# StoryForge — Todo, Technical Debt & Open Questions

> **Last Updated**: April 3, 2026

This document tracks unfinished work, known weak points, and items needing decisions. Resolved items are removed — see git history for past issues.

---

## Technical Debt

_No current items._

---

## Deferred Features

- **`[block:stage]` two-part reference syntax**: Currently `[a:b]` always resolves as `category:block`. `block:stage` support deferred.
- **Undo/Redo**: Low priority. Versions already preserve generation history.
- **Pre-built prompt templates**: Shipping with a starter instruction library.
- **Stale block detection**: Mark blocks whose dependencies have changed since last generation.
- **Regeneration cascade**: Optionally regenerate dependent blocks when a dependency changes.
