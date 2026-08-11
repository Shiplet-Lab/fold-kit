import { readFileSync } from "node:fs";
import { join } from "node:path";
const [group, command, ...rest] = process.argv.slice(2);
if (group === "--help" || group === "-h") {
  console.log(`Shiplet Fold CLI\n\nUsage:\n  shiplet fold <plan|inspect|validate|init|compile> [options]\n  shiplet-check [--json]\n\nOptions:\n  --json                 Emit machine-readable output\n  --provider=<name>      Compile provider metadata\n`);
} else if (group === "--version" || group === "-v") {
  const packageUrl = new URL("../package.json", import.meta.url);
  console.log(JSON.parse(readFileSync(packageUrl, "utf8")).version);
} else if (group !== "fold" && group !== "capsule") {
  process.argv = [process.argv[0], process.argv[1], ...(group ? [group, command, ...rest].filter(Boolean) : [])];
  await import("./shiplet-check.mjs");
} else if (!command || ["plan", "validate", "inspect", "init", "compile"].includes(command)) {
  process.argv = [process.argv[0], process.argv[1], ...(command === "init" ? ["--write-contract"] : []), ...rest];
  process.env.SHIPLET_KIND = "fold";
  await import("./shiplet-check.mjs");
} else {
  console.error(`Unknown Fold command: ${command}. Try: shiplet fold plan`);
  process.exitCode = 2;
}
