#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { DEFAULT_API_BASE_URL, resolveUpload } from "./api.js";
import { detectContentType } from "./detectContentType.js";
import { uploadFileToSignedUrl } from "./uploadFile.js";

function printUsage() {
  console.error(
    "Usage: vee3-upload <upload_code> <file_path> [--api-base-url https://api.vee3.io] [--json]"
  );
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
        throw new Error("--api-base-url requires a value");
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
    throw new Error("Expected upload_code and file_path");
  }

  return {
    uploadCode: positionalArguments[0],
    filePath: positionalArguments[1],
    apiBaseUrl,
    outputJson
  };
}

async function main() {
  const { uploadCode, filePath, apiBaseUrl, outputJson } = parseArguments(
    process.argv.slice(2)
  );
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error(`File path is not a file: ${filePath}`);
  }

  const contentType = await detectContentType(filePath);
  const resolvedUpload = await resolveUpload({
    apiBaseUrl,
    uploadCode,
    contentType
  });

  if (fileStat.size > resolvedUpload.max_bytes) {
    throw new Error(
      `File is too large: ${fileStat.size} bytes exceeds ${resolvedUpload.max_bytes} bytes`
    );
  }

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
  printUsage();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
