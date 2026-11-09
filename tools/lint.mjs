// Lint the macro scripts in src/ with ESLint 9 and the nearest eslint.config.mjs (Nik's shared Foundry V14 config).
// Macro code runs as the body of an async function (top-level await and return), so each script is wrapped in
// `(async () => { … })();` in a temporary folder first. Line numbers in the output are shifted back to the source.
//   node tools/lint.mjs
import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, SRC_DIR } from "./lib.mjs";

const TMP = path.join(ROOT, "lint-tmp");
fs.rmSync(TMP, { recursive: true, force: true });

const files = [];
const walk = d => {
  for ( const e of fs.readdirSync(d, { withFileTypes: true }) ) {
    const f = path.join(d, e.name);
    if ( e.isDirectory() ) walk(f);
    else if ( e.name.endsWith(".js") ) files.push(f);
  }
};
walk(SRC_DIR);

for ( const file of files ) {
  const target = path.join(TMP, path.relative(SRC_DIR, file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `(async () => {\n${fs.readFileSync(file, "utf8")}\n})();\n`);
}

let status = 1;
try {
  const result = spawnSync("npx", ["-y", "eslint@9.15.0", "--no-warn-ignored", "lint-tmp"],
    { cwd: ROOT, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`
    .replaceAll(`${TMP}${path.sep}`, `src${path.sep}`)
    .replace(/^(\s+)(\d+):(\d+)/gm, (_m, space, line, col) => `${space}${Number(line) - 1}:${col}`);
  process.stdout.write(output || `No problems in ${files.length} macro(s).\n`);
  status = result.status ?? 1;
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
process.exitCode = status;
