// Scale NPC HP - Foundry V14 + D&D 5e 6.x
// Scales current and/or maximum HP of the selected NPCs by a percentage.
// The HP before the first scaling is remembered on each NPC, and every percentage is applied to that original:
// 150 % twice stays 150 %, and 100 % restores the original HP (and forgets it). Works for linked and unlinked tokens.
// The dialog stays open, so you can try several values.

const FLAG_SCOPE = "world";
const FLAG_KEY = "hpScaleBase";

const allSelected = canvas.tokens.controlled;
const actors = [...new Set(allSelected.map(t => t.actor).filter(a => a?.type === "npc"))];
if ( !actors.length ) return ui.notifications.warn("Select at least one NPC token.");

const presets = [50, 75, 100, 125, 150, 200];

async function scale(percent, doCurrent, doMax) {
  if ( !doCurrent && !doMax ) return ui.notifications.warn("Tick Current HP, Max HP or both.");
  const factor = percent / 100;
  let changed = 0;
  for ( const actor of actors ) {
    const src = actor._source.system.attributes.hp;
    const base = actor.getFlag(FLAG_SCOPE, FLAG_KEY) ?? { max: Number(src.max) || 1, value: Number(src.value) || 0 };
    const max = doMax ? Math.max(1, Math.round(base.max * factor)) : (Number(src.max) || 1);
    const value = Math.min(doCurrent ? Math.max(0, Math.round(base.value * factor)) : Number(src.value) || 0, max);
    const update = {
      "system.attributes.hp.max": max,
      "system.attributes.hp.value": value,
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: (percent === 100) && doMax && doCurrent ? _del : base
    };
    await actor.update(update);
    changed++;
  }
  ui.notifications.info(`HP set to ${percent} % of the original for ${changed} NPC(s).`);
}

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-hp-scale .presets { display: grid; grid-template-columns: repeat(${presets.length}, 1fr); gap: 0.25rem; }
    .nm-hp-scale .presets button { padding: 0 0.25rem; }
    .nm-hp-scale .affect { display: flex; gap: 1rem; }
  </style>
  <div class="nm-hp-scale">
    <p class="hint">${actors.length} NPC(s) selected${allSelected.length > actors.length
      ? ` (${allSelected.length - actors.length} non-NPC token(s) ignored)` : ""}.
      Percentages always apply to each NPC's HP before its first scaling.</p>
    <div class="form-group">
      <label>Percent</label>
      <div class="form-fields"><input type="number" name="percent" value="100" min="1" step="1"></div>
    </div>
    <div class="affect">
      <label class="checkbox"><input type="checkbox" name="doCurrent" checked> Current HP</label>
      <label class="checkbox"><input type="checkbox" name="doMax" checked> Max HP</label>
    </div>
    <div class="presets">
      ${presets.map(p => `<button type="button" data-preset="${p}">${p}%</button>`).join("")}
    </div>
  </div>`;

const read = form => ({
  percent: Number(form.elements.percent.value),
  doCurrent: form.elements.doCurrent.checked,
  doMax: form.elements.doMax.checked
});

const dialog = new foundry.applications.api.DialogV2({
  window: { title: "Scale NPC HP", icon: "fa-solid fa-heart-pulse" },
  position: { width: 460 },
  form: { closeOnSubmit: false },
  content,
  buttons: [
    { action: "apply", label: "Apply %", icon: "fa-solid fa-check", default: true,
      callback: async (_event, button) => {
        const { percent, doCurrent, doMax } = read(button.form);
        if ( !(percent > 0) ) return ui.notifications.warn("Enter a percentage greater than 0.");
        await scale(percent, doCurrent, doMax);
      } },
    { action: "close", label: "Close", icon: "fa-solid fa-xmark", type: "button", callback: (_e, _b, d) => d.close() }
  ]
});
await dialog.render({ force: true });

dialog.element.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", async () => {
  const form = dialog.element.querySelector("form");
  form.elements.percent.value = b.dataset.preset;
  const { doCurrent, doMax } = read(form);
  await scale(Number(b.dataset.preset), doCurrent, doMax);
}));
