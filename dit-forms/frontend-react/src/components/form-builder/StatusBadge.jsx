import { Check, Loader2, AlertCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    archived: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

export function SaveIndicator({ state, lastSavedAt }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
        <Check className="w-3 h-3" /> Saved
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle className="w-3 h-3" /> Save failed
      </span>
    );
  }
  if (lastSavedAt) {
    const time = lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <span className="text-xs text-gray-400">Last saved {time}</span>
    );
  }
  return null;
}
