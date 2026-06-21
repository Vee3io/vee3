import { formatBytes } from "./format.js";

const TTY_RENDER_INTERVAL_MS = 150;
const NON_TTY_MILESTONE_STEP = 20;

/**
 * Reports upload progress to stderr so that stdout stays clean for the
 * upload_id. In an interactive terminal it redraws a single line; in
 * non-interactive contexts (such as agent logs) it prints discrete milestone
 * lines to avoid carriage-return spam.
 */
export function createUploadProgressReporter(totalBytes) {
  const isInteractive = Boolean(process.stderr.isTTY);
  let lastRenderTime = 0;
  let lastMilestone = 0;

  function computePercent(uploadedBytes) {
    if (totalBytes <= 0) {
      return 100;
    }
    return Math.min(100, Math.floor((uploadedBytes / totalBytes) * 100));
  }

  function report(uploadedBytes) {
    const percent = computePercent(uploadedBytes);

    if (isInteractive) {
      const now = Date.now();
      const isComplete = uploadedBytes >= totalBytes;
      if (!isComplete && now - lastRenderTime < TTY_RENDER_INTERVAL_MS) {
        return;
      }
      lastRenderTime = now;
      process.stderr.write(
        `\rUploading ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)})`
      );
      return;
    }

    const milestone = Math.floor(percent / NON_TTY_MILESTONE_STEP) * NON_TTY_MILESTONE_STEP;
    if (milestone <= lastMilestone || milestone >= 100) {
      return;
    }
    lastMilestone = milestone;
    process.stderr.write(
      `Uploading ${milestone}% (${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)})\n`
    );
  }

  function finish() {
    if (isInteractive) {
      process.stderr.write(`\rUploaded ${formatBytes(totalBytes)} (100%)\n`);
      return;
    }
    process.stderr.write(`Uploaded ${formatBytes(totalBytes)} (100%)\n`);
  }

  return { report, finish };
}
