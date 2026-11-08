# Changelog

All notable changes to this project will be documented in this file.

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
