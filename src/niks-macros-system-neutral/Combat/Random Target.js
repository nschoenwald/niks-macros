// Random Target - Foundry V14 (any system)
// Picks one visible player-owned or friendly token on the scene at random, every token with the same chance,
// targets it, and posts the roll with the list of candidates.

const candidates = canvas.tokens.placeables.filter(t => t.actor && !t.document.hidden
  && (t.actor.hasPlayerOwner || (t.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY)));
if ( !candidates.length ) return ui.notifications.warn("No visible player-owned or friendly tokens on this scene.");

const roll = await new Roll(`1d${candidates.length}`).evaluate();
const chosen = candidates[roll.total - 1];
chosen.setTarget(true, { releaseOthers: true });

const esc = foundry.utils.escapeHTML;
const list = candidates.map((t, i) => `<li>${i + 1}. ${i === roll.total - 1
  ? `<strong>${esc(t.name)}</strong>` : esc(t.name)}</li>`).join("");
await roll.toMessage({
  speaker: ChatMessage.getSpeaker(),
  flavor: `<h3><i class="fa-solid fa-crosshairs"></i> Random Target: ${esc(chosen.name)}</h3>
    <ol style="list-style: none; padding: 0; margin: 0;">${list}</ol>`
});
