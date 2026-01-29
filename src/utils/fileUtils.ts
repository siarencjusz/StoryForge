/**
 * File utilities for loading and saving YAML project files
 */
import yaml from 'js-yaml';
import type { Project } from '../types';

// Store the file handle for "Save" functionality
let currentFileHandle: FileSystemFileHandle | null = null;


/**
 * Clear the current file handle (e.g., when creating a new project)
 */
export function clearFileHandle(): void {
  currentFileHandle = null;
}

/**
 * Parse YAML content into a Project object
 */
export function parseYaml(content: string): Project {
  const data = yaml.load(content) as Project;
  // Validate basic structure
  if (!data.storyforge || !data.schema_version) {
    throw new Error('Invalid StoryForge project file');
  }
  // Ensure required fields have defaults
  if (!data.blocks) data.blocks = {};
  if (!data.tree) data.tree = { expanded_categories: [], selected: '' };
  if (!data.settings) {
    data.settings = { llm_provider: '', default_reference_mode: 'summary' };
  }
  return data;
}

/**
 * Serialize a Project object to YAML string
 */
export function serializeYaml(project: Project): string {
  return yaml.dump(project, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Open a file picker and load a YAML file
 */
export async function openProjectFile(): Promise<{ project: Project; fileName: string } | null> {
  // Try using File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'YAML Files',
          accept: { 'text/yaml': ['.yaml', '.yml'] },
        }],
      });
      const file = await handle.getFile();
      const content = await file.text();
      const project = parseYaml(content);
      // Store the handle for future saves
      currentFileHandle = handle;
      return { project, fileName: file.name };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  // Fallback to input element
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const content = await file.text();
        const project = parseYaml(content);
        // No file handle available with fallback method
        currentFileHandle = null;
        resolve({ project, fileName: file.name });
      } catch (error) {
        console.error('Failed to load project:', error);
        alert('Failed to load project: ' + (error instanceof Error ? error.message : 'Unknown error'));
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Save project to the current file (if we have a handle) or prompt for location
 * Returns the filename if successful, null if cancelled
 */
export async function saveProjectFile(project: Project): Promise<string | null> {
  // If we have a file handle, write directly to it
  if (currentFileHandle) {
    try {
      const content = serializeYaml(project);
      const writable = await currentFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return currentFileHandle.name;
    } catch (error) {
      console.error('Failed to save to file handle:', error);
      // Fall through to Save As
    }
  }

  // No handle or failed - use Save As
  return saveProjectFileAs(project);
}

/**
 * Save project with a new filename (Save As)
 * Returns the filename if successful, null if cancelled
 */
export async function saveProjectFileAs(project: Project): Promise<string | null> {
  // Check if File System Access API is available
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: (project.project.title || 'project').replace(/[^a-zA-Z0-9_-]/g, '_') + '.yaml',
        types: [{
          description: 'YAML Files',
          accept: { 'text/yaml': ['.yaml', '.yml'] },
        }],
      });
      const content = serializeYaml(project);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      // Store the new handle for future saves
      currentFileHandle = handle;
      return handle.name;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  } else {
    // Fallback: prompt for filename and download
    const fileName = prompt('Enter filename:', (project.project.title || 'project') + '.yaml');
    if (fileName) {
      downloadProject(project, fileName);
      return fileName;
    }
    return null;
  }
}

/**
 * Download project as a file (fallback for browsers without File System Access API)
 */
function downloadProject(project: Project, fileName: string): void {
  const content = serializeYaml(project);
  const blob = new Blob([content], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

