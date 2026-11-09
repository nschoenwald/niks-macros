// Adjust NPC Initiative - Foundry V14 (any system)
// Adds or subtracts 5 from the initiative of every combatant without a player owner.
// Combatants that haven't rolled initiative yet are left alone.

const combat = game.combat;
if ( !combat ) return ui.notifications.warn("There is no active combat.");

const action = await foundry.applications.api.DialogV2.wait({
  window: { title: "Adjust NPC Initiative", icon: "fa-solid fa-arrow-down-up-across-line" },
  position: { width: 360 },
  content: `<p class="hint">Changes the initiative of all non-player combatants that have rolled.</p>`,
  buttons: [
    { action: "subtract", label: "−5", icon: "fa-solid fa-minus" },
    { action: "add", label: "+5", icon: "fa-solid fa-plus" }
  ],
  rejectClose: false
});
if ( !action ) return;

const delta = action === "subtract" ? -5 : 5;
const updates = combat.combatants
  .filter(c => c.isNPC && Number.isFinite(c.initiative))
  .map(c => ({ _id: c.id, initiative: c.initiative + delta }));
if ( !updates.length ) return ui.notifications.info("No NPC combatants with rolled initiative.");

await combat.updateEmbeddedDocuments("Combatant", updates);
ui.notifications.info(`Initiative ${delta > 0 ? "+" : "−"}5 for ${updates.length} NPC combatant(s).`);
