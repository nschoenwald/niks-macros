# Nik's Macros

A collection of script macros for Foundry VTT V14, in two compendiums. Open a compendium, drag a macro to your hotbar
(or import it) and run it. Most macros are meant for the GM.

## Installation

In Foundry's **Install Module** dialog, paste this manifest URL:

```
https://github.com/nschoenwald/niks-macros/releases/latest/download/module.json
```

This module is only available here on GitHub, not in Foundry's package list.

## Nik's Macros (System-neutral)

Works in any game system.

| Macro | What it does |
|---|---|
| (Un)lock all drawings & tiles | Locks or unlocks every drawing and tile on the current scene. |
| Adjust NPC initiative | Adds or subtracts 5 from the initiative of the NPC combatants. |
| Apply selected token's setting to all NPC tokens | Copies bars, name display, vision, disposition and scale of one selected token to the NPC tokens in all scenes, after a preview. |
| Batch change scene transitions | Sets one transition effect and duration on every scene. |
| Clean up unused world settings | Lists world settings of modules that aren't active and deletes the ones you pick. |
| Delete chat by timestamp | Deletes chat messages newer or older than a chosen time, with a preview and a confirmation. |
| Delete selected Templates | Lists the templates (and template regions) on the scene by creator, shape and size; focus or delete them. |
| Grid Scaler V14 | Changes the grid size of a scene and moves everything on it, after making a backup copy of the scene. |
| Next Turn / Previous Turn | Moves the combat tracker one turn forward or back. |
| Random Target | Rolls to pick a random player or friendly token and targets it. |
| Reload World | Asks to reload the world for everyone. |
| Scale Tile Image Size | Resizes the selected tile to its image size times a factor. |
| Thumbnail Refresh | Regenerates scene thumbnails. |
| Token Light Picker | Gives the selected tokens a light source: torch, lamp, lanterns, Light cantrip and more. |
| Token Size Picker | Sets the size of the selected tokens. |
| Wall Duplicate Cleanup | Finds and removes walls with identical coordinates, with a dry run and a JSON backup. |

## Nik's Macros (DnD5e)

For the D&D 5e system.

| Macro | What it does |
|---|---|
| Alert Feat (Swap Player Initiative) | Swaps the initiative of a character with the Alert feat and another character. |
| Battle Medic (Healer Feat 2024) | Spends Hit Dice of a character to heal them with the Healer feat's Battle Medic. |
| Convert currency to gp | Converts the coins of the chosen characters into as many whole gold pieces as possible, with a live before/after preview. |
| EXP value of selected enemies | Totals the XP of the selected hostile NPCs and rates the encounter difficulty with the 2024 DMG budgets. |
| Monster HP calculation | Whispers a table of average HP for a range of Hit Dice, using the open NPC sheet as defaults. |
| Monster: Ability Drain / Buff | Lowers or raises ability scores with Active Effects (flat numbers or dice), with history, undo and clear. The pack holds an older and a newer version. |
| Monster: Max HP Drain | Lowers maximum HP with a stacking Active Effect (Specter, Wraith…), with history, undo and clear. |
| Monster: TempHPMax | Newer version of the Max HP drain: ends on a long rest, gives back HP on undo, and can take the amount from the last damage roll. |
| Roll Hit Points (Scene Tokens / Selected Tokens) | Rolls HP from the HP formula for unlinked NPC tokens. |
| Scale HP (selected NPC tokens) | Scales current and/or maximum HP of the selected NPCs by a percentage. |
| Tandem Footwork | Rolls a die and adds it to the initiative of the player characters and friendly NPCs. |
| Update all token bars | Sets every token to show HP and its name to the owner, and updates the NPC prototype tokens. |
| XP Distribution | Awards XP to the chosen characters, split or to each, with a preview and a chat summary. |
