// Refresh Scene Thumbnails - Foundry V14 (GM only)
// Regenerates the thumbnails of all world scenes and of the scenes in this world's own compendiums.
// Compendiums of the system and of modules are left alone: changes there would be lost on the next update.
// Locked world compendiums are unlocked for the refresh and always locked again, even if something fails.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can refresh scene thumbnails.");

const packs = game.packs.filter(p => (p.metadata.type === "Scene") && (p.metadata.packageType === "world"));
const ok = await foundry.applications.api.DialogV2.confirm({
  window: { title: "Refresh Scene Thumbnails", icon: "fa-solid fa-image" },
  content: `<p>Regenerate the thumbnails of <strong>${game.scenes.size}</strong> world scene(s) and of the scenes in
    <strong>${packs.length}</strong> world compendium(s)?</p><p class="hint">This can take a while.</p>`
});
if ( !ok ) return;
const relock = packs.filter(p => p.locked);
let done = 0;
let failed = 0;

async function refresh(scene, label) {
  try {
    const t = await scene.createThumbnail();
    if ( t?.thumb ) {
      await scene.update({ thumb: t.thumb });
      done++;
    }
  } catch ( err ) {
    failed++;
    console.error(`Thumbnail Refresh | ${label}`, err);
  }
}

ui.notifications.info(`Refreshing thumbnails for ${game.scenes.size} world scene(s) and ${packs.length} compendium(s)…`);
try {
  for ( const scene of game.scenes ) await refresh(scene, scene.name);
  for ( const pack of relock ) await pack.configure({ locked: false });
  for ( const pack of packs ) {
    for ( const scene of await pack.getDocuments() ) await refresh(scene, `${pack.title}: ${scene.name}`);
  }
} finally {
  for ( const pack of relock ) await pack.configure({ locked: true });
}

if ( failed ) ui.notifications.error(`Refreshed ${done} thumbnail(s), ${failed} failed. See the console (F12).`);
else ui.notifications.info(`Refreshed ${done} scene thumbnail(s).`);
