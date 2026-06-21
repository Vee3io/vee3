export const DEFAULT_API_BASE_URL = "https://api.vee3.io";

async function formatApiError(response) {
  const responseText = await response.text();
  try {
    const payload = JSON.parse(responseText);
    if (payload && typeof payload.error === "object") {
      const requestId = payload.error.request_id ? ` (request_id=${payload.error.request_id})` : "";
      return `${payload.error.code}: ${payload.error.message}${requestId}`;
    }
  } catch {
    // Fall through to raw response text.
  }
  return responseText || `HTTP ${response.status}`;
}

export async function resolveUpload({ apiBaseUrl, uploadCode, contentType }) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/agent-uploads/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      upload_code: uploadCode,
      content_type: contentType
    })
  });

  if (!response.ok) {
    throw new Error(await formatApiError(response));
  }

  return await response.json();
}
