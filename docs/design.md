# StoryForge Design Document

> **Last Updated**: January 28, 2026  
> **See also**: [decisions.md](./decisions.md) for all design decisions

## Overview

StoryForge is a tree-based tool that leverages Large Language Models (LLMs) to support writers in crafting stories and books. It provides a structured system where writers create interconnected blocks organized by category (characters, locations, scenes, etc.) that generate and refine narrative elements through iterative LLM interactions.

## Problem Statement

Writers using LLMs for assistance face several challenges:
- LLMs have limited context windows, making it hard to maintain consistency across long narratives
- Manually tracking characters, plot lines, and world-building details is tedious
- Feeding relevant context to LLMs requires manual copy-pasting and repetition
- No centralized way to manage story elements that can be easily queried
- Reusable prompts and instructions are hard to manage across multiple generation tasks

## Goals

1. **Tree-Based Organization**: Provide a familiar folder structure where blocks are organized by category
2. **Reusable Context via Tags**: Allow tagging of outputs so they can be referenced in other blocks using `[tag_name]` or `[category:tag]` syntax
3. **Iterative Generation**: Support generating multiple variations and merging/selecting the best traits
4. **Single-File Storage**: Store entire project in one human-readable YAML file
5. **Writer-First Experience**: Enhance creativity, not replace it
6. **Dependency Visibility**: Show what each block uses and what uses it

## Non-Goals (Initial Version)

- Full text editor functionality
- AI-generated full chapters without human guidance
- Publishing or formatting/export features (depends on project evolution)
- Real-time collaboration (single author focus)
- Editor integrations (VS Code, Obsidian) - standalone web-based UI only

---

## Core Concepts

### The Tree-Based UI

The primary interface is a tree-based layout with three panels:

```
┌──────────────────┬────────────────────────────────┬──────────────────┐
│ 📁 Characters    │                                │ Dependencies     │
│   📄 alice       │  # Alice                       │                  │
│   📄 shadow      │                                │ Uses:            │
│ 📁 Locations     │  [generate_character]          │  → generate_char │
│   📄 forest      │                                │                  │
│   📄 shadow      │  A former ranger who tracks    │ Used by:         │
│ 📁 Scenes        │  criminals in the Whisperwood  │  ← chapter_1     │
│   📄 ch1_scene1  │                                │  ← chapter_2     │
│   📄 ch1_scene2  │  ───────────────────────────   │                  │
│ 📁 Instructions  │                                │ Token Info:      │
│   📄 gen_char    │  **Output** (v3, 520 tokens)   │  Input: 245      │
│   📄 gen_scene   │                                │  Output: 520     │
│                  │  Alice Thornwood, 28 years     │  Summary: 12     │
│ [+ New Block]    │  old, stands at the edge of    │                  │
│                  │  the Whisperwood...            │ [🔄 Regenerate]  │
│ Filter: All ▼    │                                │                  │
│ 🔍 Search...     │  ───────────────────────────   │                  │
│                  │                                │                  │
│                  │  **Summary** (12 tokens)       │                  │
│                  │  Alice - 28yo ranger,          │                  │
│                  │  distrusts magic               │                  │
└──────────────────┴────────────────────────────────┴──────────────────┘
     Tree Panel              Editor Panel            Dependency Panel
```

**Three Panels**:
1. **Tree Panel (Left)**: Category folders containing blocks, search/filter
2. **Editor Panel (Center)**: Input prompt, output, summary, version selector
3. **Dependency Panel (Right)**: Shows "Uses" and "Used by" relationships, token info, actions

**Key Benefits**:
- Familiar UX (like VS Code, file managers)
- Natural category organization (folders = categories)
- More space for text editing
- Scales well to 100+ blocks
- Dependencies visible without cluttering the editor

### Blocks

A **Block** is the fundamental unit of work. Each block has:

| Component | Description |
|-----------|-------------|
| **Tag** | Identifier unique within its category (e.g., `alice` in `character` category) |
| **Category** | Required grouping (e.g., `character`, `location`, `scene`, `plot`) - forms folder in tree |
| **Input/Prompt** | The instruction or prompt text, may include references to other tags |
| **Output** | The generated content (can have multiple versions) |
| **Summary** | Optional condensed version of the output for context efficiency |
| **Token Count** | Automatically calculated tokens for input, output, and summary (displayed to user) |
| **Metadata** | Type hints, creation date, version history, notes |

#### Block Types

1. **Instruction Block**: Contains reusable prompt templates (stored in separate `instructions` section). Referenced by name in block's `instruction` or `pipeline` fields. No LLM call on its own.
2. **Generation Block**: Calls LLM with input to produce output through a processing pipeline
3. **Content Block**: Static content (notes, raw text, world facts) - no LLM processing

### Block Processing Pipeline

Each block contains its own processing pipeline. Every pipeline stage stores multiple versions independently.

```
BLOCK (category:tag)
│
├── instruction          → references an instruction template
├── input/context        → user prompt + [tag] references to other blocks
│
└── pipeline stages (each with independently versioned outputs)
    │
    ├── raw              → initial LLM generation
    │   ├── v1 (selected ✓)
    │   ├── v2
    │   └── v3
    │
    ├── refined          → improved/expanded output
    │   ├── v1 (selected ✓)
    │   └── v2
    │
    ├── grammar          → polished for spelling/style
    │   └── v1 (selected ✓)
    │
    ├── final            → used when referenced as [tag:full]
    │   └── v1 (selected ✓)
    │
    └── summary          → used when referenced as [tag:summary]
        ├── v1
        └── v2 (selected ✓)
```

**Key Points**:
- Pipeline is **within each block**, not a separate entity
- Each stage stores **multiple versions** (auto-increment v1, v2... or user-named)
- User marks which version is **"selected"** per stage
- When another block references `[tag:full]`, it gets the selected version of `final` stage
- User controls which stages to generate—no concept of "optional", just generate what you need

### Version Management

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [character:alice] - Raw Stage Versions                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │ **v1** (selected ✓)     │    │ **v2**                  │             │
│  │ Jan 28, 10:20           │    │ Jan 28, 10:25           │             │
│  ├─────────────────────────┤    ├─────────────────────────┤             │
│  │ Alice Thornwood, 28     │    │ Alice "Thorn" is a      │             │
│  │ years old, stands at    │    │ twenty-eight year old   │             │
│  │ the edge of...          │    │ tracker who haunts...   │             │
│  └─────────────────────────┘    └─────────────────────────┘             │
│                                                                          │
│  [Select v1] [Select v2] [New Version ✏️] [Delete v2 🗑️]               │
└──────────────────────────────────────────────────────────────────────────┘
```

- Compare any two versions side-by-side
- Select which version to use as the stage output
- Create new version by editing or regenerating
- User can manually edit any version to merge best parts

### Tag Uniqueness & References

**Uniqueness Rules**:
- Tags must be unique **within a category** (not globally)
- `[category:tag]` forms the unique composite key
- Example: `[character:shadow]` and `[location:shadow]` can coexist

**Reference Syntax**:
```
[tag]                  → Works if tag is unique across ALL categories, uses default mode
[category:tag]         → Explicit category, uses default mode
[tag:full]             → Short form, uses final stage output
[tag:summary]          → Short form, uses summary stage output
[category:tag:full]    → Explicit category + full output
[category:tag:summary] → Explicit category + summary output
```

**Ambiguity Handling**:
- If `[shadow]` exists in both `character` and `location`, using `[shadow]` is an error
- UI prompts user to disambiguate: use `[character:shadow]` or `[location:shadow]`
- When a new block creates ambiguity, UI offers to update existing short references

**Rename Behavior**:
- Renaming a tag automatically updates ALL references across all blocks
- Cannot rename to a tag that already exists in the same category
- Moving to a different category is allowed (changes the category field)


#### Instruction Library Example

Instruction blocks form a reusable library of prompts:

```
[generate_character] (Instruction Block, category: template)
─────────────────────────────────────────────────────────────
Create a detailed character sheet including:
- Name and aliases
- Physical appearance  
- Personality traits and flaws
- Background and key life events
- Goals and motivations

[generate_scene] (Instruction Block, category: template)
─────────────────────────────────────────────────────────────
Write a vivid scene with:
- Setting description and atmosphere
- Character actions and dialogue
- Sensory details (sight, sound, smell)
- Emotional undertones
- Clear scene goal/purpose
```

#### Content Block Examples

```
[forest] (Content Block, category: location)
─────────────────────────────────────────────────────────────
The Whisperwood - an ancient forest where the trees are said 
to hold memories. Perpetual twilight under the canopy, 
bioluminescent fungi light the paths. Dangerous at night.
Tokens: 42

[alice] (Generation Block, category: character)
─────────────────────────────────────────────────────────────
OUTPUT: Alice Thornwood, 28, former ranger...
SUMMARY: Alice - 28yo ranger, tracks criminals, distrusts magic
Tokens: output=320, summary=18
```

#### Scene Generation Example

This shows how instructions, locations, and characters compose:

```
[chapter_2_scene_1] (Generation Block, category: scene)
─────────────────────────────────────────────────────────────
[generate_scene]

Locations: [forest:full], [castle:summary]
Characters: [alice:full], [bob:summary]

Alice confronts Bob at the edge of the Whisperwood about 
his secret meetings with the castle guards. Tension rises 
as Bob reveals he's been protecting her from the King's spies.

───────────────────────────────────────────────────────────
RESOLVED INPUT (shown to user before generation):
  Instructions: 245 tokens
  Locations: 89 tokens  
  Characters: 412 tokens
  User prompt: 52 tokens
  TOTAL: 798 tokens ✓ (within context limit)
```

The user sees token counts **before** generating, allowing them to switch from `[alice:full]` to `[alice:summary]` if context is too large.

### Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GENERATION WORKFLOW                       │
│                                                             │
│  1. COMPOSE        2. GENERATE         3. SELECT/MERGE      │
│  ┌─────────┐       ┌─────────┐         ┌─────────┐         │
│  │ Write   │       │ Call    │         │ Review  │         │
│  │ prompt  │──────▶│ LLM     │────────▶│ outputs │         │
│  │ + refs  │       │ N times │         │ & merge │         │
│  └─────────┘       └─────────┘         └─────────┘         │
│                          │                   │              │
│                          ▼                   ▼              │
│                    ┌─────────┐         ┌─────────┐         │
│                    │ Version │         │ Final   │         │
│                    │ 1, 2, 3 │         │ Output  │         │
│                    └─────────┘         └─────────┘         │
│                                              │              │
│                          4. SUMMARIZE        ▼              │
│                          ┌─────────────────────────┐       │
│                          │ Create summary for      │       │
│                          │ efficient context reuse │       │
│                          └─────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Story Project (Single YAML File)

The entire project is stored in a single `project.yaml` file.

**See [schemas/schema_v1.md](./schemas/schema_v1.md) for complete schema documentation.**

Quick overview of top-level structure:
```yaml
storyforge: "1.0"
schema_version: 1

project: { title, author, genre, created, modified }
settings: { llm_provider, default_reference_mode, unresolved_references }
categories: [ { name, color }, ... ]
instructions: [ { tag, description, content }, ... ]
blocks: [ { category, tag, type, instruction, input, pipeline, ... }, ... ]
tree: { expanded_categories, selected_block }
```

### Dependency Graph

The system automatically tracks dependencies between blocks:

```
generate_char ─────┬────▶ knight_hero ────┐
                   │                      │
                   └────▶ villain ────────┼────▶ opening_scene
                                          │
castle_blackmoor ─────────────────────────┘
```

This graph enables:
- Visualization of content relationships
- Impact analysis (what breaks if I change X?)
- Regeneration cascades (optionally regenerate dependent blocks)
- Cycle detection (prevent circular references)

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     StoryForge UI (React)                   │
│  ┌────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │    Tree    │  │     Editor       │  │  Dependency    │  │
│  │   Panel    │  │     Panel        │  │    Panel       │  │
│  └────────────┘  └──────────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    REST API (FastAPI)                       │
├─────────────────────────────────────────────────────────────┤
│                     Core Engine                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Block     │  │  Reference  │  │      LLM            │ │
│  │   Manager   │  │  Resolver   │  │      Interface      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Version   │  │  Dependency │  │   Token Counter     │ │
│  │   Manager   │  │  Tracker    │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Single YAML Project File               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Block Manager
- CRUD operations for blocks
- Block type validation
- Tag uniqueness enforcement (within category)
- Category management
- Block metadata management
- Rename with reference propagation

#### 2. Reference Resolver
- Parse `[tag]` and `[category:tag]` references in input text
- Handle ambiguity detection and errors
- Resolve to full output or summary based on syntax:
  - `[tag]` → default (configurable, usually summary)
  - `[tag:full]` → complete output
  - `[tag:summary]` → condensed summary
  - `[category:tag:mode]` → explicit category + mode
- Validate references exist before generation

#### 3. Dependency Tracker
- Build and maintain "uses" and "used-by" relationships
- Detect cycles (circular dependencies)
- Calculate affected blocks when one changes
- Mark blocks as "stale" when dependencies change
- Support "regenerate cascade" operations

#### 4. Version Manager
- Store multiple generated versions per block
- Support selection of preferred version
- Enable merging traits from multiple versions
- Track generation history and parameters

#### 5. LLM Interface
- Abstract interface for multiple LLM providers
- Handle generation requests with resolved context
- Token counting and context window management
- Support batch generation (N variations)
- Error handling and retry logic

#### 6. Token Counter
- Count tokens for input, output, summary
- Display breakdown before generation
- Warn when approaching context limits

#### 7. UI Components (React)
- **Tree Panel**: Category folders, block list, search/filter
- **Editor Panel**: Input, output, summary, version selector
- **Dependency Panel**: Uses/used-by lists, token info, actions

---

## User Workflows

### Workflow 1: Creating a Character
1. Create an **Instruction Block** with character generation template (or select existing)
2. Create a **Generation Block** referencing the instruction + specific character idea
3. Generate multiple versions (e.g., 3 variations)
4. Review outputs, select best traits from each
5. Merge into final character output
6. Write/edit summary for efficient context reuse
7. Tag is now available for use in other blocks

### Workflow 2: Writing a Scene
1. Create a **Generation Block** for the scene
2. Reference relevant characters via tags: `[hero:summary]`, `[villain:full]`
3. Reference location: `[castle_blackmoor]`
4. Add scene-specific instructions
5. Generate, review, and refine
6. Tag the output for future reference (e.g., `[chapter_1_scene_3]`)

### Workflow 3: Building a Plot Line
1. Create blocks for major plot beats
2. Link them via references to show progression
3. Each beat can reference characters and locations involved
4. Visual canvas shows the flow of the story
5. Easily identify gaps or inconsistencies in the graph

### Workflow 4: Refining Content
1. Select any block to regenerate
2. System shows dependent blocks that may be affected
3. Choose to regenerate single block or cascade to dependents
4. Compare new versions with existing
5. Update summaries if content changed significantly

---


## LLM Integration Strategy

### Architecture

**Decision**: Direct OpenAI API with custom abstraction layer (no LangChain/LiteLLM).

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Interface (Abstract)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  generate(prompt, config) → response                 │   │
│  │  count_tokens(text) → int                           │   │
│  │  get_models() → list                                │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Provider Implementations                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   OpenAI    │  │  Anthropic  │  │   Ollama (future)   │ │
│  │  (Initial)  │  │  (future)   │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Benefits**:
- Minimal dependencies
- Full control over API calls
- Easy to add new providers
- Simple error handling

### Initial Provider: OpenAI

MVP will support OpenAI API only. Abstraction layer allows adding other providers in P2:
- Anthropic (Claude)
- Local models via Ollama
- OpenAI-compatible APIs (LM Studio, vLLM)

### LLM Configuration

**Tool-Level Setup** (stored outside projects in `~/.storyforge/providers/`):

```yaml
# ~/.storyforge/providers/openai-main.yaml
name: openai-main
provider: openai
api_key: sk-...           # Or: ${OPENAI_API_KEY}
default_model: gpt-4o
default_temperature: 0.8
```

**Project Configuration** (references provider by name):

```yaml
settings:
  llm_provider: openai-main
```

Blocks can override provider settings with `llm_override`. See [schemas/schema_v1.md](./schemas/schema_v1.md) for details.

### Token Counting & Display

Token counts are calculated and displayed to help users manage context:

```
┌─────────────────────────────────────────────────────────────┐
│ [chapter_2_scene_1]                           category:scene│
├─────────────────────────────────────────────────────────────┤
│ INPUT:                                                      │
│   [generate_scene]         ──────────────────   245 tokens  │
│   [forest:full]            ──────────────────    89 tokens  │
│   [castle:summary]         ──────────────────    23 tokens  │
│   [alice:full]             ──────────────────   320 tokens  │
│   [bob:summary]            ──────────────────    18 tokens  │
│   User prompt              ──────────────────    52 tokens  │
│   ─────────────────────────────────────────────────────────│
│   TOTAL INPUT:                                  747 tokens  │
│   Max output (max_tokens):                    4,096 tokens  │
│   Context limit:                            128,000 tokens ✓│
├─────────────────────────────────────────────────────────────┤
│ OUTPUT:                                       1,247 tokens  │
│ SUMMARY:                                         34 tokens  │
└─────────────────────────────────────────────────────────────┘
```

Users can:
- See which references consume the most tokens
- Switch between `:full` and `:summary` to optimize
- Be warned if total exceeds model's context limit
- See output token count after generation

### Prompt Templates (Instruction Library)

Pre-built instruction blocks for common tasks (user can customize):
- `[generate_character]` - Detailed character creation
- `[generate_location]` - Place/setting description
- `[generate_scene]` - Scene writing
- `[generate_dialogue]` - Conversation generation
- `[generate_plot_beat]` - Story beat development
- `[consistency_check]` - Review for contradictions
- `[expand_description]` - Elaborate on brief notes
- `[summarize]` - Create concise summary

These form a versioned instruction library that ships with StoryForge and can be extended by users.

---

## Design Decisions

All design decisions are tracked in [decisions.md](./decisions.md).

**Key Confirmed Decisions**:
- Tree + Dependency Panel UI
- Single YAML file storage with schema versioning
- Tag uniqueness per category (`[category:tag]`, `[category:tag:full]`)
- Block pipeline within each block (raw → refined → grammar → final → summary)
- Per-stage versioning with user-selected active version
- Tool-level LLM config in `~/.storyforge/providers/`
- Direct OpenAI API with abstraction layer (no LangChain/LiteLLM)
- FastAPI + React + TypeScript + Tailwind
- UI-only (no CLI)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18+ | UI framework |
| | TypeScript | Type safety |
| | Tailwind CSS | Styling |
| | Vite | Build tool |
| **Backend** | Python 3.11+ | Core logic |
| | FastAPI | REST API framework |
| | Pydantic | Data validation |
| | uvicorn | ASGI server |
| **Storage** | YAML | Project files |
| **LLM** | httpx | OpenAI API calls |

### Development Setup

```bash
# Backend
cd backend/
uv sync
uv run uvicorn main:app --reload

# Frontend  
cd frontend/
npm install
npm run dev
```


---

## Strengths of This Approach

1. **Flexibility**: The block system is domain-agnostic—works for characters, scenes, worldbuilding, anything
2. **Composability**: Tags enable reuse without duplication; change one block, references update
3. **Transparency**: Dependency panel shows all relationships at a glance
4. **Iterative Refinement**: Per-stage versioning supports exploration before commitment
5. **Context Control**: Summary vs. full output gives fine-grained context window management
6. **Single File**: Easy backup, version control, and portability

---

## Potential Weaknesses & Mitigations

| Weakness | Description | Mitigation |
|----------|-------------|------------|
| **Large File Size** | Single YAML file could grow very large with many versions and long outputs | Monitor in practice; future: archive old versions |
| **Manual Dependency Management** | Writer must manually add `[tag]` references | Auto-suggest tags based on content analysis; highlight unlinked blocks |
| **Context Window Overflow** | Deep reference chains could exceed LLM context limits | Token counting with warnings; use summaries; depth limits |
| **Cycle Detection UX** | Circular references could create confusing errors | Real-time validation; visual warning before cycles form |
| **Search/Filter** | Finding specific content could be difficult | Implement search, filtering by category/tag |
| **Collaboration Limitations** | Single file makes concurrent editing difficult | Accept as v1 limitation; consider future multi-file approach |

---

## Development Phases

### Phase 1: Core Data Model
- [ ] Define Block schema and YAML structure with category:tag uniqueness
- [ ] Implement project file load/save
- [ ] Tag parsing and reference resolution (`[tag]`, `[category:tag]`, `[tag:full]`, `[tag:summary]`)
- [ ] Dependency tracking (uses/used-by)
- [ ] Cycle detection

### Phase 2: LLM Integration
- [ ] Abstract LLM interface
- [ ] OpenAI provider implementation
- [ ] Context assembly from resolved references
- [ ] Generation with multiple versions
- [ ] Token counting and warnings

### Phase 3: Version & Merge Management
- [ ] Store and list versions per pipeline stage
- [ ] Select preferred version per stage
- [ ] Manual version editing/merging
- [ ] Summary generation

### Phase 4: Tree-Based UI (MVP)
- [ ] Tree panel with category folders
- [ ] Editor panel for input/output/summary
- [ ] Dependency panel showing uses/used-by
- [ ] Block creation, editing, deletion
- [ ] Tag autocomplete when typing `[`
- [ ] Token count display
- [ ] Version comparison view

### Phase 5: Enhanced Features
- [ ] Multiple LLM providers (via abstraction)
- [ ] Pre-built instruction templates
- [ ] Search and filter blocks
- [ ] Stale block detection
- [ ] Regeneration cascade

### Phase 6: Polish
- [ ] Rich editing experience
- [ ] Documentation and tutorials
- [ ] Performance optimization for large projects

---

## Technical Decisions Summary

See [decisions.md](./decisions.md) for complete decision log.

| Category | Decision |
|----------|----------|
| **UI** | Tree + Dependency Panel (React, TypeScript, Tailwind) |
| **Backend** | FastAPI + Python 3.11+ |
| **Storage** | Single YAML file per project |
| **Tags** | Unique within category, `[category:tag]` syntax |
| **Pipeline** | raw → refined → grammar → final → summary |
| **Versions** | Unlimited, side-by-side comparison, manual merge |

---

## Pre-Implementation Tasks

Before coding, ensure these are addressed:

1. **Schema finalization**:
   - [x] `schema_version` field for migrations
   - [ ] `status` and `error` fields on pipeline stages
   - [ ] `created_at`, `modified_at` timestamps on all entities

2. **LLM abstraction layer**:
   - [ ] Define abstract interface
   - [ ] Implement OpenAI provider
   - [ ] Error handling (rate limit, timeout, invalid key)

3. **Error states to define**:
   - [ ] LLM API errors (rate limit, timeout, invalid key)
   - [ ] Validation errors (cycle detection, ambiguous refs)
   - [ ] File errors (corrupt YAML, permission denied)

---

*See [decisions.md](./decisions.md) for decision history and [schemas/schema_v1.md](./schemas/schema_v1.md) for detailed YAML schema.*
