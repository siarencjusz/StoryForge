"""Tests for the StoryForge Project data model."""

import tempfile
from pathlib import Path

import pytest

from backend.project import (
    BlockExistsError,
    BlockNotFoundError,
    Project,
    ProjectError,
    StageNotFoundError,
    VersionNotFoundError,
)


class TestProjectLifecycle:
    """Tests for project creation, loading, and saving."""

    def test_new_creates_empty_project(self):
        """New project has correct structure."""
        project = Project.new("Test Story", "Test Author")

        assert project.title == "Test Story"
        assert project.author == "Test Author"
        assert project.storyforge_version == "1.0"
        assert project.schema_version == 1
        assert project.list_categories() == []

    def test_new_with_empty_author(self):
        """New project can have empty author."""
        project = Project.new("Test Story")
        assert project.author == ""

    def test_save_and_load_roundtrip(self):
        """Project can be saved and loaded."""
        project = Project.new("Test Story", "Test Author")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "Create character")
        project.add_version("character", "alice", "raw", "v1", "Alice content")
        project.select_version("character", "alice", "raw", "v1")

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test_project.yaml"
            project.save(path)

            loaded = Project.load(path)

            assert loaded.title == "Test Story"
            assert loaded.author == "Test Author"
            assert loaded.list_categories() == ["character"]
            assert loaded.list_blocks("character") == ["alice"]
            assert loaded.get_selected_output("character", "alice", "raw") == "Alice content"

    def test_load_nonexistent_file_raises(self):
        """Loading nonexistent file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            Project.load("/nonexistent/path.yaml")

    def test_save_without_path_raises(self):
        """Saving without path raises ProjectError."""
        project = Project.new("Test")
        with pytest.raises(ProjectError):
            project.save()

    def test_save_creates_parent_directories(self):
        """Save creates parent directories if needed."""
        project = Project.new("Test")

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "nested" / "dir" / "project.yaml"
            project.save(path)
            assert path.exists()


class TestProjectMetadata:
    """Tests for project metadata properties."""

    def test_title_getter_setter(self):
        """Title can be get and set."""
        project = Project.new("Original")
        assert project.title == "Original"

        project.title = "Updated"
        assert project.title == "Updated"

    def test_author_getter_setter(self):
        """Author can be get and set."""
        project = Project.new("Test", "Original Author")
        assert project.author == "Original Author"

        project.author = "New Author"
        assert project.author == "New Author"

    def test_metadata_enforces_string(self):
        """Metadata values are converted to strings."""
        project = Project.new("Test")
        project.title = 123  # type: ignore
        assert project.title == "123"


class TestCategoryOperations:
    """Tests for category CRUD operations."""

    def test_list_categories_empty(self):
        """Empty project has no categories."""
        project = Project.new("Test")
        assert project.list_categories() == []

    def test_create_category(self):
        """Categories can be created."""
        project = Project.new("Test")
        project.create_category("character")

        assert "character" in project.list_categories()

    def test_create_category_idempotent(self):
        """Creating existing category is idempotent."""
        project = Project.new("Test")
        project.create_category("character")
        project.create_category("character")

        assert project.list_categories().count("character") == 1

    def test_delete_category(self):
        """Categories can be deleted."""
        project = Project.new("Test")
        project.create_category("character")

        result = project.delete_category("character")

        assert result is True
        assert "character" not in project.list_categories()

    def test_delete_nonexistent_category(self):
        """Deleting nonexistent category returns False."""
        project = Project.new("Test")
        result = project.delete_category("nonexistent")
        assert result is False


class TestBlockCRUD:
    """Tests for block CRUD operations."""

    def test_create_block(self):
        """Blocks can be created."""
        project = Project.new("Test")
        block = project.create_block("character", "alice")

        assert block == {}
        assert "alice" in project.list_blocks("character")

    def test_create_block_with_stages(self):
        """Blocks can be created with initial stages."""
        project = Project.new("Test")
        stages = {
            "raw": {"input": "test", "selected": "", "output": {}}
        }
        block = project.create_block("character", "alice", stages)

        assert block == stages
        assert project.get_stage("character", "alice", "raw") is not None

    def test_create_block_creates_category(self):
        """Creating block creates category if needed."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        assert "character" in project.list_categories()

    def test_create_duplicate_block_raises(self):
        """Creating duplicate block raises BlockExistsError."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        with pytest.raises(BlockExistsError):
            project.create_block("character", "alice")

    def test_get_block(self):
        """Blocks can be retrieved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "input")

        block = project.get_block("character", "alice")

        assert block is not None
        assert "raw" in block

    def test_get_nonexistent_block(self):
        """Getting nonexistent block returns None."""
        project = Project.new("Test")
        assert project.get_block("character", "nonexistent") is None

    def test_update_block(self):
        """Blocks can be updated."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        new_stages = {"updated": {"input": "new", "selected": "", "output": {}}}
        project.update_block("character", "alice", new_stages)

        block = project.get_block("character", "alice")
        assert "updated" in block

    def test_update_nonexistent_block_raises(self):
        """Updating nonexistent block raises BlockNotFoundError."""
        project = Project.new("Test")

        with pytest.raises(BlockNotFoundError):
            project.update_block("character", "alice", {})

    def test_delete_block(self):
        """Blocks can be deleted."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        result = project.delete_block("character", "alice")

        assert result is True
        assert "alice" not in project.list_blocks("character")

    def test_delete_nonexistent_block(self):
        """Deleting nonexistent block returns False."""
        project = Project.new("Test")
        result = project.delete_block("character", "nonexistent")
        assert result is False

    def test_rename_block(self):
        """Blocks can be renamed."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "input")

        project.rename_block("character", "alice", "bob")

        assert "bob" in project.list_blocks("character")
        assert "alice" not in project.list_blocks("character")
        assert project.get_stage("character", "bob", "raw") is not None

    def test_rename_to_existing_raises(self):
        """Renaming to existing name raises BlockExistsError."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.create_block("character", "bob")

        with pytest.raises(BlockExistsError):
            project.rename_block("character", "alice", "bob")

    def test_rename_nonexistent_raises(self):
        """Renaming nonexistent block raises BlockNotFoundError."""
        project = Project.new("Test")

        with pytest.raises(BlockNotFoundError):
            project.rename_block("character", "nonexistent", "new")

    def test_move_block(self):
        """Blocks can be moved to different category."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "input")

        project.move_block("character", "alice", "npc")

        assert "alice" in project.list_blocks("npc")
        assert "alice" not in project.list_blocks("character")
        assert project.get_stage("npc", "alice", "raw") is not None

    def test_move_to_category_with_same_name_raises(self):
        """Moving to category with same block name raises BlockExistsError."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.create_block("npc", "alice")

        with pytest.raises(BlockExistsError):
            project.move_block("character", "alice", "npc")


class TestStageOperations:
    """Tests for stage operations."""

    def test_add_stage(self):
        """Stages can be added to blocks."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        stage = project.add_stage("character", "alice", "raw", "Create a character")

        assert stage["input"] == "Create a character"
        assert stage["selected"] == ""
        assert stage["output"] == {}

    def test_add_stage_to_nonexistent_block_raises(self):
        """Adding stage to nonexistent block raises BlockNotFoundError."""
        project = Project.new("Test")

        with pytest.raises(BlockNotFoundError):
            project.add_stage("character", "nonexistent", "raw")

    def test_get_stage(self):
        """Stages can be retrieved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "input text")

        stage = project.get_stage("character", "alice", "raw")

        assert stage is not None
        assert stage["input"] == "input text"

    def test_get_nonexistent_stage(self):
        """Getting nonexistent stage returns None."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        assert project.get_stage("character", "alice", "nonexistent") is None

    def test_update_stage_input(self):
        """Stage input can be updated."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", "original")

        project.update_stage_input("character", "alice", "raw", "updated")

        stage = project.get_stage("character", "alice", "raw")
        assert stage["input"] == "updated"

    def test_update_nonexistent_stage_raises(self):
        """Updating nonexistent stage raises StageNotFoundError."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        with pytest.raises(StageNotFoundError):
            project.update_stage_input("character", "alice", "raw", "text")

    def test_delete_stage(self):
        """Stages can be deleted."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_stage("character", "alice", "refined")

        result = project.delete_stage("character", "alice", "raw")

        assert result is True
        assert "raw" not in project.list_stages("character", "alice")
        assert "refined" in project.list_stages("character", "alice")

    def test_delete_nonexistent_stage(self):
        """Deleting nonexistent stage returns False."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        result = project.delete_stage("character", "alice", "nonexistent")
        assert result is False

    def test_list_stages(self):
        """Stages can be listed."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_stage("character", "alice", "refined")
        project.add_stage("character", "alice", "summary")

        stages = project.list_stages("character", "alice")

        assert stages == ["raw", "refined", "summary"]


class TestVersionOperations:
    """Tests for version operations."""

    def test_add_version(self):
        """Versions can be added to stages."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")

        project.add_version("character", "alice", "raw", "v1", "Alice content v1")

        assert project.get_version("character", "alice", "raw", "v1") == "Alice content v1"

    def test_add_version_to_nonexistent_stage_raises(self):
        """Adding version to nonexistent stage raises StageNotFoundError."""
        project = Project.new("Test")
        project.create_block("character", "alice")

        with pytest.raises(StageNotFoundError):
            project.add_version("character", "alice", "raw", "v1", "content")

    def test_add_multiple_versions(self):
        """Multiple versions can be added."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")

        project.add_version("character", "alice", "raw", "v1", "content v1")
        project.add_version("character", "alice", "raw", "v2", "content v2")

        assert project.list_versions("character", "alice", "raw") == ["v1", "v2"]

    def test_select_version(self):
        """Version can be selected."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", "content v1")
        project.add_version("character", "alice", "raw", "v2", "content v2")

        project.select_version("character", "alice", "raw", "v2")

        assert project.get_selected_output("character", "alice", "raw") == "content v2"

    def test_select_nonexistent_version_raises(self):
        """Selecting nonexistent version raises VersionNotFoundError."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")

        with pytest.raises(VersionNotFoundError):
            project.select_version("character", "alice", "raw", "v1")

    def test_delete_version(self):
        """Versions can be deleted."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", "content v1")
        project.add_version("character", "alice", "raw", "v2", "content v2")

        result = project.delete_version("character", "alice", "raw", "v1")

        assert result is True
        assert "v1" not in project.list_versions("character", "alice", "raw")
        assert "v2" in project.list_versions("character", "alice", "raw")

    def test_delete_selected_version_clears_selection(self):
        """Deleting selected version clears selection."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", "content")
        project.select_version("character", "alice", "raw", "v1")

        project.delete_version("character", "alice", "raw", "v1")

        assert project.get_selected_output("character", "alice", "raw") is None

    def test_get_selected_output_no_selection(self):
        """Getting selected output with no selection returns None."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")

        assert project.get_selected_output("character", "alice", "raw") is None


class TestReferenceOperations:
    """Tests for reference resolution and tracking."""

    def test_resolve_simple_reference(self):
        """Simple [block] reference can be resolved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", "Alice content")
        project.select_version("character", "alice", "raw", "v1")

        result = project.resolve_reference("[alice]")

        assert result == "Alice content"

    def test_resolve_category_block_reference(self):
        """[category:block] reference can be resolved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", "Alice content")
        project.select_version("character", "alice", "raw", "v1")

        result = project.resolve_reference("[character:alice]")

        assert result == "Alice content"

    def test_resolve_block_stage_reference(self):
        """[block:stage] reference can be resolved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_stage("character", "alice", "summary")
        project.add_version("character", "alice", "raw", "v1", "Raw content")
        project.add_version("character", "alice", "summary", "v1", "Summary content")
        project.select_version("character", "alice", "raw", "v1")
        project.select_version("character", "alice", "summary", "v1")

        result = project.resolve_reference("[alice:summary]")

        assert result == "Summary content"

    def test_resolve_full_reference(self):
        """[category:block:stage] reference can be resolved."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "refined")
        project.add_version("character", "alice", "refined", "v1", "Refined content")
        project.select_version("character", "alice", "refined", "v1")

        result = project.resolve_reference("[character:alice:refined]")

        assert result == "Refined content"

    def test_resolve_ambiguous_reference_returns_none(self):
        """Ambiguous [block] reference returns None."""
        project = Project.new("Test")
        # Same name in different categories
        project.create_block("character", "shadow")
        project.create_block("location", "shadow")

        result = project.resolve_reference("[shadow]")

        assert result is None

    def test_resolve_nonexistent_reference_returns_none(self):
        """Nonexistent reference returns None."""
        project = Project.new("Test")

        result = project.resolve_reference("[nonexistent]")

        assert result is None

    def test_find_references_in_block(self):
        """References used by a block can be found."""
        project = Project.new("Test")
        project.create_block("scene", "opening")
        project.add_stage("scene", "opening", "raw", """
            ### INSTRUCTION:
            [prompts:generate_scene]
            ### CHARACTERS:
            [character:alice]
            [bob:summary]
            ### RESPONSE:
        """)

        refs = project.find_references_in("scene", "opening")

        assert set(refs) == {"prompts:generate_scene", "character:alice", "bob:summary"}

    def test_find_references_to_block(self):
        """Blocks referencing a target block can be found."""
        project = Project.new("Test")

        # Target block
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")

        # Blocks that reference alice
        project.create_block("scene", "opening")
        project.add_stage("scene", "opening", "raw", "[character:alice] appears")

        project.create_block("scene", "ending")
        project.add_stage("scene", "ending", "raw", "[alice] leaves")

        # Block that doesn't reference alice
        project.create_block("scene", "middle")
        project.add_stage("scene", "middle", "raw", "No references here")

        refs = project.find_references_to("character", "alice")

        assert len(refs) == 2
        categories = {r[0] for r in refs}
        blocks = {r[1] for r in refs}
        assert categories == {"scene"}
        assert blocks == {"opening", "ending"}

    def test_expand_references(self):
        """References in text can be expanded."""
        project = Project.new("Test")
        project.create_block("prompts", "generate")
        project.add_stage("prompts", "generate", "output")
        project.add_version("prompts", "generate", "output", "v1", "Create a character")
        project.select_version("prompts", "generate", "output", "v1")

        project.create_block("character", "alice")
        project.add_stage("character", "alice", "summary")
        project.add_version("character", "alice", "summary", "v1", "Alice is a ranger")
        project.select_version("character", "alice", "summary", "v1")

        text = "### INSTRUCTION:\n[prompts:generate]\n### CHARACTER:\n[alice:summary]"
        result = project.expand_references(text)

        assert "Create a character" in result
        assert "Alice is a ranger" in result
        assert "[prompts:generate]" not in result
        assert "[alice:summary]" not in result

    def test_expand_references_keeps_unresolved(self):
        """Unresolved references are kept as-is."""
        project = Project.new("Test")

        text = "Use [nonexistent] here"
        result = project.expand_references(text)

        assert result == "Use [nonexistent] here"


class TestStringEnforcement:
    """Tests that string types are enforced throughout the API."""

    def test_block_name_converted_to_string(self):
        """Block names are converted to strings."""
        project = Project.new("Test")
        # This would fail type checking but tests runtime behavior
        project.create_block("character", 123)  # type: ignore

        assert "123" in project.list_blocks("character")

    def test_stage_input_converted_to_string(self):
        """Stage inputs are converted to strings."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw", 12345)  # type: ignore

        stage = project.get_stage("character", "alice", "raw")
        assert stage["input"] == "12345"

    def test_version_content_converted_to_string(self):
        """Version content is converted to strings."""
        project = Project.new("Test")
        project.create_block("character", "alice")
        project.add_stage("character", "alice", "raw")
        project.add_version("character", "alice", "raw", "v1", {"nested": "dict"})  # type: ignore

        content = project.get_version("character", "alice", "raw", "v1")
        assert isinstance(content, str)
