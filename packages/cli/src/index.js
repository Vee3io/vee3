#!/usr/bin/env node

const COMMANDS = [
  {
    name: "vee3-upload",
    summary: "Upload a local file using an upload code from meta-tools.upload_file",
    usage: "vee3-upload <upload_code> <file_path>"
  },
  {
    name: "vee3-get-file",
    summary: "Download a stored file using a download code from meta-tools.download_file",
    usage: "vee3-get-file <download_code> [output_path]"
  }
];

function printHelp() {
  console.log("Vee3 CLI");
  console.log("");
  console.log("Install once: npm install -g @vee3/cli");
  console.log("This package installs the Vee3 command-line tools listed below.");
  console.log("");
  console.log("Commands:");
  for (const command of COMMANDS) {
    console.log(`  ${command.name}`);
    console.log(`    ${command.summary}`);
    console.log(`    ${command.usage}`);
    console.log("");
  }
  console.log("Docs: https://vee3.io");
}

const firstArgument = process.argv[2];
if (firstArgument === "--help" || firstArgument === "-h" || firstArgument === "help") {
  printHelp();
  process.exit(0);
}

if (firstArgument) {
  console.error(`Unknown command: ${firstArgument}`);
  console.error("Run `vee3 --help` to list installed Vee3 tools.");
  process.exit(1);
}

printHelp();
