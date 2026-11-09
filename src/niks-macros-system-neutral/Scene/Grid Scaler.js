/**
 * Grid Scaler - Foundry V14 (GM only)
 * Changes the grid size (pixels per square) of the scene you are viewing and moves everything with it.
 * 1. Makes a backup copy named "[Scene] ([old] px)".
 * 2. Scales scene size, grid size and offsets; token positions in the same update (avoids snapping).
 * 3. Moves walls, lights, sounds, tiles, drawings, notes and regions (all region shape types).
 * Light and sound radii are distances (ft, m…), not pixels, so they stay as they are.
 */

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can scale a scene.");
const scene = canvas.scene;
if ( !scene ) return ui.notifications.warn("There is no scene to scale.");

const DEFAULT_TARGET_PIXEL_SIZE = 100;
const oldGridSize = scene.grid.size;

const targetSize = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Grid Scaler", icon: "fa-solid fa-expand" },
  content: `
    <p>Scale <strong>${foundry.utils.escapeHTML(scene.name)}</strong> (currently ${oldGridSize} px per grid square)
      and everything on it?</p>
    <p class="hint">A backup copy of the scene is created first.</p>
    <div class="form-group">
      <label>Target grid size (px)</label>
      <div class="form-fields">
        <input type="number" name="gridSize" value="${DEFAULT_TARGET_PIXEL_SIZE}" min="${CONST.GRID_MIN_SIZE}" step="1" autofocus>
      </div>
    </div>`,
  ok: {
    label: "Scale Scene",
    icon: "fa-solid fa-expand",
    callback: (_event, button) => button.form.elements.gridSize.valueAsNumber
  },
  rejectClose: false
});
if ( !Number.isFinite(targetSize) || (targetSize <= 0) ) return;
if ( Math.round(targetSize) === Math.round(oldGridSize) ) {
  return ui.notifications.info(`The grid is already ${oldGridSize} px.`);
}

const factor = Math.round(targetSize) / oldGridSize;
const round = v => Math.round(v * factor);

// Region shapes: scale every pixel value, including nested ones (emanation base, polygon origin).
// Grid shapes store grid offsets (rows/columns), which do not change.
const PIXEL_KEYS = new Set(["x", "y", "width", "height", "radius", "radiusX", "radiusY", "length",
  "innerWidth", "outerWidth"]);
function scaleShape(shape) {
  if ( shape.type === "grid" ) return shape;
  for ( const [key, value] of Object.entries(shape) ) {
    if ( PIXEL_KEYS.has(key) && Number.isFinite(value) ) shape[key] = round(value);
    else if ( (key === "points") && Array.isArray(value) ) shape[key] = value.map(round);
    else if ( (key === "origin" || key === "base") && value && (typeof value === "object") ) scaleShape(value);
  }
  return shape;
}

try {
  ui.notifications.info(`Creating backup: ${scene.name} (${Math.round(oldGridSize)} px)`);
  await scene.clone({ name: `${scene.name} (${Math.round(oldGridSize)} px)` }, { save: true });

  const position = d => ({ _id: d.id, x: round(d.x), y: round(d.y) });
  const updates = {
    Wall: scene.walls.map(w => ({ _id: w.id, c: w.c.map(round) })),
    AmbientLight: scene.lights.map(position),
    AmbientSound: scene.sounds.map(position),
    Tile: scene.tiles.map(t => ({ ...position(t), width: round(t.width), height: round(t.height) })),
    Drawing: scene.drawings.map(d => {
      const shape = d.shape.toObject();
      for ( const key of ["width", "height", "radius"] ) if ( Number.isFinite(shape[key]) ) shape[key] = round(shape[key]);
      if ( Array.isArray(shape.points) ) shape.points = shape.points.map(round);
      return { ...position(d), shape, fontSize: Math.max(8, round(d.fontSize)) };
    }),
    Note: scene.notes.map(n => ({ ...position(n), iconSize: Math.max(32, round(n.iconSize || 40)) })),
    Region: scene.regions.map(r => ({ _id: r.id, shapes: r.toObject().shapes.map(scaleShape) }))
  };

  // Scene size, grid and tokens in one update, so tokens are valid for the new grid immediately.
  await scene.update({
    width: round(scene.width),
    height: round(scene.height),
    "grid.size": Math.round(targetSize),
    "grid.offsetX": round(scene.grid.offsetX ?? 0),
    "grid.offsetY": round(scene.grid.offsetY ?? 0),
    tokens: scene.tokens.map(position)
  });

  for ( const [documentName, data] of Object.entries(updates) ) {
    if ( data.length ) await scene.updateEmbeddedDocuments(documentName, data);
  }

  if ( canvas.scene === scene ) await canvas.animatePan({ x: scene.width / 2, y: scene.height / 2, scale: 0.2 });
  ui.notifications.info(`Scene scaled from ${oldGridSize} px to ${Math.round(targetSize)} px.`);
} catch ( err ) {
  console.error("Grid Scaler |", err);
  ui.notifications.error(`Scaling failed: ${err.message}. The backup copy is untouched. See the console (F12).`);
}
