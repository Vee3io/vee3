import { open } from "node:fs/promises";
import { extname } from "node:path";

const extensionContentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".bmp", "image/bmp"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".svg", "image/svg+xml"],
  [".mp4", "video/mp4"],
  [".m4v", "video/mp4"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
  [".avi", "video/x-msvideo"],
  [".mkv", "video/x-matroska"],
  [".mpeg", "video/mpeg"],
  [".mpg", "video/mpeg"],
  [".3gp", "video/3gpp"],
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".pdf", "application/pdf"],
  [".zip", "application/zip"],
  [".json", "application/json"],
  [".txt", "text/plain"],
  [".csv", "text/csv"]
]);

function matchesBytes(bytes, expectedBytes, offset = 0) {
  if (bytes.length < offset + expectedBytes.length) {
    return false;
  }
  return expectedBytes.every((byte, index) => bytes[offset + index] === byte);
}

function readAscii(bytes, start, end) {
  return Buffer.from(bytes.subarray(start, end)).toString("ascii");
}

async function readSignature(filePath) {
  const file = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

export async function detectContentType(filePath) {
  const signature = await readSignature(filePath);

  if (matchesBytes(signature, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (matchesBytes(signature, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (readAscii(signature, 0, 6) === "GIF87a" || readAscii(signature, 0, 6) === "GIF89a") {
    return "image/gif";
  }
  if (readAscii(signature, 0, 4) === "RIFF" && readAscii(signature, 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (readAscii(signature, 0, 4) === "%PDF") {
    return "application/pdf";
  }
  if (matchesBytes(signature, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/zip";
  }
  if (readAscii(signature, 0, 4) === "RIFF" && readAscii(signature, 8, 12) === "AVI ") {
    return "video/x-msvideo";
  }
  if (matchesBytes(signature, [0x1a, 0x45, 0xdf, 0xa3])) {
    return extname(filePath).toLowerCase() === ".mkv" ? "video/x-matroska" : "video/webm";
  }
  if (readAscii(signature, 4, 8) === "ftyp") {
    const brand = readAscii(signature, 8, 12);
    return brand === "qt  " ? "video/quicktime" : "video/mp4";
  }

  const extension = extname(filePath).toLowerCase();
  return extensionContentTypes.get(extension) ?? "application/octet-stream";
}
