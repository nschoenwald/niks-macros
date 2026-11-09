// Previous Turn - Foundry V14
if ( !game.combat ) return ui.notifications.warn("There is no active combat.");
if ( !game.combat.started ) return ui.notifications.warn("The combat hasn't started yet.");
await game.combat.previousTurn();
