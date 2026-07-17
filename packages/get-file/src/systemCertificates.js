import { spawnSync } from "node:child_process";

const SYSTEM_CA_FLAG = "--use-system-ca";
const REEXEC_GUARD_VARIABLE = "VEE3_DOWNLOAD_SYSTEM_CA_REEXEC";

function systemCaFlagAlreadyActive() {
  if (process.execArgv.includes(SYSTEM_CA_FLAG)) {
    return true;
  }
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  return nodeOptions.includes(SYSTEM_CA_FLAG);
}

function systemCaFlagSupported() {
  try {
    return process.allowedNodeEnvironmentFlags.has(SYSTEM_CA_FLAG);
  } catch {
    return false;
  }
}

/**
 * Networks that perform TLS inspection (corporate proxies, some antivirus
 * products) present certificates signed by a private root CA that Node does not
 * trust by default, so HTTPS requests fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
 * Re-executing with --use-system-ca makes Node trust the same roots the
 * operating system already trusts, which is what browsers and OS HTTP clients
 * use. On older Node versions without the flag we fall back to whatever
 * NODE_EXTRA_CA_CERTS provides.
 */
export function ensureSystemCertificateTrust() {
  if (process.env[REEXEC_GUARD_VARIABLE] === "1") {
    return;
  }
  if (systemCaFlagAlreadyActive()) {
    return;
  }
  if (!systemCaFlagSupported()) {
    return;
  }

  const entryScript = process.argv[1];
  if (!entryScript) {
    return;
  }

  const result = spawnSync(
    process.execPath,
    [SYSTEM_CA_FLAG, entryScript, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, [REEXEC_GUARD_VARIABLE]: "1" }
    }
  );

  if (result.error) {
    return;
  }

  process.exit(result.status ?? 0);
}
