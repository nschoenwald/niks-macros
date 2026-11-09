// Token Size Picker - Foundry V14
// Sets the size of all selected tokens. Sizes follow D&D 5e: Tiny is half a square, Small is one square shown at
// 80 % (like dnd5e's own dynamic token scale). Mirrored token images stay mirrored.

const selected = canvas.tokens.controlled;
if ( !selected.length ) return ui.notifications.warn("Select at least one token.");

const sizes = [
  { action: "tiny", label: "Tiny", icon: "fa-solid fa-seedling", size: 0.5, scale: 1, hint: "½ × ½ square" },
  { action: "sm", label: "Small", icon: "fa-solid fa-cat", size: 1, scale: 0.8, hint: "1 × 1, shown at 80 %" },
  { action: "med", label: "Medium", icon: "fa-solid fa-user", size: 1, scale: 1, hint: "1 × 1" },
  { action: "lg", label: "Large", icon: "fa-solid fa-horse", size: 2, scale: 1, hint: "2 × 2" },
  { action: "huge", label: "Huge", icon: "fa-solid fa-hippo", size: 3, scale: 1, hint: "3 × 3" },
  { action: "grg", label: "Gargantuan", icon: "fa-solid fa-dragon", size: 4, scale: 1, hint: "4 × 4" }
];

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `<style>
    .nm-size-picker .form-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  </style>
  <p class="hint">${selected.length} token(s) selected. Pick a size.</p>`;

const choice = await foundry.applications.api.DialogV2.wait({
  window: { title: "Token Size Picker", icon: "fa-solid fa-up-right-and-down-left-from-center" },
  position: { width: 360 },
  classes: ["nm-size-picker"],
  content,
  buttons: sizes.map(s => ({ action: s.action, label: s.label, icon: s.icon, tooltip: s.hint })),
  rejectClose: false
});
const size = sizes.find(s => s.action === choice);
if ( !size ) return;

const updates = selected.map(t => {
  const { scaleX, scaleY } = t.document.texture;
  return {
    _id: t.id,
    width: size.size,
    height: size.size,
    "texture.scaleX": Math.sign(scaleX || 1) * size.scale,
    "texture.scaleY": Math.sign(scaleY || 1) * size.scale
  };
});
await canvas.scene.updateEmbeddedDocuments("Token", updates);
ui.notifications.info(`${size.label} set on ${updates.length} token(s).`);
