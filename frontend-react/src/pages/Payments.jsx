import { useState, useEffect, useCallback } from 'react';
import { api, getScope } from '../lib/api';
import { formatDate, formatMoney, debounce } from '../lib/utils';
import { TableSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ExportButton from '../components/ui/ExportButton';
import { useSound } from '../hooks/useSound';
import {
  Search, Filter, ExternalLink, DollarSign,
} from 'lucide-react';

const METHOD_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'other', label: 'Other' },
];

export default function Payments() {
  const scope = getScope();
  const { play } = useSound();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!scope.programClassId || !scope.termId) return;
    try {
      const res = await api.get(`/students/all-groups?programClassId=${scope.programClassId}&termId=${scope.termId}`);
      setGroups(res || []);
    } catch (err) {
      console.error(err);
    }
  }, [scope.programClassId, scope.termId]);

  const loadPayments = useCallback(async (q = '', method = '', grp = '') => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      let url = `/payments?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      if (q) url += `&studentId=${encodeURIComponent(q)}`;
      if (method) url += `&method=${method}`;
      if (grp) url += `&group=${encodeURIComponent(grp)}`;
      const res = await api.get(url);
      setPayments(res.payments || []);
      setTotal(res.total || 0);
      setTotalAmount(res.totalAmount || 0);
      if (res.totalAmount > 0) play('kaching');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadPayments(); loadGroups(); }, [loadPayments, loadGroups]);

  const handleSearch = useCallback(debounce((q) => loadPayments(q, methodFilter, groupFilter)), [loadPayments, methodFilter, groupFilter]);

  const handleMethodFilter = (method) => {
    setMethodFilter(method);
    loadPayments(search, method, groupFilter);
  };

  const handleGroupFilter = (grp) => {
    setGroupFilter(grp);
    loadPayments(search, methodFilter, grp);
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Track and manage all payment records.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 rounded-2xl px-4 md:px-6 py-2.5 md:py-3 text-white shadow-lg shadow-emerald-500/20">
              <div className="flex items-center gap-2 md:gap-3">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                <div>
                  <p className="text-emerald-100 text-[10px] md:text-xs font-medium">Total Collected</p>
                  <p className="text-base md:text-xl font-bold">{formatMoney(totalAmount)}</p>
                </div>
              </div>
            </div>
            <ExportButton endpoint="payments" label="Export CSV" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-8">
        <div className="sticky top-14 z-10 p-4 md:p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student ID..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleMethodFilter(m.value)}
                  className={`px-2.5 md:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                    methodFilter === m.value
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {groups.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {groups.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => handleGroupFilter(groupFilter === g.name ? '' : g.name)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                      groupFilter === g.name ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
            <span className="text-sm text-gray-500 shrink-0">{total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-l-lg">Order ID</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Amount</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden sm:table-cell">Method</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">Reference</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Date</th>
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-r-lg">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6}><TableSkeleton rows={5} cols={6} /></td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={DollarSign}
                    title="No payments recorded"
                    description="Payment records will appear here once payments are processed."
                  />
                </td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm shrink-0">
                          {p.handoutOrderId?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="ml-3 md:ml-4 min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 font-mono truncate">{p.handoutOrderId?.slice(-8) || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-bold text-emerald-600">
                      {formatMoney(p.amount)}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {(p.method || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-mono text-gray-500 hidden md:table-cell">
                      {p.reference || '—'}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDate(p.paidAt)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 font-mono">
                      {p.receivedByUserId?.slice(-8) || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
