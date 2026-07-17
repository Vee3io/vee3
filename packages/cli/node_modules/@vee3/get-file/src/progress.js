import { formatBytes } from "./format.js";

const TTY_RENDER_INTERVAL_MS = 150;
const NON_TTY_MILESTONE_STEP = 20;

/**
 * Reports download progress to stderr so that stdout stays clean for the
 * file_name. In an interactive terminal it redraws a single line; in
 * non-interactive contexts (such as agent logs) it prints discrete milestone
 * lines to avoid carriage-return spam.
 */
export function createDownloadProgressReporter(totalBytes) {
  const isInteractive = Boolean(process.stderr.isTTY);
  let lastRenderTime = 0;
  let lastMilestone = 0;

  function computePercent(downloadedBytes) {
    if (totalBytes <= 0) {
      return 100;
    }
    return Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100));
  }

  function report(downloadedBytes) {
    const percent = computePercent(downloadedBytes);

    if (isInteractive) {
      const now = Date.now();
      const isComplete = totalBytes > 0 && downloadedBytes >= totalBytes;
      if (!isComplete && now - lastRenderTime < TTY_RENDER_INTERVAL_MS) {
        return;
      }
      lastRenderTime = now;
      const totalLabel = totalBytes > 0 ? formatBytes(totalBytes) : "?";
      process.stderr.write(
        `\rDownloading ${percent}% (${formatBytes(downloadedBytes)} / ${totalLabel})`
      );
      return;
    }

    if (totalBytes <= 0) {
      return;
    }

    const milestone = Math.floor(percent / NON_TTY_MILESTONE_STEP) * NON_TTY_MILESTONE_STEP;
    if (milestone <= lastMilestone || milestone >= 100) {
      return;
    }
    lastMilestone = milestone;
    process.stderr.write(
      `Downloading ${milestone}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})\n`
    );
  }

  function finish(downloadedBytes) {
    const byteCount = downloadedBytes ?? totalBytes;
    if (isInteractive) {
      process.stderr.write(`\rDownloaded ${formatBytes(byteCount)} (100%)\n`);
      return;
    }
    process.stderr.write(`Downloaded ${formatBytes(byteCount)} (100%)\n`);
  }

  return { report, finish };
}
