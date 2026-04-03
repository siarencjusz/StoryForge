/**
 * Type declarations for the File System Access API.
 *
 * These APIs are only available in Chromium-based browsers, so all
 * usage sites check `'showOpenFilePicker' in window` first.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
 */

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

export {};

