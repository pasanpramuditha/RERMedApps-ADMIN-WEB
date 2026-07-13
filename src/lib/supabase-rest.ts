type SupabaseOptions = {
  table: string;
  id?: string | number;
  query?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || (!publishableKey && !serviceRoleKey)) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    publishableKey,
    serviceRoleKey,
    schema: process.env.SUPABASE_DB_SCHEMA?.trim() || 'public',
  };
}

export function hasSupabaseConfig() {
  return getSupabaseConfig() !== null;
}

export async function supabaseRestRequest<T>({ table, id, query, method = 'GET', body }: SupabaseOptions): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase is not configured.');
  }

  const apiKey = config.serviceRoleKey || config.publishableKey;
  if (!apiKey) {
    throw new Error('Supabase API key is missing.');
  }

  const url = new URL(`${config.url}/rest/v1/${table}${id !== undefined ? `?id=eq.${encodeURIComponent(String(id))}` : ''}`);
  for (const [key, value] of Object.entries(query || {})) {
    url.searchParams.set(key, value);
  }
  if (method === 'GET' && !url.searchParams.has('select')) {
    url.searchParams.set('select', '*');
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': config.schema,
      'Content-Profile': config.schema,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Supabase request failed (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}
