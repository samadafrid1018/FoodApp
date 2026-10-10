import { createClient } from 'jsr:@supabase/supabase-js@2';

async function getAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${base64url(header)}.${base64url(payload)}`;

  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
    .trim();

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. The caller must be a logged-in user
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) {
      return jsonResponse({ error: 'Missing authorization token' }, 401);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }

    // 2. The caller must be an admin (role is read from the database)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'Admins only' }, 403);
    }

    // 3. Validate the request
    const { user_id, title, body } = await req.json();
    if (!user_id || !title || !body) {
      return jsonResponse({ error: 'user_id, title and body are required' }, 400);
    }

    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (error || !tokens || tokens.length === 0) {
      return jsonResponse({ message: 'No tokens found' }, 200);
    }

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!;

    const accessToken = await getAccessToken(clientEmail, privateKey);

    const results = [];
    for (const row of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title, body },
            },
          }),
        },
      );
      results.push(await res.json());
    }

    return jsonResponse({ success: true, results }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});