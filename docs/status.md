# StoryForge Development Status

> **Last Updated**: April 3, 2026

## Overview

StoryForge is a tree-based story writing tool with LLM integration for AI-powered content generation. It is a pure TypeScript/React frontend application packaged with Electron for desktop distribution (Windows + Linux) and also deployable as a static web app.

**Tech stack**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand + js-yaml + Electron  
**Testing**: Vitest (77 tests covering name validation, reference propagation, ambiguity detection)

## Completed Features

### Core UI
- [x] Three-panel layout (Tree, Editor, Dependencies)
- [x] Resizable panels with drag handles
- [x] Dark theme with custom color palette
- [x] Tutorial hints system (2s hover delay)

### Tree Panel
- [x] Category management (create, rename, delete, reorder)
- [x] Block management (create, rename, delete, duplicate)
- [x] Expand/collapse categories
- [x] Block selection and secondary panel comparison
- [x] Context menus for operations
- [x] Drag & drop reordering (categories and blocks)
- [x] Search/filter blocks by name

### Editor Panel
- [x] Stage tabs with add/rename/delete/reorder
- [x] Resizable input/output sections
- [x] Input textarea with reference syntax highlighting
- [x] Version management (add, rename, delete, reorder)
- [x] Version comparison (Shift+Click)
- [x] Token counting with breakdown per reference
- [x] Generation buttons (Generate New, Regenerate, Continue, Stop)
- [x] Prompt preview modal (resolved references)

### LLM Integration
- [x] OpenAI-compatible `/v1/chat/completions` API support
- [x] Streaming responses with live display
- [x] Multiple LLM configurations (stored in localStorage)
- [x] Endpoint ping/status checking
- [x] Configurable model, temperature, max tokens
- [x] Stop generation with content preservation
- [x] System prompt convention (`### SYSTEM:` / `### USER:` in input text)

### Reference System
- [x] `[block]` — Simple block reference
- [x] `[category:block]` — Category-qualified reference
- [x] `[category:block:stage]` — Stage-specific reference
- [x] Validation of missing/broken references
- [x] Reference resolution before generation
- [x] Automatic rename propagation (block + category renames update all refs)
- [x] Reference highlighting in input textarea (green=valid, red=broken, amber=ambiguous)
- [x] Ambiguous short reference warnings (block exists in multiple categories)

### Dependency Panel
- [x] Shows "Uses" references with token counts
- [x] Shows "Used by" reverse references
- [x] Click to navigate to referenced blocks
- [x] Generation status indicator

### File Operations
- [x] Save/Load YAML project files
- [x] File System Access API for direct save
- [x] Save As functionality
- [x] Project persistence to localStorage
- [x] Default demo project for new users

### Data Integrity
- [x] Name validation on all identifiers (`[a-zA-Z_][a-zA-Z0-9_]*`, max 64 chars)
- [x] Store-level defensive validation
- [x] UI-level inline error messages

### Desktop Packaging
- [x] Electron main process
- [x] Windows build (.exe)
- [x] Linux build (.deb, .AppImage)

### Testing
- [x] Vitest framework configured
- [x] Name validation tests (30 tests)
- [x] Reference propagation tests (42 tests)
- [x] Ambiguous reference detection tests (5 tests)
- [x] 77 tests passing

## Project Structure

```
StoryForge/
├── src/                    # Source code
│   ├── components/         # React components (TreePanel, EditorPanel, DependencyPanel, etc.)
│   ├── store/              # Zustand stores (projectStore, llmStore, hintsStore)
│   ├── services/           # LLM service (chat completions streaming)
│   ├── types/              # TypeScript types (project.ts, llm.ts)
│   ├── utils/              # Utilities (fileUtils, referenceUtils, tokenUtils, nameValidation)
│   │   └── __tests__/      # Unit tests (Vitest)
│   └── data/               # Static data (defaultProject)
├── electron/               # Electron main process
├── docs/                   # Documentation
├── public/                 # Static assets
└── scripts/                # Build/packaging scripts
```

## Recent Changes

- Updated all documentation to reflect current implementation
- Added name validation on all identifiers with enforcement in store + UI
- Implemented automatic rename propagation for block and category renames
- Set up Vitest with ~50 tests covering name validation and reference propagation
- Added Electron desktop packaging for Windows + Linux
- Implemented system prompt convention (`### SYSTEM:` / `### USER:`)
- Added tutorial hints system
- Implemented streaming LLM generation
- Added token counting with reference breakdown
- Added version delete with confirmation
- Fixed Save functionality with File System Access API
