// Reload World - Foundry V14
// Asks whether to reload the world for every connected client. GM only.

if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can reload the world for everyone.");
await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: true });
