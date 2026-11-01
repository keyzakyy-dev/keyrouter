#!/usr/bin/env node
// One-command release: derive the changelog section from Conventional Commits,
// bump root + cli package versions in lockstep, prepend the section.
//   node scripts/release.mjs [--patch|--minor|--major] [--dry] [--commit]
// Commit subjects follow Conventional Commits: feat/fix/style/... (scope): text.
// Only, feat => minor bump, "!" or BREAKING CHANGE => major, everything else patch.
// style/perf/refactor land under "Fixes" (polish), docs/test/ci/chore/build are skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const PKGS = [path.join(ROOT, "package.json"), path.join(ROOT, "cli", "package.json")];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const doCommit = args.includes("--commit");
const force = ["--patch", "--minor", "--major"].find((f) => args.includes(f));
const today = new Date().toISOString().slice(0, 10);

const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

// --- collect commits since the previous release commit ---------------------
const all = git("log", "--format=%H%x1f%s%x1f%b%x1e").split("\x1e").filter(Boolean);
const bumpRe = /^(chore|release)(\([^)]*\))?:\s*(bump|release|publish)|^chore\(release\):/i;
let boundary = all.length;
for (let i = 0; i < all.length; i++) {
  const [ , subject ] = all[i].trim().split("\x1f");
  if (bumpRe.test(subject)) { boundary = i; break; }
}
const commits = all.slice(0, boundary).map((e) => {
  const [hash, subject = "", body = ""] = e.trim().split("\x1f");
  return { hash, subject, breaking: /BREAKING CHANGE:/i.test(body) };
});
if (!commits.length) {
  console.log("No commits since the previous release commit; nothing to record.");
  process.exit(dry ? 0 : 1);
}

// --- classify ---------------------------------------------------------------
const buckets = { Features: [], Fixes: [], Changes: [] };
let sawFeat = false;
let sawBreaking = false;
const convRe = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
for (const c of commits) {
  const m = c.subject.match(convRe);
  if (!m) { buckets.Changes.push(c.subject); continue; }
  const [ , type, scope, bang, text ] = m;
  if (bang || c.breaking) sawBreaking = true;
  const label = scope ? `**${scope}**: ${text}` : text;
  if (type === "feat") { sawFeat = true; buckets.Features.push(label); }
  else if (type === "fix" || type === "style" || type === "perf" || type === "refactor") buckets.Fixes.push(label);
  else if (["docs", "chore", "ci", "test", "build"].includes(type)) continue; // internal noise
  else buckets.Changes.push(label);
}

// --- next version ------------------------------------------------------------
const pkg = readJson(PKGS[0]);
const [maj, min, pat] = String(pkg.version).split(".").map(Number);
const bump = force ? force.slice(2) : sawBreaking ? "major" : sawFeat ? "minor" : "patch";
const next = bump === "major" ? `${maj + 1}.0.0` : bump === "minor" ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;

// --- build the new section ---------------------------------------------------
let section = `# v${next} (${today})\n`;
for (const [title, items] of Object.entries(buckets)) {
  if (!items.length) continue;
  section += `\n## ${title}\n` + items.map((t) => `- ${t}`).join("\n") + "\n";
}

// --- merge into CHANGELOG.md (replace an identical version section if any) ---
const sections = readFileSync(CHANGELOG, "utf8").split(/(?=^# v)/m);
const kept = sections.filter((s) => !s.startsWith(`# v${next} `));
const content = (section + "\n" + kept.join("").replace(/^\n+/, "")).replace(/\n{3,}/g, "\n\n");

console.log(`Bump ${pkg.version} -> ${next} (${bump}${force ? ", forced" : ""}) from ${commits.length} commit(s)`);
for (const [title, items] of Object.entries(buckets)) items.forEach((t) => console.log(`  ${title}: ${t}`));

if (dry) { console.log("(dry run — nothing written)"); process.exit(0); }

writeFileSync(CHANGELOG, content);
for (const p of PKGS) { const o = readJson(p); o.version = next; writeJson(p, o); }
console.log(`Updated CHANGELOG.md + ${PKGS.map((p) => path.relative(ROOT, p)).join(", ")}`);

if (doCommit) {
  git("add", "CHANGELOG.md", "package.json", path.join("cli", "package.json"));
  git("commit", "-m", `chore(release): v${next}`);
  console.log(`Committed as chore(release): v${next} — publish with: npm run cli:publish`);
} else {
  console.log("Commit when ready (git add -A && git commit) — publish with: npm run cli:publish");
}
