// Encounter XP & Difficulty - Foundry V14 + D&D 5e 6.x
// Totals the XP of the selected hostile NPCs and rates the encounter with the 2024 DMG XP budgets for parties of
// 3, 4 and 5 characters at the chosen level (or the average level of the players' characters).
// The result is whispered to the GMs.

const XP_BUDGETS = {
  1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500], 5: [500, 750, 1100],
  6: [600, 1000, 1400], 7: [750, 1300, 1700], 8: [1000, 1700, 2100], 9: [1300, 2000, 2600],
  10: [1600, 2300, 3100], 11: [1900, 2900, 4100], 12: [2200, 3700, 4700], 13: [2600, 4200, 5400],
  14: [2900, 4900, 6200], 15: [3300, 5400, 7800], 16: [3800, 6100, 9800], 17: [4500, 7200, 11700],
  18: [5000, 8700, 14200], 19: [5500, 10700, 17200], 20: [6400, 13200, 22000]
}; // [low, moderate, high] per character
const PARTY_SIZES = [3, 4, 5];

const hostiles = canvas.tokens.controlled.filter(t => (t.actor?.type === "npc")
  && (t.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE));
if ( !hostiles.length ) return ui.notifications.warn("Select at least one hostile NPC token.");

const pcLevels = game.users.players.map(u => u.character?.system.details?.level).filter(l => Number.isInteger(l) && l > 0);
const averageLevel = pcLevels.length
  ? Math.clamp(Math.round(pcLevels.reduce((a, b) => a + b, 0) / pcLevels.length), 1, 20) : null;

const level = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Encounter XP & Difficulty", icon: "fa-solid fa-scale-balanced" },
  position: { width: 380 },
  content: `
    <div class="form-group">
      <label>Party level</label>
      <div class="form-fields">
        <select name="level">
          ${Array.fromRange(20, 1).map(l => `<option value="${l}" ${l === (averageLevel ?? 1) ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      <p class="hint">${averageLevel ? `Average level of the players' characters: ${averageLevel}.`
        : "No player has an assigned character."} ${hostiles.length} hostile NPC(s) selected.</p>
    </div>`,
  rejectClose: false,
  ok: { label: "Calculate", icon: "fa-solid fa-calculator", callback: (_event, button) => Number(button.form.elements.level.value) }
});
if ( !level ) return;

const esc = foundry.utils.escapeHTML;
const fmt = new Intl.NumberFormat(game.i18n.lang);
const groups = new Map();
for ( const token of hostiles ) {
  const xp = Number(token.actor.system.details?.xp?.value) || 0;
  const key = `${token.actor.name}::${xp}`;
  const g = groups.get(key) ?? { name: token.actor.name, xp, count: 0 };
  g.count++;
  groups.set(key, g);
}
const rows = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || (b.xp - a.xp));
const total = rows.reduce((sum, g) => sum + (g.xp * g.count), 0);

const [low, moderate, high] = XP_BUDGETS[level];
const rate = size => {
  if ( total <= low * size ) return ["Low", "--color-level-success"];
  if ( total <= moderate * size ) return ["Moderate", "--color-level-warning"];
  if ( total <= high * size ) return ["High", "--color-level-error"];
  return ["Deadly", "--color-level-error"];
};

await ChatMessage.create({
  speaker: ChatMessage.getSpeaker(),
  whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
  content: `<h3><i class="fa-solid fa-scale-balanced"></i> Encounter XP</h3>
    <table>
      <thead><tr><th>Creature</th><th style="text-align: right;">XP</th><th style="text-align: right;">Qty</th></tr></thead>
      <tbody>${rows.map(g => `<tr><td>${esc(g.name)}</td><td style="text-align: right;">${fmt.format(g.xp)}</td>
        <td style="text-align: right;">×${g.count}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th colspan="2">Total</th><th style="text-align: right;">${fmt.format(total)}</th></tr></tfoot>
    </table>
    <p><strong>Difficulty at level ${level}</strong></p>
    <table>
      <thead><tr><th>Party</th><th>Difficulty</th><th style="text-align: right;">XP each</th></tr></thead>
      <tbody>${PARTY_SIZES.map(size => {
        const [label, color] = rate(size);
        return `<tr><td>${size} PCs</td><td><strong style="color: var(${color});">${label}</strong></td>
          <td style="text-align: right;">${fmt.format(Math.floor(total / size))}</td></tr>`;
      }).join("")}</tbody>
    </table>`
});
