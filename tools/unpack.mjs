// Unpack the LevelDB compendium packs into readable source files:
//   src/<pack>/_folders.json                  the pack's folders
//   src/<pack>/<Folder>/<Macro name>.js       the macro's script
//   src/<pack>/<Folder>/<Macro name>.json     the rest of the macro document (id, name, icon, folder, …)
// Run with Foundry closed:  node tools/unpack.mjs
import fs from "node:fs";
import path from "node:path";
import { PACKS, SRC_DIR, clearDir, loadClassicLevel, safeName, stableJSON } from "./lib.mjs";

const ClassicLevel = loadClassicLevel();

for ( const pack of PACKS ) {
  const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
  const folders = [];
  const macros = [];
  for await ( const [key, doc] of db.iterator() ) {
    if ( key.startsWith("!folders!") ) folders.push(doc);
    else if ( key.startsWith("!macros!") ) macros.push(doc);
    else throw new Error(`${pack.name}: unexpected document ${key}`);
  }
  await db.close();

  const outDir = path.join(SRC_DIR, pack.name);
  clearDir(outDir);
  folders.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(outDir, "_folders.json"), stableJSON(folders));

  const folderNames = Object.fromEntries(folders.map(f => [f._id, safeName(f.name)]));
  const used = new Set();
  for ( const macro of macros.sort((a, b) => a.name.localeCompare(b.name)) ) {
    const dir = path.join(outDir, folderNames[macro.folder] ?? "_no-folder");
    let base = safeName(macro.name);
    if ( used.has(path.join(dir, base)) ) base = `${base} (${macro._id})`;
    used.add(path.join(dir, base));
    fs.mkdirSync(dir, { recursive: true });
    const { command, ...rest } = macro;
    fs.writeFileSync(path.join(dir, `${base}.js`), command); // byte for byte
    fs.writeFileSync(path.join(dir, `${base}.json`), stableJSON(rest));
  }
  console.log(`${pack.name}: ${folders.length} folders, ${macros.length} macros → src/${pack.name}`);
}
