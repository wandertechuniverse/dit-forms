import { useFormBuilderStore } from '../../store/formBuilderStore';

export default function UnsavedChangesBanner() {
  const { isDirty, saveState, errorMessage, validationErrors } = useFormBuilderStore();

  if (!isDirty && saveState !== 'error' && !validationErrors) return null;

  return (
    <div className="sticky top-16 z-30 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-b ${
        validationErrors ? 'bg-red-50 text-red-700 border-red-200' :
        saveState === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
        isDirty ? 'bg-amber-50 text-amber-700 border-amber-200' :
        'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          validationErrors || saveState === 'error' ? 'bg-red-500' :
          isDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
        }`} />
        {validationErrors ? (
          <span>Validation errors — fix before publishing. {Object.values(validationErrors).flatMap(e => Object.values(e)).join('; ')}</span>
        ) : saveState === 'error' ? (
          <span>Save failed: {errorMessage}</span>
        ) : isDirty ? (
          <span>You have unsaved changes</span>
        ) : (
          <span>All changes saved</span>
        )}
      </div>
    </div>
  );
}
