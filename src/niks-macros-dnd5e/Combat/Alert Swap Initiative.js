// Alert: Swap Initiative - Foundry V14 + D&D 5e 6.x
// For the Alert feat (2024): swaps the initiative of a player character who has Alert with another player
// character in the current combat. Both must have rolled initiative. Only player characters are offered.

const combat = game.combat;
if ( !combat ) return ui.notifications.warn("There is no active combat.");

const esc = foundry.utils.escapeHTML;
const pcs = combat.combatants.filter(c => c.actor?.type === "character");
const alert = pcs.filter(c => c.actor.itemTypes.feat.some(f => f.system.identifier === "alert"));
const others = pcs.filter(c => !alert.includes(c));
if ( !alert.length ) return ui.notifications.warn("No player character with the Alert feat is in this combat.");
if ( !others.length ) return ui.notifications.warn("There is no other player character to swap with.");

const init = c => (Number.isFinite(c.initiative) ? Math.round(c.initiative * 100) / 100 : "—");
const card = (c, group, checked) => `
  <label class="nm-alert-card">
    <input type="radio" name="${group}" value="${c.id}" ${checked ? "checked" : ""}>
    <img src="${esc(c.img || c.actor.img)}" alt="">
    <span class="nm-alert-name">${esc(c.name)}</span>
    <span class="nm-alert-init">Initiative ${init(c)}</span>
  </label>`;

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-alert { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .nm-alert fieldset { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin: 0; }
    .nm-alert-card { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; width: 6rem;
      padding: 0.375rem; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; text-align: center; }
    .nm-alert-card:has(input:checked) { border-color: var(--color-border-highlight); box-shadow: 0 0 4px var(--color-border-highlight); }
    .nm-alert-card img { width: 3.5rem; height: 3.5rem; object-fit: cover; object-position: top; border: none; border-radius: 4px; }
    .nm-alert-name { font-weight: bold; line-height: 1.1; word-break: break-word; }
    .nm-alert-init { font-size: var(--font-size-12); color: var(--color-text-secondary); }
  </style>
  <div class="nm-alert">
    <fieldset><legend>Character with Alert</legend>${alert.map((c, i) => card(c, "a", i === 0)).join("")}</fieldset>
    <fieldset><legend>Swap with</legend>${others.map((c, i) => card(c, "b", i === 0)).join("")}</fieldset>
  </div>`;

const pick = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Alert: Swap Initiative", icon: "fa-solid fa-arrow-right-arrow-left" },
  position: { width: 560 },
  content,
  rejectClose: false,
  ok: {
    label: "Swap",
    icon: "fa-solid fa-arrow-right-arrow-left",
    callback: (_event, button) => ({ a: button.form.elements.a.value, b: button.form.elements.b.value })
  }
});
if ( !pick?.a || !pick?.b ) return;

const a = combat.combatants.get(pick.a);
const b = combat.combatants.get(pick.b);
if ( !Number.isFinite(a?.initiative) || !Number.isFinite(b?.initiative) ) {
  return ui.notifications.warn("Both characters must have rolled initiative.");
}

await combat.updateEmbeddedDocuments("Combatant", [
  { _id: a.id, initiative: b.initiative },
  { _id: b.id, initiative: a.initiative }
]);
await ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor: a.actor }),
  content: `<h3><i class="fa-solid fa-arrow-right-arrow-left"></i> Alert: Initiative Swap</h3>
    <p><strong>${esc(a.name)}</strong> is now at ${init(b)}, <strong>${esc(b.name)}</strong> at ${init(a)}.</p>`
});
