# StoryForge - Decision Summary

> **Last Updated**: January 28, 2026  
> **Purpose**: Single source of truth for all design decisions

---

## ✅ Confirmed Decisions

### Architecture & Storage

| Decision          | Choice                         | Rationale                              |
|-------------------|--------------------------------|----------------------------------------|
| Storage Format    | Single YAML file               | Human-readable, git-friendly, portable |
| Project Structure | Single file per project        | Simplicity, easy backup                |
| Schema Version    | Include `schema_version` field | Enable future migrations               |

### User Interface

| Decision        | Choice                                         | Rationale                                                                    |
|-----------------|------------------------------------------------|------------------------------------------------------------------------------|
| UI Paradigm     | **Tree + Dependency Panel**                    | Familiar UX (VS Code-like), scales to 100+ blocks, more writing space        |
| UI Technology   | FastAPI backend + React frontend               | Clear separation, async LLM support, modern tooling                          |
| Frontend Stack  | React 18+, TypeScript, Tailwind CSS, Vite      | Type safety, rapid development, modern DX                                    |
| Backend Stack   | Python 3.11+, FastAPI, Pydantic, uvicorn       | Async support, validation, auto-docs                                         |
| Standalone      | Web-based, no editor integrations              | Focus on core product                                                        |

### Block System

| Decision               | Choice                                                                                       | Rationale                                                                      |
|------------------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Block Model            | Unified - all content is blocks                                                              | No separate "instruction" type; prompts are blocks in `prompts` category       |
| Block Name Uniqueness  | Unique within category                                                                       | `[category:block_name]` composite key allows same name in different categories |
| Reference Syntax       | `[block_name]`, `[category:block_name]`, `[block_name:stage]`, `[category:block_name:stage]` | Flexible, explicit when needed                                                 |
| Default Reference Mode | Configurable (summary or full)                                                               | Project-level setting                                                          |
| Rename Behavior        | Auto-propagate to all references                                                             | Consistency, prevents broken refs                                              |
| Ambiguity Handling     | Error + prompt to disambiguate                                                               | Fail-safe, user control                                                        |

### Block Structure

Blocks use YAML's natural nested dictionary structure. A block is a dictionary of stages:

```
yaml root → blocks → category → block_name → stage → [input, selected, output → versions]
```

| Decision         | Choice                              | Rationale                                            |
|------------------|-------------------------------------|------------------------------------------------------|
| Schema Structure | Nested dictionaries                 | No IDs needed, direct Python dict access             |
| Block = Stages   | Block is directly a dict of stages  | Each stage has its own input, no block-level input   |
| Stage Structure  | input + selected + output           | Simple and consistent                                |
| Version Storage  | Simple strings (key → content)      | Minimal schema, expand later if needed               |
| No Timestamps    | Not stored                          | Not requested; can add in future schema version      |
| No Token Counts  | Calculated at runtime               | Depends on tokenizer/LLM, shouldn't be stored        |

See [schemas/schema_v1.md](./schemas/schema_v1.md) for complete YAML examples.

### Version Management

| Decision           | Choice                                      | Rationale                                          |
|--------------------|---------------------------------------------|----------------------------------------------------|
| Version Storage    | All versions kept per stage                 | Never lose previous generations                    |
| Version Format     | Simple strings (key → content)              | Minimal; expand schema later if needed             |
| Version Naming     | Auto-increment (v1, v2...) or user-defined  | Organization flexibility                           |
| Version Comparison | Side-by-side view                           | Easy comparison between versions                   |
| Version Selection  | Mark one version as "selected" per stage    | This version is used when block is referenced      |
| Manual Editing     | User can edit any version directly          | Merge best parts manually, create new version      |

### LLM Integration

| Decision              | Choice                                            | Rationale                                                  |
|-----------------------|---------------------------------------------------|------------------------------------------------------------|
| API Approach          | Direct OpenAI API with abstraction layer          | Simple, no heavy dependencies, easy to add providers later |
| Initial Provider      | OpenAI                                            | Wide adoption, good documentation                          |
| Provider Abstraction  | Custom interface (no LangChain/LiteLLM)           | Keep dependencies minimal, full control                    |
| **Tool-Level Config** | Separate YAML files in `~/.storyforge/providers/` | Swap providers easily, keep secrets out of projects        |
| Project Config        | Reference provider by name                        | Projects don't contain API keys                            |
| Parameters            | temperature, max_tokens, top_p, etc.              | Standard LLM controls                                      |
| Token Counting        | Calculated at runtime, displayed in UI            | Not stored (depends on tokenizer/LLM)                      |
| Unresolved References | Configurable: block or placeholder                | Draft mode vs strict mode                                  |

**Provider Configuration Example** (`~/.storyforge/providers/openai.yaml`):
```yaml
name: openai-main
provider: openai
api_key: sk-...  # Or use env var
default_model: gpt-4o
```

**Project references provider by name**:
```yaml
settings:
  llm_provider: openai-main  # References ~/.storyforge/providers/openai.yaml
  llm_overrides:
    temperature: 0.8
```

### Development

| Decision        | Choice          | Rationale                       |
|-----------------|-----------------|---------------------------------|
| Language        | Python 3.11+    | Modern features, LLM ecosystem  |
| Package Manager | uv              | Fast, modern, reliable          |
| Testing         | pytest          | Standard, well-supported        |
| CLI             | None (UI-only)  | Web UI is the only interface    |

---

## ⏸️ Deferred Decisions (P2+)

| Decision                 | Deferred To | Reason                                               |
|--------------------------|-------------|------------------------------------------------------|
| Export Formats           | Future      | Depends on how project evolves                       |
| Multiple LLM Providers   | P2          | Start with OpenAI, add others via abstraction layer  |
| Editor Integrations      | No plans    | Focus on standalone experience                       |
| Real-time Collaboration  | No plans    | Single author focus, file-based storage              |

---

## 🔴 Pending Decisions (Decide Before Coding)

*All critical decisions have been finalized.*

---

## 🟡 Nice-to-Have Features (Not Required for MVP)

| Feature           | Options                                  | Notes                                                                                                                                                                        |
|-------------------|------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Undo/Redo**     | Project snapshots OR command history     | Low priority - versions already preserve all generation history. Options: (1) periodic YAML snapshots in config folder, (2) UI command history with limit. Consider for P2.  |
| **Multi-project** | Open two projects simultaneously         | Useful for copying content between projects. Consider for P2.                                                                                                                |

---

## ❌ Abandoned Approaches (Not Pursuing)

| Approach                          | Reason Abandoned                                                                          |
|-----------------------------------|-------------------------------------------------------------------------------------------|
| **Canvas/Graph View**             | Complexity; tree view is sufficient, may reconsider in distant future                     |
| **Composite Block Type**          | Confusing semantics; user can manually merge versions instead                             |
| **Global Block Name Uniqueness**  | Too restrictive; `[character:shadow]` and `[location:shadow]` should coexist              |
| **Separate Instruction Type**     | Unnecessary; prompts are just blocks in `prompts` category                                |
| **Block-level input field**       | Each stage has its own input; more flexible                                               |
| **Block notes field**             | Not needed for MVP; can add in future schema version                                      |
| **Per-block LLM overrides**       | Not needed for MVP; can add in future schema version                                      |
| **Stored token counts**           | Depends on tokenizer/LLM; calculate at runtime instead                                    |
| **Stored timestamps**             | Not requested; can add in future schema version                                           |
| **Version metadata objects**      | Versions are simple strings; expand later if needed                                       |
| **Multiple Files per Project**    | Complexity; single YAML simpler to manage                                                 |
| **TUI (Terminal UI)**             | Web UI is the primary interface                                                           |
| **CLI Interface**                 | UI-only approach; no command-line needed                                                  |
| **LangChain**                     | Heavy dependency (~50+ packages), abstractions hide important details, overkill for needs |
| **LiteLLM**                       | Adds dependency for multi-provider support we don't need yet                              |
| **Merge Provenance Tracking**     | Complexity without clear benefit                                                          |

---

## Key Design Principles

1. **Writer-First**: Enhance creativity, don't replace it
2. **Composability**: Blocks reference each other via `[block_name]` syntax
3. **Transparency**: Show dependencies, tokens (runtime), relationships
4. **Iterative**: Support multiple versions, refinement stages
5. **Simplicity**: Single file, familiar UI patterns, minimal schema
6. **Flexibility**: User-defined stages, configurable defaults
