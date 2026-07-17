#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { DEFAULT_API_BASE_URL, resolveDownload } from "./api.js";
import { downloadFileToPath } from "./downloadFile.js";
import { DownloadError, UsageError } from "./errors.js";
import { formatBytes } from "./format.js";
import { ensureSystemCertificateTrust } from "./systemCertificates.js";

ensureSystemCertificateTrust();

function printUsage() {
  console.error(
    "Usage: vee3-get-file <download_code> [output_path] [--api-base-url https://api.vee3.io] [--json]"
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

  if (positionalArguments.length < 1 || positionalArguments.length > 2) {
    throw new UsageError("Expected download_code and optional output_path");
  }

  return {
    downloadCode: positionalArguments[0],
    outputPathArgument: positionalArguments[1],
    apiBaseUrl,
    outputJson
  };
}

async function resolveOutputPath(outputPathArgument, fileName) {
  if (!outputPathArgument) {
    return `./${fileName}`;
  }

  const isDirectoryHint =
    outputPathArgument.endsWith("/") || outputPathArgument.endsWith("\\");

  if (isDirectoryHint) {
    return join(outputPathArgument, basename(fileName));
  }

  try {
    const pathStat = await stat(outputPathArgument);
    if (pathStat.isDirectory()) {
      return join(outputPathArgument, basename(fileName));
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw new DownloadError(
        `Could not inspect output path: ${outputPathArgument} (${error.message})`
      );
    }
  }

  return outputPathArgument;
}

async function main() {
  const { downloadCode, outputPathArgument, apiBaseUrl, outputJson } = parseArguments(
    process.argv.slice(2)
  );

  console.error("Resolving download code...");
  const resolvedDownload = await resolveDownload({
    apiBaseUrl,
    downloadCode
  });

  const outputPath = await resolveOutputPath(outputPathArgument, resolvedDownload.file_name);
  const sizeBytes = resolvedDownload.size_bytes;

  if (Number.isFinite(sizeBytes) && sizeBytes > 0) {
    console.error(`Downloading ${basename(resolvedDownload.file_name)} (${formatBytes(sizeBytes)})...`);
  } else {
    console.error(`Downloading ${basename(resolvedDownload.file_name)}...`);
  }

  const downloadedBytes = await downloadFileToPath({
    downloadUrl: resolvedDownload.download_url,
    outputPath,
    sizeBytes
  });

  if (outputJson) {
    console.log(
      JSON.stringify({
        file_name: resolvedDownload.file_name,
        download_id: resolvedDownload.download_id,
        size_bytes: Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : downloadedBytes,
        output_path: outputPath
      })
    );
    return;
  }

  console.log(resolvedDownload.file_name);
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
