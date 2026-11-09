// Roll NPC HP (Scene) - Foundry V14 + D&D 5e 6.x
// Rolls new hit points from the HP formula for every unlinked NPC token on the scene you are viewing
// (current and maximum HP, at least 1). Linked tokens are skipped. GM only; the results are whispered to the GMs.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can roll NPC hit points.");
const scene = canvas.scene;
if ( !scene ) return ui.notifications.warn("There is no scene to roll for.");

const tokens = scene.tokens.filter(t => !t.actorLink && (t.actor?.type === "npc") && t.actor.system.attributes.hp.formula);
if ( !tokens.length ) return ui.notifications.warn("No unlinked NPC tokens with an HP formula on this scene.");

const ok = await foundry.applications.api.DialogV2.confirm({
  window: { title: "Roll NPC HP (Scene)", icon: "fa-solid fa-dice-d20" },
  content: `<p>Roll new hit points for <strong>${tokens.length}</strong> unlinked NPC token(s) on this scene?</p>
    <p class="hint">Their current and maximum HP are replaced.</p>`
});
if ( !ok ) return;

const esc = foundry.utils.escapeHTML;
const lines = [];
for ( const token of tokens ) {
  const formula = token.actor.system.attributes.hp.formula;
  const roll = await new Roll(formula, token.actor.getRollData()).evaluate();
  const hp = Math.max(1, roll.total);
  await token.actor.update({ "system.attributes.hp.max": hp, "system.attributes.hp.value": hp });
  lines.push(`<li><strong>${esc(token.name)}</strong>: ${esc(formula)} → ${hp}</li>`);
}

await ChatMessage.create({
  speaker: { alias: "Roll NPC HP" },
  whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
  content: `<h3><i class="fa-solid fa-dice-d20"></i> NPC Hit Points</h3><ul>${lines.join("")}</ul>`
});
ui.notifications.info(`Rolled hit points for ${lines.length} NPC token(s).`);
