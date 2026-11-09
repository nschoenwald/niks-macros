// Shared helpers for the pack tools. No dependencies besides classic-level (LevelDB), which is resolved from this repo's
// node_modules first and from a local Foundry install (../FoundryVTT-Node-14.370) second.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PACKS_DIR = path.join(ROOT, "packs");
export const SRC_DIR = path.join(ROOT, "src");
export const PACKS = (() => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
  return manifest.packs.map(p => ({ name: p.name, path: path.join(ROOT, p.path) }));
})();

export function loadClassicLevel() {
  const candidates = [
    path.join(ROOT, "package.json"),
    path.join(ROOT, "..", "FoundryVTT-Node-14.370", "package.json")
  ];
  for ( const base of candidates ) {
    try {
      return createRequire(base)("classic-level").ClassicLevel;
    } catch {
      // try the next location
    }
  }
  throw new Error("classic-level not found. Run `npm install classic-level` in the repo, or keep a Foundry install "
    + "at ../FoundryVTT-Node-14.370.");
}

/** A file-system-safe name: keeps spaces and most punctuation, replaces path separators and reserved characters. */
export function safeName(name) {
  return name.replace(/[/\\]/g, "-").replace(/[<>:"|?*]/g, "").replace(/\s+/g, " ").trim();
}

/** Stable JSON: keys in a fixed order so the files diff cleanly. */
export function stableJSON(value) {
  const sort = v => {
    if ( Array.isArray(v) ) return v.map(sort);
    if ( v && (typeof v === "object") ) return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])]));
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

/** Remove every file below `dir` (only inside this repo's src folder). */
export function clearDir(dir) {
  if ( !path.resolve(dir).startsWith(SRC_DIR + path.sep) ) throw new Error(`Refusing to clear ${dir}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
