import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores';
import { ipcInvoke } from '../ipc/client';
import type { GitignoreTemplate } from '../stores/git-ops';

const TEMPLATE_CATEGORIES: Record<string, string[]> = {
  Languages: [
    'node',
    'python',
    'rust',
    'go',
    'java',
    'c++',
    'ruby',
    'swift',
    'kotlin',
    'scala',
    'elixir',
    'dotnet',
    'bun',
  ],
  Frameworks: [
    'vue',
    'nextjs',
    'rails',
    'laravel',
    'terraform',
    'unity',
    'unrealengine',
  ],
  Editors: [
    'visualstudiocode',
    'jetbrains',
    'vim',
    'emacs',
    'xcode',
    'visualstudio',
  ],
  OS: ['macos', 'windows', 'linux'],
  BuildTools: ['cmake', 'gradle', 'maven'],
};

export function GitignoreEditor() {
  const {
    gitignoreTemplates,
    gitignoreTemplatesLoading,
    gitignoreEditorContent,
    gitignoreEditorPath,
    showGitignoreEditor,
    setGitignoreEditorContent,
    setGitignoreTemplates,
    setGitignoreTemplatesLoading,
    closeGitignoreEditor,
    setError,
    showToast,
    setGitOpLoading,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'editor' | 'templates'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<GitignoreTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchTemplates() {
      if (gitignoreTemplates.length === 0 && !gitignoreTemplatesLoading) {
        setGitignoreTemplatesLoading(true);
        try {
          const response = await ipcInvoke('git:gitignore-templates', {});
          setGitignoreTemplates(response.templates);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to load templates',
          );
        } finally {
          setGitignoreTemplatesLoading(false);
        }
      }
    }
    fetchTemplates();
  }, [
    gitignoreTemplates.length,
    gitignoreTemplatesLoading,
    setGitignoreTemplates,
    setGitignoreTemplatesLoading,
    setError,
  ]);

  useEffect(() => {
    if (showGitignoreEditor && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showGitignoreEditor]);

  const handleApplyTemplate = async (template: GitignoreTemplate) => {
    setSelectedTemplate(template);
    setApplyMode('replace');
    setShowApplyDialog(true);
  };

  const handleApplyConfirmed = async () => {
    if (!selectedTemplate || !gitignoreEditorPath) return;

    let newContent = '';
    if (applyMode === 'replace') {
      newContent = selectedTemplate.content;
    } else {
      newContent = gitignoreEditorContent
        ? `${gitignoreEditorContent.trimEnd()}\n\n# ${selectedTemplate.name}\n${selectedTemplate.content}`
        : selectedTemplate.content;
    }

    setGitignoreEditorContent(newContent);
    setShowApplyDialog(false);
    setSelectedTemplate(null);
    showToast(`Applied "${selectedTemplate.name}" template`);
  };

  const handleSave = async () => {
    if (!gitignoreEditorPath) return;

    setGitOpLoading(true);
    try {
      await ipcInvoke('fs:write-file', {
        repoPath: gitignoreEditorPath,
        relativePath: '.gitignore',
        content: gitignoreEditorContent,
      });
      showToast('Saved .gitignore');
      closeGitignoreEditor();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save .gitignore',
      );
    } finally {
      setGitOpLoading(false);
    }
  };

  const handleCancel = () => {
    closeGitignoreEditor();
  };

  const filteredTemplates = gitignoreTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!showGitignoreEditor) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Gitignore Editor</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'editor'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'templates'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              {gitignoreEditorPath
                ? `${gitignoreEditorPath}/.gitignore`
                : '.gitignore'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={gitignoreEditorContent}
            onChange={(e) => setGitignoreEditorContent(e.target.value)}
            className="flex-1 font-mono text-sm p-3 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="# Enter your .gitignore rules here..."
            spellCheck={false}
          />
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">
              {gitignoreTemplatesLoading
                ? 'Loading...'
                : `${filteredTemplates.length} templates`}
            </span>
          </div>
          {gitignoreTemplatesLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading templates...
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {Object.entries(TEMPLATE_CATEGORIES).map(([category, ids]) => {
                const categoryTemplates = filteredTemplates.filter((t) =>
                  ids.includes(t.id),
                );
                if (categoryTemplates.length === 0) return null;
                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categoryTemplates.map((template) => (
                        <button
                          type="button"
                          key={template.id}
                          onClick={() => handleApplyTemplate(template)}
                          className="p-3 text-left border border-border rounded-md hover:border-primary/50 hover:bg-accent transition-colors group"
                        >
                          <div className="font-medium text-sm">
                            {template.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {template.id}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to apply
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Apply Template Dialog */}
      {showApplyDialog && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Apply "{selectedTemplate.name}"?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              How would you like to apply this template to your .gitignore?
            </p>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="h-4 w-4 text-primary border-border focus:ring-primary"
                />
                <span className="text-sm">Replace entire content</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="merge"
                  checked={applyMode === 'merge'}
                  onChange={() => setApplyMode('merge')}
                  className="h-4 w-4 text-primary border-border focus:ring-primary"
                />
                <span className="text-sm">Append to existing content</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowApplyDialog(false);
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyConfirmed}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
