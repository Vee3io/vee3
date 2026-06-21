export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

export class UploadError extends Error {
  constructor(message) {
    super(message);
    this.name = "UploadError";
  }
}

const TLS_VERIFICATION_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID"
]);

/**
 * Turns a low-level fetch failure into a message a user can act on. Node's
 * fetch throws a generic "fetch failed" TypeError and hides the real reason in
 * error.cause, so we surface the underlying code here.
 */
export function describeNetworkError(error, targetDescription) {
  const cause = error?.cause ?? error;
  const code = cause?.code;

  if (code === "ECONNREFUSED") {
    return `Could not connect to ${targetDescription}. Make sure it is running and the address is correct.`;
  }
  if (code === "ENOTFOUND") {
    return `Could not find ${targetDescription}. Check the address and your network connection.`;
  }
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return `Connection to ${targetDescription} timed out.`;
  }
  if (code && TLS_VERIFICATION_CODES.has(code)) {
    return (
      `Could not verify the TLS certificate for ${targetDescription}. ` +
      "This usually means a proxy or antivirus is inspecting HTTPS traffic. " +
      "Use Node 22.15 or newer, or set NODE_EXTRA_CA_CERTS to your root certificate."
    );
  }

  const detail = cause?.message ?? error?.message ?? String(error);
  return `Request to ${targetDescription} failed: ${detail}`;
}
