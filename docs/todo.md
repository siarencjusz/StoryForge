# StoryForge — Todo, Technical Debt & Open Questions

> **Last Updated**: April 3, 2026

This document tracks unfinished work, known weak points, and items needing decisions. Resolved items are removed — see git history for past issues.

---

## Code Review — Refactoring Plan

Execution order: High → Medium → Low. Check off items as completed.

### 🔴 Phase 1 — High Impact (core maintainability)

- [x] **#1 — Add `immer` middleware to `projectStore.ts`** ✅ 788 → 484 lines (−304)
  - **Problem:** 5-level immutable spread boilerplate repeated in 11 store actions (`addStage`, `updateStageInput`, `deleteStage`, `renameStage`, `reorderStages`, `addVersion`, `selectVersion`, `deleteVersion`, `renameVersion`, `reorderVersions`, `updateVersionContent`). Each action is ~15 lines of nesting.
  - **Fix:** `npm i immer`, add Zustand `immer` middleware, convert all `set(state => ({ ...spread }))` to direct `set(state => { state.x = y })` mutations on draft.
  - **Estimated savings:** ~200 lines removed. File goes from 788 → ~550 lines.
  - **Prerequisite:** Add store action tests first (currently none exist) to catch regressions.

- [x] **#2 — Extract `prepareGeneration()` helper in `EditorPanel.tsx`** ✅ 513 → 464 lines (−49), also fixed #8 (removed pointless `useCallback` wrapper)
  - **Problem:** `handleGenerateNew` (L109–148), `handleRegenerate` (L150–184), `handleContinue` (L186–221) share ~80% identical preamble: null-check activeStage/selection, get freshBlocks, get stage, check activeConfig, resolve references, check errors.
  - **Fix:** Extract shared logic into a `prepareGeneration()` helper returning `{ resolved, stage }` or `null`. Each handler shrinks from ~35 to ~10 lines.
  - **Estimated savings:** ~60 lines removed.

### 🟡 Phase 2 — Medium Impact (repeated UI patterns)

- [x] **#3 — Create `useDragReorder` hook** (`src/hooks/useDragReorder.ts`) ✅
  - Drag-and-drop state machine (draggedIndex + dragOverIndex + 5 event handlers + CSS) extracted into reusable hook. Used in: StageTabs, OutputSection.

- [x] **#4 — Create `useInlineEdit` hook** (`src/hooks/useInlineEdit.ts`) ✅
  - Inline rename state (`editingItem` + `editingName` + `nameError` + Enter/Escape/Blur + `validateName()`) extracted into reusable hook. Used in: TreePanel (categories + blocks), StageTabs, OutputSection.

- [x] **#5 — Extract `<Modal>` component** (`src/components/Modal.tsx`) ✅
  - Reusable modal overlay with Escape-key and click-outside handling. Used in: NewProjectDialog, PromptPreviewModal, LLMSettingsPanel.

- [x] **#6 — Decompose `App.tsx`** (316 lines → ~160) ✅
  - Extracted `<Header>` component, `<NewProjectDialog>` component, and `useKeyboardShortcuts` hook.

- [x] **#7 — Extract `useResize` hook** (`src/hooks/useResize.ts`) ✅
  - Panel resize logic (mousedown → mousemove → mouseup with clamping) extracted into reusable hook. Used in: App.tsx (tree/dep panels), EditorPanel.tsx (input height).

### 🟢 Phase 3 — Low Impact (polish & correctness)

- [x] **#8 — Remove pointless `useCallback` wrapper** in EditorPanel.tsx L223–225 ✅ Done as part of #2
  - `handleStopGeneration` wraps a stable Zustand function unnecessarily.

- [x] **#9 — Extract `parseRef()` helper** in `referenceUtils.ts` ✅
  - `ref.split(':')` + `parts.length` branching centralized into `parseRef(ref): { category?, block, stage? }`. Refactored 6 call sites in referenceUtils.ts + 1 in DependencyPanel.tsx.

- [x] **#10 — Define constants for magic strings** (`src/constants.ts`) ✅
  - Created `src/constants.ts` with `DEFAULT_STAGE_PRIORITY`, `DEFAULT_STAGE_NAME`, `VERSION_PREFIX`, and `nextVersionKey()`. Updated referenceUtils.ts and EditorPanel.tsx.

- [x] **#11 — Remove or fix `getProjectForExport()`** in projectStore.ts ✅
  - Was a no-op that reconstructed `state.project` key-by-key with identical values. Simplified to `return get().project` — callers serialize to JSON so no copy-safety needed.

- [x] **#12 — Add File System Access API type declarations** ✅
  - Created `src/types/file-system-access.d.ts` with `Window.showOpenFilePicker` and `Window.showSaveFilePicker` declarations. Removed `(window as any)` casts in fileUtils.ts.

- [x] **#13 — Replace `alert()` / `confirm()` with toast system** ✅
  - Installed `sonner`, added `<Toaster>` to App.tsx. Replaced all 6 `alert()` calls with `toast.error()` across EditorPanel, LLMSettingsPanel, and fileUtils. `confirm()` calls left as-is (synchronous destructive-action gates — async dialog refactor deferred).

- [x] **#14 — Fix ESLint missing deps** in LLMSettingsPanel.tsx ✅
  - Changed auto-ping `useEffect` to read `configs` and `pingConfig` via `useLLMStore.getState()` inside the effect body, eliminating the closure dependency and satisfying exhaustive-deps with `[]`.

- [x] **#15 — Use `parseReferences()` in DependencyPanel.tsx** ✅
  - Added `stripReferences()` utility to referenceUtils.ts. Replaced inline `REFERENCE_PATTERN` usage in DependencyPanel with `stripReferences()`, removed `REFERENCE_PATTERN` from its imports.

---

## Technical Debt

_Tracked above in the refactoring plan._

---

## Deferred Features

- **`[block:stage]` two-part reference syntax**: Currently `[a:b]` always resolves as `category:block`. `block:stage` support deferred.
- **Undo/Redo**: Low priority. Versions already preserve generation history.
- **Pre-built prompt templates**: Shipping with a starter instruction library.
- **Stale block detection**: Mark blocks whose dependencies have changed since last generation.
- **Regeneration cascade**: Optionally regenerate dependent blocks when a dependency changes.
