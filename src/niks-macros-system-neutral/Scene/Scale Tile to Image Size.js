// Scale Tile to Image Size - Foundry V14
// Resizes the selected tile to its image's real size times a factor (1 = original pixel size).

const tile = canvas.tiles.controlled[0]?.document;
if ( !tile ) return ui.notifications.warn("Select a tile.");
if ( !tile.texture.src ) return ui.notifications.warn("The selected tile has no image.");

const factor = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Scale Tile to Image Size", icon: "fa-solid fa-image" },
  position: { width: 380 },
  content: `
    <div class="form-group">
      <label>Factor</label>
      <div class="form-fields"><input type="number" name="factor" value="1" min="0.01" step="0.05" autofocus></div>
      <p class="hint">1 sets the tile to the image's own pixel size, 0.5 to half of it.</p>
    </div>`,
  rejectClose: false,
  ok: { label: "Apply", icon: "fa-solid fa-check", callback: (_event, button) => button.form.elements.factor.valueAsNumber }
});
if ( !(factor > 0) ) return;

const texture = await foundry.canvas.loadTexture(tile.texture.src);
if ( !texture ) return ui.notifications.error("The tile's image could not be loaded. See the console (F12).");
await tile.update({ width: Math.round(texture.width * factor), height: Math.round(texture.height * factor) });
ui.notifications.info(`Tile set to ${Math.round(texture.width * factor)} × ${Math.round(texture.height * factor)} px.`);
