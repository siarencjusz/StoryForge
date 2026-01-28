# Agent Rules for StoryForge

This document contains guidelines for AI assistants operating on this project.

## General Rules

1. **Read documentation first**: Before making changes, review relevant documentation in the `docs/` folder to understand the current state of the project.

2. **Update documentation**: After significant changes, update the relevant documentation to reflect the new state.

## Python Environment

- **Use `uv` for dependency management**: All Python dependencies must be managed using [uv](https://github.com/astral-sh/uv).
  - Add dependencies: `uv add <package>`
  - Remove dependencies: `uv remove <package>`
  - Sync environment: `uv sync`
  - Run commands: `uv run <command>`
  - Do NOT use `pip` directly

## Temporary Files

- **Keep temporary files in a dedicated folder**: All temporary files created during development, testing, or agent operations must be stored in the `tmp/` folder at the project root.
- The `tmp/` folder should be added to `.gitignore`.
- Clean up temporary files when they are no longer needed.

## Documentation

- **Maintain up-to-date documentation**: The `docs/` folder contains the current state of the project.
- Key documentation files:
  - `docs/design.md` - Overall design and architecture
  - `docs/features.md` - Feature descriptions and status
  - `docs/api.md` - API documentation (when applicable)
- When implementing new features or making changes, update the relevant documentation.

## Code Style

- Follow PEP 8 guidelines for Python code.
- Use type hints where appropriate.
- Write docstrings for public functions and classes.

## Before Coding

- Ensure design documents are reviewed and approved before implementing new features.
- Break down large tasks into smaller, manageable pieces.
