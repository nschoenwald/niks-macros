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
| Adjust NPC initiative | Adds or subtracts 5 from the initiative of all non-player combatants that have rolled. |
| Apply selected token's setting to all NPC tokens | Copies bars, name display, vision, disposition and scale of one selected token to the NPC tokens in all scenes, after a preview. |
| Batch change scene transitions | Sets one transition effect (or none) and duration (500–10,000 ms) on every scene. |
| Clean up unused world settings | Lists world settings of uninstalled modules (pre-selected) and of disabled modules (not selected), downloads a JSON backup and deletes the ones you pick. |
| Delete chat by timestamp | Deletes chat messages newer or older than a chosen time, with a preview and a confirmation. |
| Delete selected Templates | Lists the templates (and template regions) on the scene by creator, shape and size; focus or delete them. |
| Grid Scaler V14 | Changes the grid size of the scene you are viewing and moves everything on it (tokens, walls, lights, sounds, tiles, drawings, notes, regions), after making a backup copy. Light and sound ranges stay the same. |
| Next Turn / Previous Turn | Moves the combat tracker one turn forward or back (with a warning when no combat is running). |
| Random Target | Picks a random visible player-owned or friendly token, each with the same chance, and targets it. |
| Reload World | Asks to reload the world for everyone. |
| Scale Tile Image Size | Resizes the selected tile to its image size times a factor. |
| Thumbnail Refresh | Regenerates the thumbnails of the world's scenes and of the scenes in the world's own compendiums. |
| Token Light Picker | Gives the selected tokens a light source: torch, lamp, lanterns, Light cantrip and more. |
| Token Size Picker | Sets the size of the selected tokens from Tiny (½ square) to Gargantuan; Small tokens are shown at 80 %. |
| Wall Duplicate Cleanup | Removes walls with identical coordinates, keeping doors over plain walls and leaving walls with different settings alone. Dry run and JSON backup included. |

## Nik's Macros (DnD5e)

For the D&D 5e system.

| Macro | What it does |
|---|---|
| Alert Feat (Swap Player Initiative) | Swaps the initiative of a character with the Alert feat and another character. |
| Battle Medic (Healer Feat 2024) | The selected healer treats a character: the patient spends one Hit Die, healed for the roll (1s rerolled) plus the healer's Proficiency Bonus. |
| Convert currency to gp | Converts the coins of the chosen characters into as many whole gold pieces as possible, with a live before/after preview. |
| EXP value of selected enemies | Totals the XP of the selected hostile NPCs and rates the encounter difficulty with the 2024 DMG budgets. |
| Monster HP calculation | Whispers a table of average HP for a range of Hit Dice, using the open NPC sheet as defaults. Click a formula to roll it. |
| Monster: Ability Drain / Buff | Lowers or raises ability scores (flat numbers or dice). Each application is its own effect that ends on a short or long rest, after a set time or never; with history, undo and clear. |
| Monster: TempHPMax | Lowers maximum HP with a stacking effect (Specter, Wraith…) that ends on a long rest; undo gives back the lost HP, and the amount can come from the last damage roll. |
| Roll Hit Points (Scene Tokens / Selected Tokens) | Rolls HP from the HP formula for unlinked NPC tokens. |
| Scale HP (selected NPC tokens) | Scales current and/or maximum HP of the selected NPCs by a percentage of their original HP; 100 % restores it. |
| Tandem Footwork | Rolls the bard's Bardic Inspiration die and adds it to the initiative of allies, optionally only those within 30 ft of the selected bard. |
| Update all token bars | Sets every token to show its name and HP bar to the owner, and updates the NPC prototype tokens. |
| XP Distribution | Awards XP to the chosen characters, split or to each, with a preview and a chat summary. |
