# StoryForge - Decision Summary

> **Last Updated**: January 28, 2026  
> **Purpose**: Single source of truth for all design decisions

---

## ✅ Confirmed Decisions

### Architecture & Storage

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage Format | Single YAML file | Human-readable, git-friendly, portable |
| Project Structure | Single file per project | Simplicity, easy backup |
| Schema Version | Include `schema_version` field | Enable future migrations |

### User Interface

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Paradigm | **Tree + Dependency Panel** | Familiar UX (VS Code-like), scales to 100+ blocks, more writing space |
| UI Technology | FastAPI backend + React frontend | Clear separation, async LLM support, modern tooling |
| Frontend Stack | React 18+, TypeScript, Tailwind CSS, Vite | Type safety, rapid development, modern DX |
| Backend Stack | Python 3.11+, FastAPI, Pydantic, uvicorn | Async support, validation, auto-docs |
| Standalone | Web-based, no editor integrations | Focus on core product |

### Block System

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Block Types | Generation, Content, Instruction (separate) | Clear separation of concerns |
| Tag Uniqueness | Unique within category | `[category:tag]` composite key allows same name in different categories |
| Reference Syntax | `[tag]`, `[category:tag]`, `[tag:full]`, `[tag:summary]`, `[category:tag:full]`, `[category:tag:summary]` | Flexible, explicit when needed |
| Default Reference Mode | Configurable (summary or full) | Project-level setting |
| Rename Behavior | Auto-propagate to all references | Consistency, prevents broken refs |
| Ambiguity Handling | Error + prompt to disambiguate | Fail-safe, user control |
| Version Selection | Each block marks which version to use as output | User controls which version is referenced by other blocks |

### Block Structure & Pipeline

Each block contains its own processing pipeline with versioned outputs:

```
BLOCK (category:tag)
├── instruction      → which instruction template to use
├── input/context    → user prompt + [tag] references
└── pipeline stages (each with multiple versions)
    ├── raw          → initial LLM output (v1, v2, v3...)
    ├── refined      → improved output (v1, v2...)
    ├── grammar      → polished output (v1, v2...)
    ├── final        → ready for :full reference
    └── summary      → ready for :summary reference
```

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pipeline Location | Within each block | Self-contained, all stages stored together |
| Stage Versions | Each stage stores multiple versions independently | User can regenerate any stage without losing previous |
| Version Naming | Auto-increment (v1, v2, v3) or user-defined name | Flexibility for organization |
| Selected Version | Each stage marks which version to use as output | Referenced blocks get the selected version |
| Stage Generation | User controls which stages to generate | No "optional" concept—just generate what you need |

### Version Management

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Version Storage | All versions kept per pipeline stage | Never lose previous generations |
| Version Naming | Auto-increment (v1, v2...) or user-defined | Organization flexibility |
| Version Comparison | Side-by-side view | Easy comparison between versions |
| Version Selection | Mark one version as "active" per stage | This version is used when block is referenced |
| Manual Editing | User can edit any version directly | Merge best parts manually, create new version |

### LLM Integration

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Approach | Direct OpenAI API with abstraction layer | Simple, no heavy dependencies, easy to add providers later |
| Initial Provider | OpenAI | Wide adoption, good documentation |
| Provider Abstraction | Custom interface (no LangChain/LiteLLM) | Keep dependencies minimal, full control |
| **Tool-Level Config** | Separate YAML files in `~/.storyforge/providers/` | Swap providers easily, keep secrets out of projects |
| Project Config | Reference provider by name + per-block overrides | Projects don't contain API keys |
| Parameters | temperature, max_tokens, top_p, etc. | Standard LLM controls |
| Token Counting | Display before/after generation | Context window management |
| Unresolved References | Configurable: block or placeholder | Draft mode vs strict mode |

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

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Python 3.11+ | Modern features, LLM ecosystem |
| Package Manager | uv | Fast, modern, reliable |
| Testing | pytest | Standard, well-supported |
| CLI | None (UI-only) | Web UI is the only interface |

---

## ⏸️ Deferred Decisions (P2+)

| Decision | Deferred To | Reason |
|----------|-------------|--------|
| Export Formats | Future | Depends on how project evolves |
| Multiple LLM Providers | P2 | Start with OpenAI, add others via abstraction layer |
| Editor Integrations | No plans | Focus on standalone experience |
| Real-time Collaboration | No plans | Single author focus, file-based storage |

---

## 🔴 Pending Decisions (Decide Before Coding)

*All critical decisions have been finalized.*

---

## 🟡 Nice-to-Have Features (Not Required for MVP)

| Feature | Options | Notes |
|---------|---------|-------|
| **Undo/Redo** | Project snapshots OR command history | Low priority - versions already preserve all generation history. Options: (1) periodic YAML snapshots in config folder, (2) UI command history with limit. Consider for P2. |
| **Multi-project** | Open two projects simultaneously | Useful for copying content between projects. Consider for P2. |

---

## ❌ Abandoned Approaches (Not Pursuing)

| Approach | Reason Abandoned |
|----------|------------------|
| **Canvas/Graph View** | Complexity; tree view is sufficient, may reconsider in distant future |
| **Composite Block Type** | Confusing semantics; user can manually merge versions instead |
| **Global Tag Uniqueness** | Too restrictive; `[character:shadow]` and `[location:shadow]` should coexist |
| **`[instruction]` at top of blocks** | Repetitive; instruction is now a config field |
| **Multiple Files per Project** | Complexity; single YAML simpler to manage |
| **TUI (Terminal UI)** | Web UI is the primary interface |
| **CLI Interface** | UI-only approach; no command-line needed |
| **LangChain** | Heavy dependency (~50+ packages), abstractions hide important details, overkill for our needs. Direct API calls with thin abstraction give full control and simpler debugging. |
| **LiteLLM** | Adds dependency for multi-provider support we don't need yet. When adding providers in P2, our custom abstraction will be sufficient. |
| **Merge Provenance Tracking** | Complexity without clear benefit; user can manually note merges if needed |

---

## Key Design Principles

1. **Writer-First**: Enhance creativity, don't replace it
2. **Composability**: Blocks reference each other via tags
3. **Transparency**: Show dependencies, tokens, relationships
4. **Iterative**: Support multiple versions, refinement stages
5. **Simplicity**: Single file, familiar UI patterns
6. **Flexibility**: Optional stages, configurable defaults
