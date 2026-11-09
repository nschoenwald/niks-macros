// Ability Drain / Buff - Foundry V14 + D&D 5e 6.x
// Lowers or raises ability scores.
//
// - Every application is its own Active Effect, so each one can have its own end:
//   short rest, long rest (dnd5e removes these itself), a fixed time, or permanent.
// - Works with every ability in CONFIG.DND5E.abilities, including custom ones.
// - Flat numbers or dice formulas; the preview shows the possible range. Roll once for everyone or per creature.
// - Drain never takes a score below 0, and warns when a score reaches 0 (e.g. a Shadow's Strength Drain).
// - The dialog stays open: apply, undo the newest, or remove any single entry from the list.
// - Rolls and the summary are whispered to the GM by default.
//
// Combined effects created by the old version of this macro (same flag) are listed and can be removed.

(async () => {
  // --- Config ---------------------------------------------------------------
  const CFG = {
    label: "Ability Modifier",
    img: "icons/magic/control/voodoo-doll-pain-damage-pink.webp",
    flagScope: "world",
    flagKey: "abilityMods",
    defaultExpiry: "longRest", // "shortRest" | "longRest" | "timed" | "none"
    durationHours: 24,         // used by "timed"
    whisperGM: true,
    quickAmounts: ["1", "2", "1d4", "1d6"]
  };
  // -------------------------------------------------------------------------

  const { DialogV2 } = foundry.applications.api;
  const { escapeHTML: esc } = foundry.utils;
  const loc = s => game.i18n.localize(s ?? "");

  const ABILITIES = Object.fromEntries(Object.entries(CONFIG.DND5E.abilities).map(([key, a]) => [key, {
    label: loc(a.label), abbr: loc(a.abbreviation).toUpperCase()
  }]));

  const EXPIRIES = {
    shortRest: "Until a short or long rest",
    longRest: "Until a long rest",
    timed: `${CFG.durationHours} in-game hours`,
    none: "Permanent (until removed)"
  };

  // Collect selected actors once each (two tokens of one linked actor would otherwise be changed twice).
  const targets = [];
  const seen = new Set();
  let notOwned = 0;
  for ( const token of canvas.tokens.controlled ) {
    const actor = token.actor;
    if ( !actor || seen.has(actor.uuid) || !actor.system.abilities ) continue;
    seen.add(actor.uuid);
    if ( !actor.isOwner ) { notOwned++; continue; }
    targets.push({ actor, name: token.name });
  }
  if ( notOwned ) ui.notifications.warn(`Skipped ${notOwned} actor(s) you don't own.`);
  if ( !targets.length ) {
    ui.notifications.warn(`Select at least one token.`);
    return;
  }

  // --- Data helpers ---------------------------------------------------------

  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");
  const score = (actor, key) => Number(actor.system.abilities[key]?.value) || 0;
  const deltaText = deltas => Object.entries(deltas).map(([k, v]) => `${ABILITIES[k]?.abbr ?? k} ${signed(v)}`)
    .join(", ");

  // This macro's effects on an actor, oldest first. Old combined effects store { totals, history }.
  function readEntries(actor) {
    return actor.effects
      .filter(e => e.getFlag(CFG.flagScope, CFG.flagKey))
      .sort((a, b) => (a._stats.createdTime ?? 0) - (b._stats.createdTime ?? 0))
      .map(effect => {
        const flag = effect.getFlag(CFG.flagScope, CFG.flagKey);
        const deltas = Object.fromEntries(Object.entries(flag.deltas ?? flag.totals ?? {}).filter(([, v]) => v));
        return { effect, deltas, reason: flag.reason ?? (flag.version ? "" : "older combined effect") };
      });
  }

  function durationData(expiry) {
    if ( (expiry === "shortRest") || (expiry === "longRest") ) {
      return { duration: { value: null, units: "seconds", expiry } };
    }
    if ( expiry === "timed" ) return { duration: { value: CFG.durationHours * 3600, units: "seconds", expiry: null } };
    return {};
  }

  // How an effect ends, for the history list (dnd5e labels rest expiries, core labels timed ones).
  function endLabel(effect) {
    const { value, expiry, label } = effect.duration;
    return (Number.isFinite(value) || expiry) && label ? label : "Permanent";
  }

  // Possible [min, max] of a formula, or null if it is invalid.
  function formulaRange(formula) {
    try {
      if ( !Roll.validate(formula) ) return null;
      const min = new Roll(formula).evaluateSync({ minimize: true }).total;
      const max = new Roll(formula).evaluateSync({ maximize: true }).total;
      return [Math.min(min, max), Math.max(min, max)];
    } catch {
      return null;
    }
  }

  // Deltas actually applied: drain stops at a score of 0.
  function clampDeltas(actor, keys, amount) {
    const deltas = {};
    for ( const key of keys ) {
      const delta = amount < 0 ? Math.max(amount, -score(actor, key)) : amount;
      if ( delta ) deltas[key] = delta;
    }
    return deltas;
  }

  // --- Actions per actor ----------------------------------------------------
  // Each returns { changed, text, zero? } for the chat summary.

  async function applyTo({ actor }, keys, amount, { reason, expiry, formula }) {
    const deltas = clampDeltas(actor, keys, amount);
    if ( foundry.utils.isEmpty(deltas) ) return { changed: false, text: "no change (scores already 0)" };

    const before = Object.fromEntries(Object.keys(deltas).map(k => [k, score(actor, k)]));
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: `${CFG.label}: ${deltaText(deltas)}`,
      img: CFG.img,
      description: `<p>${esc(reason || "No reason given")}</p><p>${esc(formula)} → ${Math.abs(amount)}</p>`,
      system: {
        changes: Object.entries(deltas).map(([k, v]) => ({ key: `system.abilities.${k}.value`, type: "add", value: v }))
      },
      ...durationData(expiry),
      flags: { [CFG.flagScope]: { [CFG.flagKey]: { version: 2, deltas, reason, formula, user: game.user.id } } }
    }]);

    const parts = Object.keys(deltas).map(k => `${ABILITIES[k]?.abbr ?? k} ${before[k]} → ${score(actor, k)}`);
    const zeroed = Object.keys(deltas).filter(k => score(actor, k) <= 0);
    let text = parts.join(", ");
    if ( zeroed.length ) text += ` <strong>(${zeroed.map(k => ABILITIES[k]?.abbr ?? k).join(", ")} at 0!)</strong>`;
    return { changed: true, text, zero: zeroed.length > 0 };
  }

  async function removeEntry({ actor }, effectId) {
    const entries = readEntries(actor);
    const entry = effectId ? entries.find(e => e.effect.id === effectId) : entries.at(-1);
    if ( !entry ) return { changed: false, text: "nothing to undo" };
    await entry.effect.delete();
    return { changed: true, text: `removed ${deltaText(entry.deltas)}${entry.reason ? ` (${esc(entry.reason)})` : ""}` };
  }

  async function clearOn({ actor }) {
    const ids = readEntries(actor).map(e => e.effect.id);
    if ( !ids.length ) return { changed: false, text: "no modifiers" };
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    return { changed: true, text: `cleared ${ids.length} modifier(s)` };
  }

  // Run an action on the given targets, then notify and post one chat summary.
  async function runAll(title, fn, reason = "", list = targets) {
    const results = await Promise.allSettled(list.map(async t => ({ name: t.name, ...(await fn(t)) })));
    const lines = [];
    let failed = 0;
    for ( const r of results ) {
      if ( r.status === "rejected" ) { failed++; console.error(`${CFG.label} |`, r.reason); continue; }
      if ( r.value.changed ) lines.push(r.value);
    }
    if ( failed ) ui.notifications.error(`Failed on ${failed} actor(s). See the console (F12).`);
    if ( !lines.length ) {
      if ( !failed ) ui.notifications.info(`Nothing changed.`);
      return;
    }
    if ( lines.some(l => l.zero) ) ui.notifications.warn(`An ability score is now 0.`);

    const items = lines.map(l => `<li><strong>${esc(l.name)}</strong>: ${l.text}</li>`).join("");
    await ChatMessage.create({
      speaker: { alias: CFG.label },
      content: `<h3><i class="fa-solid fa-dumbbell"></i> ${esc(title)}</h3>${reason ? `<p>${esc(reason)}</p>` : ""}<ul>${items}</ul>`,
      whisper: CFG.whisperGM ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : []
    });
  }

  // Evaluate the formula, show the roll in chat if it has dice, return the (positive) amount or null.
  async function rollAmount(formula, flavor) {
    const roll = new Roll(formula);
    await roll.evaluate();
    if ( roll.dice.length ) await roll.toMessage({ flavor }, { messageMode: CFG.whisperGM ? "gm" : "public" });
    return Math.abs(Math.trunc(roll.total)) || null;
  }

  // --- Dialog ---------------------------------------------------------------

  const content = document.createElement("div");
  content.innerHTML = `
    <style>
      .nm-amod { display: flex; flex-direction: column; gap: 0.5rem; }
      .nm-amod-modes, .nm-amod-grid { display: grid; gap: 0.25rem; }
      .nm-amod-modes { grid-template-columns: 1fr 1fr; }
      .nm-amod-grid { grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr)); }
      .nm-amod button.nm-amod-toggle { border: 2px solid var(--color-border); }
      .nm-amod button.nm-amod-toggle[aria-pressed=true] { border-color: var(--amod-accent); font-weight: bold; }
      .nm-amod.drain { --amod-accent: var(--color-level-error); }
      .nm-amod.raise { --amod-accent: var(--color-level-success); }
      .nm-amod button[data-mode=drain][aria-pressed=true] { --amod-accent: var(--color-level-error); }
      .nm-amod button[data-mode=raise][aria-pressed=true] { --amod-accent: var(--color-level-success); }
      .nm-amod-amount { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
      .nm-amod-amount input { width: 6rem; flex: none; text-align: center; }
      .nm-amod-amount button { flex: none; width: auto; padding: 0 0.5rem; }
      .nm-amod-options { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
      .nm-amod-options select { flex: 1; }
      .nm-amod-options label { display: flex; gap: 0.25rem; align-items: center; flex: none; }
      .nm-amod-preview { max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem; }
      .nm-amod-row { border: 1px solid var(--color-border); border-radius: 4px; padding: 0.25rem 0.5rem; }
      .nm-amod-line { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.25rem 0.75rem; }
      .nm-amod-new { font-weight: bold; color: var(--amod-accent); }
      .nm-amod-zero { color: var(--color-level-error); font-weight: bold; }
      .nm-amod-hint { font-size: var(--font-size-12); color: var(--color-text-secondary); margin: 0; }
      .nm-amod-history { list-style: none; margin: 0.25rem 0 0; padding: 0; font-size: var(--font-size-12); }
      .nm-amod-history li { display: flex; align-items: center; gap: 0.5rem; }
      .nm-amod-history li span { flex: 1; }
      .nm-amod-history button { flex: none; width: 1.5rem; height: 1.5rem; min-height: 0; padding: 0; line-height: 1; }
    </style>
    <div class="nm-amod drain">
      <div class="nm-amod-modes">
        <button type="button" class="nm-amod-toggle" data-mode="drain" aria-pressed="true">
          <i class="fa-solid fa-arrow-down"></i> Drain
        </button>
        <button type="button" class="nm-amod-toggle" data-mode="raise" aria-pressed="false">
          <i class="fa-solid fa-arrow-up"></i> Raise
        </button>
      </div>
      <div class="nm-amod-grid">
        ${Object.entries(ABILITIES).map(([k, a]) => `
          <button type="button" class="nm-amod-toggle" data-ability="${esc(k)}" aria-pressed="false"
            data-tooltip="${esc(a.label)}">${esc(a.abbr)}</button>`).join("")}
      </div>
      <div class="nm-amod-amount">
        <label for="nm-amod-formula"><strong>Amount</strong></label>
        <input type="text" id="nm-amod-formula" name="formula" value="1" placeholder="1d4">
        ${CFG.quickAmounts.map(v => `<button type="button" data-amod-quick="${esc(v)}">${esc(v)}</button>`).join("")}
      </div>
      <input type="text" name="reason" placeholder="Reason (optional), e.g. Shadow, Poison, Ray of Enfeeblement">
      <div class="nm-amod-options">
        <select name="expiry">
          ${Object.entries(EXPIRIES).map(([k, l]) => `
            <option value="${k}" ${k === CFG.defaultExpiry ? "selected" : ""}>${esc(l)}</option>`).join("")}
        </select>
        <label><input type="checkbox" name="perTarget"> Roll per creature</label>
      </div>
      <p class="nm-amod-hint">Drain never goes below 0. Each application is a separate effect with its own end.</p>
      <div class="nm-amod-preview"></div>
    </div>`;

  let busy = false;
  const dialog = new DialogV2({
    window: { title: `Ability Drain / Buff (${targets.length} selected)`, icon: "fa-solid fa-dumbbell" },
    position: { width: 500 },
    form: { closeOnSubmit: false },
    content,
    buttons: [
      { action: "apply", label: "Apply", icon: "fa-solid fa-check", default: true, callback: onApply },
      { action: "undo", label: "Undo Last", icon: "fa-solid fa-rotate-left", type: "button", callback: onUndo },
      { action: "clear", label: "Clear All", icon: "fa-solid fa-trash", type: "button", callback: onClear },
      { action: "close", label: "Close", icon: "fa-solid fa-xmark", type: "button",
        callback: (_event, _button, d) => d.close() }
    ]
  });
  await dialog.render({ force: true });

  const root = dialog.element;
  const container = root.querySelector(".nm-amod");
  const formulaInput = root.querySelector("[name=formula]");
  const reasonInput = root.querySelector("[name=reason]");
  const expirySelect = root.querySelector("[name=expiry]");
  const perTargetBox = root.querySelector("[name=perTarget]");
  const preview = root.querySelector(".nm-amod-preview");

  const getMode = () => (container.classList.contains("raise") ? "raise" : "drain");
  const getKeys = () => [...root.querySelectorAll("[data-ability][aria-pressed=true]")].map(b => b.dataset.ability);
  const getFormula = () => formulaInput.value.trim() || "1";

  root.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
    root.querySelectorAll("[data-mode]").forEach(o => o.setAttribute("aria-pressed", String(o === b)));
    container.classList.toggle("drain", b.dataset.mode === "drain");
    container.classList.toggle("raise", b.dataset.mode === "raise");
    refreshPreview();
  }));
  root.querySelectorAll("[data-ability]").forEach(b => b.addEventListener("click", () => {
    b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
    refreshPreview();
  }));
  root.querySelectorAll("[data-amod-quick]").forEach(b => b.addEventListener("click", () => {
    formulaInput.value = b.dataset.amodQuick;
    refreshPreview();
  }));
  formulaInput.addEventListener("input", foundry.utils.debounce(refreshPreview, 200));
  preview.addEventListener("click", event => {
    const button = event.target.closest("[data-amod-remove]");
    const target = button && targets.find(t => t.actor.uuid === button.dataset.amodRemove);
    if ( !target ) return;
    guarded(() => runAll("Ability modifier removed", t => removeEntry(t, button.dataset.effect), "", [target]));
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
    const keys = getKeys();
    const formula = getFormula();
    if ( !keys.length ) return ui.notifications.warn(`Select at least one ability.`);
    if ( !formulaRange(formula) ) return ui.notifications.warn(`"${formula}" is not a valid formula.`);

    const sign = getMode() === "drain" ? -1 : 1;
    const options = { reason: reasonInput.value.trim(), expiry: expirySelect.value, formula };
    const title = sign < 0 ? "Ability scores drained" : "Ability scores raised";
    const flavor = `${CFG.label}: ${keys.map(k => ABILITIES[k].abbr).join(", ")}`;

    await guarded(async () => {
      if ( perTargetBox.checked ) {
        await runAll(title, async t => {
          const amount = await rollAmount(formula, `${flavor} – ${t.name}`);
          return amount ? applyTo(t, keys, sign * amount, options) : { changed: false, text: "rolled 0" };
        }, options.reason);
      } else {
        const amount = await rollAmount(formula, flavor);
        if ( !amount ) return ui.notifications.info(`Rolled 0, nothing applied.`);
        await runAll(title, t => applyTo(t, keys, sign * amount, options), options.reason);
      }
    });
  }

  async function onUndo() {
    await guarded(() => runAll("Last ability modifier undone", t => removeEntry(t)));
  }

  async function onClear() {
    const ok = await DialogV2.confirm({
      window: { title: "Ability Drain / Buff", icon: "fa-solid fa-dumbbell" },
      content: "<p>Remove every ability modifier from this macro on the selected creatures?</p>"
    });
    if ( ok ) await guarded(() => runAll("Ability modifiers cleared", clearOn));
  }

  function refreshPreview() {
    if ( !dialog.rendered ) return;
    const keys = getKeys();
    const range = formulaRange(getFormula());
    const sign = getMode() === "drain" ? -1 : 1;

    preview.innerHTML = targets.map(({ actor, name }) => {
      let changes = "";
      if ( !keys.length ) changes = `<span class="nm-amod-hint">Select abilities</span>`;
      else if ( !range ) changes = `<span class="nm-amod-zero">Invalid formula</span>`;
      else changes = keys.map(k => {
        const now = score(actor, k);
        const results = range.map(v => now + (clampDeltas(actor, [k], sign * Math.abs(v))[k] ?? 0));
        const lo = Math.min(...results);
        const hi = Math.max(...results);
        const result = lo === hi ? `${lo}` : `${lo}–${hi}`;
        return `<span>${ABILITIES[k].abbr} ${now} → <span class="nm-amod-new ${lo <= 0 ? "nm-amod-zero" : ""}">${result}</span></span>`;
      }).join("");

      const history = readEntries(actor).map(({ effect, deltas, reason }) => `
        <li>
          <span>${esc(deltaText(deltas))}${reason ? ` – ${esc(reason)}` : ""}
            <span class="nm-amod-hint">(${esc(endLabel(effect))})</span></span>
          <button type="button" data-amod-remove="${actor.uuid}" data-effect="${effect.id}"
            data-tooltip="Remove this modifier"><i class="fa-solid fa-xmark"></i></button>
        </li>`).join("");

      return `
        <div class="nm-amod-row">
          <div class="nm-amod-line"><strong>${esc(name)}</strong>${changes}</div>
          ${history ? `<ol class="nm-amod-history">${history}</ol>` : ""}
        </div>`;
    }).join("");
  }
})();