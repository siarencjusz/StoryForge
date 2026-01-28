# StoryForge Schema v1

> **Schema Version**: 1  
> **Last Updated**: January 28, 2026

This document defines the complete YAML schema for StoryForge project files.

---

## Design Principles

1. **Use YAML's natural nested dictionary structure** - no redundant IDs
2. **Unique keys at each level** - category and block names are dictionary keys
3. **Direct Python mapping** - loads directly as nested dictionaries
4. **Unified block model** - all content (prompts, characters, scenes) are blocks
5. **Categories are implicit** - derived from the nested structure

---

## Tree Structure

```
yaml root
└── blocks
    └── category (e.g., "character", "prompts", "location")
        └── block_name (unique within category)
            └── stage (e.g., "raw", "refined", "summary", or just "output")
                ├── input (prompt text with [references])
                ├── selected (which version is active)
                └── output
                    ├── v1: "content..."
                    ├── v2: "content..."
                    └── ...
```

---

## Overview

```yaml
storyforge: "1.0"
schema_version: 1

project:
  title: "The Fallen Crown"
  author: "Jane Doe"

settings:
  llm_provider: openai-main
  default_reference_mode: summary

blocks:
  prompts:                          # category
    generate_character:             # block name (unique within category)
      output:
        selected: v1
        versions:
          v1: |
            Create a detailed character sheet including:
            - Name and aliases
            - Physical appearance
            - Personality traits and flaws

  character:                        # category
    alice:                          # block name (unique within category)
      raw:                          # stage
        input: |
          ### INSTRUCTION:
          [prompts:generate_character]
          ### INPUT:
          A former ranger who tracks criminals in the Whisperwood.
          ### RESPONSE:
        selected: v1
        output:
          v1: "Alice Thornwood, 28 years old..."
          v2: "Alice of the Wood, ranger..."
      summary:                      # stage
        input: |
          Summarize the character in 2-3 sentences.
          [alice:raw]
        selected: v1
        output:
          v1: "Alice - 28yo ranger"
```

---

## Top-Level Fields

| Field            | Type    | Required | Description                                                |
|------------------|---------|----------|------------------------------------------------------------|
| `storyforge`     | string  | Yes      | Application version                                        |
| `schema_version` | integer | Yes      | Schema version for migrations                              |
| `project`        | object  | Yes      | Project metadata                                           |
| `settings`       | object  | Yes      | Project settings                                           |
| `blocks`         | object  | No       | All content blocks (nested: category → block_name → stage) |
| `tree`           | object  | No       | UI state (expanded nodes, selection)                       |
---

## Project & Settings

```yaml
project:
  title: "The Fallen Crown"
  author: "Jane Doe"
  genre: fantasy

settings:
  llm_provider: openai-main           # References ~/.storyforge/providers/
  default_reference_mode: summary     # "summary" or "full"
  unresolved_references: block        # "block" or "placeholder"
```

---

## Blocks

All content in StoryForge is stored as blocks. Categories emerge naturally from the YAML structure.

### Block Structure

A block is a dictionary of stages. Each stage has:
- **input**: The prompt template with optional `[category:block_name]` references
- **selected**: Which version to use as output
- **output**: Dictionary of versions (version key → content string)

### Simple Block (e.g., prompts, static content)

For blocks that don't need stages (like prompt templates or static content), use a single `output` field:

```yaml
blocks:
  prompts:
    generate_character:             # block name
      output:
        selected: v1
        versions:
          v1: |
            Create a detailed character sheet including:
            - Name and aliases
            - Physical appearance  
            - Personality traits and flaws
            - Background and motivations
          v2: "..."

    world_rules:                    # block name
      output:
        selected: v1
        versions:
          v1: |
            The world is set in a dark fantasy realm where magic is forbidden.
            Technology is medieval-era. Dragons are extinct but their bones hold power.
```

### Block with Stages (e.g., characters, scenes)

For blocks that use multi-stage generation:

```yaml
blocks:
  character:
    alice:                          # block name
      raw:                          # stage
        input: |
          ### INSTRUCTION:
          [prompts:generate_character]
          [prompts:world_rules]
          ### INPUT:
          A former ranger who tracks criminals in the Whisperwood.
          She has a mysterious past connected to the old dragon cults.
          ### RESPONSE:
        selected: v2
        output:
          v1: "Alice Thornwood, 28 years old..."
          v2: "Alice of the Wood, a ranger of 28 winters..."
      refined:                      # stage
        input: |
          Improve the character description, add more depth to personality.
          [alice:raw]
        selected: v1
        output:
          v1: "Alice Thornwood, known as 'Shadow of the Wood'..."
      summary:                      # stage
        input: |
          Summarize the character in 2-3 sentences for quick reference.
          [alice:refined]
        selected: v1
        output:
          v1: "Alice - 28yo ranger, tracks criminals in Whisperwood"

  location:
    whisperwood:                    # block name
      raw:
        input: |
          ### INSTRUCTION:
          [prompts:generate_location]
          ### INPUT:
          An ancient forest that holds memories of those who enter.
          ### RESPONSE:
        selected: v1
        output:
          v1: "The Whisperwood is an ancient forest..."
      summary:
        input: |
          Brief location summary for scene context.
          [whisperwood:raw]
        selected: v1
        output:
          v1: "Ancient memory-holding forest"
```
---

## Stage Structure

A block is a dictionary of stages. Each stage has:
- **input**: Prompt for this stage (with optional `[category:block_name]` or `[block_name:stage]` references)
- **selected**: Which version to use as output
- **output**: Dictionary of versions (version key → content string)

```yaml
alice:                              # block name
  raw:                              # stage
    input: "..."
    selected: v2
    output:
      v1: "..."
      v2: "..."
  refined:                          # stage
    input: |
      Improve clarity and add emotional depth.
      [alice:raw]
    selected: v1
    output:
      v1: "..."
  summary:                          # stage
    input: |
      Summarize in 2-3 sentences.
      [alice:refined]
    selected: v1
    output:
      v1: "..."
```

Versions are stored as simple strings (version key → content).

---

## Reference Syntax

References use `[category:block_name]` format with optional stage modifier:

```
[block_name]                  → default stage, block_name unique across categories
[category:block_name]         → explicit category, default stage
[block_name:stage]            → explicit stage (e.g., [alice:summary])
[category:block_name:stage]   → explicit category + stage (e.g., [character:alice:raw])
```

---

## Scene Generation Example

Shows how prompts, locations, and characters compose:

```yaml
blocks:
  scene:
    chapter_2_scene_1:              # block name
      raw:
        input: |
          ### INSTRUCTION:
          [prompts:generate_scene]
          ### LOCATIONS:
          [location:whisperwood]
          [location:castle:summary]
          ### CHARACTERS:
          [character:alice:raw]
          [character:bob:summary]
          ### INPUT:
          Alice confronts Bob at the edge of the Whisperwood about 
          his secret meetings with the castle guards. Tension rises 
          as Bob reveals he's been protecting her from the King's spies.
          ### RESPONSE:
        selected: v1
        output:
          v1: "The mist curled around Alice's boots as she..."
      summary:
        input: |
          Brief scene summary.
          [chapter_2_scene_1:raw]
        selected: v1
        output:
          v1: "Alice confronts Bob; he reveals he's protecting her from spies."
```

---

## Tree UI State

```yaml
tree:
  expanded_categories: [character, scene]
  selected: "character:alice"
```

---

## Tool-Level Config

Stored in `~/.storyforge/providers/`:

```yaml
# ~/.storyforge/providers/openai-main.yaml
name: openai-main
provider: openai
api_key: ${OPENAI_API_KEY}
default_model: gpt-4o
default_temperature: 0.8
```

---

## Python Access

```python
import yaml

with open("project.yaml") as f:
    project = yaml.safe_load(f)

# Access block
alice = project["blocks"]["character"]["alice"]

# Get selected output from a stage
stage = alice["raw"]
output = stage["output"][stage["selected"]]

# Access simple block (like prompts)
prompt = project["blocks"]["prompts"]["generate_character"]
prompt_content = prompt["output"]["versions"][prompt["output"]["selected"]]

# Iterate all blocks
for category, blocks in project["blocks"].items():
    for block_name, block in blocks.items():
        print(f"[{category}:{block_name}]")
```
```

---

## Schema Migration

When `schema_version` changes:
1. Detect old version on load
2. Apply migrations sequentially
3. Save with updated schema

Current version: **1**
