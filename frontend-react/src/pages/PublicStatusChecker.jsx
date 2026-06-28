import { useState } from 'react';
import { Search, CheckCircle, AlertTriangle, Download, Loader2 } from 'lucide-react';
import FeedbackWidget from '../components/FeedbackWidget';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function PublicStatusChecker() {
  const [idNumber, setIdNumber] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheck(e) {
    e.preventDefault();
    if (!idNumber.trim()) return;
    setLoading(true);
    setError('');
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/public/status?idNumber=${encodeURIComponent(idNumber)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Failed to check status.');
        return;
      }
      setStatus(data);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Status</h1>
          <p className="text-gray-600 text-sm">Enter your student ID to view payment status. No login required.</p>
        </div>

        <form onSubmit={handleCheck} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Student ID Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
              placeholder="e.g., 01240001C"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !idNumber.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Check
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Your ID is processed securely. No personal data is stored.</p>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {status && !status.found && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">No Records Found</p>
              <p className="text-xs text-amber-700 mt-1">{status.message}</p>
            </div>
          </div>
        )}

        {status && status.found && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-medium text-indigo-900">Records Found</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{status.studentName}</p>
              <p className="text-xs text-gray-600">{status.programClass} &bull; {status.term}</p>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Invoiced</p>
                <p className="text-lg font-bold text-gray-900">GH₵ {status.totalInvoiced.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                <p className={`text-lg font-bold ${status.pendingBalance === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  GH₵ {status.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Pending Balance</p>
                  {status.pendingBalance === 0 && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">All Paid</span>
                  )}
                </div>
                <p className={`text-2xl font-bold ${status.pendingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  GH₵ {status.pendingBalance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 space-y-2">
              {status.latestReceiptUrl && (
                <a
                  href={`${API_BASE}${status.latestReceiptUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={18} />
                  Download Latest Receipt
                </a>
              )}
              <p className="text-xs text-center text-gray-500 pt-2">
                Last updated: {status.lastUpdated ? new Date(status.lastUpdated).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
      {status?.found && (
        <FeedbackWidget source="status_checker" context={{ term: status.term }} />
      )}
    </div>
  );
}
