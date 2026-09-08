# Localization contract

All new or modified player-facing copy must use semantic localization keys, including HUD, Canvas/Phaser text, accessibility labels, tutorials, errors, result screens and content-driven events. Do not concatenate translated sentence fragments. Use named ICU arguments, plural/select where appropriate, and locale-aware number/date formatting.

Required locales and Chinese fallback are defined in `src/i18n/locales.ts`. `zh-Hant` is independent. Explicit Simplified Chinese falls back to Traditional Chinese before English; unspecified Chinese selects Traditional Chinese. Other regional variants first resolve to their supported language, then English.

Only exceptions recorded in `game/localization-exceptions.json` are DNT. A new atmospheric-text exception needs product discussion; a Canvas/image rendering method does not itself make text exempt. Debug-only/internal error messages may remain literal when they cannot appear to players.

When changing copy, update all required catalogs, preserve placeholder names/types, update translation review metadata, regenerate font subsets and run `npm run i18n:check`, `npm run test:i18n`, and relevant browser localization checks. English fallback is resilience, not completion of required translations. Never mark machine translation as native-reviewed.

Keep core/catalog/font policy changes separate from cover layout changes. Main and `codex/cold-hospital-cover` must consume the same keys and runtime. Do not merge cover artwork or release manifests as part of localization.
