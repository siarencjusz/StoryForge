# StoryForge Frontend

React-based frontend for StoryForge - a tree-based story writing tool with LLM integration.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **js-yaml** - YAML parsing/serialization
- **Lucide React** - Icons

## Project Structure

```
src/
├── components/       # React components
│   ├── TreePanel.tsx      # Category/block tree navigation
│   ├── EditorPanel.tsx    # Stage input/output editing
│   └── DependencyPanel.tsx # Block dependency tracking
├── store/
│   └── projectStore.ts    # Zustand store with all CRUD operations
├── types/
│   ├── index.ts           # Type exports
│   └── project.ts         # Project/Block/Stage type definitions
├── utils/
│   └── fileUtils.ts       # YAML file operations (parse, serialize, save/load)
├── App.tsx               # Main layout with 3-panel design
├── index.css             # Tailwind directives and custom styles
└── main.tsx              # React entry point
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Features

### Tree Panel (Left)
- Category folders with expand/collapse
- Block items within categories
- Create/rename/delete categories and blocks
- Duplicate blocks
- Open blocks in side panel for comparison
- Search placeholder

### Editor Panel (Center)
- Stage tabs with drag & drop reordering
- Resizable input/output sections
- Input textarea for prompts with block references
- Output version management
- Version comparison (Shift+Click)
- Generation buttons (UI ready)

### Dependency Panel (Right)
- Shows "Uses" references (blocks this block references)
- Shows "Used by" references (blocks that reference this block)
- Token information placeholder

## Color Scheme

Custom dark theme with StoryForge palette:
- Background: `sf-bg-*` (700-900 range)
- Text: `sf-text-*` (100-400 range)
- Accent: `sf-accent-*` (purple tones)
- Semantic: `sf-success`, `sf-warning`, `sf-error`
