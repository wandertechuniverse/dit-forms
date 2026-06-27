import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api, getScope } from '../../lib/api';

export default function ExportButton({ endpoint, label = 'Export CSV', className = '' }) {
  const [loading, setLoading] = useState(false);
  const scope = getScope();

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dit_token');
      const url = `${api.baseURL}/export/${endpoint}?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${endpoint}_${scope.programClassId}_${scope.termId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {label}
    </button>
  );
}
