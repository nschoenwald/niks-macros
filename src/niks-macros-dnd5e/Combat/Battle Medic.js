/**
 * Battle Medic - Foundry V14 + D&D 5e 6.x (Healer feat, 2024)
 * The healer is the selected token's actor (or your assigned character). The patient expends ONE of their Hit
 * Point Dice; the healer rolls it (rerolling a 1, from Healing Rerolls) and adds the HEALER's Proficiency Bonus.
 * Not tracked: the once-per-short-rest limit per patient, and reach.
 */

const { DialogV2 } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

const healer = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if ( !healer ) return ui.notifications.warn("Select the healer's token (or assign yourself a character).");
const prof = Number(healer.system.attributes?.prof) || 0;

// Patients: player characters and anything you have targeted, with at least one unspent Hit Die.
const candidates = new Set(game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner));
for ( const t of game.user.targets ) if ( t.actor ) candidates.add(t.actor);
const targetIds = new Set([...game.user.targets].map(t => t.actor?.uuid));

const options = [];
for ( const actor of candidates ) {
  for ( const cls of actor.itemTypes.class ?? [] ) {
    const available = Number(cls.system.hd?.value) || 0;
    if ( available < 1 ) continue;
    options.push({
      value: `${actor.uuid}::${cls.id}`, actor, cls, available,
      targeted: targetIds.has(actor.uuid),
      label: `${actor.name} – ${cls.name} (${cls.system.hd.denomination}, ${available} left)`
    });
  }
}
if ( !options.length ) return ui.notifications.warn("No patient with unspent Hit Dice found.");
options.sort((a, b) => (b.targeted - a.targeted) || a.actor.name.localeCompare(b.actor.name));

const choice = await DialogV2.prompt({
  window: { title: "Battle Medic", icon: "fa-solid fa-staff-snake" },
  position: { width: 460 },
  content: `
    <p>Healer: <strong>${esc(healer.name)}</strong> (Proficiency Bonus +${prof})</p>
    <div class="form-group">
      <label>Patient &amp; Hit Die</label>
      <div class="form-fields">
        <select name="target" autofocus>
          ${options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}
        </select>
      </div>
      <p class="hint">The patient expends one Hit Die. Targeted creatures are listed first.</p>
    </div>`,
  rejectClose: false,
  ok: { label: "Heal", icon: "fa-solid fa-heart", callback: (_event, button) => button.form.elements.target.value }
});
const option = options.find(o => o.value === choice);
if ( !option ) return;

const { actor, cls } = option;
if ( (Number(cls.system.hd?.value) || 0) < 1 ) return ui.notifications.warn(`${actor.name} has no ${cls.name} Hit Dice left.`);

const roll = new CONFIG.Dice.DamageRoll(`1${cls.system.hd.denomination}r1 + ${prof}`, {}, { type: "healing" });
await roll.evaluate();
await roll.toMessage({
  speaker: ChatMessage.implementation.getSpeaker({ actor: healer }),
  flavor: `<h3><i class="fa-solid fa-staff-snake"></i> Battle Medic</h3>${esc(healer.name)} treats ${esc(actor.name)}
    (expends 1 ${esc(cls.name)} Hit Die, ${cls.system.hd.denomination})`
});

await actor.applyDamage(-roll.total);
await cls.update({ "system.hd.spent": (Number(cls.system.hd.spent) || 0) + 1 });
