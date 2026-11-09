// Convert Currency to Gold - Foundry V14 + D&D 5e 6.x
// Converts the coins of the chosen player characters into as many whole gold pieces as possible:
// 1 pp = 10 gp, 2 ep = 1 gp, 10 sp = 1 gp, 10 cp = 1 sp, and a leftover 1 ep + 5 sp = 1 gp. Remainders stay as coins.
// A GM can convert every player character; players only their own. The result is posted to chat.

const esc = foundry.utils.escapeHTML;
const characters = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner && (game.user.isGM || a.isOwner))
  .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
if ( !characters.length ) return ui.notifications.warn("There are no player characters you can convert.");

const DENOMINATIONS = ["pp", "gp", "ep", "sp", "cp"];
const coinsOf = actor => Object.fromEntries(DENOMINATIONS.map(d => [d, Math.trunc(Number(actor.system.currency?.[d]) || 0)]));
const fmtCoins = c => DENOMINATIONS.filter(d => c[d]).map(d => `${c[d]} ${d}`).join(", ") || "0";

function convert(c) {
  let gp = c.gp + (c.pp * 10);
  let { ep, sp, cp } = c;
  sp += Math.floor(cp / 10); cp %= 10;
  gp += Math.floor(ep / 2); ep %= 2;
  gp += Math.floor(sp / 10); sp %= 10;
  if ( (ep >= 1) && (sp >= 5) ) { gp += 1; ep -= 1; sp -= 5; }
  return { pp: 0, gp, ep, sp, cp };
}

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-currency { display: grid; grid-template-columns: 15rem 1fr; gap: 0.75rem; }
    .nm-currency .nm-tools { display: flex; gap: 0.25rem; margin: 0.25rem 0; }
    .nm-currency .nm-tools button { flex: 1; padding: 0 0.25rem; }
    .nm-currency .nm-list { max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.125rem; }
    .nm-currency .nm-list label { display: flex; align-items: center; gap: 0.375rem; }
    .nm-currency .nm-list img { width: 1.5rem; height: 1.5rem; object-fit: cover; border: none; border-radius: 3px; }
    .nm-currency .nm-preview { max-height: 400px; overflow-y: auto; }
    .nm-currency table { width: 100%; border-collapse: collapse; }
    .nm-currency th, .nm-currency td { padding: 0.25rem 0.375rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    .nm-currency .nm-gain { color: var(--color-level-success); font-weight: bold; }
    .nm-currency .nm-empty { color: var(--color-text-secondary); text-align: center; padding: 1rem; }
  </style>
  <div class="nm-currency">
    <div>
      <input type="search" name="search" placeholder="Search characters…">
      <div class="nm-tools">
        <button type="button" data-select="all">Select all</button>
        <button type="button" data-select="none">Select none</button>
      </div>
      <div class="nm-list">
        ${characters.map(a => `<label><input type="checkbox" name="${a.id}"><img src="${esc(a.img)}" alt=""> ${esc(a.name)}</label>`).join("")}
      </div>
    </div>
    <div class="nm-preview"></div>
  </div>
  <p class="hint">1 pp = 10 gp · 2 ep = 1 gp · 10 sp = 1 gp · 10 cp = 1 sp · 1 ep + 5 sp = 1 gp. Remainders stay as coins.</p>`;

const selectedIds = form => characters.filter(a => form.elements[a.id]?.checked).map(a => a.id);

const ids = await foundry.applications.api.DialogV2.wait({
  window: { title: "Convert Currency to Gold", icon: "fa-solid fa-coins" },
  position: { width: 820 },
  content,
  buttons: [{
    action: "convert", label: "Convert", icon: "fa-solid fa-coins", default: true,
    callback: (_event, button) => selectedIds(button.form)
  }],
  rejectClose: false,
  render: (_event, dialog) => {
    const form = dialog.element.querySelector("form");
    const preview = form.querySelector(".nm-preview");
    const convertButton = dialog.element.querySelector('[data-action="convert"]');
    const update = () => {
      const chosen = selectedIds(form).map(id => game.actors.get(id));
      convertButton.disabled = !chosen.length;
      if ( !chosen.length ) {
        preview.innerHTML = `<p class="nm-empty">Tick characters to see their coins before and after.</p>`;
        return;
      }
      let totalGp = 0;
      preview.innerHTML = `<table>
        <thead><tr><th>Character</th><th>Before</th><th>After</th><th>Δ gp</th></tr></thead>
        <tbody>${chosen.map(a => {
          const before = coinsOf(a);
          const after = convert(before);
          totalGp += after.gp;
          const delta = after.gp - before.gp;
          return `<tr><td>${esc(a.name)}</td><td>${fmtCoins(before)}</td><td><strong>${fmtCoins(after)}</strong></td>
            <td class="${delta > 0 ? "nm-gain" : ""}">${delta > 0 ? "+" : ""}${delta}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <p>Total gold after: <strong>${totalGp} gp</strong></p>`;
    };
    form.addEventListener("change", update);
    form.elements.search.addEventListener("input", () => {
      const q = form.elements.search.value.toLowerCase().trim();
      form.querySelectorAll(".nm-list label").forEach(l => { l.hidden = !l.textContent.toLowerCase().includes(q); });
    });
    form.querySelectorAll("[data-select]").forEach(b => b.addEventListener("click", () => {
      form.querySelectorAll(".nm-list label:not([hidden]) input").forEach(i => { i.checked = b.dataset.select === "all"; });
      update();
    }));
    update();
  }
});
if ( !ids?.length ) return;

const rows = [];
let failed = 0;
for ( const id of ids ) {
  const actor = game.actors.get(id);
  const before = coinsOf(actor);
  const after = convert(before);
  try {
    await actor.update(Object.fromEntries(DENOMINATIONS.map(d => [`system.currency.${d}`, after[d]])));
    rows.push(`<tr><td>${actor.link}</td><td>${fmtCoins(before)}</td><td><strong>${fmtCoins(after)}</strong></td></tr>`);
  } catch ( err ) {
    failed++;
    console.error("Convert Currency to Gold |", err);
  }
}
if ( failed ) ui.notifications.error(`Converting failed for ${failed} character(s). See the console (F12).`);
if ( !rows.length ) return;

await ChatMessage.create({
  speaker: { alias: "Currency Exchange" },
  content: `<h3><i class="fa-solid fa-coins"></i> Currency Converted to Gold</h3>
    <table><thead><tr><th>Character</th><th>Before</th><th>After</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
});
ui.notifications.info(`Converted the coins of ${rows.length} character(s).`);
