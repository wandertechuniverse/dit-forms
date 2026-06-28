import { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';
import { CheckCircle, AlertTriangle, Loader2, Receipt } from 'lucide-react';

export default function PaymentRecorder({ onSuccess }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!invoiceNumber.trim() || !amount || !reference.trim()) return;
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const res = await api.post('/payments/record', null, {
        params: {
          invoiceNumber: invoiceNumber.trim().toUpperCase(),
          amount: parseFloat(amount),
          reference: reference.trim(),
          method,
        },
      });
      setSuccess(res);
      onSuccess?.(res);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => {
        setInvoiceNumber('');
        setAmount('');
        setReference('');
        setSuccess(null);
        inputRef.current?.focus();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Receipt size={20} className="text-indigo-600" />
        Record Payment
      </h2>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-emerald-800">Payment Recorded!</p>
            <p className="text-sm text-emerald-700 mt-1">
              Invoice {success.invoiceNumber} &bull; GH₵ {success.amount.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-600 mt-2">Ready for next payment...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
            <input
              ref={inputRef}
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
              placeholder="e.g., INV-TERM1-0001"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GH₵) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cash">Cash</option>
                <option value="mobile">Mobile Money</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID *</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., MP230501123456 or collector name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">MoMo/Bank: transaction ID. Cash: collector name.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      )}
    </div>
  );
}
