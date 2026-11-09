// Lock / Unlock Drawings & Tiles - Foundry V14
// Locks or unlocks every drawing and tile on the scene you are viewing. GM only.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can lock or unlock drawings and tiles.");
const scene = canvas.scene;
if ( !scene ) return ui.notifications.warn("There is no scene to change.");

const count = (collection) => `${collection.size} (${collection.filter(d => d.locked).length} locked)`;
const action = await foundry.applications.api.DialogV2.wait({
  window: { title: "Lock / Unlock Drawings & Tiles", icon: "fa-solid fa-lock" },
  position: { width: 400 },
  content: `<p>Drawings: <strong>${count(scene.drawings)}</strong><br>Tiles: <strong>${count(scene.tiles)}</strong></p>
    <p class="hint">Applies to every drawing and tile on ${foundry.utils.escapeHTML(scene.name)}.</p>`,
  buttons: [
    { action: "lock", label: "Lock All", icon: "fa-solid fa-lock", default: true },
    { action: "unlock", label: "Unlock All", icon: "fa-solid fa-unlock" }
  ],
  rejectClose: false
});
if ( !action ) return;

const locked = action === "lock";
const changes = collection => collection.filter(d => d.locked !== locked).map(d => ({ _id: d.id, locked }));
const drawings = changes(scene.drawings);
const tiles = changes(scene.tiles);
if ( drawings.length ) await scene.updateEmbeddedDocuments("Drawing", drawings);
if ( tiles.length ) await scene.updateEmbeddedDocuments("Tile", tiles);

const word = locked ? "Locked" : "Unlocked";
if ( !drawings.length && !tiles.length ) ui.notifications.info(`All drawings and tiles are already ${word.toLowerCase()}.`);
else ui.notifications.info(`${word} ${drawings.length} drawing(s) and ${tiles.length} tile(s).`);
