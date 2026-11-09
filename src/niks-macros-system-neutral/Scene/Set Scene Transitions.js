// Set Scene Transitions - Foundry V14
// GM only.
// Sets the same transition effect and duration on every scene in the world.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can change scene transitions.");
const scenes = game.scenes.contents;
if ( !scenes.length ) return ui.notifications.warn("No scenes found in this world.");

const esc = foundry.utils.escapeHTML;
const options = [`<option value="">${esc(game.i18n.localize("COMMON.None"))}</option>`]
  .concat(Object.entries(CONFIG.Canvas.sceneTransitions ?? {})
    .map(([key, t]) => `<option value="${esc(key)}">${esc(game.i18n.localize(t.label ?? key))}</option>`))
  .join("");

const result = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Set Transition for All Scenes", icon: "fa-solid fa-film" },
  position: { width: 440 },
  content: `
    <div class="form-group">
      <label>Transition</label>
      <div class="form-fields"><select name="type">${options}</select></div>
    </div>
    <div class="form-group">
      <label>Duration (ms)</label>
      <div class="form-fields">
        <range-picker name="duration" min="500" max="10000" step="100" value="1500"></range-picker>
      </div>
      <p class="hint">Applies to all ${scenes.length} scenes. Foundry allows 500–10,000 ms.</p>
    </div>`,
  rejectClose: false,
  ok: {
    icon: "fa-solid fa-check",
    label: "Apply to All Scenes",
    callback: (_event, button) => ({
      type: button.form.elements.type.value || null,
      duration: Math.clamp(Number(button.form.elements.duration.value) || 1500, 500, 10000)
    })
  }
});
if ( !result ) return;

await Scene.implementation.updateDocuments(scenes.map(s => ({
  _id: s.id, "transition.type": result.type, "transition.duration": result.duration
})));

const label = result.type
  ? game.i18n.localize(CONFIG.Canvas.sceneTransitions[result.type]?.label ?? result.type)
  : game.i18n.localize("COMMON.None");
await ChatMessage.create({
  speaker: { alias: "Scene Transitions" },
  whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
  content: `<h3><i class="fa-solid fa-film"></i> Scene Transitions</h3>
    <p>${esc(label)}, ${result.duration} ms</p>
    <details><summary>${scenes.length} scenes</summary>
      <ul>${scenes.map(s => `<li>${esc(s.name)}</li>`).join("")}</ul>
    </details>`
});
ui.notifications.info(`Transition set on ${scenes.length} scenes.`);
