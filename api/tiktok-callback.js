function getCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    const key = cookie.slice(0, separator);
    const value = cookie.slice(separator + 1);
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}

export async function POST(request) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return Response.json(
        { success: false, error: "Missing TikTok authorization code." },
        { status: 400 }
      );
    }

    const expectedState = getCookie(request, "tiktok_oauth_state");
    if (!state || !expectedState || state !== expectedState) {
      return Response.json(
        { success: false, error: "TikTok authorization state did not match. Please reconnect." },
        { status: 400 }
      );
    }

    const body = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: "https://mirza-content-empire.vercel.app/callback.html",
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

    if (!tokenResponse.ok || !data.access_token) {
      return Response.json(
        {
          success: false,
          error: data.error || data.error_description || "TikTok token exchange failed.",
        },
        { status: 400 }
      );
    }

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append(
      "Set-Cookie",
      `tiktok_access_token=${encodeURIComponent(data.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in || 86400}`
    );
    if (data.refresh_token) {
      headers.append(
        "Set-Cookie",
        `tiktok_refresh_token=${encodeURIComponent(data.refresh_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.refresh_expires_in || 31536000}`
      );
    }
    headers.append(
      "Set-Cookie",
      "tiktok_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );

    return new Response(
      JSON.stringify({
        success: true,
        connected: true,
        open_id: data.open_id || null,
        scope: data.scope || "",
      }),
      { status: 200, headers }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: "Server error while connecting TikTok." },
      { status: 500 }
    );
  }
}
