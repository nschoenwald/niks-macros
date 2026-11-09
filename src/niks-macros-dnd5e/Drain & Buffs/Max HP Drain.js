// Max HP Drain - Foundry V14 + D&D 5e 6.x
// For Specters, Wraiths and other Max HP drain.
//
// - One Active Effect per actor holding the running total and a per-application history.
// - Ends on the target's next long rest (dnd5e removes it itself), or after a fixed time if configured.
// - The dialog stays open: apply, undo or remove single entries as often as needed.
// - Restoring never raises Max HP above normal (configurable).
// - Current HP is capped to the new Max HP. Undoing / removing an entry gives back the HP that entry took away.
// - "From last damage" fills in the necrotic damage of the most recent damage roll in chat.
// - One chat summary per action, whispered to the GM by default. Warns when Max HP reaches 0.
//
// Effects created by the old version of this macro (same flag) are picked up and converted on the next change.

(async () => {
  // --- Config ---------------------------------------------------------------
  const CFG = {
    name: "Max HP Drain",
    img: "icons/skills/wounds/injury-triple-slash-bleed.webp",
    flagScope: "world",
    flagKey: "maxHpDrain",
    // "longRest" (Life Drain rules), "shortRest", or null to use durationHours instead.
    expiry: "longRest",
    durationHours: 24,
    refreshDurationOnApply: true, // only used with durationHours
    allowAboveNormal: false,      // allow positive totals (Max HP above normal)
    whisperGM: true,              // false = public chat message
    defaultAmount: -5,
    quickAmounts: [-1, -5, -10, 1, 5, 10]
  };
  // -------------------------------------------------------------------------

  const { DialogV2 } = foundry.applications.api;
  const { escapeHTML: esc, randomID, deepClone } = foundry.utils;
  const HP_KEY = "system.attributes.hp.tempmax";

  // Collect selected actors once each (two tokens of one linked actor would otherwise drain twice).
  const targets = [];
  const seen = new Set();
  let notOwned = 0;
  for ( const token of canvas.tokens.controlled ) {
    const actor = token.actor;
    if ( !actor || seen.has(actor.uuid) ) continue;
    seen.add(actor.uuid);
    if ( !Number.isFinite(actor.system.attributes?.hp?.effectiveMax) ) continue;
    if ( !actor.isOwner ) { notOwned++; continue; }
    targets.push({ actor, name: token.name });
  }
  if ( notOwned ) ui.notifications.warn(`Skipped ${notOwned} actor(s) you don't own.`);
  if ( !targets.length ) {
    ui.notifications.warn(`Select at least one token.`);
    return;
  }

  // --- Data helpers ---------------------------------------------------------

  const sum = entries => entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

  function readState(actor) {
    const effect = actor.effects.find(e => e.getFlag(CFG.flagScope, CFG.flagKey)) ?? null;
    const entries = deepClone(effect?.getFlag(CFG.flagScope, CFG.flagKey)?.entries ?? []);
    return { effect, entries, total: sum(entries) };
  }

  function readHp(actor) {
    const hp = actor.system.attributes.hp;
    return {
      value: hp.value,                                         // derived, already capped by dnd5e
      source: actor._source.system.attributes.hp.value ?? hp.value,
      max: Math.max(0, hp.effectiveMax)
    };
  }

  // Without allowAboveNormal, shrink positive (restore) entries from the newest backwards until the total is <= 0.
  function normalize(entries) {
    if ( CFG.allowAboveNormal ) return entries;
    let excess = sum(entries);
    for ( let i = entries.length - 1; (i >= 0) && (excess > 0); i-- ) {
      const e = entries[i];
      if ( e.amount <= 0 ) continue;
      const cut = Math.min(excess, e.amount);
      e.amount -= cut;
      excess -= cut;
    }
    return entries.filter(e => e.amount !== 0);
  }

  function durationData() {
    if ( CFG.expiry ) return { duration: { value: null, units: "seconds", expiry: CFG.expiry } };
    return {
      duration: { value: CFG.durationHours * 3600, units: "seconds", expiry: null },
      start: CONFIG.ActiveEffect.documentClass.getEffectStart()
    };
  }

  function historyHTML(entries, total) {
    const items = entries.map(e => `<li>${signed(e.amount)}${e.reason ? ` – ${esc(e.reason)}` : ""}</li>`).join("");
    return `<p>Max HP ${signed(total)}</p><ul>${items}</ul>`;
  }

  // Create, update or delete the effect in a single operation.
  async function writeEntries(actor, effect, entries, { refreshDuration = false } = {}) {
    const total = sum(entries);
    if ( !entries.length || (total === 0) ) {
      if ( effect ) await effect.delete();
      return;
    }
    const data = {
      name: `${CFG.name} (${signed(total)})`,
      img: CFG.img,
      description: historyHTML(entries, total),
      system: { changes: [{ key: HP_KEY, type: "add", value: total }] },
      flags: { [CFG.flagScope]: { [CFG.flagKey]: { version: 2, entries } } }
    };
    if ( !effect ) await actor.createEmbeddedDocuments("ActiveEffect", [{ ...data, ...durationData() }]);
    else await effect.update(refreshDuration ? { ...data, ...durationData() } : data);
  }

  // Cap stored current HP to the effective maximum, optionally giving back `heal` HP first.
  async function settleHp(actor, heal = 0) {
    const { source, max } = readHp(actor);
    const value = Math.min(source + heal, max);
    if ( value !== source ) await actor.update({ "system.attributes.hp.value": value });
  }

  // --- Actions per actor ----------------------------------------------------
  // Each returns { changed, text } for the chat summary.

  async function applyTo({ actor }, amount, reason) {
    const { effect, entries, total } = readState(actor);
    if ( !CFG.allowAboveNormal && (amount > 0) ) amount = Math.min(amount, Math.max(0, -total));
    if ( !amount ) return { changed: false, text: "nothing to restore" };

    const before = readHp(actor);
    const projectedMax = Math.max(0, before.max + amount);
    entries.push({
      id: randomID(), amount, reason, time: game.time.worldTime, user: game.user.id,
      hpLost: Math.max(0, before.source - projectedMax)
    });
    await writeEntries(actor, effect, entries, { refreshDuration: CFG.refreshDurationOnApply });
    await settleHp(actor);

    const after = readHp(actor);
    let text = `${signed(amount)} → Max HP ${before.max} → ${after.max}, HP ${after.value}`;
    if ( after.max === 0 ) text += ` <strong>(Max HP 0!)</strong>`;
    return { changed: true, text, zero: after.max === 0 };
  }

  async function removeEntry({ actor }, entryId) {
    const { effect, entries } = readState(actor);
    const index = entryId ? entries.findIndex(e => e.id === entryId) : entries.length - 1;
    if ( index < 0 ) return { changed: false, text: "nothing to undo" };

    const before = readHp(actor);
    const [removed] = entries.splice(index, 1);
    await writeEntries(actor, effect, normalize(entries));
    await settleHp(actor, removed.amount < 0 ? (removed.hpLost ?? 0) : 0);

    const after = readHp(actor);
    return { changed: true, text: `removed ${signed(removed.amount)} → Max HP ${before.max} → ${after.max}, HP ${after.value}` };
  }

  async function clearOn({ actor }) {
    const { effect } = readState(actor);
    if ( !effect ) return { changed: false, text: "no drain" };
    const before = readHp(actor);
    await effect.delete();
    return { changed: true, text: `cleared → Max HP ${before.max} → ${readHp(actor).max}` };
  }

  // Run an action on every target, then notify and post one chat summary.
  async function runAll(title, fn, reason = "", list = targets) {
    const results = await Promise.allSettled(list.map(async t => ({ name: t.name, ...(await fn(t)) })));
    const lines = [];
    let failed = 0;
    for ( const r of results ) {
      if ( r.status === "rejected" ) { failed++; console.error(`${CFG.name} |`, r.reason); continue; }
      if ( r.value.changed ) lines.push(r.value);
    }
    if ( failed ) ui.notifications.error(`Failed on ${failed} actor(s). See the console (F12).`);
    if ( !lines.length ) {
      if ( !failed ) ui.notifications.info(`Nothing changed.`);
      return;
    }
    if ( lines.some(l => l.zero) ) ui.notifications.warn(`A creature's Max HP is now 0.`);

    const items = lines.map(l => `<li><strong>${esc(l.name)}</strong>: ${l.text}</li>`).join("");
    await ChatMessage.create({
      speaker: { alias: CFG.name },
      content: `<h3><i class="fa-solid fa-skull"></i> ${esc(title)}</h3>${reason ? `<p>${esc(reason)}</p>` : ""}<ul>${items}</ul>`,
      whisper: CFG.whisperGM ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : []
    });
  }

  // Necrotic total of the most recent damage roll in chat (all damage if it has no necrotic part).
  function lastNecroticDamage() {
    const messages = game.messages.contents;
    for ( let i = messages.length - 1; i >= Math.max(0, messages.length - 50); i-- ) {
      const rolls = messages[i].rolls.filter(r => r instanceof CONFIG.Dice.DamageRoll);
      if ( !rolls.length ) continue;
      const isNecrotic = r => (r.options.type === "necrotic") || r.options.types?.includes("necrotic");
      const pick = rolls.some(isNecrotic) ? rolls.filter(isNecrotic) : rolls;
      return pick.reduce((s, r) => s + Math.max(0, r.total), 0);
    }
    return null;
  }

  // --- Dialog ---------------------------------------------------------------

  const ends = CFG.expiry
    ? `Ends on the next ${CFG.expiry === "shortRest" ? "short or long" : "long"} rest.`
    : `Lasts ${CFG.durationHours} in-game hours${CFG.refreshDurationOnApply ? ", refreshed on each apply" : ""}.`;

  const content = document.createElement("div");
  content.innerHTML = `
    <style>
      .nm-mhd { display: flex; flex-direction: column; gap: 0.5rem; }
      .nm-mhd-amount { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
      .nm-mhd-amount input[type=number] { width: 5rem; flex: none; }
      .nm-mhd-amount button { flex: none; width: auto; padding: 0 0.5rem; }
      .nm-mhd-hint { font-size: var(--font-size-12); color: var(--color-text-secondary); margin: 0; }
      .nm-mhd-preview { max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem; }
      .nm-mhd-row { border: 1px solid var(--color-border); border-radius: 4px; padding: 0.25rem 0.5rem; }
      .nm-mhd-row .nm-mhd-line { display: flex; justify-content: space-between; gap: 0.5rem; }
      .nm-mhd-row .nm-mhd-sub { font-size: var(--font-size-12); color: var(--color-text-secondary); }
      .nm-mhd-row .nm-mhd-zero { color: var(--color-level-error); font-weight: bold; }
      .nm-mhd-history { list-style: none; margin: 0.25rem 0 0; padding: 0; font-size: var(--font-size-12); }
      .nm-mhd-history li { display: flex; align-items: center; gap: 0.5rem; }
      .nm-mhd-history li span { flex: 1; }
      .nm-mhd-history button { flex: none; width: 1.5rem; height: 1.5rem; min-height: 0; padding: 0; line-height: 1; }
    </style>
    <div class="nm-mhd">
      <div class="nm-mhd-amount">
        <label for="nm-mhd-amount"><strong>Amount</strong></label>
        <input type="number" id="nm-mhd-amount" name="amount" step="1" value="${CFG.defaultAmount}">
        ${CFG.quickAmounts.map(d => `<button type="button" data-mhd-delta="${d}">${signed(d)}</button>`).join("")}
        <button type="button" data-mhd-last data-tooltip="Use the necrotic damage of the last damage roll in chat">
          <i class="fa-solid fa-dice-d20"></i> From last damage
        </button>
      </div>
      <input type="text" name="reason" placeholder="Reason (optional), e.g. Specter Life Drain">
      <p class="nm-mhd-hint">Negative reduces Max HP, positive restores it. ${ends}</p>
      <div class="nm-mhd-preview"></div>
    </div>`;

  let busy = false;
  const dialog = new DialogV2({
    window: { title: `Max HP Drain (${targets.length} selected)`, icon: "fa-solid fa-skull" },
    position: { width: 480 },
    form: { closeOnSubmit: false },
    content,
    buttons: [
      { action: "apply", label: "Apply", icon: "fa-solid fa-skull", default: true, callback: onApply },
      { action: "undo", label: "Undo Last", icon: "fa-solid fa-rotate-left", type: "button", callback: onUndo },
      { action: "clear", label: "Clear", icon: "fa-solid fa-trash", type: "button", callback: onClear },
      { action: "close", label: "Close", icon: "fa-solid fa-xmark", type: "button",
        callback: (_event, _button, d) => d.close() }
    ]
  });
  await dialog.render({ force: true });

  const root = dialog.element;
  const amountInput = root.querySelector("[name=amount]");
  const reasonInput = root.querySelector("[name=reason]");
  const preview = root.querySelector(".nm-mhd-preview");
  const readAmount = () => Math.trunc(Number(amountInput.value)) || 0;

  amountInput.addEventListener("input", refreshPreview);
  root.querySelectorAll("[data-mhd-delta]").forEach(b => b.addEventListener("click", () => {
    amountInput.value = readAmount() + Number(b.dataset.mhdDelta);
    refreshPreview();
  }));
  root.querySelector("[data-mhd-last]").addEventListener("click", () => {
    const dmg = lastNecroticDamage();
    if ( dmg === null ) return ui.notifications.warn(`No damage roll found in recent chat.`);
    amountInput.value = -dmg;
    refreshPreview();
  });
  preview.addEventListener("click", event => {
    const button = event.target.closest("[data-mhd-remove]");
    if ( !button ) return;
    const target = targets.find(t => t.actor.uuid === button.dataset.mhdRemove);
    if ( !target ) return;
    guarded(() => runAll("Max HP drain entry removed", t => removeEntry(t, button.dataset.entry), "", [target]));
  });
  refreshPreview();

  // Run only one action at a time, and refresh the preview afterwards.
  async function guarded(fn) {
    if ( busy ) return;
    busy = true;
    try { await fn(); }
    finally { busy = false; refreshPreview(); }
  }

  async function onApply() {
    const amount = readAmount();
    if ( !amount ) return ui.notifications.warn(`Enter a non-zero whole number.`);
    const reason = reasonInput.value.trim();
    await guarded(() => runAll(amount < 0 ? "Max HP drained" : "Max HP restored",
      t => applyTo(t, amount, reason), reason));
  }

  async function onUndo() {
    await guarded(() => runAll("Last Max HP drain undone", t => removeEntry(t)));
  }

  async function onClear() {
    const ok = await DialogV2.confirm({
      window: { title: "Max HP Drain", icon: "fa-solid fa-skull" },
      content: "<p>Remove all Max HP drain from the selected creatures? Current HP is not restored.</p>"
    });
    if ( ok ) await guarded(() => runAll("Max HP drain cleared", clearOn));
  }

  function refreshPreview() {
    if ( !dialog.rendered ) return;
    const amount = readAmount();
    preview.innerHTML = targets.map(({ actor, name }) => {
      const { entries, total } = readState(actor);
      const hp = readHp(actor);
      let delta = amount;
      if ( !CFG.allowAboveNormal && (delta > 0) ) delta = Math.min(delta, Math.max(0, -total));
      const max = Math.max(0, hp.max + delta);
      const value = Math.min(hp.value, max);
      const history = entries.map(e => `
        <li>
          <span>${signed(e.amount)}${e.reason ? ` – ${esc(e.reason)}` : ""}</span>
          <button type="button" data-mhd-remove="${actor.uuid}" data-entry="${esc(e.id)}"
            data-tooltip="Remove this entry"><i class="fa-solid fa-xmark"></i></button>
        </li>`).join("");
      return `
        <div class="nm-mhd-row">
          <div class="nm-mhd-line">
            <strong>${esc(name)}</strong>
            <span>HP ${hp.value}/${hp.max} → <span class="${max === 0 ? "nm-mhd-zero" : ""}">${value}/${max}</span></span>
          </div>
          <div class="nm-mhd-sub">Drain ${signed(total)} → ${signed(total + delta)}</div>
          ${history ? `<ol class="nm-mhd-history">${history}</ol>` : ""}
        </div>`;
    }).join("");
  }
})();