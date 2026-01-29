# StoryForge
A tree-based story writing tool with LLM integration. Build complex narratives by organizing content into blocks with references, then use AI to generate and iterate on your writing.

This is playground to learn interactions with LLM, and how to use github copilot to write apps. 
If you appreciate the project, you learned from it, you can buy me a coffee at 
[buycofee.to](https://buycoffee.to/pawel.dawidowski).

## Features
- **Tree-based Organization**: Organize your story into categories (characters, locations, scenes, prompts) with blocks
- **Block References**: Reference other blocks using `[block_name]` or `[category:block]` syntax
- **LLM Integration**: Connect to any OpenAI-compatible API (local or cloud) for AI-powered generation
- **Live Streaming**: See generation in real-time with ability to stop anytime
- **Version Control**: Keep multiple versions of each output, compare side-by-side
- **Token Tracking**: See token counts with breakdown per referenced block
- **Tutorial Hints**: Built-in hints for new users (hover 2s to see tips)
- **Project Files**: Save/load projects as YAML files
## Tech Stack
- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management with persistence
- **js-yaml** - YAML parsing/serialization
## Quick Start
```bash
# Install dependencies
npm install
# Start dev server
npm run dev
# Or use the runner script
./run.sh
```
Open http://localhost:5173 in your browser.
## Project Structure
```
StoryForge/
├── src/
│   ├── components/          # React components
│   │   ├── TreePanel.tsx        # Category/block tree navigation
│   │   ├── EditorPanel.tsx      # Stage input/output editing
│   │   ├── DependencyPanel.tsx  # Block dependency tracking
│   │   ├── LLMSettingsPanel.tsx # LLM configuration modal
│   │   └── Hint.tsx             # Tutorial hint tooltip
│   ├── store/
│   │   ├── projectStore.ts      # Project state management
│   │   ├── llmStore.ts          # LLM configuration and generation
│   │   └── hintsStore.ts        # Tutorial hints toggle
│   ├── services/
│   │   └── llmService.ts        # OpenAI-compatible API client
│   ├── types/
│   │   ├── project.ts           # Project/Block/Stage types
│   │   └── llm.ts               # LLM configuration types
│   ├── utils/
│   │   ├── fileUtils.ts         # YAML file operations
│   │   ├── referenceUtils.ts    # Block reference resolution
│   │   └── tokenUtils.ts        # Token counting utilities
│   ├── data/
│   │   └── defaultProject.ts    # Demo project for new users
│   ├── App.tsx                  # Main layout
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind styles
├── docs/
│   ├── design.md                # Design documentation
│   ├── decisions.md             # Architecture decisions
│   ├── status.md                # Development status
│   └── schemas/
│       └── schema_v1.md         # YAML schema specification
├── public/                      # Static assets
├── index.html                   # HTML entry point
├── package.json                 # Dependencies and scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── run.sh                       # Development runner script
```
## Usage
### Block References
In any input field, use brackets to reference other blocks:
- `[block_name]` - Reference by block name (searches all categories)
- `[category:block]` - Reference specific category and block
- `[category:block:stage]` - Reference specific stage output
### Generation
1. Configure your LLM in the header (click the LLM status indicator)
2. Write your prompt in the INPUT section, using references as needed
3. Click "Generate New" to create a new version
4. Use "Regenerate" to replace current version, "Continue" to extend it
### Keyboard Shortcuts
- `Ctrl+S` - Save project
- `Ctrl+Shift+S` - Save As
- `Ctrl+O` - Open project
- `Ctrl+N` - New project
## Development
```bash
# Install dependencies
npm install
# Start development server
npm run dev
# Build for production
npm run build
# Lint code
npm run lint
# Preview production build
npm run preview
```
## License
MIT License - see [LICENSE](LICENSE) file
