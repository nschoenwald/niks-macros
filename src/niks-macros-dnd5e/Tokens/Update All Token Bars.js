// Update All Token Bars - Foundry V14 + D&D 5e 6.x (GM only)
// Sets name/bar visibility and the bar attributes on every placed token in every scene, and on the
// prototype tokens of all NPC actors.
//
// Token bars need a value AND a maximum. AC has no maximum, so an AC bar is never drawn; bar 2 is therefore left
// as it is by default. Set BAR2 to a bar-type attribute (e.g. "resources.primary") or to "" to clear it.

const DISPLAY_NAME = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
const DISPLAY_BARS = CONST.TOKEN_DISPLAY_MODES.OWNER;
const BAR1 = "attributes.hp";
const BAR2 = null; // null = leave unchanged

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can update all tokens.");

const ok = await foundry.applications.api.DialogV2.confirm({
  window: { title: "Update All Token Bars", icon: "fa-solid fa-bars-progress" },
  content: `<p>Set every token in every scene (and every NPC prototype token) to show its name on hover and its HP bar
    to the owner?</p>`
});
if ( !ok ) return;

const wanted = { displayName: DISPLAY_NAME, displayBars: DISPLAY_BARS, "bar1.attribute": BAR1 };
if ( BAR2 !== null ) wanted["bar2.attribute"] = BAR2 || null;
const differs = data => Object.entries(wanted).some(([k, v]) => foundry.utils.getProperty(data, k) !== v);

let tokenCount = 0;
for ( const scene of game.scenes ) {
  const updates = scene.tokens.filter(t => t.actor && differs(t)).map(t => ({ _id: t.id, ...wanted }));
  if ( !updates.length ) continue;
  await scene.updateEmbeddedDocuments("Token", updates);
  tokenCount += updates.length;
}

const actorUpdates = game.actors.filter(a => (a.type === "npc") && differs(a.prototypeToken)).map(a => ({
  _id: a.id,
  ...Object.fromEntries(Object.entries(wanted).map(([k, v]) => [`prototypeToken.${k}`, v]))
}));
if ( actorUpdates.length ) await Actor.implementation.updateDocuments(actorUpdates);

if ( !tokenCount && !actorUpdates.length ) ui.notifications.info("All tokens already use these settings.");
else ui.notifications.info(`Updated ${tokenCount} placed token(s) and ${actorUpdates.length} NPC prototype token(s).`);
