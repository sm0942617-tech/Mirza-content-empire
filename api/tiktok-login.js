export async function GET() {
  const state = crypto.randomUUID();

  const redirectUri =
    "https://mirza-content-empire.vercel.app/callback.html";

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic,video.upload,video.publish",
    redirect_uri: redirectUri,
    state,
  });

  const headers = new Headers();

  headers.set(
    "Set-Cookie",
    `tiktok_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  );

  headers.set(
    "Location",
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );

  return new Response(null, {
    status: 302,
    headers,
  });
}
