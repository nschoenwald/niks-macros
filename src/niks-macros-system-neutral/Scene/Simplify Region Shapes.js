// Simplify Region Shapes - Foundry V14
// Rebuilds a region from the fewest shapes that cover the same area: overlapping shapes become one polygon, holes are
// cut into it, and shapes or holes that change nothing are dropped.
// Who: GM only. Works on the selected regions or on every region of the scene being viewed.
// Options: keep shapes that touch no other shape as they are (so a lone circle stays an editable circle), remove points
// that lie (almost) on a straight line, and drop tiny slivers and holes. Each region keeps its old shapes in a flag, and
// "Restore" puts them back.
// Wall restrictions are not baked in: the new shapes are built from the unrestricted shapes, so a region that is
// restricted by walls keeps that setting and is cut by the walls as before.
// Not automated: merged shapes become plain polygons, so circles, rectangles, grid shapes etc. that were merged lose
// their own editing handles.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can simplify region shapes.");
if ( !canvas.scene ) return ui.notifications.warn("There is no scene being viewed.");

const MACRO = "Simplify Region Shapes";
const FLAG = "nmShapesBackup";
const S = CONST.CLIPPER_SCALING_FACTOR;
const { DialogV2 } = foundry.applications.api;
const { Clipper, ClipType, PolyType, PolyFillType, PolyTree } = ClipperLib;

const selectedCount = canvas.regions?.controlled.length ?? 0;
const sceneCount = canvas.scene.regions.size;
if ( !sceneCount ) return ui.notifications.warn("This scene has no regions.");

const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-simplify-regions .form-fields input[type="number"] { flex: 0 0 5rem; }
    .nm-simplify-regions .nm-unit { flex: 1; color: var(--color-text-secondary); }
  </style>
  <div class="nm-simplify-regions">
    <div class="form-group">
      <label>Regions</label>
      <div class="form-fields">
        <select name="scope">
          <option value="selected" ${selectedCount ? "selected" : ""}>Selected regions (${selectedCount})</option>
          <option value="scene" ${selectedCount ? "" : "selected"}>All regions in this scene (${sceneCount})</option>
        </select>
      </div>
    </div>
    <label class="checkbox"><input type="checkbox" name="keepSeparate" checked>
      Keep shapes that touch no other shape as they are</label>
    <p class="hint">They stay circles, rectangles etc. and can still be edited as such. Only overlapping or touching
      shapes are merged into polygons.</p>
    <div class="form-group">
      <label>Straighten edges</label>
      <div class="form-fields">
        <input type="number" name="tolerance" value="0.2" min="0" step="0.1"><span class="nm-unit">px</span>
      </div>
      <p class="hint">Removes points that are less than this far off a straight line. Higher values also flatten curves
        (0.5 px already turns small circles visibly angular). 0 keeps every point.</p>
    </div>
    <div class="form-group">
      <label>Drop slivers below</label>
      <div class="form-fields">
        <input type="number" name="minArea" value="2" min="0" step="1"><span class="nm-unit">% of a grid space</span>
      </div>
      <p class="hint">Pieces and holes smaller than this are removed (a removed hole is filled in).</p>
    </div>
    <p class="hint">The old shapes are stored on each region. Choose Restore later to put them back.</p>
  </div>`;

const readForm = (button, mode) => {
  const f = button.form.elements;
  return {
    mode,
    scope: f.scope.value,
    keepSeparate: f.keepSeparate.checked,
    tolerance: Math.max(0, Number(f.tolerance.value) || 0),
    minArea: Math.max(0, Number(f.minArea.value) || 0)
  };
};

const opts = await DialogV2.wait({
  window: { title: MACRO, icon: "fa-solid fa-draw-polygon" },
  position: { width: 480 },
  content,
  rejectClose: false,
  buttons: [
    { action: "simplify", label: "Simplify", icon: "fa-solid fa-wand-magic-sparkles", default: true,
      callback: (_event, button) => readForm(button, "simplify") },
    { action: "restore", label: "Restore", icon: "fa-solid fa-clock-rotate-left",
      callback: (_event, button) => readForm(button, "restore") },
    { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
  ]
});
if ( !opts?.mode ) return;

let regions;
if ( opts.scope === "selected" ) {
  regions = (canvas.regions?.controlled ?? []).map(r => r.document);
  if ( !regions.length ) return ui.notifications.warn("Select at least one region.");
}
else regions = canvas.scene.regions.contents;

/* -------------------------------------------- */
/*  Restore                                     */
/* -------------------------------------------- */

if ( opts.mode === "restore" ) {
  const withBackup = regions.filter(r => Array.isArray(r.getFlag("world", FLAG)?.shapes));
  if ( !withBackup.length ) return ui.notifications.warn("None of these regions has stored shapes to restore.");
  const proceed = await DialogV2.confirm({
    window: { title: MACRO, icon: "fa-solid fa-clock-rotate-left" },
    position: { width: 420 },
    content: `<p>Restore the shapes from before the last simplification on ${withBackup.length} region(s)?</p>
      <p class="hint">Changes made to these regions since then are replaced.</p>`,
    rejectClose: false,
    modal: true
  });
  if ( !proceed ) return;
  try {
    await canvas.scene.updateEmbeddedDocuments("Region", withBackup.map(r => ({
      _id: r.id,
      shapes: r.getFlag("world", FLAG).shapes,
      [`flags.world.${FLAG}`]: _del
    })));
    ui.notifications.info(`Restored the shapes of ${withBackup.length} region(s).`);
  } catch ( err ) {
    console.error(`${MACRO} |`, err);
    ui.notifications.error("Restoring the region shapes failed. See the console (F12).");
  }
  return;
}

/* -------------------------------------------- */
/*  Geometry helpers                            */
/* -------------------------------------------- */

const copyPaths = paths => paths.map(path => path.map(p => ({ X: p.X, Y: p.Y })));

// Clipper paths of a shape without the region's wall restriction (winding 1, holes of the shape itself included).
const pathsOf = shape => copyPaths(shape.clipperPaths);

const runClipper = (clipType, subject, clip, solution = []) => {
  const clipper = new Clipper();
  clipper.AddPaths(subject, PolyType.ptSubject, true);
  if ( clip ) clipper.AddPaths(clip, PolyType.ptClip, true);
  clipper.Execute(clipType, solution, PolyFillType.pftNonZero, PolyFillType.pftNonZero);
  return solution;
};

// Number of filled outlines (any depth) in a set of paths.
const countOutlines = paths => {
  const tree = runClipper(ClipType.ctUnion, paths, null, new PolyTree());
  let n = 0;
  const walk = node => {
    for ( const child of node.Childs() ) {
      if ( !child.IsHole() ) n++;
      walk(child);
    }
  };
  walk(tree);
  return n;
};

// Same evaluation as RegionDocument#_createClipperPolyTree: shapes in order, runs of holes subtract from everything
// before them, runs of non-holes are added. Leading holes do nothing.
const mergeShapes = shapes => {
  let subject = null;
  let i = 0;
  while ( i < shapes.length ) {
    const isHole = shapes[i].hole;
    const paths = [];
    do paths.push(...pathsOf(shapes[i++]));
    while ( (i < shapes.length) && (shapes[i].hole === isHole) );
    if ( subject === null ) {
      if ( !isHole ) subject = runClipper(ClipType.ctUnion, paths);
    }
    else subject = runClipper(isHole ? ClipType.ctDifference : ClipType.ctUnion, subject, paths);
  }
  return runClipper(ClipType.ctUnion, subject ?? [], null, new PolyTree());
};

const pathArea = path => Math.abs(Clipper.Area(path)) / (S * S);

// Area covered by a polygon tree (outlines minus holes, islands inside holes added again).
const treeArea = tree => {
  let area = 0;
  const walk = node => {
    for ( const child of node.Childs() ) {
      area += (child.IsHole() ? -1 : 1) * pathArea(child.Contour());
      walk(child);
    }
  };
  walk(tree);
  return area;
};

const minAreaPx = (opts.minArea / 100) * (canvas.grid.size ** 2);

// Turn a polygon tree into polygon shapes: all outlines first, then the holes cut into them, then islands inside
// those holes, and so on (each hole only subtracts from the shapes before it).
const treeToShapes = tree => {
  const nodes = [];
  let area = 0;
  const walk = (node, depth) => {
    for ( const child of node.Childs() ) {
      let path = child.Contour();
      if ( opts.tolerance > 0 ) path = Clipper.CleanPolygon(path, opts.tolerance * S);
      const a = path.length >= 3 ? pathArea(path) : 0;
      // Dropping an outline removes everything inside it; dropping a hole fills it, so its islands are redundant
      if ( (a === 0) || (a < minAreaPx) ) continue;
      const hole = child.IsHole();
      area += (hole ? -1 : 1) * a;
      nodes.push({ depth, hole, path });
      walk(child, depth + 1);
    }
  };
  walk(tree, 0);
  nodes.sort((a, b) => a.depth - b.depth);
  const shapes = nodes.map(({ hole, path }) => ({
    type: "polygon",
    hole,
    points: path.flatMap(p => [p.X / S, p.Y / S]),
    origin: null
  }));
  return { shapes, area, points: nodes.reduce((n, { path }) => n + path.length, 0) };
};

/* -------------------------------------------- */
/*  Plan                                        */
/* -------------------------------------------- */

const round = n => Math.round(n * 100) / 100;
const report = [];
const updates = [];
let shapesBefore = 0;
let shapesAfter = 0;
let maxAreaChange = 0;

for ( const region of regions ) {
  const shapes = region.shapes;
  const row = { region: region.name, before: shapes.length, after: shapes.length, "area before": 0,
    "area after": 0, "area change %": 0, result: "" };
  report.push(row);
  try {
    if ( shapes.length < 2 && !shapes.some(s => s.hole) ) {
      row.result = "already simple";
      continue;
    }

    // Shapes that touch no other shape (including holes) don't depend on the order and can stay as they are.
    const keep = new Set();
    if ( opts.keepSeparate ) {
      const paths = shapes.map(pathsOf);
      const outlines = paths.map(countOutlines);
      const bounds = shapes.map(s => s.polygonTree.bounds.clone().pad(1));
      shapes.forEach((shape, i) => {
        if ( shape.hole ) return;
        const alone = shapes.every((_other, j) => (i === j) || !bounds[i].intersects(bounds[j])
          || (countOutlines([...paths[i], ...paths[j]]) === outlines[i] + outlines[j]));
        if ( alone ) keep.add(i);
      });
    }

    const kept = shapes.filter((_s, i) => keep.has(i));
    const toMerge = shapes.filter((_s, i) => !keep.has(i));
    const tree = mergeShapes(toMerge);
    const merged = treeToShapes(tree);
    const areaBefore = treeArea(tree) + kept.reduce((a, s) => a + s.polygonTree.area, 0);
    const areaAfter = merged.area + kept.reduce((a, s) => a + s.polygonTree.area, 0);
    const newShapes = [...merged.shapes, ...kept.map(s => s.toObject())];

    row["area before"] = round(areaBefore);
    row["area after"] = round(areaAfter);
    row.after = newShapes.length;
    const change = areaBefore ? (Math.abs(areaAfter - areaBefore) / areaBefore) * 100 : 0;
    row["area change %"] = round(change);

    if ( !newShapes.length ) {
      row.after = shapes.length;
      row.result = "skipped: would be empty";
      continue;
    }
    if ( newShapes.length >= shapes.length ) {
      row.after = shapes.length;
      row.result = "already simple";
      continue;
    }

    row.result = `${shapes.length} → ${newShapes.length} shapes, ${merged.points} polygon points`;
    shapesBefore += shapes.length;
    shapesAfter += newShapes.length;
    maxAreaChange = Math.max(maxAreaChange, change);
    updates.push({
      _id: region.id,
      shapes: newShapes,
      [`flags.world.${FLAG}`]: { date: new Date().toISOString(), shapes: region.toObject().shapes }
    });
  } catch ( err ) {
    console.error(`${MACRO} | ${region.name}`, err);
    row.result = "error (see console)";
  }
}

console.groupCollapsed(`${MACRO} | Report`);
console.table(report);
console.groupEnd();

if ( report.some(r => r.result.startsWith("error")) ) {
  ui.notifications.error("Some regions could not be simplified. See the console (F12).");
}
if ( !updates.length ) {
  return ui.notifications.info(`Nothing to simplify in ${regions.length} region(s).`);
}

const proceed = await DialogV2.confirm({
  window: { title: MACRO, icon: "fa-solid fa-draw-polygon" },
  position: { width: 440 },
  content: `<p>Simplify ${updates.length} of ${regions.length} region(s): ${shapesBefore} shapes become
    ${shapesAfter}.</p>
    <p class="hint">Largest area change: ${round(maxAreaChange)} %. Details are in the console (F12). The old shapes
    are stored on each region; run the macro again and choose Restore to undo.</p>`,
  rejectClose: false,
  modal: true
});
if ( !proceed ) return;

try {
  await canvas.scene.updateEmbeddedDocuments("Region", updates);
  ui.notifications.info(`Simplified ${updates.length} region(s): ${shapesBefore} shapes became ${shapesAfter}.`);
} catch ( err ) {
  console.error(`${MACRO} |`, err);
  ui.notifications.error("Simplifying the region shapes failed. See the console (F12).");
}
