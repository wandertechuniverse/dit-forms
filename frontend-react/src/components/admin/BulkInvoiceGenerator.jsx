import { useState } from 'react';
import { api } from '../../lib/api';
import { AlertTriangle, CheckCircle, Loader2, FileText, X } from 'lucide-react';

export default function BulkInvoiceGenerator({ programClassId, termId, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Term Handout Fee');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleGenerate(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/invoices/bulk-generate', null, {
        params: { programClassId, termId, amountPerStudent: parseFloat(amount), description },
      });
      setResult(res);
      onSuccess?.(res.generated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate invoices.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
        <FileText size={18} />
        Bulk Generate Invoices
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Bulk Generate Invoices</h2>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>

        {!result ? (
          <form onSubmit={handleGenerate} className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">Creates invoices for <strong>all students</strong> in {programClassId} ({termId}) who don't already have one.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Per Student (GH₵)</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 150.00" className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            {error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={loading || !amount} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {loading ? 'Generating...' : 'Generate Invoices'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className={`rounded-lg p-4 flex items-start gap-3 ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              {result.errors.length > 0 ? <AlertTriangle size={20} className="text-amber-600 mt-0.5" /> : <CheckCircle size={20} className="text-emerald-600 mt-0.5" />}
              <div>
                <p className="font-medium text-gray-900">Generated {result.generated} invoice(s)</p>
                {result.errors.length > 0 && <p className="text-sm text-amber-700 mt-1">{result.errors.length} failed. See details below.</p>}
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left font-medium text-gray-500">Student ID</th><th className="px-3 py-2 text-left font-medium text-gray-500">Error</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.errors.map((err, i) => (
                      <tr key={i}><td className="px-3 py-2 font-mono text-gray-700">{err.studentId}</td><td className="px-3 py-2 text-rose-600">{err.error}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => { setOpen(false); setResult(null); setAmount(''); }} className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
