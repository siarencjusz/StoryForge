# StoryForge Design Document

> **Last Updated**: January 29, 2026  
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
┌──────────────────┬────────────────────────────────────────┬──────────────────┐
│ 📁 Characters    │  # Alice (raw stage)                   │ Dependencies     │
│   📄 alice       │                                        │                  │
│   📄 shadow      │  INPUT:                                │ Uses:            │
│ 📁 Locations     │  ### INSTRUCTION:                      │  → prompts:      │
│   📄 forest      │  [prompts:generate_character]          │     generate_char│
│   📄 shadow      │  ### INPUT:                            │  → prompts:      │
│ 📁 Scenes        │  A former ranger who tracks            │     world_rules  │
│   📄 ch1_scene1  │  criminals in the Whisperwood          │                  │
│   📄 ch1_scene2  │  ### RESPONSE:                         │ Used by:         │
│ 📁 Prompts       │                                        │  ← scene:ch1     │
│   📄 gen_char    │  ───────────────────────────           │  ← alice:summary │
│   📄 gen_scene   │                                        │                  │
│                  │  OUTPUT (v2 selected, 520 tokens)      │ Token Info:      │
│ [+ New Block]    │                                        │  Input: 245      │
│                  │  Alice Thornwood, 28 years             │  Output: 520     │
│ Filter: All ▼    │  old, stands at the edge of            │                  │
│ 🔍 Search...     │  the Whisperwood...                    │ [🔄 Regenerate]  │
│                  │                                        │                  │
│                  │  [v1] [v2 ✓] [+ New]                   │                  │
└──────────────────┴────────────────────────────────────────┴──────────────────┘
     Tree Panel              Editor Panel                   Dependency Panel
```

**Three Panels**:
1. **Tree Panel (Left)**: Category folders containing blocks, search/filter
2. **Editor Panel (Center)**: Stage input, output versions, version selector
3. **Dependency Panel (Right)**: Shows "Uses" and "Used by" relationships, token info (runtime), actions

**Key Benefits**:
- Familiar UX (like VS Code, file managers)
- Natural category organization (folders = categories)
- More space for text editing
- Scales well to 100+ blocks
- Dependencies visible without cluttering the editor

### Blocks

A **Block** is the fundamental unit of work. All content (prompts, characters, scenes, locations) uses the same block structure.

| Component        | Description                                                                                  |
|------------------|----------------------------------------------------------------------------------------------|
| **Block Name**   | Identifier unique within its category (e.g., `alice` in `character` category)                |
| **Category**     | Required grouping (e.g., `character`, `location`, `scene`, `prompts`) - forms folder in tree |
| **Stages**       | Dictionary of processing stages (e.g., `raw`, `refined`, `summary`)                          |
| **Stage Input**  | Each stage has its own prompt, may include `[block_name]` references                         |
| **Stage Output** | Dictionary of versions (version key → content string)                                        |
| **Selected**     | Which version is active for each stage                                                       |

**Note**: Token counts are calculated at runtime (depend on tokenizer/LLM), not stored.

**See [schemas/schema_v1.md](./schemas/schema_v1.md) for complete YAML examples.**

#### Block Types

1. **Simple Block** (prompts, static content): Has only `output` field with versions
2. **Block with Stages** (characters, scenes): Has multiple stages, each with `input`, `selected`, `output`

For complete YAML examples, see [schemas/schema_v1.md](./schemas/schema_v1.md).

### Block Processing Pipeline

Each block is a dictionary of stages. Each stage has its own input, selected version, and output versions.

```
BLOCK (category:block_name)
│
└── stages (each with its own input and versioned outputs)
    │
    ├── raw
    │   ├── input: "### INSTRUCTION:\n[prompts:generate_character]\n..."
    │   ├── selected: v2
    │   └── output:
    │       ├── v1: "..."
    │       └── v2: "..."
    │
    ├── refined
    │   ├── input: "Improve depth.\n[alice:raw]"
    │   ├── selected: v1
    │   └── output:
    │       └── v1: "..."
    │
    └── summary
        ├── input: "Summarize in 2-3 sentences.\n[alice:refined]"
        ├── selected: v1
        └── output:
            └── v1: "..."
```

**Key Points**:
- Block is directly a **dictionary of stages** (no `pipeline` wrapper)
- Each stage has its **own input** (no block-level input)
- Stages can reference other stages: `[alice:raw]`, `[alice:refined]`
- Each stage stores **multiple versions** (v1, v2... or user-named)
- User marks which version is **"selected"** per stage
- Versions are **simple strings** (not objects with metadata)
- User controls which stages to create—no fixed pipeline

For complete YAML examples, see [schemas/schema_v1.md](./schemas/schema_v1.md).

### Version Management

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [character:alice] - Raw Stage Versions                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │ **v1** (selected ✓)     │    │ **v2**                  │             │
│  ├─────────────────────────┤    ├─────────────────────────┤             │
│  │ Alice Thornwood, 28     │    │ Alice "Thorn" is a      │             │
│  │ years old, stands at    │    │ twenty-eight year old   │             │
│  │ the edge of...          │    │ tracker who haunts...   │             │
│  └─────────────────────────┘    └─────────────────────────┘             │
│                                                                          │
│  [Select v1] [Select v2] [New Version ✏️] [Delete v2 🗑️]               │
└──────────────────────────────────────────────────────────────────────────┘
```

- Versions are **simple strings** (version key → content)
- Compare any two versions side-by-side
- Select which version to use as the stage output
- Create new version by editing or regenerating
- User can manually edit any version to merge best parts
- Token counts calculated and displayed at runtime (not stored)

### Block Name Uniqueness & References

**Uniqueness Rules**:
- Block names must be unique **within a category** (not globally)
- `[category:block_name]` forms the unique composite key
- Example: `[character:shadow]` and `[location:shadow]` can coexist

**Reference Syntax**:
```
[block_name]                  → Works if unique across ALL categories, uses default stage
[category:block_name]         → Explicit category, uses default stage
[block_name:stage]            → Explicit stage (e.g., [alice:summary])
[category:block_name:stage]   → Explicit category + stage (e.g., [character:alice:raw])
```

**Stage References**:
- `[alice:raw]` → selected version from alice's raw stage
- `[alice:summary]` → selected version from alice's summary stage
- Default stage is configurable per project (usually `summary` or last stage)

**Ambiguity Handling**:
- If `shadow` exists in both `character` and `location`, using `[shadow]` is an error
- UI prompts user to disambiguate: use `[character:shadow]` or `[location:shadow]`
- When a new block creates ambiguity, UI offers to update existing short references

**Rename Behavior**:
- Renaming a block automatically updates ALL references across all blocks
- Cannot rename to a name that already exists in the same category
- Moving to a different category is allowed


#### Prompt Library

Prompts are blocks in the `prompts` category (or any category you choose). They are referenced like any other block: `[prompts:generate_character]`

For YAML examples, see [schemas/schema_v1.md](./schemas/schema_v1.md).

#### Content Blocks

Content blocks can be:
- **Static content** (locations, world facts): Has only `output` with versions
- **Generated content** (characters, scenes): Has multiple stages with `input`/`output`

For YAML examples, see [schemas/schema_v1.md](./schemas/schema_v1.md).

#### Scene Generation

Scenes compose prompts, locations, and characters by referencing them. The user sees token counts **at runtime** (calculated, not stored), allowing them to switch between `:raw` and `:summary` to optimize context usage.

For YAML examples, see [schemas/schema_v1.md](./schemas/schema_v1.md).

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

The entire project is stored in a single YAML file using nested dictionaries.

**See [schemas/schema_v1.md](./schemas/schema_v1.md) for complete schema documentation.**

Key structure:
```
yaml root → blocks → category → block_name → stage → [input, selected, output → versions]
```

- No redundant IDs - dictionary keys provide uniqueness
- Loads directly as Python nested dictionaries
- `blocks[category][block_name][stage]` for direct access
- Versions are simple strings (not metadata objects)

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
- Tag uniqueness enforcement (within category)
- Category management (implicit from structure)
- Stage management (add/remove/rename stages)
- Rename with reference propagation

#### 2. Reference Resolver
- Parse `[tag]`, `[category:tag]`, and `[tag:stage]` references in input text
- Handle ambiguity detection and errors
- Resolve to appropriate stage based on syntax:
  - `[tag]` → default stage (configurable, usually summary)
  - `[tag:stage]` → specific stage (e.g., `[alice:raw]`)
  - `[category:tag]` → explicit category, default stage
  - `[category:tag:stage]` → explicit category + stage
- Validate references to exist before generation

#### 3. Dependency Tracker
- Build and maintain "uses" and "used-by" relationships
- Calculate affected blocks when one changes
- Mark blocks as "stale" when dependencies change
- Support "regenerate cascade" operations

#### 4. Version Manager
- Store multiple generated versions per stage (simple strings)
- Support selection of preferred version per stage
- Enable manual editing and merging
- Auto-increment version names (v1, v2...) or user-defined

#### 5. LLM Interface
- Abstract interface for multiple LLM providers
- Handle generation requests with resolved context
- Token counting and context window management
- Support batch generation (N variations)
- Error handling and retry logic

#### 6. Token Counter
- Count tokens at runtime (not stored in YAML)
- Display breakdown before generation
- Warn when approaching context limits
- Support different tokenizers per LLM provider

#### 7. UI Components (React)
- **Tree Panel**: Category folders, block list, search/filter
- **Editor Panel**: Input, output, summary, version selector
- **Dependency Panel**: Uses/used-by lists, token info, actions

---

## User Workflows

### Workflow 1: Creating a Character
1. Ensure a character generation prompt exists in `prompts` category (or create one)
2. Create a new block in `character` category with a `raw` stage
3. Write input referencing `[prompts:generate_character]` + specific character idea
4. Generate multiple versions (e.g., v1, v2, v3)
5. Review outputs, select best version or manually merge
6. Add a `summary` stage referencing `[tag:raw]` for efficient context reuse
7. Block is now available for use: `[character:tag]` or `[tag:raw]`, `[tag:summary]`

### Workflow 2: Writing a Scene
1. Create a new block in `scene` category with a `raw` stage
2. Reference relevant characters via tags: `[hero:summary]`, `[villain:raw]`
3. Reference location: `[castle]`
4. Reference prompt template: `[prompts:generate_scene]`
5. Generate, review versions, and select best
6. Add `refined` or `summary` stages as needed

### Workflow 3: Building a Plot Line
1. Create blocks in `plot` category for major plot beats
2. Link them via stage references to show progression
3. Each beat can reference characters and locations involved
4. Dependency panel shows the flow of references
5. Easily identify gaps or inconsistencies

### Workflow 4: Refining Content
1. Select any stage to regenerate (creates new version)
2. System shows dependent blocks that may be affected
3. Choose to regenerate single stage or cascade to dependents
4. Compare new versions with existing
5. Select preferred version per stage

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

See [schemas/schema_v1.md](./schemas/schema_v1.md) for complete schema details.

### Token Counting & Display

Token counts are **calculated at runtime** (not stored, as they depend on the tokenizer/LLM):

```
┌─────────────────────────────────────────────────────────────┐
│ [chapter_2_scene_1]                           category:scene│
├─────────────────────────────────────────────────────────────┤
│ INPUT (raw stage):                                          │
│   [prompts:generate_scene]     ──────────────   245 tokens  │
│   [location:forest]            ──────────────    89 tokens  │
│   [location:castle:summary]    ──────────────    23 tokens  │
│   [character:alice:raw]        ──────────────   320 tokens  │
│   [character:bob:summary]      ──────────────    18 tokens  │
│   User prompt                  ──────────────    52 tokens  │
│   ─────────────────────────────────────────────────────────│
│   TOTAL INPUT:                                  747 tokens  │
│   Max output (max_tokens):                    4,096 tokens  │
│   Context limit:                            128,000 tokens ✓│
├─────────────────────────────────────────────────────────────┤
│ OUTPUT (after generation):                    1,247 tokens  │
└─────────────────────────────────────────────────────────────┘
```

Users can:
- See which references are consuming the most tokens
- Switch between stages (`:raw` vs `:summary`) to optimize
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
- Unified block model (no separate instruction/content types)
- Block = dictionary of stages (each with input/selected/output)
- Tag uniqueness per category (`[category:tag]`, `[category:tag:stage]`)
- Versions as simple strings (not metadata objects)
- Token counts calculated at runtime (not stored)
- No timestamps stored
- Tool-level LLM config in `~/.storyforge/providers/`
- Direct OpenAI API with abstraction layer (no LangChain/LiteLLM)
- FastAPI + React + TypeScript + Tailwind
- UI-only (no CLI)

---

## Technology Stack

| Layer        | Technology   | Purpose             |
|--------------|--------------|---------------------|
| **Frontend** | React 18+    | UI framework        |
|              | TypeScript   | Type safety         |
|              | Tailwind CSS | Styling             |
|              | Vite         | Build tool          |
| **Backend**  | Python 3.11+ | Core logic          |
|              | FastAPI      | REST API framework  |
|              | Pydantic     | Data validation     |
|              | uvicorn      | ASGI server         |
| **Storage**  | YAML         | Project files       |
| **LLM**      | httpx        | OpenAI API calls    |

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

| Weakness                         | Description                                                                | Mitigation                                                             |
|----------------------------------|----------------------------------------------------------------------------|------------------------------------------------------------------------|
| **Large File Size**              | Single YAML file could grow very large with many versions and long outputs | Monitor in practice; future: archive old versions                      |
| **Manual Dependency Management** | Writer must manually add `[block_name]` references                         | Auto-suggest tags based on content analysis; highlight unlinked blocks |
| **Context Window Overflow**      | Deep reference chains could exceed LLM context limits                      | Token counting with warnings; use summaries; depth limits              |
| **Search/Filter**                | Finding specific content could be difficult                                | Implement search, filtering by category/block_name                     |
| **Collaboration Limitations**    | Single file makes concurrent editing difficult                             | Accept as v1 limitation; consider future multi-file approach           |

---

## Development Phases

### Phase 1: Core Data Model
- [ ] Define Block schema and YAML structure (category:block_name, stages)
- [ ] Implement project file load/save
- [ ] Tag parsing and reference resolution (`[block_name]`, `[category:block_name]`, `[block_name:stage]`)
- [ ] Dependency tracking (uses/used-by)

### Phase 2: LLM Integration
- [ ] Abstract LLM interface
- [ ] OpenAI provider implementation
- [ ] Context assembly from resolved references
- [ ] Generation with multiple versions
- [ ] Runtime token counting and warnings

### Phase 3: Version Management
- [ ] Store and list versions per stage (simple strings)
- [ ] Select preferred version per stage
- [ ] Manual version editing/merging
- [ ] Stage creation (raw, refined, summary, etc.)

### Phase 4: Tree-Based UI (MVP)
- [ ] Tree panel with category folders
- [ ] Editor panel for stage input/output
- [ ] Dependency panel showing uses/used-by
- [ ] Block creation, editing, deletion
- [ ] Tag autocomplete when typing `[`
- [ ] Token count display (runtime)
- [ ] Version comparison view

### Phase 5: Enhanced Features
- [ ] Multiple LLM providers (via abstraction)
- [ ] Pre-built prompt templates
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

| Category      | Decision                                                     |
|---------------|--------------------------------------------------------------|
| **UI**        | Tree + Dependency Panel (React, TypeScript, Tailwind)        |
| **Backend**   | FastAPI + Python 3.11+                                       |
| **Storage**   | Single YAML file per project                                 |
| **Blocks**    | Unified model - all content is blocks                        |
| **Structure** | Block = dict of stages, each with input/selected/output      |
| **Tags**      | Unique within category, `[category:block_name:stage]` syntax |
| **Versions**  | Simple strings, unlimited, side-by-side comparison           |
| **Tokens**    | Calculated at runtime, not stored                            |

---

## Pre-Implementation Tasks

Before coding, ensure these are addressed:

1. **Schema finalization**:
   - [x] `schema_version` field for migrations
   - [x] Unified block model (no separate types)
   - [x] Block = dict of stages structure
   - [x] Versions as simple strings
   - [x] No stored timestamps or token counts

2. **LLM abstraction layer**:
   - [ ] Define abstract interface
   - [ ] Implement OpenAI provider
   - [ ] Error handling (rate limit, timeout, invalid key)

3. **Error states to define**:
   - [ ] LLM API errors (rate limit, timeout, invalid key)
   - [ ] Validation errors (ambiguous refs, missing refs)
   - [ ] File errors (corrupt YAML, permission denied)

---

*See [decisions.md](./decisions.md) for decision history and [schemas/schema_v1.md](./schemas/schema_v1.md) for detailed YAML schema.*
