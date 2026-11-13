/**
 * Nik's Macros - automatic updates for imported macros.
 *
 * A macro dragged from one of this module's compendiums to the hotbar or the Macros sidebar remembers where it came
 * from (`_stats.compendiumSource`). After a module update, the active GM's client updates those world copies to the new
 * compendium version, without asking, and whispers a summary to the GMs.
 *
 * - Only copies whose script is a version this module shipped are updated (see known-versions.mjs). A copy that was
 *   edited in the world is left alone and listed in the summary.
 * - The script and (if it wasn't changed in the world) the icon are updated. The copy keeps its id, so hotbar slots
 *   stay, and its name, folder and permissions.
 * - Runs once per module version, on the active GM's client only. Can be switched off in the module settings.
 */
import { fingerprint } from "./fingerprint.mjs";
import KNOWN_VERSIONS from "./known-versions.mjs";

const MODULE_ID = "niks-macros";
const SOURCE_PREFIX = `Compendium.${MODULE_ID}.`;

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoUpdate", {
    name: "NIKS_MACROS.Settings.AutoUpdate.Name",
    hint: "NIKS_MACROS.Settings.AutoUpdate.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, "lastCheckedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.once("ready", async () => {
  if ( !game.user.isActiveGM ) return;
  if ( !game.settings.get(MODULE_ID, "autoUpdate") ) return;
  const version = game.modules.get(MODULE_ID).version;
  if ( game.settings.get(MODULE_ID, "lastCheckedVersion") === version ) return;
  try {
    await updateImportedMacros();
    await game.settings.set(MODULE_ID, "lastCheckedVersion", version);
  } catch ( err ) {
    console.error(`${MODULE_ID} | Updating imported macros failed`, err);
    ui.notifications.error(game.i18n.localize("NIKS_MACROS.Update.Failed"));
  }
});

/**
 * Update the world copies of this module's macros to the current compendium versions.
 * @returns {Promise<{updated: Macro[], edited: Macro[]}>}
 */
async function updateImportedMacros() {
  const linked = game.macros.filter(m => m._stats.compendiumSource?.startsWith(SOURCE_PREFIX));
  if ( !linked.length ) return { updated: [], edited: [] };

  // Current compendium versions. Packs for another game system aren't loaded, so their copies are skipped.
  const sources = new Map();
  for ( const pack of game.packs ) {
    if ( (pack.metadata.packageName !== MODULE_ID) || (pack.documentName !== "Macro") ) continue;
    for ( const doc of await pack.getDocuments() ) sources.set(doc.uuid, doc);
  }

  const updates = [];
  const updated = [];
  const edited = [];
  for ( const macro of linked ) {
    const source = sources.get(macro._stats.compendiumSource);
    if ( !source ) continue; // removed from the compendium, or a pack of another system
    const known = KNOWN_VERSIONS[source.id] ?? { scripts: [], icons: [] };
    const update = {};

    const script = fingerprint(macro.command);
    if ( script !== fingerprint(source.command) ) {
      if ( !known.scripts.includes(script) ) {
        edited.push(macro);
        continue;
      }
      update.command = source.command;
    }
    // Only replace an icon that is one this module shipped; a custom icon stays.
    if ( (macro.img !== source.img) && known.icons.includes(macro.img) ) update.img = source.img;

    if ( foundry.utils.isEmpty(update) ) continue;
    updates.push({ _id: macro.id, ...update });
    updated.push(macro);
  }

  if ( updates.length ) await Macro.implementation.updateDocuments(updates);
  if ( updated.length || edited.length ) await whisperSummary(updated, edited);
  return { updated, edited };
}

/**
 * Whisper the result to all GMs.
 * @param {Macro[]} updated
 * @param {Macro[]} edited
 */
async function whisperSummary(updated, edited) {
  const esc = foundry.utils.escapeHTML;
  const i18n = game.i18n;
  const list = macros => `<ul>${macros.map(m => `<li>@UUID[${m.uuid}]{${esc(m.name)}}</li>`).join("")}</ul>`;
  const version = game.modules.get(MODULE_ID).version;
  let content = `<h3><i class="fa-solid fa-scroll"></i> ${esc(i18n.format("NIKS_MACROS.Update.Title", { version }))}</h3>`;
  if ( updated.length ) content += `<p>${esc(i18n.localize("NIKS_MACROS.Update.Updated"))}</p>${list(updated)}`;
  if ( edited.length ) content += `<p>${esc(i18n.localize("NIKS_MACROS.Update.Edited"))}</p>${list(edited)}`;
  await ChatMessage.implementation.create({
    speaker: { alias: game.modules.get(MODULE_ID).title },
    whisper: ChatMessage.implementation.getWhisperRecipients("GM").map(u => u.id),
    content
  });
}
