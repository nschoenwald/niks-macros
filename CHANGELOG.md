# Changelog

All notable changes to this project will be documented in this file.

## [14.6.0] - 2026-11-13
### Changed
- The module is now called **Nik's Macros** (it was "Content: Macros") in the module list, the settings and the update whisper. Nothing else changes, and macros you already imported keep working.

## [14.5.0] - 2026-11-13
### Added
- **Automatic updates of imported macros**: Macros you imported from these compendiums now update themselves when a new version of the module comes out. The next time a GM loads the world, they're replaced with the new version (name, folder, permissions, hotbar slot and custom icons stay) and the GMs get a whisper listing them. Macros you changed in your world are never overwritten; they're listed in the whisper instead. Can be turned off in the module settings.

## [14.4.0] - 2026-11-09
### Added
- **Simplify Region Shapes**: Cleans up regions built from many overlapping shapes and holes. Overlapping and touching shapes become one polygon, holes are cut into it, and holes or shapes that make no difference are removed, so the region covers exactly the same area with far fewer shapes. Shapes that touch nothing else stay as they are (a lone circle stays an editable circle), tiny slivers can be dropped, and Restore brings back the old shapes. Regions limited by walls keep that setting.

## [14.3.0] - 2026-11-08
### Changed
- **All macros**: Every macro now uses the same kind of dialog, follows your light or dark theme (no more dark-only colours), and uses the same wording for "GM only", "select a token" and "no combat". Results show as one notification, and chat summaries share one layout.
- **Compendiums**: Macros are sorted into folders (System-neutral: Combat, Scene, Tokens, World; DnD5e: Combat, Hit Points, Drain & Buffs, Experience & Treasure, Tokens) and have shorter, consistent names, for example "Monster: TempHPMax" is now **Max HP Drain** and "EXP value of selected enemies (difficulty calculation)" is now **Encounter XP & Difficulty**. Copies you already imported into your world keep their old names.
- **Next Turn / Previous Turn**, **Random Target**, **Battle Medic**, **Roll NPC HP**: New icons. Next and Previous Turn no longer load their icons from an external website.
- **Copy Token Settings to NPCs** (was "Apply selected token's setting to all NPC tokens"): Choose this scene or all scenes, and whether to copy the image scale. Detection modes are now copied exactly. Works in any system (NPC = token without a player owner).
- **Delete Chat by Time**: Shows the cutoff date and how many messages you can delete while you type.
- **Delete Templates**: Shows sizes in scene units and finds templates reliably.
- **Token Light Picker**: Stays open so you can try several lights, and each button shows the light's colour.
- **Roll NPC HP (Scene / Selected)**: Whispers the rolled HP to the GMs, uses the NPC's roll data in the formula, and the Scene version asks before replacing HP.
- **Encounter XP & Difficulty**: Preselects the average level of the players' characters.
- **Convert Currency to Gold**: Characters are picked with checkboxes and a search, with a before/after table.
- **Refresh Scene Thumbnails** and **Update All Token Bars**: Ask for confirmation before they start.

### Fixed
- **Delete Templates**: Deleting templates no longer risks canvas errors.

## [14.2.0] - 2026-11-08
### Fixed
- **Clean up unused world settings**: No longer pre-selects modules that are only disabled. Their settings are listed separately and stay unless you tick them, settings of world scripts are never listed, and a backup of everything deleted is downloaded first.
- **Grid Scaler V14**: Scales the scene you are viewing (it used the scene active for players). Light and sound ranges no longer grow or shrink with the grid, ambient sounds now move with the scene, and every region shape keeps its size and place.
- **Thumbnail Refresh**: Only changes your world's scenes and compendiums. Compendiums of the system and of modules are no longer unlocked or changed, and locked compendiums are always locked again.
- **Wall Duplicate Cleanup**: Never removes a door that sits on top of a plain wall. Overlapping walls with different settings are kept and listed for you to check.
- **Token Size Picker**: Tiny and Small work again (Tiny is half a square, Small is shown at 80 %), and mirrored token images stay mirrored. The non-5e "Colossal" size is gone.
- **Batch change scene transitions**: Short durations no longer make the whole update fail (Foundry needs at least 500 ms). Transition names are shown properly, and "None" is available.
- **Battle Medic (Healer Feat 2024)**: Follows the 2024 rules: the patient spends one Hit Die and heals the roll plus the healer's Proficiency Bonus (it used the patient's bonus and allowed several dice). Extra Hit Dice now count.
- **Scale HP (selected NPC tokens)**: Percentages no longer stack on linked NPCs: each one applies to the NPC's original HP, and 100 % restores it.
- **Tandem Footwork**: Adds the d6, defaults to the bard's own Bardic Inspiration die, and can limit the bonus to allies within 30 ft of the selected bard.
- **Adjust NPC initiative**: Combatants that haven't rolled initiative are left alone (they got 5 or −5).
- **Random Target**: Every token has the same chance (the last one used to be more likely), hidden tokens are skipped, and it works in any system.
- **Update all token bars**: No longer sets bar 2 to AC, which Foundry can't show as a bar. Bar 2 is left as it is.
- **Monster HP calculation**: The formulas in the chat table are now roll buttons that keep working after a reload (the copy buttons stopped working).
- **Next Turn / Previous Turn**: Show a warning instead of an error when no combat is running.

## [14.1.1] - 2026-11-08
### Added
- The module is now on GitHub and can be installed and updated with its manifest URL (see the README). It is not listed in Foundry's package list.
