#!/usr/bin/env node
const [group, command, ...rest] = process.argv.slice(2);
if (group !== "capsule") {
  process.argv = [process.argv[0], process.argv[1], ...(group ? [group, command, ...rest].filter(Boolean) : [])];
  await import("./shiplet-check.mjs");
} else if (!command || command === "plan" || command === "validate") {
  process.argv = [process.argv[0], process.argv[1], ...rest];
  process.env.SHIPLET_KIND = "capsule";
  await import("./shiplet-check.mjs");
} else {
  console.error(`Unknown capsule command: ${command}. Try: shiplet capsule plan`);
  process.exitCode = 2;
}
