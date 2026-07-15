#!/usr/bin/env node
// Zips dist/ for Chrome Web Store upload (context-editor-tab-v$version.zip).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
const outName = `context-editor-tab-v${pkg.version}.zip`;
const outPath = path.join(root, outName);

if (!fs.existsSync(dist) || !fs.existsSync(path.join(dist, "manifest.json"))) {
  console.error("dist/ is missing or incomplete. Run npm run build:extension first.");
  process.exit(1);
}

if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

execFileSync("zip", ["-r", "-q", outPath, "."], { cwd: dist, stdio: "inherit" });
console.log(`Wrote ${outName}`);
