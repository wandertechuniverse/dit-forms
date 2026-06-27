import { Save, Send, Trash2, Copy, Loader2, Eye, ExternalLink } from 'lucide-react';
import { useFormBuilderStore } from '../../store/formBuilderStore';
import StatusBadge, { SaveIndicator } from './StatusBadge';

export default function ActionButtons() {
  const {
    currentVersion,
    isDirty,
    saveState,
    publishState,
    lastSavedAt,
    saveDraft,
    publishVersion,
    deleteDraft,
    createNewVersionFromPublished,
    allVersions,
    formDefinition,
  } = useFormBuilderStore();

  const isDraft = currentVersion?.status === 'draft';
  const hasPublished = allVersions.some((v) => v.status === 'published');

  const handlePreview = () => {
    if (!formDefinition?.id) return;
    window.open(`/form/${formDefinition.id}`, '_blank');
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        {currentVersion && <StatusBadge status={currentVersion.status} />}
        <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
        {isDirty && (
          <span className="text-xs text-amber-600 font-medium animate-pulse">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={!formDefinition?.id}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          title="Open form as students see it"
        >
          <Eye className="w-4 h-4" />
          Preview
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>

        {!isDraft && hasPublished && (
          <button
            onClick={createNewVersionFromPublished}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            New Version
          </button>
        )}

        {isDraft && (
          <button
            onClick={() => {
              if (window.confirm('Delete this draft? This cannot be undone.')) {
                deleteDraft();
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}

        {isDraft && (
          <button
            onClick={() => saveDraft()}
            disabled={saveState === 'saving' || !isDirty}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveState === 'saving' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Draft
          </button>
        )}

        {isDraft && (
          <button
            onClick={() => {
              if (window.confirm('Publish this version? It will become the live form for students.')) {
                publishVersion();
              }
            }}
            disabled={publishState === 'publishing'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishState === 'publishing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Live
          </button>
        )}
      </div>
    </div>
  );
}
