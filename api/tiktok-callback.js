export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return Response.json(
        { success: false, error: "Missing TikTok authorization code." },
        { status: 400 }
      );
    }

    const body = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri:
        "https://mirza-content-empire.vercel.app/callback.html",
    });

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await tokenResponse.json();

    if (!tokenResponse.ok || data.error) {
      return Response.json(
        {
          success: false,
          error: data.error || "TikTok token exchange failed",
          description: data.error_description || null,
        },
        { status: 400 }
      );
    }

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    headers.append(
      "Set-Cookie",
      `tiktok_access_token=${encodeURIComponent(
        data.access_token
      )}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in}`
    );

    headers.append(
      "Set-Cookie",
      `tiktok_refresh_token=${encodeURIComponent(
        data.refresh_token
      )}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.refresh_expires_in}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        connected: true,
        open_id: data.open_id,
        scope: data.scope,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Server error while connecting TikTok.",
      },
      { status: 500 }
    );
  }
}
