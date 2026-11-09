// Copy Token Settings to NPCs - Foundry V14
// Select one token as the template, then run. Copies its name and bar display, bars, disposition, vision and
// detection modes (and optionally its image scale) to the tokens without a player owner, on this scene or all scenes.
// GM only.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can change all NPC tokens.");
if ( canvas.tokens.controlled.length !== 1 ) return ui.notifications.warn("Select exactly one token as the template.");

const esc = foundry.utils.escapeHTML;
const source = canvas.tokens.controlled[0].document;
const data = source.toObject();

const choice = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Copy Token Settings to NPCs", icon: "fa-solid fa-clone" },
  position: { width: 440 },
  content: `
    <p>Template: <strong>${esc(source.name)}</strong></p>
    <div class="form-group">
      <label>Scenes</label>
      <div class="form-fields">
        <select name="scope">
          <option value="current">This scene</option>
          <option value="all">All scenes</option>
        </select>
      </div>
    </div>
    <label class="checkbox"><input type="checkbox" name="scale"> Also copy the image scale</label>
    <p class="hint">Copies name and bar display, bars, disposition, vision and detection modes to every token without a
      player owner.</p>`,
  rejectClose: false,
  ok: {
    label: "Preview",
    icon: "fa-solid fa-eye",
    callback: (_event, button) => ({ scope: button.form.elements.scope.value, scale: button.form.elements.scale.checked })
  }
});
if ( !choice ) return;

// A fresh object per token: the replacement wrapper must not be shared between updates.
const makeSettings = () => ({
  displayName: data.displayName,
  displayBars: data.displayBars,
  bar1: data.bar1,
  bar2: data.bar2,
  disposition: data.disposition,
  sight: data.sight,
  // Exactly the template's modes, not merged with the target's.
  detectionModes: _replace(foundry.utils.deepClone(data.detectionModes)),
  appendNumber: data.appendNumber,
  prependAdjective: data.prependAdjective,
  ...(choice.scale ? { "texture.scaleX": data.texture.scaleX, "texture.scaleY": data.texture.scaleY } : {})
});

const scenes = choice.scope === "all" ? game.scenes.contents : [canvas.scene];
const plan = scenes.map(scene => ({
  scene,
  ids: scene.tokens.filter(t => t.actor && !t.actor.hasPlayerOwner && (t !== source)).map(t => t.id)
})).filter(p => p.ids.length);
const total = plan.reduce((n, p) => n + p.ids.length, 0);
if ( !total ) return ui.notifications.info("No other NPC tokens found.");

const ok = await foundry.applications.api.DialogV2.confirm({
  window: { title: "Copy Token Settings to NPCs", icon: "fa-solid fa-clone" },
  content: `<p>Overwrite the settings of <strong>${total}</strong> NPC token(s)?</p>
    <ul>${plan.map(p => `<li>${esc(p.scene.name)}: ${p.ids.length}</li>`).join("")}</ul>`
});
if ( !ok ) return;

for ( const { scene, ids } of plan ) {
  await scene.updateEmbeddedDocuments("Token", ids.map(_id => ({ _id, ...makeSettings() })));
}
ui.notifications.info(`Updated ${total} NPC token(s) in ${plan.length} scene(s).`);
