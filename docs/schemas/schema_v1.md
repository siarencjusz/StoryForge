# StoryForge Schema v1

> **Schema Version**: 1  
> **Last Updated**: January 28, 2026

This document defines the complete YAML schema for StoryForge project files.

---

## Overview

A StoryForge project is stored as a single YAML file with the following top-level structure:

```yaml
storyforge: "1.0"
schema_version: 1

project: { ... }
settings: { ... }
categories: [ ... ]
instructions: [ ... ]
blocks: [ ... ]
tree: { ... }
```

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `storyforge` | string | Yes | Application version (e.g., "1.0") |
| `schema_version` | integer | Yes | Schema version for migrations (currently 1) |
| `project` | object | Yes | Project metadata |
| `settings` | object | Yes | Project settings |
| `categories` | array | No | Custom category definitions |
| `instructions` | array | No | Reusable prompt templates |
| `blocks` | array | No | Content blocks |
| `tree` | object | No | UI state for tree panel |

---

## Project Metadata

```yaml
project:
  title: "The Fallen Crown"
  author: "Jane Doe"
  genre: fantasy
  created: 2026-01-28T10:00:00Z
  modified: 2026-01-28T15:30:00Z
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Project title |
| `author` | string | No | Author name |
| `genre` | string | No | Genre/category of the story |
| `created` | datetime | Yes | Creation timestamp (ISO 8601) |
| `modified` | datetime | Yes | Last modification timestamp |

---

## Settings

```yaml
settings:
  llm_provider: openai-main           # References ~/.storyforge/providers/
  default_reference_mode: summary     # "summary" or "full"
  unresolved_references: block        # "block" or "placeholder"
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `llm_provider` | string | Yes | - | Name of provider config in `~/.storyforge/providers/` |
| `default_reference_mode` | string | No | `summary` | Default mode for `[tag]` references |
| `unresolved_references` | string | No | `block` | How to handle unresolved refs: `block` (prevent generation) or `placeholder` (allow with warning) |

---

## Categories

Categories define the folder structure in the tree view. Users can define custom categories.

```yaml
categories:
  - name: character
    color: "#4CAF50"
  - name: location
    color: "#2196F3"
  - name: scene
    color: "#FF9800"
  - name: plot
    color: "#9C27B0"
  - name: worldbuilding
    color: "#795548"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Category identifier (used in `[category:tag]` syntax) |
| `color` | string | No | Hex color for UI display |

**Default categories** (created automatically for new projects):
- `character`, `location`, `scene`, `plot`, `worldbuilding`

---

## Instructions

Instructions are reusable prompt templates. They are referenced by name in block's `instruction` field.

```yaml
instructions:
  - tag: "generate_character"
    description: "Creates detailed character sheet"
    content: |
      Create a detailed character sheet including:
      - Name and aliases
      - Physical appearance
      - Personality traits and flaws
      - Background and key life events
      - Goals and motivations

  - tag: "generate_scene"
    description: "Writes a vivid scene"
    content: |
      Write a vivid scene with:
      - Setting description and atmosphere
      - Character actions and dialogue
      - Sensory details (sight, sound, smell)
      - Emotional undertones

  - tag: "summarize"
    description: "Creates concise summary"
    content: |
      Create a brief summary (2-3 sentences max) capturing:
      - Key identifying information
      - Most important traits or features
      - Critical relationships or context
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Unique identifier for the instruction |
| `description` | string | No | Human-readable description |
| `content` | string | Yes | The prompt template text |

**Note**: Instructions are NOT referenced with `[tag]` syntax. They are referenced by name in block config fields.

---

## Blocks

Blocks are the core content units. Each block has a unique `category:tag` composite key.

### Block Types

| Type | Description |
|------|-------------|
| `generation` | Calls LLM to generate content, has pipeline stages |
| `content` | Static content, no LLM processing |

### Generation Block Schema

```yaml
blocks:
  - id: "b_a1b2c3d4"
    category: character
    tag: "alice"
    type: generation
    created: 2026-01-28T10:15:00Z
    modified: 2026-01-28T14:20:00Z
    notes: "Main protagonist, needs more backstory"
    
    instruction: "generate_character"
    input: |
      A former ranger who tracks criminals in the Whisperwood.
      She has a troubled past and distrusts magic users.
    
    llm_override:                    # Optional per-block LLM settings
      provider: openai-creative
      temperature: 0.9
    
    pipeline:
      raw:
        selected: "v2"
        versions:
          - id: "v1"
            content: "Alice Thornwood, 28 years old, she was born..."
            tokens: 520
            generated: 2026-01-28T10:20:00Z
          - id: "v2"
            name: "better opening"   # Optional user-defined name
            content: "Alice 'Thorn' Thornwood stands at the edge..."
            tokens: 540
            generated: 2026-01-28T10:25:00Z
      
      refined:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice 'Thorn' Thornwood stands at 28 years..."
            tokens: 580
            generated: 2026-01-28T10:30:00Z
      
      grammar:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice 'Thorn' Thornwood stands at twenty-eight..."
            tokens: 575
            generated: 2026-01-28T10:35:00Z
      
      final:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice 'Thorn' Thornwood stands at twenty-eight..."
            tokens: 575
      
      summary:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice - 28yo ranger, tracks criminals, distrusts magic"
            tokens: 12
            generated: 2026-01-28T10:40:00Z
```

### Content Block Schema

```yaml
blocks:
  - id: "b_e5f6g7h8"
    category: location
    tag: "whisperwood"
    type: content
    created: 2026-01-28T09:00:00Z
    modified: 2026-01-28T09:00:00Z
    notes: "Main story location"
    
    content: |
      The Whisperwood is an ancient forest where the trees are said 
      to hold memories. Perpetual twilight under the canopy, 
      bioluminescent fungi light the paths. Dangerous at night.
    tokens: 45
    
    summary: "Ancient memory-holding forest, perpetual twilight, dangerous at night"
    summary_tokens: 11
```

### Block Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (auto-generated, e.g., `b_a1b2c3d4`) |
| `category` | string | Yes | Category name (must exist in categories list) |
| `tag` | string | Yes | Tag name, unique within category |
| `type` | string | Yes | Block type: `generation` or `content` |
| `created` | datetime | Yes | Creation timestamp |
| `modified` | datetime | Yes | Last modification timestamp |
| `notes` | string | No | User notes/reminders |
| `instruction` | string | No | Instruction tag to use (generation blocks only) |
| `input` | string | No | User prompt with `[tag]` references (generation blocks only) |
| `llm_override` | object | No | Per-block LLM settings override |
| `pipeline` | object | No | Pipeline stages (generation blocks only) |
| `content` | string | No | Static content (content blocks only) |
| `tokens` | integer | No | Token count for content |
| `summary` | string | No | Summary text (content blocks only) |
| `summary_tokens` | integer | No | Token count for summary |

---

## Pipeline Stages

Each generation block has a pipeline with 5 stages. Each stage stores multiple versions independently.

```
pipeline:
  raw:       → Initial LLM generation
  refined:   → Improved/expanded output
  grammar:   → Polished for spelling/style
  final:     → Ready for [tag:full] reference
  summary:   → Ready for [tag:summary] reference
```

### Stage Schema

```yaml
pipeline:
  raw:
    selected: "v2"           # Which version is active
    versions:
      - id: "v1"             # Auto-incremented or user-defined
        name: "first try"    # Optional user-defined name
        content: "..."       # The generated text
        tokens: 520          # Token count
        generated: 2026-01-28T10:20:00Z
        status: success      # success | error | pending
        error: null          # Error message if status is error
      - id: "v2"
        content: "..."
        tokens: 540
        generated: 2026-01-28T10:25:00Z
        status: success
```

### Stage Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selected` | string | Yes | ID of the active version |
| `versions` | array | Yes | List of version objects |

### Version Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Version identifier (e.g., "v1", "v2", or custom name) |
| `name` | string | No | Optional user-defined name |
| `content` | string | Yes | The generated/edited text |
| `tokens` | integer | Yes | Token count |
| `generated` | datetime | Yes | Generation timestamp |
| `status` | string | No | `success`, `error`, or `pending` |
| `error` | string | No | Error message if generation failed |

---

## Reference Syntax

Blocks reference each other using tag syntax in the `input` field:

```
[tag]                  → Uses default_reference_mode, tag must be unique across categories
[category:tag]         → Explicit category, uses default mode
[tag:full]             → Returns selected version from `final` stage
[tag:summary]          → Returns selected version from `summary` stage
[category:tag:full]    → Explicit category + full output
[category:tag:summary] → Explicit category + summary output
```

### Example

```yaml
blocks:
  - category: scene
    tag: "chapter_1_opening"
    type: generation
    instruction: "generate_scene"
    input: |
      Write the opening scene where [alice:full] arrives at 
      the gates of [location:castle:summary].
      
      She is looking for [bob:summary] who has information 
      about [plot:conspiracy].
```

### Reference Resolution

1. **Unique tag**: `[alice]` works if only one block named "alice" exists
2. **Ambiguous tag**: If `[shadow]` exists in both `character` and `location`, using `[shadow]` is an error
3. **Explicit category**: `[character:shadow]` always works
4. **Mode selection**: 
   - `[tag:full]` → returns `final` stage, selected version
   - `[tag:summary]` → returns `summary` stage, selected version
   - `[tag]` → uses `settings.default_reference_mode`

---

## Tree UI State

Stores the UI state for the tree panel:

```yaml
tree:
  expanded_categories:
    - character
    - scene
  selected_block: "b_a1b2c3d4"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expanded_categories` | array | No | List of expanded category names |
| `selected_block` | string | No | ID of currently selected block |

---

## Tool-Level Configuration

Provider configurations are stored outside projects in `~/.storyforge/providers/`:

```yaml
# ~/.storyforge/providers/openai-main.yaml
name: openai-main
provider: openai
api_key: sk-...                    # Or: ${OPENAI_API_KEY}
default_model: gpt-4o
default_temperature: 0.8
default_max_tokens: 4096
```

```yaml
# ~/.storyforge/providers/openai-creative.yaml
name: openai-creative
provider: openai
api_key: ${OPENAI_API_KEY}
default_model: gpt-4o
default_temperature: 1.2
```

Projects reference providers by name:
```yaml
settings:
  llm_provider: openai-main
```

---

## Complete Example

```yaml
storyforge: "1.0"
schema_version: 1

project:
  title: "The Fallen Crown"
  author: "Jane Doe"
  genre: fantasy
  created: 2026-01-28T10:00:00Z
  modified: 2026-01-28T15:30:00Z

settings:
  llm_provider: openai-main
  default_reference_mode: summary
  unresolved_references: block

categories:
  - name: character
    color: "#4CAF50"
  - name: location
    color: "#2196F3"
  - name: scene
    color: "#FF9800"

instructions:
  - tag: "generate_character"
    description: "Creates detailed character sheet"
    content: |
      Create a detailed character sheet including:
      - Name and aliases
      - Physical appearance
      - Personality traits and flaws
      - Background and key life events
      - Goals and motivations

  - tag: "summarize"
    description: "Creates concise summary"
    content: |
      Create a brief summary (2-3 sentences max).

blocks:
  - id: "b_char_alice"
    category: character
    tag: "alice"
    type: generation
    created: 2026-01-28T10:15:00Z
    modified: 2026-01-28T14:20:00Z
    notes: "Main protagonist"
    instruction: "generate_character"
    input: |
      A former ranger who tracks criminals in the Whisperwood.
    pipeline:
      raw:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice Thornwood, 28 years old..."
            tokens: 520
            generated: 2026-01-28T10:20:00Z
            status: success
      final:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice Thornwood, 28 years old..."
            tokens: 520
      summary:
        selected: "v1"
        versions:
          - id: "v1"
            content: "Alice - 28yo ranger, tracks criminals"
            tokens: 12
            generated: 2026-01-28T10:25:00Z
            status: success

  - id: "b_loc_whisperwood"
    category: location
    tag: "whisperwood"
    type: content
    created: 2026-01-28T09:00:00Z
    modified: 2026-01-28T09:00:00Z
    content: |
      The Whisperwood is an ancient forest where trees hold memories.
    tokens: 12
    summary: "Ancient memory-holding forest"
    summary_tokens: 4

tree:
  expanded_categories: [character, location]
  selected_block: "b_char_alice"
```

---

## Schema Migration

When `schema_version` changes, the application will:
1. Detect old schema version on file load
2. Apply migration functions sequentially (v1→v2→v3...)
3. Save file with updated schema

Current version: **1**
