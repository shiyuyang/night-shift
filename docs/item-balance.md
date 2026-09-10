# Item usefulness and supplies

- Night 1–2: 4 flashes, 4 decoys, 2 bandages. Later nights: 2 of each, with the existing extra flash on supply nights.
- Cabinet pickups, supply commands and gift rewards do not cap carried item counts. A cabinet still yields its reward once. Action cooldowns remain separate from inventory capacity.
- Listener: flash interrupts for 1 second with knockback, clears the old sound target and ignores incoming footsteps during that interruption. Visible targets within the existing 190 px range are required. Walking hearing is 55 px unobstructed / 25 px occluded; running keeps its loud range.
- Patroller: flash keeps its 2-second stun. A nearby new decoy during visual pursuit causes a 0.65-second hesitation instead of a full redirect. Out of sight, the existing short investigation and recovery remain.
- Light-shy: flashlight recoil grants a 2.5-second escape window after turning away (previously 2 seconds), with the existing cooldown. Flash keeps its 4-second stun and knockback. A nearby new decoy interrupts for 0.65 seconds even during visual pursuit. An unseen decoy is investigated for at most 2 seconds per sound activation.
- Shared flash method serves both F and the repel command. Weeper flash behavior remains unchanged.
- Required locale catalogs and editorial overrides describe the listener interruption; updates are drafts, with no native review claimed. Font subsets regenerated.
- Checks: full CPU suite, build, localization/font and ICU tests, `tests/item-balance.browser.mjs` for game effects and high-count inventory, `tests/item-copy.browser.mjs` for all 29 guide locales.
