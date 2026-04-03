# Agent Rules for StoryForge

This document contains guidelines for AI assistants operating on this project.

## Project Overview

StoryForge is a **tree-based story writing tool with LLM integration**. It is a **pure TypeScript/React frontend application** packaged with Electron for desktop distribution. There is **no Python backend**.

**Tech stack**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand (state) + js-yaml + Electron  
**Package manager**: npm  
**Testing**: Vitest  
**LLM integration**: Direct fetch to OpenAI-compatible `/v1/chat/completions` endpoints (browser-based, no server)  
**Distribution targets**: Both Electron desktop (Windows + Linux) and static web

## General Rules

1. **Read documentation first**: Before making changes, review relevant docs in `docs/`.
2. **Update documentation**: After significant changes, update the relevant docs to reflect the new state.
3. **This is a TypeScript/React project**: Do NOT use Python, pip, uv, or any Python tooling.

## Environment & Dependencies

- **Use `npm` for dependency management**:
  - Install: `npm install <package>`
  - Remove: `npm uninstall <package>`
  - Run dev server: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Test: `npm test` (single run) or `npm run test:watch` (watch mode)
  - Electron dev: `npm run electron:dev`

## Temporary Files

- **Keep temporary files in `tmp/`** at the project root.
- The `tmp/` folder is in `.gitignore`.
- Clean up temporary files when no longer needed.

## Documentation

- **Maintain up-to-date documentation** in the `docs/` folder:
  - `docs/design.md` — Overall design and architecture
  - `docs/decisions.md` — All design decisions and rationale
  - `docs/status.md` — Development status and completed features
  - `docs/schemas/schema_v1.md` — YAML schema specification
  - `docs/todo.md` — Technical debt, bugs, open questions, deferred features

## Code Style

- Follow standard TypeScript/React conventions.
- Use TypeScript types and interfaces for all data structures.
- Use JSDoc comments for public functions and utilities.
- Components use functional style with hooks.
- State management is via Zustand stores with persistence.

## Project Structure

```
src/
├── components/          # React components (TreePanel, EditorPanel, DependencyPanel, etc.)
├── store/               # Zustand stores (projectStore, llmStore, hintsStore)
├── services/            # API services (llmService)
├── types/               # TypeScript types (project.ts, llm.ts)
├── utils/               # Utilities (fileUtils, referenceUtils, tokenUtils, nameValidation)
│   └── __tests__/       # Unit tests (Vitest)
├── data/                # Static data (defaultProject)
├── App.tsx              # Main layout
├── main.tsx             # Entry point
└── index.css            # Tailwind styles + component classes
electron/
└── main.cjs             # Electron main process
```

## Key Design Patterns

- **Name validation**: Block, category, and stage names MUST be identifier-safe (`[a-zA-Z_][a-zA-Z0-9_]*`, max 64 chars). Validated in store (defensive) and UI (with error messages). See `src/utils/nameValidation.ts`.

- **Reference syntax**: `[block]`, `[category:block]`, `[category:block:stage]`. Two-part `[a:b]` always resolves as `category:block`. Regex pattern: `REFERENCE_PATTERN` in `referenceUtils.ts`.

- **Rename propagation**: When blocks or categories are renamed, all references across all stage inputs are automatically updated via `propagateBlockRename` / `propagateCategoryRename` in `referenceUtils.ts`.

- **System prompt**: Parsed from input text using `### SYSTEM:` / `### USER:` convention (in `llmService.ts`), NOT stored in LLM config.

## Before Coding

- Review relevant docs before implementing new features.
- Break down large tasks into smaller, manageable pieces.
- Run `npm run lint` and check for TypeScript errors before committing.
- Run `npm test` to verify existing tests pass before committing.
- Check `docs/todo.md` for related known issues before working in an area.
