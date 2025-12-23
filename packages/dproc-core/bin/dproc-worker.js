#!/usr/bin/env node
import("../dist/cli/worker.js").catch((err) => {
  console.error("Failed to load worker:", err);
  process.exit(1);
});
