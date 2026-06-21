import { createReadStream } from "node:fs";

export async function uploadFileToSignedUrl({
  uploadUrl,
  filePath,
  fileSizeBytes,
  requiredHeaders
}) {
  const headers = {
    ...requiredHeaders,
    "Content-Length": String(fileSizeBytes)
  };

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: createReadStream(filePath),
    duplex: "half"
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(responseText || `Upload failed with HTTP ${response.status}`);
  }
}
