#!/usr/bin/env node
const [group, command, ...rest] = process.argv.slice(2);
if (group !== "fold" && group !== "capsule") {
  process.argv = [process.argv[0], process.argv[1], ...(group ? [group, command, ...rest].filter(Boolean) : [])];
  await import("./shiplet-check.mjs");
} else if (!command || command === "plan" || command === "validate" || command === "inspect" || command === "init" || command === "compile") {
  process.argv = [process.argv[0], process.argv[1], ...(command === "init" ? ["--write-contract"] : []), ...rest];
  process.env.SHIPLET_KIND = "fold";
  await import("./shiplet-check.mjs");
} else {
  console.error(`Unknown fold command: ${command}. Try: shiplet fold plan`);
  process.exitCode = 2;
}
