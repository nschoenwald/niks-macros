// Monster HP Calculator - Foundry V14 + D&D 5e 6.x
// Whispers a table of average HP for a range of Hit Dice counts to the GM. Defaults come from the NPC sheet
// that is open in front (size → Hit Die, Con modifier, CR → range).
// Each formula in the table is an inline roll button: click it to roll that HP. It keeps working after a reload.

const { DialogV2 } = foundry.applications.api;

let defaultHd = 8;
let defaultCon = 0;
let defaultMinHd = 1;
let defaultMaxHd = 20;

// Front-most open NPC sheet, if any.
const npcSheet = [...foundry.applications.instances.values()]
  .filter(app => app.rendered && (app.document?.documentName === "Actor") && (app.document.type === "npc"))
  .sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];
if ( npcSheet ) {
  const npc = npcSheet.document;
  defaultHd = CONFIG.DND5E.actorSizes[npc.system.traits?.size]?.hitDie ?? 8;
  defaultCon = npc.system.abilities?.con?.mod ?? 0;
  const cr = Number(npc.system.details?.cr) || 0;
  defaultMinHd = Math.max(1, Math.floor(cr * 0.75));
  defaultMaxHd = Math.max(10, Math.ceil(cr * 4));
}

const result = await DialogV2.prompt({
  window: { title: "Monster HP Calculator", icon: "fa-solid fa-heart" },
  position: { width: 400 },
  content: `
    ${npcSheet ? `<p class="hint">Defaults from ${foundry.utils.escapeHTML(npcSheet.document.name)}.</p>` : ""}
    <div class="form-group">
      <label>Hit Die</label>
      <div class="form-fields"><select name="hdSize">
        ${[4, 6, 8, 10, 12, 20].map(d => `<option value="${d}" ${d === defaultHd ? "selected" : ""}>d${d}</option>`).join("")}
      </select></div>
    </div>
    <div class="form-group">
      <label>Constitution modifier</label>
      <div class="form-fields"><input type="number" name="conMod" value="${defaultCon}" step="1"></div>
    </div>
    <div class="form-group">
      <label>Hit Dice from / to</label>
      <div class="form-fields">
        <input type="number" name="minHd" value="${defaultMinHd}" step="1" min="1">
        <input type="number" name="maxHd" value="${defaultMaxHd}" step="1" min="1">
      </div>
    </div>`,
  rejectClose: false,
  ok: {
    label: "Calculate",
    callback: (_event, button) => {
      const f = button.form.elements;
      return { hdSize: Number(f.hdSize.value), conMod: Number(f.conMod.value) || 0,
        minHd: Math.max(1, Number(f.minHd.value) || 1), maxHd: Number(f.maxHd.value) || 1 };
    }
  }
});
if ( !result ) return;

const { hdSize, conMod, minHd } = result;
const maxHd = Math.min(Math.max(minHd, result.maxHd), minHd + 99);
const dieAverage = (hdSize / 2) + 0.5;
const signed = n => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);

const rows = [];
for ( let i = minHd; i <= maxHd; i++ ) {
  const bonus = i * conMod;
  const formula = bonus ? `${i}d${hdSize} ${signed(bonus)}` : `${i}d${hdSize}`;
  const average = Math.max(1, Math.floor((i * dieAverage) + bonus));
  rows.push(`<tr><td>[[/r ${formula} # HP]]{${formula}}</td><td style="text-align: right;"><strong>${average}</strong></td></tr>`);
}

await ChatMessage.create({
  speaker: ChatMessage.getSpeaker(),
  whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
  content: `<h3><i class="fa-solid fa-heart"></i> Average HP</h3><p>d${hdSize}, Con ${signed(conMod)}</p>
    <table><thead><tr><th>Formula</th><th style="text-align: right;">Average</th></tr></thead>
    <tbody>${rows.join("")}</tbody></table>`
});
