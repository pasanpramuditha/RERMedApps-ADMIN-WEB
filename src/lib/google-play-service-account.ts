type GooglePlayServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function parseServiceAccount(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

async function getRawGooglePlayServiceAccountJson(): Promise<string> {
  return process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '';
}

export async function getGooglePlayServiceAccount(): Promise<GooglePlayServiceAccount | { error: string }> {
  const raw = await getRawGooglePlayServiceAccountJson();
  if (!raw.trim()) {
    return { error: 'Google Play service account JSON is not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in the server environment.' };
  }

  try {
    const parsed = parseServiceAccount(raw.trim()) as Partial<GooglePlayServiceAccount>;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      return { error: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email, private_key, or project_id.' };
    }

    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
      project_id: parsed.project_id,
    };
  } catch {
    return { error: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON or base64 JSON.' };
  }
}
