import crypto from 'crypto';
import jwt from 'jsonwebtoken';

type ServiceAccountConfig = {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
};

export type DecodedIdToken = {
  uid: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  admin?: boolean;
  role?: string;
  [key: string]: unknown;
};

type SessionPayload = DecodedIdToken & {
  exp: number;
  iat: number;
};

type GoogleCertCache = {
  expiresAt: number;
  certs: Record<string, string>;
};

let certCache: GoogleCertCache | null = null;

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n').replace(/^['"]+|['"]+$/g, '');
}

function normalizeServiceAccount(value: Record<string, unknown>): ServiceAccountConfig {
  const projectId = String(value.projectId || value.project_id || '');
  const clientEmail = String(value.clientEmail || value.client_email || '');
  const privateKey = String(value.privateKey || value.private_key || '');
  if (!projectId) {
    throw new Error('Firebase service account JSON must include project_id.');
  }
  return {
    projectId,
    clientEmail,
    privateKey: privateKey ? normalizePrivateKey(privateKey) : '',
  };
}

function parseServiceAccountJson(value: string) {
  let trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      trimmed = parsed.trim();
    }
  }
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');
  return normalizeServiceAccount(JSON.parse(jsonText));
}

function getServiceAccountFromEnv(): ServiceAccountConfig | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  if (serviceAccountJson.trim()) {
    return parseServiceAccountJson(serviceAccountJson);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (projectId) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey ? normalizePrivateKey(privateKey) : '',
    };
  }

  return null;
}

function getProjectId() {
  const serviceAccount = getServiceAccountFromEnv();
  const projectId = serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!projectId) {
    throw new Error('Firebase project ID is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID.');
  }
  return projectId;
}

function getSessionSecret() {
  const configured = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (configured.trim()) {
    return configured.trim();
  }

  const serviceAccount = getServiceAccountFromEnv();
  const fallback = serviceAccount?.privateKey || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!fallback.trim()) {
    throw new Error('Session signing secret is not configured. Set AUTH_SESSION_SECRET or FIREBASE_SERVICE_ACCOUNT_JSON.');
  }
  return fallback;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlJson(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signSessionPayload(payload: SessionPayload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySessionPayload(cookieValue: string): SessionPayload {
  const [body, signature] = cookieValue.split('.');
  if (!body || !signature) {
    throw new Error('Invalid session cookie format.');
  }

  const expected = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid session cookie signature.');
  }

  const payload = base64UrlJson(body) as SessionPayload;
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Session cookie has expired.');
  }
  return payload;
}

async function getGoogleSecureTokenCerts() {
  const now = Date.now();
  if (certCache && certCache.expiresAt > now) {
    return certCache.certs;
  }

  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Could not fetch Firebase public certs (${response.status}).`);
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = await response.json() as Record<string, string>;
  certCache = {
    certs,
    expiresAt: now + Math.max(60, maxAgeSeconds - 60) * 1000,
  };
  return certs;
}

async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const [encodedHeader] = idToken.split('.');
  if (!encodedHeader) {
    throw new Error('Invalid Firebase ID token.');
  }

  const header = base64UrlJson(encodedHeader) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase ID token header.');
  }

  const certs = await getGoogleSecureTokenCerts();
  const cert = certs[header.kid];
  if (!cert) {
    certCache = null;
    throw new Error('Firebase ID token signing certificate was not found.');
  }

  const projectId = getProjectId();
  const decoded = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as jwt.JwtPayload;

  const uid = String(decoded.sub || '');
  if (!uid) {
    throw new Error('Firebase ID token is missing uid.');
  }

  return {
    ...decoded,
    uid,
  } as DecodedIdToken;
}

function unsupportedAdminAuthMethod(method: string): never {
  throw new Error(`Firebase Admin SDK method ${method} is not available in this deployment build.`);
}

const auth = () => ({
  verifyIdToken: async (idToken: string, _checkRevoked?: boolean) => verifyFirebaseIdToken(idToken),
  createSessionCookie: async (idToken: string, options: { expiresIn: number }) => {
    const decoded = await verifyFirebaseIdToken(idToken);
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = Math.max(60, Math.floor((options?.expiresIn || 0) / 1000));
    return signSessionPayload({
      ...decoded,
      iat: now,
      exp: now + expiresInSeconds,
    } as SessionPayload);
  },
  verifySessionCookie: async (sessionCookie: string, _checkRevoked?: boolean) => verifySessionPayload(sessionCookie),
  createUser: async (_payload: any): Promise<any> => unsupportedAdminAuthMethod('createUser'),
  updateUser: async (_uid: string, _payload: any): Promise<any> => unsupportedAdminAuthMethod('updateUser'),
  listUsers: async (_maxResults?: number, _pageToken?: string): Promise<any> => unsupportedAdminAuthMethod('listUsers'),
  getUser: async (_uid: string): Promise<any> => unsupportedAdminAuthMethod('getUser'),
});

function createDisabledFirestoreReference(): any {
  const emptySnapshot = {
    empty: true,
    docs: [],
    exists: false,
    forEach: (_callback: (doc: any) => void) => {},
  };

  const reference: any = {
    id: 'firestore-disabled',
    collection: () => reference,
    doc: () => reference,
    where: () => reference,
    orderBy: () => reference,
    limit: () => reference,
    add: async () => ({ id: 'firestore-disabled' }),
    set: async () => {},
    update: async () => {},
    delete: async () => {},
    get: async () => emptySnapshot,
    data: () => ({}),
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {},
    }),
  };

  return reference;
}

const firestoreDisabled: any = function firestoreDisabled() {
  return createDisabledFirestoreReference();
};

firestoreDisabled.FieldPath = {
  documentId: () => '__name__',
};
firestoreDisabled.FieldValue = {
  serverTimestamp: () => new Date(),
};
firestoreDisabled.Timestamp = {
  fromDate: (date: Date) => date,
};

const admin = {
  auth,
  firestore: firestoreDisabled,
};

export default admin;
export type FirestoreQuery = any;
export type FirestoreWriteBatch = any;
