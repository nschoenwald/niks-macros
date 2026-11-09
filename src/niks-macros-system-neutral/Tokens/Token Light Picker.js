// Token Light Picker - Foundry V14
// Gives the selected tokens a light source. Ranges are in feet (D&D 5e values); the coloured edge of each button
// shows the light's colour. The dialog stays open, so you can try several lights.

const selected = canvas.tokens.controlled;
if ( !selected.length ) return ui.notifications.warn("Select at least one token.");

const torch = (speed, intensity) => ({ type: "torch", speed, intensity });
const lights = [
  { id: "none", label: "None", icon: "fa-solid fa-ban", color: null, hint: "No light",
    config: { dim: 0, bright: 0, color: null, alpha: 0.5, angle: 360, animation: { type: null } } },
  { id: "torch", label: "Torch", icon: "fa-solid fa-fire", color: "#ff830f", hint: "Bright 20 ft, dim 40 ft",
    config: { dim: 40, bright: 20, color: "#ff830f", alpha: 0.3, angle: 360, animation: torch(5, 5) } },
  { id: "lamp", label: "Lamp", icon: "fa-solid fa-lightbulb", color: "#ffa200", hint: "Bright 15 ft, dim 45 ft",
    config: { dim: 45, bright: 15, color: "#ffa200", alpha: 0.3, angle: 360, animation: torch(3, 3) } },
  { id: "bullseye", label: "Bullseye Lantern", icon: "fa-solid fa-bullseye", color: "#ffa200",
    hint: "Bright 60 ft, dim 120 ft, 45° cone",
    config: { dim: 120, bright: 60, color: "#ffa200", alpha: 0.3, angle: 45, animation: torch(3, 3) } },
  { id: "hooded", label: "Hooded Lantern", icon: "fa-solid fa-lightbulb", color: "#ffa200", hint: "Bright 30 ft, dim 60 ft",
    config: { dim: 60, bright: 30, color: "#ffa200", alpha: 0.3, angle: 360, animation: torch(3, 3) } },
  { id: "hoodedClosed", label: "Hooded (Closed)", icon: "fa-solid fa-eye-slash", color: "#ffa200", hint: "Dim 5 ft",
    config: { dim: 5, bright: 0, color: "#ffa200", alpha: 0.3, angle: 360, animation: torch(3, 3) } },
  { id: "light", label: "Light Cantrip", icon: "fa-solid fa-wand-magic-sparkles", color: "#fffab8",
    hint: "Bright 20 ft, dim 40 ft",
    config: { dim: 40, bright: 20, color: "#fffab8", alpha: 0.5, angle: 360, animation: torch(2, 1) } },
  { id: "moon", label: "Moon-Touched", icon: "fa-solid fa-moon", color: "#38c0f3", hint: "Bright 15 ft, dim 30 ft",
    config: { dim: 30, bright: 15, color: "#38c0f3", alpha: 0.5, angle: 360, animation: torch(1, 1) } },
  { id: "sunlight", label: "Sunlight", icon: "fa-solid fa-sun", color: "#fff45c", hint: "Bright 30 ft, dim 60 ft",
    config: { dim: 60, bright: 30, color: "#fff45c", alpha: 0.6, angle: 360, animation: torch(1, 5) } },
  { id: "starry", label: "Starry Form", icon: "fa-solid fa-star", color: "#d3a84a", hint: "Bright 10 ft, dim 20 ft",
    config: { dim: 20, bright: 10, color: "#d3a84a", alpha: 0.2, angle: 360, animation: { type: "sunburst", speed: 1, intensity: 5 } } }
];

async function apply(light) {
  const updates = selected.map(t => ({ _id: t.id, light: light.config }));
  await canvas.scene.updateEmbeddedDocuments("Token", updates);
  ui.notifications.info(`${light.label} set on ${updates.length} token(s).`);
}

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-light-picker .form-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 0.375rem; }
    .nm-light-picker .form-footer button { border-left-width: 6px; justify-content: flex-start; }
  </style>
  <p class="hint">${selected.length} token(s) selected. Click a light to apply it; the dialog stays open.</p>`;

const dialog = new foundry.applications.api.DialogV2({
  window: { title: "Token Light Picker", icon: "fa-solid fa-lightbulb" },
  classes: ["nm-light-picker"],
  position: { width: 420 },
  form: { closeOnSubmit: false },
  content,
  buttons: [
    ...lights.map(l => ({
      action: l.id, label: l.label, icon: l.icon, type: "button", tooltip: l.hint,
      style: l.color ? { "border-left-color": l.color } : {},
      callback: () => apply(l)
    })),
    { action: "close", label: "Close", icon: "fa-solid fa-xmark", type: "button", callback: (_e, _b, d) => d.close() }
  ]
});
await dialog.render({ force: true });
