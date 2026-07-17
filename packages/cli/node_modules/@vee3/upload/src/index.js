#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { DEFAULT_API_BASE_URL, resolveUpload } from "./api.js";
import { detectContentType } from "./detectContentType.js";
import { UploadError, UsageError } from "./errors.js";
import { formatBytes } from "./format.js";
import { ensureSystemCertificateTrust } from "./systemCertificates.js";
import { uploadFileToSignedUrl } from "./uploadFile.js";

ensureSystemCertificateTrust();

function printUsage() {
  console.error("Usage: vee3-upload <upload_code> <file_path>");
}

function parseArguments(argumentsList) {
  const positionalArguments = [];
  let apiBaseUrl = DEFAULT_API_BASE_URL;
  let outputJson = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--api-base-url") {
      const nextArgument = argumentsList[index + 1];
      if (!nextArgument) {
        throw new UsageError("--api-base-url requires a value");
      }
      apiBaseUrl = nextArgument;
      index += 1;
      continue;
    }
    if (argument === "--json") {
      outputJson = true;
      continue;
    }
    positionalArguments.push(argument);
  }

  if (positionalArguments.length !== 2) {
    throw new UsageError("Expected upload_code and file_path");
  }

  return {
    uploadCode: positionalArguments[0],
    filePath: positionalArguments[1],
    apiBaseUrl,
    outputJson
  };
}

async function readFileStat(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new UploadError(`File not found: ${filePath}`);
    }
    throw new UploadError(`Could not read file: ${filePath} (${error.message})`);
  }
}

async function main() {
  const { uploadCode, filePath, apiBaseUrl, outputJson } = parseArguments(
    process.argv.slice(2)
  );

  const fileStat = await readFileStat(filePath);
  if (!fileStat.isFile()) {
    throw new UploadError(`Not a file: ${filePath}`);
  }

  const contentType = await detectContentType(filePath);

  console.error("Resolving upload code...");
  const resolvedUpload = await resolveUpload({
    apiBaseUrl,
    uploadCode,
    contentType
  });

  if (fileStat.size > resolvedUpload.max_bytes) {
    throw new UploadError(
      `File is too large: ${formatBytes(fileStat.size)} exceeds the ${formatBytes(
        resolvedUpload.max_bytes
      )} limit.`
    );
  }

  console.error(`Uploading ${basename(filePath)} (${formatBytes(fileStat.size)})...`);
  await uploadFileToSignedUrl({
    uploadUrl: resolvedUpload.upload_url,
    filePath,
    fileSizeBytes: fileStat.size,
    requiredHeaders: resolvedUpload.required_headers
  });

  if (outputJson) {
    console.log(
      JSON.stringify({
        upload_id: resolvedUpload.upload_id,
        content_type: contentType,
        size_bytes: fileStat.size
      })
    );
    return;
  }

  console.log(resolvedUpload.upload_id);
}

main().catch((error) => {
  if (error instanceof UsageError) {
    printUsage();
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
});
