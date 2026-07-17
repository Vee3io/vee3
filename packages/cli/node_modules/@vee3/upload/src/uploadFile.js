import { createReadStream } from "node:fs";
import { Transform } from "node:stream";
import { UploadError, describeNetworkError } from "./errors.js";
import { createUploadProgressReporter } from "./progress.js";

export async function uploadFileToSignedUrl({
  uploadUrl,
  filePath,
  fileSizeBytes,
  requiredHeaders
}) {
  const progressReporter = createUploadProgressReporter(fileSizeBytes);
  let uploadedBytes = 0;

  const progressStream = new Transform({
    transform(chunk, _encoding, callback) {
      uploadedBytes += chunk.length;
      progressReporter.report(uploadedBytes);
      callback(null, chunk);
    }
  });

  const fileStream = createReadStream(filePath);
  fileStream.on("error", (error) => {
    progressStream.destroy(error);
  });
  fileStream.pipe(progressStream);

  const headers = {
    ...requiredHeaders,
    "Content-Length": String(fileSizeBytes)
  };

  let response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: progressStream,
      duplex: "half"
    });
  } catch (error) {
    throw new UploadError(describeNetworkError(error, "Vee3 storage"));
  }

  if (!response.ok) {
    const responseText = (await response.text()).trim();
    throw new UploadError(responseText || `Upload failed with HTTP ${response.status}`);
  }

  progressReporter.finish();
}
