/**
 * Tandem Footwork - Foundry V14 + D&D 5e 6.x (College of Dance, 2024)
 * Rolls the bard's Bardic Inspiration die and adds it to the initiative of the bard and of allies (player characters
 * and friendly tokens) in the current combat. Select the bard's token: the die is read from the bard's scale value,
 * and only allies within 30 ft of the bard are included (can be turned off).
 * Not done automatically: spending the Bardic Inspiration use, and checking that allies can see or hear the bard.
 */

const combat = game.combat;
if ( !combat ) return ui.notifications.warn("There is no active combat.");

const bardToken = canvas.tokens.controlled[0] ?? null;
const bard = bardToken?.actor ?? game.user.character ?? null;

// Find the Bardic Inspiration die among the bard's scale values (e.g. @scale.bard.inspiration).
function inspirationDie(actor) {
  for ( const values of Object.values(actor?.system.scale ?? {}) ) {
    for ( const [key, value] of Object.entries(values ?? {}) ) {
      if ( key.includes("inspiration") && value?.faces ) return `d${value.faces}`;
    }
  }
  return null;
}
const detected = inspirationDie(bard);
const dice = ["d6", "d8", "d10", "d12"];
const esc = foundry.utils.escapeHTML;

const result = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Tandem Footwork", icon: "fa-solid fa-person-running" },
  position: { width: 420 },
  content: `
    <p>${bard ? `Bard: <strong>${esc(bard.name)}</strong>` : "No bard selected."}
      ${detected ? `(Bardic Inspiration ${detected})` : ""}</p>
    <div class="form-group">
      <label>Bardic Inspiration die</label>
      <div class="form-fields">
        <select name="die">${dice.map(d => `<option ${d === (detected ?? "d6") ? "selected" : ""}>${d}</option>`)
          .join("")}</select>
      </div>
    </div>
    <label class="checkbox"><input type="checkbox" name="inRange" ${bardToken ? "checked" : "disabled"}>
      Only allies within 30 ft of the selected bard token</label>`,
  rejectClose: false,
  ok: {
    label: "Roll & Apply",
    icon: "fa-solid fa-dice",
    callback: (_event, button) => ({ die: button.form.elements.die.value, inRange: button.form.elements.inRange.checked })
  }
});
if ( !result ) return;

const inRange = combatant => {
  if ( !result.inRange || !bardToken ) return true;
  const token = combatant.token?.object;
  if ( !token ) return false; // on another scene
  if ( token === bardToken ) return true;
  return canvas.grid.measurePath([bardToken.center, token.center]).distance <= 30;
};

const allies = combat.combatants.filter(c => c.actor && Number.isFinite(c.initiative)
  && ((c.actor.type === "character") || (c.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY))
  && inRange(c));
if ( !allies.length ) return ui.notifications.warn("No allies with rolled initiative found.");

const roll = await new Roll(`1${result.die}`).evaluate();
await roll.toMessage({
  speaker: bard ? ChatMessage.getSpeaker({ actor: bard }) : ChatMessage.getSpeaker(),
  flavor: `<h3><i class="fa-solid fa-person-running"></i> Tandem Footwork</h3>+${roll.total} initiative for ${allies.map(c => esc(c.name)).join(", ")}`
});
await combat.updateEmbeddedDocuments("Combatant",
  allies.map(c => ({ _id: c.id, initiative: c.initiative + roll.total })));
