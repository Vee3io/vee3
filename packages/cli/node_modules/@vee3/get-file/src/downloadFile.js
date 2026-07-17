import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DownloadError, describeNetworkError } from "./errors.js";
import { createDownloadProgressReporter } from "./progress.js";

async function assertOutputPathIsAvailable(outputPath) {
  try {
    await stat(outputPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw new DownloadError(
      `Could not inspect output path: ${outputPath} (${error.message})`
    );
  }

  throw new DownloadError(
    `Output path already exists: ${outputPath}. Choose a different path or remove the existing file.`
  );
}

export async function downloadFileToPath({ downloadUrl, outputPath, sizeBytes }) {
  await assertOutputPathIsAvailable(outputPath);
  await mkdir(dirname(outputPath), { recursive: true });

  let response;
  try {
    response = await fetch(downloadUrl);
  } catch (error) {
    throw new DownloadError(describeNetworkError(error, "Vee3 storage"));
  }

  if (!response.ok) {
    const responseText = (await response.text()).trim();
    throw new DownloadError(responseText || `Download failed with HTTP ${response.status}`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  const parsedContentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  const totalBytes =
    Number.isFinite(sizeBytes) && sizeBytes > 0
      ? sizeBytes
      : Number.isFinite(parsedContentLength)
        ? parsedContentLength
        : 0;

  const progressReporter = createDownloadProgressReporter(totalBytes);
  let downloadedBytes = 0;

  const progressStream = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      progressReporter.report(downloadedBytes);
      callback(null, chunk);
    }
  });

  const fileStream = createWriteStream(outputPath, { flags: "wx" });
  fileStream.on("error", (error) => {
    progressStream.destroy(error);
  });

  const responseBody = response.body;
  if (!responseBody) {
    throw new DownloadError("Download response had no body");
  }

  try {
    await pipeline(Readable.fromWeb(responseBody), progressStream, fileStream);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new DownloadError(
        `Output path already exists: ${outputPath}. Choose a different path or remove the existing file.`
      );
    }
    throw new DownloadError(`Could not write file: ${outputPath} (${error.message})`);
  }

  progressReporter.finish(downloadedBytes);
  return downloadedBytes;
}
