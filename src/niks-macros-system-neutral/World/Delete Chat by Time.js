// Delete Chat by Time - Foundry V14
// Deletes chat messages newer or older than a chosen time, with a live count and a confirmation.
// A GM can delete every message; players only the ones they own.

const { DialogV2 } = foundry.applications.api;

const findMessages = ({ mode, days, hours, minutes }) => {
  const ms = (((days * 24) + hours) * 60 + minutes) * 60 * 1000;
  if ( ms <= 0 ) return null;
  const cutoff = Date.now() - ms;
  const inRange = game.messages.filter(m => (mode === "newer" ? m.timestamp >= cutoff : m.timestamp < cutoff));
  return { cutoff, found: inRange.length, deletable: inRange.filter(m => game.user.isGM || m.isOwner) };
};
const readForm = form => ({
  mode: form.elements.mode.value,
  days: Math.max(0, parseInt(form.elements.days.value) || 0),
  hours: Math.max(0, parseInt(form.elements.hours.value) || 0),
  minutes: Math.max(0, parseInt(form.elements.minutes.value) || 0)
});

// Passed as an element: string content is sanitised and would lose the <style> tag.
const content = document.createElement("div");
content.innerHTML = `
  <style>
    .nm-chat-time .nm-offset { display: flex; gap: 0.25rem; align-items: center; }
    .nm-chat-time .nm-offset input { width: 4rem; flex: none; }
    .nm-chat-time .nm-quick { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .nm-chat-time .nm-quick button { flex: none; width: auto; padding: 0 0.5rem; }
    .nm-chat-time .nm-count { color: var(--color-level-error); font-weight: bold; }
  </style>
  <div class="nm-chat-time">
    <div class="form-group">
      <label>Delete messages</label>
      <div class="form-fields">
        <select name="mode">
          <option value="newer">newer than</option>
          <option value="older">older than</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Time</label>
      <div class="form-fields nm-offset">
        <input type="number" name="days" value="0" min="0" step="1"> d
        <input type="number" name="hours" value="1" min="0" step="1"> h
        <input type="number" name="minutes" value="0" min="0" step="5"> min
      </div>
    </div>
    <div class="nm-quick">
      <button type="button" data-time="0,1,0">1 hour</button>
      <button type="button" data-time="1,0,0">24 hours</button>
      <button type="button" data-time="7,0,0">7 days</button>
      <button type="button" data-time="30,0,0">30 days</button>
    </div>
    <p class="hint">Cutoff: <span class="nm-cutoff">—</span><br>
      Found: <span class="nm-found">0</span> · You can delete: <span class="nm-count">0</span></p>
  </div>`;

const values = await DialogV2.wait({
  window: { title: "Delete Chat by Time", icon: "fa-solid fa-comment-slash" },
  position: { width: 440 },
  content,
  buttons: [{
    action: "delete", label: "Delete…", icon: "fa-solid fa-trash", default: true,
    callback: (_event, button) => readForm(button.form)
  }],
  rejectClose: false,
  render: (_event, dialog) => {
    const form = dialog.element.querySelector("form");
    const update = () => {
      const result = findMessages(readForm(form));
      form.querySelector(".nm-cutoff").textContent = result ? new Date(result.cutoff).toLocaleString() : "—";
      form.querySelector(".nm-found").textContent = result?.found ?? 0;
      form.querySelector(".nm-count").textContent = result?.deletable.length ?? 0;
      dialog.element.querySelector('[data-action="delete"]').disabled = !result?.deletable.length;
    };
    form.addEventListener("input", update);
    form.querySelectorAll("[data-time]").forEach(b => b.addEventListener("click", () => {
      const [d, h, m] = b.dataset.time.split(",");
      Object.assign(form.elements.days, { value: d });
      Object.assign(form.elements.hours, { value: h });
      Object.assign(form.elements.minutes, { value: m });
      update();
    }));
    update();
  }
});
if ( !values ) return;

const result = findMessages(values);
if ( !result?.deletable.length ) return ui.notifications.info("No messages to delete.");
const ok = await DialogV2.confirm({
  window: { title: "Delete Chat by Time", icon: "fa-solid fa-comment-slash" },
  content: `<p>Permanently delete <strong>${result.deletable.length}</strong> chat message(s)? This can't be undone.</p>`
});
if ( !ok ) return;

await ChatMessage.implementation.deleteDocuments(result.deletable.map(m => m.id));
ui.notifications.info(`Deleted ${result.deletable.length} chat message(s).`);
