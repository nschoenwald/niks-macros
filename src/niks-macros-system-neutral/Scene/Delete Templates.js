// Delete Templates - Foundry V14
// Lists the measured templates on the scene you are viewing (in V14 they are Regions marked as templates) by creator,
// shape and size. Focus one on the canvas, or delete the ones you tick. GM only.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can delete templates.");
const scene = canvas.scene;
if ( !scene ) return ui.notifications.warn("There is no scene to clean up.");

const esc = foundry.utils.escapeHTML;
const templates = scene.regions.filter(r => r.getFlag("core", "MeasuredTemplate"));
if ( !templates.length ) return ui.notifications.info("There are no templates on this scene.");

const units = scene.grid.units ? ` ${scene.grid.units}` : "";
const perPixel = scene.grid.distance / scene.grid.size;
const dist = px => `${Math.round(px * perPixel * 10) / 10}${units}`;
function describe(region) {
  const s = region.shapes[0];
  switch ( s?.type ) {
    case "circle": return ["Circle", `radius ${dist(s.radius)}`];
    case "cone": return ["Cone", `${dist(s.radius)}, ${s.angle}°`];
    case "rectangle": return ["Rectangle", `${dist(s.width)} × ${dist(s.height)}`];
    case "line": return ["Line", `${dist(s.length)} × ${dist(s.width)}`];
    case "emanation": return ["Emanation", `${dist(s.radius)}`];
    case "ring": return ["Ring", `radius ${dist(s.radius)}`];
    default: return [s?.type ?? "Region", "—"];
  }
}
// The creator is the first user in the region's ownership (as core does for templates).
const creator = region => game.users.get(Object.keys(region.ownership).find(k => k !== "default"))?.name ?? "Unknown";

const rows = templates.map(r => {
  const [shape, size] = describe(r);
  return { region: r, creator: creator(r), shape, size };
}).sort((a, b) => a.creator.localeCompare(b.creator) || a.shape.localeCompare(b.shape) || a.size.localeCompare(b.size));

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-templates .nm-scroll { max-height: 340px; overflow-y: auto; }
    .nm-templates table { width: 100%; border-collapse: collapse; }
    .nm-templates th, .nm-templates td { padding: 0.25rem 0.375rem; text-align: left;
      border-bottom: 1px solid var(--color-border); }
    .nm-templates td button { width: auto; padding: 0 0.5rem; }
    .nm-templates .nm-select { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; }
    .nm-templates .nm-select button { flex: none; width: auto; padding: 0 0.5rem; }
  </style>
  <div class="nm-templates">
    <div class="nm-select">
      <button type="button" data-select="all">Select all</button>
      <button type="button" data-select="none">Select none</button>
    </div>
    <div class="nm-scroll">
      <table>
        <thead><tr><th></th><th>Creator</th><th>Shape</th><th>Size</th><th></th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td><input type="checkbox" name="${r.region.id}" checked></td>
            <td>${esc(r.creator)}</td><td>${esc(r.shape)}</td><td>${esc(r.size)}</td>
            <td><button type="button" data-focus="${r.region.id}" data-tooltip="Pan to this template">
              <i class="fa-solid fa-crosshairs"></i></button></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

const ids = await foundry.applications.api.DialogV2.wait({
  window: { title: `Delete Templates (${rows.length})`, icon: "fa-solid fa-draw-polygon" },
  position: { width: 560 },
  content,
  buttons: [{
    action: "delete", label: "Delete Selected", icon: "fa-solid fa-trash", default: true,
    callback: (_event, button) => [...button.form.querySelectorAll("tbody input:checked")].map(i => i.name)
  }],
  rejectClose: false,
  render: (_event, dialog) => {
    const root = dialog.element;
    root.querySelectorAll("[data-select]").forEach(b => b.addEventListener("click", () => {
      root.querySelectorAll("tbody input").forEach(i => i.checked = b.dataset.select === "all");
    }));
    root.querySelectorAll("[data-focus]").forEach(b => b.addEventListener("click", () => {
      const shape = scene.regions.get(b.dataset.focus)?.shapes[0];
      if ( shape && Number.isFinite(shape.x) ) canvas.animatePan({ x: shape.x, y: shape.y, duration: 350 });
    }));
  }
});
if ( !ids?.length ) return;

try {
  await scene.deleteEmbeddedDocuments("Region", ids);
  ui.notifications.info(`Deleted ${ids.length} template(s).`);
} catch ( err ) {
  console.error("Delete Templates |", err);
  ui.notifications.error("Deleting the templates failed. See the console (F12).");
}
