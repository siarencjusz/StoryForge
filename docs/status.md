# StoryForge Development Status
## Overview
StoryForge is a tree-based story writing tool with LLM integration for AI-powered content generation.
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
- [x] Drag & drop reordering
### Editor Panel
- [x] Stage tabs with add/rename/delete/reorder
- [x] Resizable input/output sections
- [x] Input textarea with reference syntax support
- [x] Version management (add, rename, delete, reorder)
- [x] Version comparison (Shift+Click)
- [x] Token counting with breakdown per reference
- [x] Generation buttons (Generate New, Regenerate, Continue, Stop)
### LLM Integration
- [x] OpenAI-compatible API support
- [x] Streaming responses with live display
- [x] Multiple LLM configurations
- [x] Endpoint ping/status checking
- [x] Configurable model, temperature, max tokens
- [x] Stop generation with content preservation
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
### Reference System
- [x] `[block]` - Simple block reference
- [x] `[category:block]` - Category-qualified reference
- [x] `[category:block:stage]` - Stage-specific reference
- [x] Validation of missing references
- [x] Reference resolution before generation
## Project Structure
```
StoryForge/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── store/              # Zustand stores
│   ├── services/           # API services
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── data/               # Static data (default project)
├── docs/                   # Documentation
├── public/                 # Static assets
└── dist/                   # Build output
```
## Recent Changes
- Removed unused Python backend
- Flattened project structure (removed frontend/ nesting)
- Added tutorial hints system
- Implemented streaming LLM generation
- Added token counting with reference breakdown
- Added version delete with confirmation
- Fixed Save functionality with File System Access API
