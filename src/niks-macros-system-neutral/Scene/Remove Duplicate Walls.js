// Remove Duplicate Walls - Foundry V14 (GM only)
// Finds walls with exactly the same coordinates (optionally also reversed) and removes the extras.
// Which wall stays:
// - A door always wins over a plain wall at the same spot (a plain wall under a door would block the open door).
// - Exact copies (same settings) are removed.
// - Overlapping walls with different settings (e.g. two doors, or different sight/light/sound) are NOT touched;
//   they are listed in the report so you can check them yourself.
// Dry Run is on by default, and a JSON backup of the affected walls can be downloaded.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can clean up walls.");

const opts = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Remove Duplicate Walls", icon: "fa-solid fa-block-brick" },
  position: { width: 460 },
  content: `
    <div class="form-group">
      <label>Scope</label>
      <div class="form-fields">
        <select name="scope">
          <option value="all">All scenes in the world</option>
          <option value="current">Only the scene being viewed</option>
        </select>
      </div>
    </div>
    <label class="checkbox"><input type="checkbox" name="dryRun" checked> Dry run (only report, delete nothing)</label>
    <label class="checkbox"><input type="checkbox" name="treatReversed" checked>
      Treat reversed walls (A→B and B→A) as duplicates</label>
    <label class="checkbox"><input type="checkbox" name="exportJSON" checked>
      Download a JSON backup of the walls that are (or would be) deleted</label>`,
  rejectClose: false,
  ok: {
    icon: "fa-solid fa-play",
    label: "Run",
    callback: (_event, button) => {
      const f = button.form.elements;
      return { scope: f.scope.value, dryRun: f.dryRun.checked, treatReversed: f.treatReversed.checked,
        exportJSON: f.exportJSON.checked };
    }
  }
});
if ( !opts ) return;

const scenes = opts.scope === "current" ? [canvas.scene].filter(Boolean) : game.scenes.contents;
if ( !scenes.length ) return ui.notifications.warn("There is no scene to scan.");

const coordsKey = c => {
  const fwd = c.join(",");
  if ( !opts.treatReversed ) return fwd;
  const rev = [c[2], c[3], c[0], c[1]].join(",");
  return fwd < rev ? fwd : rev;
};
// Everything except id, coordinates and stats: two walls with the same signature behave identically.
const signature = w => {
  const { _id, c, _stats, ...rest } = w.toObject();
  return JSON.stringify(rest);
};

const report = [];
const backup = [];
let totalDeleted = 0;
let totalFound = 0;
let totalConflicts = 0;

for ( const scene of scenes ) {
  const groups = new Map();
  for ( const w of scene.walls ) {
    if ( w.c?.length !== 4 ) continue;
    const key = coordsKey(w.c);
    if ( !groups.has(key) ) groups.set(key, []);
    groups.get(key).push(w);
  }

  const toDelete = [];
  let conflicts = 0;
  for ( const walls of groups.values() ) {
    if ( walls.length < 2 ) continue;
    const keeper = walls.find(w => w.door) ?? walls[0];
    const keeperSig = signature(keeper);
    for ( const w of walls ) {
      if ( w === keeper ) continue;
      if ( (signature(w) === keeperSig) || (keeper.door && !w.door) ) toDelete.push(w);
      else conflicts++;
    }
  }

  totalFound += toDelete.length;
  totalConflicts += conflicts;
  if ( toDelete.length && opts.exportJSON ) {
    backup.push({ sceneId: scene.id, sceneName: scene.name, walls: toDelete.map(w => w.toObject()) });
  }

  let deleted = 0;
  if ( toDelete.length && !opts.dryRun ) {
    try {
      deleted = (await scene.deleteEmbeddedDocuments("Wall", toDelete.map(w => w.id))).length;
    } catch ( err ) {
      console.error(`Remove Duplicate Walls | ${scene.name}`, err);
      ui.notifications.error(`Deleting walls in "${scene.name}" failed. See the console (F12).`);
    }
  }
  totalDeleted += deleted;
  if ( toDelete.length || conflicts ) {
    report.push({ scene: scene.name, walls: scene.walls.size, duplicates: toDelete.length, deleted,
      "different settings (kept)": conflicts });
  }
}

if ( backup.length ) {
  foundry.utils.saveDataToFile(
    JSON.stringify({ date: new Date().toISOString(), world: game.world.id, dryRun: opts.dryRun, scenes: backup },
      null, 2),
    "application/json",
    `wall-duplicates-backup-${Date.now()}.json`
  );
}

console.groupCollapsed("Remove Duplicate Walls | Report");
console.table(report);
console.groupEnd();

const conflictNote = totalConflicts
  ? ` ${totalConflicts} overlapping wall(s) with different settings were kept (see console, F12).` : "";
if ( opts.dryRun ) {
  ui.notifications.info(`Dry run: ${totalFound} duplicate wall(s) would be deleted in ${scenes.length} scene(s).`
    + conflictNote, { permanent: !!totalConflicts });
} else {
  ui.notifications.info(`Deleted ${totalDeleted} duplicate wall(s) in ${scenes.length} scene(s).${conflictNote}`,
    { permanent: !!totalConflicts });
}
