# Nik's Macros

A collection of script macros for Foundry VTT V14, in two compendiums. Open a compendium, drag a macro to your hotbar
(or import it) and run it. Most macros are meant for the GM.

## Installation

In Foundry's **Install Module** dialog, paste this manifest URL:

```
https://github.com/nschoenwald/niks-macros/releases/latest/download/module.json
```

This module is only available here on GitHub, not in Foundry's package list.

## How the macros behave

- Every macro opens a Foundry dialog that follows your light or dark theme.
- Macros that only the GM can run say so when a player tries them, and those that need a selected token, a scene or
  a running combat tell you what's missing.
- Anything that deletes or overwrites a lot asks for confirmation first (No is the default), and some offer a dry run
  or a downloadable backup.
- Tools you adjust repeatedly (Token Light Picker, Scale NPC HP, Ability Drain / Buff, Max HP Drain) stay open until
  you close them.
- GM tools whisper their results to the GMs; results the table should see are posted to chat for everyone.

## Nik's Macros (System-neutral)

Works in any game system.

### Combat

| Macro | What it does |
|---|---|
| Adjust NPC Initiative | Adds or subtracts 5 from the initiative of all non-player combatants that have rolled. |
| Next Turn / Previous Turn | Moves the combat tracker one turn forward or back. |
| Random Target | Picks a random visible player-owned or friendly token, each with the same chance, and targets it. |

### Scene

| Macro | What it does |
|---|---|
| Delete Templates | Lists the templates on the scene by creator, shape and size; pan to one, or delete the ones you tick. |
| Grid Scaler | Changes the grid size of the scene you are viewing and moves everything on it (tokens, walls, lights, sounds, tiles, drawings, notes, regions), after making a backup copy. Light and sound ranges stay the same. |
| Lock / Unlock Drawings & Tiles | Locks or unlocks every drawing and tile on the scene. |
| Refresh Scene Thumbnails | Regenerates the thumbnails of the world's scenes and of the scenes in the world's own compendiums. |
| Remove Duplicate Walls | Removes walls with identical coordinates, keeping doors over plain walls and leaving walls with different settings alone. Dry run and JSON backup included. |
| Scale Tile to Image Size | Resizes the selected tile to its image's size times a factor. |
| Set Scene Transitions | Sets one transition effect (or none) and duration (500–10,000 ms) on every scene. |

### Tokens

| Macro | What it does |
|---|---|
| Copy Token Settings to NPCs | Copies the name and bar display, bars, disposition, vision and detection modes (optionally the image scale) of one selected token to the NPC tokens on this scene or all scenes, after a preview. |
| Token Light Picker | Gives the selected tokens a light source: torch, lamp, lanterns, Light cantrip and more. |
| Token Size Picker | Sets the size of the selected tokens from Tiny (½ square) to Gargantuan; Small tokens are shown at 80 %. |

### World

| Macro | What it does |
|---|---|
| Clean Up World Settings | Lists world settings of uninstalled modules (pre-selected) and of disabled modules (not selected), downloads a JSON backup and deletes the ones you pick. |
| Delete Chat by Time | Deletes chat messages newer or older than a chosen time, with a live count and a confirmation. |
| Reload World | Asks to reload the world for everyone. |

## Nik's Macros (DnD5e)

For the D&D 5e system.

### Combat

| Macro | What it does |
|---|---|
| Alert: Swap Initiative | Swaps the initiative of a player character with the Alert feat and another player character. |
| Battle Medic | The selected healer treats a character: the patient spends one Hit Die, healed for the roll (1s rerolled) plus the healer's Proficiency Bonus. |
| Tandem Footwork | Rolls the bard's Bardic Inspiration die and adds it to the initiative of allies, optionally only those within 30 ft of the selected bard. |

### Hit Points

| Macro | What it does |
|---|---|
| Monster HP Calculator | Whispers a table of average HP for a range of Hit Dice, using the open NPC sheet as defaults. Click a formula to roll it. |
| Roll NPC HP (Scene / Selected) | Rolls new HP from the HP formula for the unlinked NPC tokens on the scene or the selected ones, and whispers the results. |
| Scale NPC HP | Scales current and/or maximum HP of the selected NPCs by a percentage of their original HP; 100 % restores it. |

### Drain & Buffs

| Macro | What it does |
|---|---|
| Ability Drain / Buff | Lowers or raises ability scores (flat numbers or dice). Each application is its own effect that ends on a short or long rest, after a set time or never; with history, undo and clear. |
| Max HP Drain | Lowers maximum HP with a stacking effect (Specter, Wraith…) that ends on a long rest; undo gives back the lost HP, and the amount can come from the last damage roll. |

### Experience & Treasure

| Macro | What it does |
|---|---|
| Convert Currency to Gold | Converts the coins of the chosen characters into as many whole gold pieces as possible, with a before/after preview. |
| Encounter XP & Difficulty | Totals the XP of the selected hostile NPCs and rates the encounter for parties of 3, 4 and 5 with the 2024 DMG budgets. |
| XP Distribution | Awards XP to the chosen characters, split (rounded down) or to each, with a preview and a chat summary. |

### Tokens

| Macro | What it does |
|---|---|
| Update All Token Bars | Sets every token to show its name and HP bar to the owner, and updates the NPC prototype tokens. |

## Source code

Each macro's script is in [`src/`](src), one `.js` file per macro (with a `.json` file for its name, icon and
folder), sorted like the compendium folders. The compendiums in `packs/` are built from these files:

- `node tools/pack.mjs` builds the packs from `src/`, `node tools/unpack.mjs` does the reverse.
- `node tools/pack.mjs --check` reports whether both match. `node tools/lint.mjs` lints the macros.

Both pack tools need Foundry to be closed and the `classic-level` package (`npm install classic-level`).
