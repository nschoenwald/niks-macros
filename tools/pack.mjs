// Build the LevelDB compendium packs from the source files in src/ (the reverse of unpack.mjs).
// Every pack is rebuilt from scratch, so documents removed from src/ disappear from the pack.
// Run with Foundry closed:  node tools/pack.mjs            write packs/
//                           node tools/pack.mjs --check    only report whether packs/ matches src/
//                           node tools/pack.mjs --force    rewrite packs/ even when nothing changed
import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { PACKS, SRC_DIR, loadClassicLevel, stableJSON } from "./lib.mjs";

const ClassicLevel = loadClassicLevel();
const checkOnly = process.argv.includes("--check");
const force = process.argv.includes("--force");

function readSource(packName) {
  const dir = path.join(SRC_DIR, packName);
  const folders = JSON.parse(fs.readFileSync(path.join(dir, "_folders.json"), "utf8"));
  const macros = [];
  const walk = d => {
    for ( const entry of fs.readdirSync(d, { withFileTypes: true }) ) {
      const file = path.join(d, entry.name);
      if ( entry.isDirectory() ) walk(file);
      else if ( entry.name.endsWith(".json") && (entry.name !== "_folders.json") ) {
        const doc = JSON.parse(fs.readFileSync(file, "utf8"));
        const script = file.replace(/\.json$/, ".js");
        if ( !fs.existsSync(script) ) throw new Error(`Missing script for ${file}`);
        doc.command = fs.readFileSync(script, "utf8");
        macros.push(doc);
      }
    }
  };
  walk(dir);
  const ids = new Set();
  for ( const doc of [...folders, ...macros] ) {
    if ( !/^[A-Za-z0-9]{16}$/.test(doc._id) ) throw new Error(`${packName}: invalid _id "${doc._id}" (${doc.name})`);
    if ( ids.has(doc._id) ) throw new Error(`${packName}: duplicate _id ${doc._id}`);
    ids.add(doc._id);
  }
  const folderIds = new Set(folders.map(f => f._id));
  for ( const m of macros ) {
    if ( m.folder && !folderIds.has(m.folder) ) throw new Error(`${packName}: "${m.name}" points to a missing folder`);
  }
  return new Map([
    ...folders.map(f => [`!folders!${f._id}`, f]),
    ...macros.map(m => [`!macros!${m._id}`, m])
  ]);
}

async function readPack(packPath) {
  const db = new ClassicLevel(packPath, { valueEncoding: "json" });
  const docs = new Map();
  for await ( const [key, doc] of db.iterator() ) docs.set(key, doc);
  await db.close();
  return docs;
}

const normalise = doc => stableJSON(doc);

let differences = 0;
for ( const pack of PACKS ) {
  const source = readSource(pack.name);
  const current = await readPack(pack.path);
  const changed = [...new Set([...source.keys(), ...current.keys()])].filter(k => {
    const a = source.get(k);
    const b = current.get(k);
    return !a || !b || (normalise(a) !== normalise(b));
  });
  differences += changed.length;

  if ( checkOnly ) {
    for ( const k of changed ) console.log(`${pack.name}: differs ${k} (${(source.get(k) ?? current.get(k)).name})`);
    continue;
  }
  if ( !changed.length && !force ) {
    console.log(`${pack.name}: already up to date`);
    continue;
  }

  const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
  await db.open();
  await db.clear();
  await db.batch([...source].map(([key, value]) => ({ type: "put", key, value })));
  await db.compactRange("\x00", "\xff");
  await db.close();
  console.log(`${pack.name}: ${source.size} documents written (${changed.length} changed)`);
}

if ( checkOnly ) {
  console.log(differences ? `${differences} difference(s) between src/ and packs/` : "packs/ matches src/");
  process.exitCode = differences ? 1 : 0;
}
