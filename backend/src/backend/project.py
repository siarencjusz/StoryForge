"""
StoryForge Project Data Model.

Provides CRUD operations for StoryForge projects with YAML persistence.
Internal state is kept as a dict matching the YAML schema for trivial serialization.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# Application version
STORYFORGE_VERSION = "1.0"
SCHEMA_VERSION = 1

# Reference pattern: [block], [category:block], [block:stage], [category:block:stage]
REFERENCE_PATTERN = re.compile(r"\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]")


class ProjectError(Exception):
    """Base exception for Project operations."""

    pass


class BlockNotFoundError(ProjectError):
    """Raised when a block is not found."""

    pass


class BlockExistsError(ProjectError):
    """Raised when trying to create a block that already exists."""

    pass


class StageNotFoundError(ProjectError):
    """Raised when a stage is not found."""

    pass


class VersionNotFoundError(ProjectError):
    """Raised when a version is not found."""

    pass


class InvalidReferenceError(ProjectError):
    """Raised when a reference cannot be resolved."""

    pass


def _create_empty_state(title: str, author: str = "") -> dict[str, Any]:
    """Create a new empty project state with default structure."""
    return {
        "storyforge": STORYFORGE_VERSION,
        "schema_version": SCHEMA_VERSION,
        "project": {
            "title": title,
            "author": author,
        },
        "settings": {
            "llm_provider": "",
            "default_reference_mode": "summary",
        },
        "blocks": {},
        "tree": {
            "expanded_categories": [],
            "selected": "",
        },
    }


def _create_stage(input_text: str = "") -> dict[str, Any]:
    """Create a new stage structure."""
    return {
        "input": str(input_text),
        "selected": "",
        "output": {},
    }


@dataclass
class Project:
    """
    StoryForge project with YAML state as internal representation.

    Provides typed methods for CRUD while keeping state as dict
    for trivial serialization.

    Usage:
        # Create new project
        project = Project.new("My Story", "Author Name")

        # Load existing project
        project = Project.load("path/to/project.yaml")

        # Create a block with stages
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "Create a character...")

        # Add output version
        project.add_version("character", "alice", "raw", "v1", "Alice is...")
        project.select_version("character", "alice", "raw", "v1")

        # Save
        project.save("path/to/project.yaml")
    """

    path: Path | None = None
    _state: dict[str, Any] = field(default_factory=dict, repr=False)

    # =========================================================================
    # Lifecycle
    # =========================================================================

    @classmethod
    def new(cls, title: str, author: str = "") -> Project:
        """Create a new project with default structure."""
        return cls(path=None, _state=_create_empty_state(str(title), str(author)))

    @classmethod
    def load(cls, path: Path | str) -> Project:
        """Load a project from a YAML file."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Project file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            state = yaml.safe_load(f)

        if state is None:
            raise ProjectError(f"Empty or invalid YAML file: {path}")

        # Basic validation
        if "storyforge" not in state:
            raise ProjectError(f"Not a StoryForge project file: {path}")

        return cls(path=path, _state=state)

    def save(self, path: Path | str | None = None) -> None:
        """Save the project to a YAML file."""
        save_path = Path(path) if path else self.path
        if save_path is None:
            raise ProjectError("No path specified for saving")

        save_path.parent.mkdir(parents=True, exist_ok=True)

        with open(save_path, "w", encoding="utf-8") as f:
            yaml.dump(
                self._state,
                f,
                default_flow_style=False,
                allow_unicode=True,
                sort_keys=False,
            )

        self.path = save_path

    @property
    def state(self) -> dict[str, Any]:
        """Return the internal state dict (read-only access for serialization)."""
        return self._state

    # =========================================================================
    # Project Metadata
    # =========================================================================

    @property
    def title(self) -> str:
        """Get project title."""
        return str(self._state.get("project", {}).get("title", ""))

    @title.setter
    def title(self, value: str) -> None:
        """Set project title."""
        self._ensure_project_section()
        self._state["project"]["title"] = str(value)

    @property
    def author(self) -> str:
        """Get project author."""
        return str(self._state.get("project", {}).get("author", ""))

    @author.setter
    def author(self, value: str) -> None:
        """Set project author."""
        self._ensure_project_section()
        self._state["project"]["author"] = str(value)

    @property
    def storyforge_version(self) -> str:
        """Get StoryForge version."""
        return str(self._state.get("storyforge", ""))

    @property
    def schema_version(self) -> int:
        """Get schema version."""
        return int(self._state.get("schema_version", 0))

    def _ensure_project_section(self) -> None:
        """Ensure project section exists."""
        if "project" not in self._state:
            self._state["project"] = {}

    def _ensure_blocks_section(self) -> None:
        """Ensure blocks section exists."""
        if "blocks" not in self._state:
            self._state["blocks"] = {}

    # =========================================================================
    # Category Operations
    # =========================================================================

    def list_categories(self) -> list[str]:
        """List all categories."""
        self._ensure_blocks_section()
        return list(self._state["blocks"].keys())

    def create_category(self, category: str) -> None:
        """Create an empty category if it doesn't exist."""
        self._ensure_blocks_section()
        category = str(category)
        if category not in self._state["blocks"]:
            self._state["blocks"][category] = {}

    def delete_category(self, category: str) -> bool:
        """Delete a category and all its blocks. Returns True if deleted."""
        self._ensure_blocks_section()
        category = str(category)
        if category in self._state["blocks"]:
            del self._state["blocks"][category]
            return True
        return False

    # =========================================================================
    # Block CRUD
    # =========================================================================

    def list_blocks(self, category: str) -> list[str]:
        """List all blocks in a category."""
        self._ensure_blocks_section()
        category = str(category)
        if category not in self._state["blocks"]:
            return []
        return list(self._state["blocks"][category].keys())

    def get_block(self, category: str, name: str) -> dict[str, Any] | None:
        """
        Get a block by category and name.

        Returns the block dict (stages) or None if not found.
        """
        self._ensure_blocks_section()
        category, name = str(category), str(name)
        return self._state["blocks"].get(category, {}).get(name)

    def create_block(
        self, category: str, name: str, stages: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Create a new block.

        Args:
            category: Category for the block
            name: Block name (unique within category)
            stages: Optional initial stages dict

        Returns:
            The created block dict

        Raises:
            BlockExistsError: If block already exists
        """
        self._ensure_blocks_section()
        category, name = str(category), str(name)

        if category not in self._state["blocks"]:
            self._state["blocks"][category] = {}

        if name in self._state["blocks"][category]:
            raise BlockExistsError(f"Block already exists: {category}:{name}")

        block = stages if stages is not None else {}
        self._state["blocks"][category][name] = block
        return block

    def update_block(self, category: str, name: str, stages: dict[str, Any]) -> None:
        """
        Update an existing block with new stages.

        Raises:
            BlockNotFoundError: If block doesn't exist
        """
        self._ensure_blocks_section()
        category, name = str(category), str(name)

        if self.get_block(category, name) is None:
            raise BlockNotFoundError(f"Block not found: {category}:{name}")

        self._state["blocks"][category][name] = stages

    def delete_block(self, category: str, name: str) -> bool:
        """
        Delete a block.

        Returns:
            True if block was deleted, False if not found
        """
        self._ensure_blocks_section()
        category, name = str(category), str(name)

        if category not in self._state["blocks"]:
            return False

        if name not in self._state["blocks"][category]:
            return False

        del self._state["blocks"][category][name]
        return True

    def rename_block(self, category: str, old_name: str, new_name: str) -> None:
        """
        Rename a block within the same category.

        Raises:
            BlockNotFoundError: If block doesn't exist
            BlockExistsError: If new name already exists
        """
        self._ensure_blocks_section()
        category, old_name, new_name = str(category), str(old_name), str(new_name)

        block = self.get_block(category, old_name)
        if block is None:
            raise BlockNotFoundError(f"Block not found: {category}:{old_name}")

        if self.get_block(category, new_name) is not None:
            raise BlockExistsError(f"Block already exists: {category}:{new_name}")

        self._state["blocks"][category][new_name] = block
        del self._state["blocks"][category][old_name]

    def move_block(self, old_category: str, name: str, new_category: str) -> None:
        """
        Move a block to a different category.

        Raises:
            BlockNotFoundError: If block doesn't exist
            BlockExistsError: If block with same name exists in new category
        """
        self._ensure_blocks_section()
        old_category, name, new_category = str(old_category), str(name), str(new_category)

        block = self.get_block(old_category, name)
        if block is None:
            raise BlockNotFoundError(f"Block not found: {old_category}:{name}")

        if new_category not in self._state["blocks"]:
            self._state["blocks"][new_category] = {}

        if name in self._state["blocks"][new_category]:
            raise BlockExistsError(f"Block already exists: {new_category}:{name}")

        self._state["blocks"][new_category][name] = block
        del self._state["blocks"][old_category][name]

    # =========================================================================
    # Stage Operations
    # =========================================================================

    def get_stage(self, category: str, block: str, stage: str) -> dict[str, Any] | None:
        """
        Get a stage from a block.

        Returns the stage dict or None if not found.
        """
        block_data = self.get_block(category, block)
        if block_data is None:
            return None
        return block_data.get(str(stage))

    def add_stage(
        self, category: str, block: str, stage: str, input_text: str = ""
    ) -> dict[str, Any]:
        """
        Add a new stage to a block.

        Args:
            category: Block category
            block: Block name
            stage: Stage name
            input_text: Initial input text for the stage

        Returns:
            The created stage dict

        Raises:
            BlockNotFoundError: If block doesn't exist
        """
        category, block, stage = str(category), str(block), str(stage)
        input_text = str(input_text)

        block_data = self.get_block(category, block)
        if block_data is None:
            raise BlockNotFoundError(f"Block not found: {category}:{block}")

        stage_data = _create_stage(input_text)
        block_data[stage] = stage_data
        return stage_data

    def update_stage_input(
        self, category: str, block: str, stage: str, input_text: str
    ) -> None:
        """
        Update the input text of a stage.

        Raises:
            StageNotFoundError: If stage doesn't exist
        """
        category, block, stage = str(category), str(block), str(stage)
        input_text = str(input_text)

        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            raise StageNotFoundError(f"Stage not found: {category}:{block}:{stage}")

        stage_data["input"] = input_text

    def delete_stage(self, category: str, block: str, stage: str) -> bool:
        """
        Delete a stage from a block.

        Returns:
            True if deleted, False if not found
        """
        category, block, stage = str(category), str(block), str(stage)

        block_data = self.get_block(category, block)
        if block_data is None:
            return False

        if stage not in block_data:
            return False

        del block_data[stage]
        return True

    def list_stages(self, category: str, block: str) -> list[str]:
        """List all stages in a block."""
        block_data = self.get_block(category, block)
        if block_data is None:
            return []
        return list(block_data.keys())

    # =========================================================================
    # Version Operations
    # =========================================================================

    def add_version(
        self, category: str, block: str, stage: str, version: str, content: str
    ) -> None:
        """
        Add a new version to a stage.

        Args:
            category: Block category
            block: Block name
            stage: Stage name
            version: Version key (e.g., "v1", "v2")
            content: Version content

        Raises:
            StageNotFoundError: If stage doesn't exist
        """
        category, block, stage = str(category), str(block), str(stage)
        version, content = str(version), str(content)

        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            raise StageNotFoundError(f"Stage not found: {category}:{block}:{stage}")

        stage_data["output"][version] = content

    def get_version(
        self, category: str, block: str, stage: str, version: str
    ) -> str | None:
        """Get a specific version content."""
        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            return None
        return stage_data.get("output", {}).get(str(version))

    def select_version(
        self, category: str, block: str, stage: str, version: str
    ) -> None:
        """
        Select a version as the active output for a stage.

        Raises:
            StageNotFoundError: If stage doesn't exist
            VersionNotFoundError: If version doesn't exist
        """
        category, block, stage = str(category), str(block), str(stage)
        version = str(version)

        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            raise StageNotFoundError(f"Stage not found: {category}:{block}:{stage}")

        if version not in stage_data.get("output", {}):
            raise VersionNotFoundError(
                f"Version not found: {category}:{block}:{stage}:{version}"
            )

        stage_data["selected"] = version

    def delete_version(
        self, category: str, block: str, stage: str, version: str
    ) -> bool:
        """
        Delete a version from a stage.

        If the deleted version was selected, clears the selection.

        Returns:
            True if deleted, False if not found
        """
        category, block, stage = str(category), str(block), str(stage)
        version = str(version)

        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            return False

        if version not in stage_data.get("output", {}):
            return False

        del stage_data["output"][version]

        # Clear selection if deleted version was selected
        if stage_data.get("selected") == version:
            stage_data["selected"] = ""

        return True

    def get_selected_output(
        self, category: str, block: str, stage: str
    ) -> str | None:
        """
        Get the selected output content for a stage.

        Returns:
            The selected version content, or None if no version is selected
        """
        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            return None

        selected = stage_data.get("selected", "")
        if not selected:
            return None

        return stage_data.get("output", {}).get(selected)

    def list_versions(self, category: str, block: str, stage: str) -> list[str]:
        """List all version keys in a stage."""
        stage_data = self.get_stage(category, block, stage)
        if stage_data is None:
            return []
        return list(stage_data.get("output", {}).keys())

    # =========================================================================
    # Reference Operations
    # =========================================================================

    def resolve_reference(self, ref: str) -> str | None:
        """
        Resolve a reference string to content.

        Supported formats:
            [block_name]                 - Block must be unique across categories
            [category:block_name]        - Explicit category, default stage
            [block_name:stage]           - Explicit stage
            [category:block_name:stage]  - Explicit category and stage

        Returns:
            The resolved content, or None if reference cannot be resolved
        """
        ref = str(ref).strip("[]")
        parts = ref.split(":")

        if len(parts) == 1:
            # [block_name] - find unique block, use first stage
            block_name = parts[0]
            found = self._find_block_by_name(block_name)
            if found is None:
                return None
            category, block_data = found
            return self._get_default_stage_output(block_data)

        elif len(parts) == 2:
            # Could be [category:block] or [block:stage]
            first, second = parts

            # Try [category:block] first
            block_data = self.get_block(first, second)
            if block_data is not None:
                return self._get_default_stage_output(block_data)

            # Try [block:stage]
            found = self._find_block_by_name(first)
            if found is not None:
                _, block_data = found
                return self._get_stage_output(block_data, second)

            return None

        elif len(parts) == 3:
            # [category:block:stage]
            category, block_name, stage = parts
            block_data = self.get_block(category, block_name)
            if block_data is None:
                return None
            return self._get_stage_output(block_data, stage)

        return None

    def _find_block_by_name(self, name: str) -> tuple[str, dict] | None:
        """
        Find a block by name across all categories.

        Returns (category, block_data) if unique, None otherwise.
        """
        self._ensure_blocks_section()
        matches = []
        for category, blocks in self._state["blocks"].items():
            if name in blocks:
                matches.append((category, blocks[name]))

        if len(matches) == 1:
            return matches[0]
        return None  # Ambiguous or not found

    def _get_default_stage_output(self, block_data: dict) -> str | None:
        """Get output from the first stage of a block."""
        if not block_data:
            return None
        # Get first stage
        for stage_name, stage_data in block_data.items():
            return self._get_stage_output(block_data, stage_name)
        return None

    def _get_stage_output(self, block_data: dict, stage: str) -> str | None:
        """Get selected output from a specific stage."""
        stage_data = block_data.get(stage)
        if stage_data is None:
            return None

        selected = stage_data.get("selected", "")
        if not selected:
            return None

        return stage_data.get("output", {}).get(selected)

    def find_references_in(self, category: str, block: str) -> list[str]:
        """
        Find all references used by a block (in all stage inputs).

        Returns:
            List of reference strings (without brackets)
        """
        block_data = self.get_block(category, block)
        if block_data is None:
            return []

        references = []
        for stage_name, stage_data in block_data.items():
            if isinstance(stage_data, dict):
                input_text = stage_data.get("input", "")
                if isinstance(input_text, str):
                    refs = REFERENCE_PATTERN.findall(input_text)
                    references.extend(refs)

        return list(set(references))  # Deduplicate

    def find_references_to(
        self, category: str, block: str
    ) -> list[tuple[str, str, str]]:
        """
        Find all blocks that reference this block.

        Returns:
            List of (category, block, stage) tuples that contain references to this block
        """
        target_name = str(block)
        target_full = f"{category}:{block}"

        results = []
        self._ensure_blocks_section()

        for cat, blocks in self._state["blocks"].items():
            for blk_name, blk_data in blocks.items():
                if not isinstance(blk_data, dict):
                    continue

                for stage_name, stage_data in blk_data.items():
                    if not isinstance(stage_data, dict):
                        continue

                    input_text = stage_data.get("input", "")
                    if not isinstance(input_text, str):
                        continue

                    refs = REFERENCE_PATTERN.findall(input_text)
                    for ref in refs:
                        # Check if reference matches target block
                        if self._reference_matches(ref, category, target_name):
                            results.append((cat, blk_name, stage_name))
                            break  # Only add once per stage

        return results

    def _reference_matches(self, ref: str, target_category: str, target_block: str) -> bool:
        """Check if a reference string matches the target block."""
        parts = ref.split(":")

        if len(parts) == 1:
            # [block] - matches if name matches
            return parts[0] == target_block

        elif len(parts) == 2:
            # [category:block] or [block:stage]
            # For [category:block]
            if parts[0] == target_category and parts[1] == target_block:
                return True
            # For [block:stage]
            if parts[0] == target_block:
                return True
            return False

        elif len(parts) == 3:
            # [category:block:stage]
            return parts[0] == target_category and parts[1] == target_block

        return False

    def expand_references(self, text: str) -> str:
        """
        Expand all references in a text with their resolved content.

        Unresolved references are left as-is.

        Args:
            text: Text containing [reference] patterns

        Returns:
            Text with references replaced by their content
        """
        def replace_ref(match: re.Match) -> str:
            ref = match.group(1)
            content = self.resolve_reference(ref)
            if content is not None:
                return content
            return match.group(0)  # Keep original if unresolved

        return REFERENCE_PATTERN.sub(replace_ref, str(text))
