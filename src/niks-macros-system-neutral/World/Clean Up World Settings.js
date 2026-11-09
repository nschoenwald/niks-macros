// Clean Up World Settings - Foundry V14
// Lists world settings whose namespace has no matching package, grouped as:
// - Uninstalled modules (pre-selected): the module is no longer installed.
// - Disabled modules (not selected): the module is installed but turned off; its settings return when you enable it.
// Settings of core, the system, the world itself (world scripts) and active modules are never listed.
// A JSON backup of everything you delete is downloaded first.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can clean up world settings.");

const esc = foundry.utils.escapeHTML;
const keep = new Set(["core", game.system.id, game.world.id]);
const groups = new Map(); // namespace -> { status, docs }

for ( const setting of game.settings.storage.get("world") ) {
  const namespace = setting.key.split(".")[0];
  if ( keep.has(namespace) ) continue;
  const module = game.modules.get(namespace);
  if ( module?.active ) continue;
  const status = module ? "disabled" : "uninstalled";
  if ( !groups.has(namespace) ) groups.set(namespace, { status, title: module?.title ?? namespace, docs: [] });
  groups.get(namespace).docs.push(setting);
}

if ( !groups.size ) return ui.notifications.info("No unused module settings found.");

const section = (status, heading, hint) => {
  const entries = [...groups.entries()].filter(([, g]) => g.status === status)
    .sort(([a], [b]) => a.localeCompare(b));
  if ( !entries.length ) return "";
  const rows = entries.map(([ns, g]) => `
    <label class="checkbox">
      <input type="checkbox" name="${esc(ns)}" ${status === "uninstalled" ? "checked" : ""}>
      <span><strong>${esc(g.title)}</strong>${g.title !== ns ? ` <code>${esc(ns)}</code>` : ""} (${g.docs.length})</span>
    </label>`).join("");
  return `<fieldset><legend>${heading}</legend><p class="hint">${hint}</p>
    <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">${rows}</div>
  </fieldset>`;
};

// Passed as an element: string content is sanitised and would lose inline styles.
const content = document.createElement("div");
content.innerHTML = `
  ${section("uninstalled", "Uninstalled modules", "These modules are no longer installed.")}
  ${section("disabled", "Disabled modules",
    "Installed but turned off. Deleting resets their configuration if you enable them again.")}
  <p class="hint">A JSON backup of the deleted settings is downloaded before anything is removed.</p>`;

const selected = await foundry.applications.api.DialogV2.prompt({
  window: { title: "Clean Up World Settings", icon: "fa-solid fa-broom" },
  position: { width: 480 },
  content,
  rejectClose: false,
  ok: {
    icon: "fa-solid fa-trash",
    label: "Delete Selected",
    callback: (_event, button) => [...button.form.querySelectorAll("input[type=checkbox]:checked")].map(i => i.name)
  }
});
if ( !selected?.length ) return;

const docs = selected.flatMap(ns => groups.get(ns)?.docs ?? []);
foundry.utils.saveDataToFile(
  JSON.stringify({ world: game.world.id, date: new Date().toISOString(), settings: docs.map(d => d.toObject()) },
    null, 2),
  "application/json",
  `world-settings-backup-${game.world.id}-${Date.now()}.json`
);

await CONFIG.Setting.documentClass.deleteDocuments(docs.map(d => d.id));
ui.notifications.info(`Deleted ${docs.length} setting(s) from ${selected.length} module(s). Backup downloaded.`);
