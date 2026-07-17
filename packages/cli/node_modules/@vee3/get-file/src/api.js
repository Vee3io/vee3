import { DownloadError, describeNetworkError } from "./errors.js";

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

export async function resolveDownload({ apiBaseUrl, downloadCode }) {
  const requestUrl = `${apiBaseUrl.replace(/\/$/, "")}/v1/agent-downloads/resolve`;

  let response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        download_code: downloadCode
      })
    });
  } catch (error) {
    throw new DownloadError(describeNetworkError(error, `the Vee3 API at ${apiBaseUrl}`));
  }

  if (!response.ok) {
    throw new DownloadError(await formatApiError(response));
  }

  return await response.json();
}
