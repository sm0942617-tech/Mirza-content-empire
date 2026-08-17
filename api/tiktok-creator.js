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

export async function GET(request) {
  const accessToken = getCookie(request, "tiktok_access_token");

  if (!accessToken) {
    return Response.json(
      { success: false, connected: false, error: "TikTok is not connected." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    const payload = await response.json();
    const apiError = payload?.error;

    if (!response.ok || (apiError?.code && apiError.code !== "ok")) {
      return Response.json(
        {
          success: false,
          connected: true,
          error: apiError?.message || apiError?.code || "Could not load TikTok creator information.",
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      connected: true,
      creator: payload.data,
    });
  } catch (error) {
    return Response.json(
      { success: false, connected: true, error: "Server error while loading TikTok creator information." },
      { status: 500 }
    );
  }
}
