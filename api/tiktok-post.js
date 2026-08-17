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
  const accessToken = getCookie(request, "tiktok_access_token");

  if (!accessToken) {
    return Response.json(
      { success: false, error: "TikTok is not connected." },
      { status: 401 }
    );
  }

  try {
    const form = await request.formData();
    const video = form.get("video");
    const title = String(form.get("title") || "").trim();
    const privacyLevel = String(form.get("privacy_level") || "SELF_ONLY");
    const disableComment = String(form.get("disable_comment") || "false") === "true";
    const disableDuet = String(form.get("disable_duet") || "false") === "true";
    const disableStitch = String(form.get("disable_stitch") || "false") === "true";
    const isAigc = String(form.get("is_aigc") || "false") === "true";
    const consent = String(form.get("consent") || "false") === "true";

    if (!consent) {
      return Response.json(
        { success: false, error: "Explicit consent is required before sending content to TikTok." },
        { status: 400 }
      );
    }

    if (!(video instanceof File) || video.size === 0) {
      return Response.json(
        { success: false, error: "Select a video file first." },
        { status: 400 }
      );
    }

    const allowedTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
    if (!allowedTypes.has(video.type)) {
      return Response.json(
        { success: false, error: "Use MP4, MOV, or WebM for the demo." },
        { status: 400 }
      );
    }

    // Keep the app-review demo deliberately small and reliable.
    // One-chunk upload keeps the media-transfer flow straightforward.
    const maxDemoBytes = 64 * 1024 * 1024;
    if (video.size > maxDemoBytes) {
      return Response.json(
        { success: false, error: "For the review demo, use a video smaller than 64 MB." },
        { status: 400 }
      );
    }

    const initResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: privacyLevel,
            disable_comment: disableComment,
            disable_duet: disableDuet,
            disable_stitch: disableStitch,
            is_aigc: isAigc,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: video.size,
            chunk_size: video.size,
            total_chunk_count: 1,
          },
        }),
      }
    );

    const initPayload = await initResponse.json();
    const initError = initPayload?.error;

    if (!initResponse.ok || (initError?.code && initError.code !== "ok")) {
      return Response.json(
        {
          success: false,
          error: initError?.message || initError?.code || "TikTok rejected the post initialization request.",
        },
        { status: 400 }
      );
    }

    const uploadUrl = initPayload?.data?.upload_url;
    const publishId = initPayload?.data?.publish_id;

    if (!uploadUrl || !publishId) {
      return Response.json(
        { success: false, error: "TikTok did not return an upload URL." },
        { status: 400 }
      );
    }

    const bytes = await video.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": video.type,
        "Content-Length": String(video.size),
        "Content-Range": `bytes 0-${video.size - 1}/${video.size}`,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      return Response.json(
        { success: false, error: `TikTok media upload failed (${uploadResponse.status}).` },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      publish_id: publishId,
      message: "Video sent to TikTok successfully.",
    });
  } catch (error) {
    return Response.json(
      { success: false, error: "Server error while sending the video to TikTok." },
      { status: 500 }
    );
  }
}
