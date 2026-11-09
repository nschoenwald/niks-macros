// XP Distribution - Foundry V14 + D&D 5e 6.x
// Awards XP to the chosen player characters: split evenly (rounded down) or the full amount to each.
// The amount can be a sum like 100+250+50. GM only; the award is posted to chat for everyone.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can award XP.");
const characters = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner)
  .sort((a, b) => a.name.localeCompare(b.name));
if ( !characters.length ) return ui.notifications.warn("There are no player characters to award XP to.");

const esc = foundry.utils.escapeHTML;
const evaluate = formula => {
  try { return Roll.create(formula || "0").evaluateSync().total; } catch { return null; }
};
const readForm = form => ({
  total: evaluate(form.elements.amount.value),
  split: form.elements.distribution.value === "split",
  ids: characters.filter(a => form.elements[`actor-${a.id}`]?.checked).map(a => a.id)
});
const share = ({ total, split, ids }) => (split ? Math.floor(total / ids.length) : total);

const content = `
  <div class="form-group">
    <label>XP</label>
    <div class="form-fields"><input type="text" name="amount" value="" placeholder="e.g. 100+250+50" autofocus></div>
  </div>
  <div class="form-group">
    <label>Distribution</label>
    <div class="form-fields">
      <select name="distribution">
        <option value="split">Split evenly (rounded down)</option>
        <option value="each">Full amount to each</option>
      </select>
    </div>
  </div>
  <fieldset>
    <legend>Characters</legend>
    ${characters.map(a => `<label class="checkbox"><input type="checkbox" name="actor-${a.id}" checked> ${esc(a.name)}</label>`).join("")}
  </fieldset>
  <p class="hint nm-xp-preview">Enter an amount.</p>`;

const result = await foundry.applications.api.DialogV2.wait({
  window: { title: "XP Distribution", icon: "fa-solid fa-star" },
  position: { width: 420 },
  content,
  buttons: [{
    action: "award", label: "Award XP", icon: "fa-solid fa-star", default: true,
    callback: (_event, button) => readForm(button.form)
  }],
  rejectClose: false,
  render: (_event, dialog) => {
    const form = dialog.element.querySelector("form");
    const preview = form.querySelector(".nm-xp-preview");
    const update = () => {
      const values = readForm(form);
      if ( values.total === null ) preview.textContent = "Not a valid amount (numbers and + − × ÷ only).";
      else if ( !values.ids.length ) preview.textContent = "No characters selected.";
      else preview.textContent = `Each character gets ${share(values)} XP (${values.split ? values.total : share(values) * values.ids.length} XP in total).`;
    };
    form.addEventListener("input", update);
    update();
  }
});
if ( !result ) return;
if ( !(result.total > 0) ) return ui.notifications.warn("Enter an XP amount greater than 0.");
if ( !result.ids.length ) return ui.notifications.warn("Select at least one character.");

const award = share(result);
const lines = [];
const updates = result.ids.map(id => {
  const actor = game.actors.get(id);
  const xp = (Number(actor.system.details.xp?.value) || 0) + award;
  const toNext = (Number(actor.system.details.xp?.max) || 0) - xp;
  lines.push(`<li><strong>${esc(actor.name)}</strong>: +${award} XP (${toNext <= 0 ? "<strong>level up!</strong>" : `${toNext} XP to next level`})</li>`);
  return { _id: id, "system.details.xp.value": xp };
});
await Actor.implementation.updateDocuments(updates);

await ChatMessage.create({
  speaker: { alias: "XP Distribution" },
  content: `<h3><i class="fa-solid fa-star"></i> Experience Awarded</h3><ul>${lines.join("")}</ul>`
});
ui.notifications.info(`Awarded ${award} XP to ${updates.length} character(s).`);
