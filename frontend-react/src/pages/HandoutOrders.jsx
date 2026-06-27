import { useState, useEffect, useCallback } from 'react';
import { api, getScope } from '../lib/api';
import { formatDate, formatMoney, debounce } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
import { TableSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import {
  Search, Loader2, Receipt, CheckCircle2, Filter, FileText, Download,
} from 'lucide-react';

export default function HandoutOrders() {
  const scope = getScope();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadGroups = useCallback(async () => {
    if (!scope.programClassId || !scope.termId) return;
    try {
      const res = await api.get(`/students/all-groups?programClassId=${scope.programClassId}&termId=${scope.termId}`);
      setGroups(res || []);
    } catch (err) {
      console.error(err);
    }
  }, [scope.programClassId, scope.termId]);

  const loadOrders = useCallback(async (q = '', status = '', grp = '') => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      let url = `/handout-orders?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      if (status) url += `&invoiceStatus=${status}`;
      if (grp) url += `&group=${encodeURIComponent(grp)}`;
      const res = await api.get(url);
      setOrders(res.orders || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadOrders(); loadGroups(); }, [loadOrders, loadGroups]);

  const handleSearch = useCallback(debounce((q) => loadOrders(q, statusFilter, groupFilter)), [loadOrders, statusFilter, groupFilter]);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    loadOrders(search, status, groupFilter);
  };

  const handleGroupFilter = (grp) => {
    setGroupFilter(grp);
    loadOrders(search, statusFilter, grp);
  };

  const markPaid = async (orderId) => {
    setActionLoading(orderId);
    try {
      await api.post(`/handout-orders/${orderId}/mark-paid`);
      toast.success('Payment recorded successfully');
      loadOrders(search, statusFilter);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadPdf = async (orderId) => {
    try {
      const token = localStorage.getItem('dit_token');
      const res = await fetch(`${API_BASE}/handout-orders/${orderId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId.slice(-8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const exportInvoices = () => {
    if (!scope.programClassId || !scope.termId) return;
    const token = localStorage.getItem('dit_token');
    const url = `${API_BASE}/handout-orders/export/invoices?programClassId=${scope.programClassId}&termId=${scope.termId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `invoices-${scope.termId}.csv`;
        a.click();
      })
      .catch(() => toast.error('Export failed'));
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Handout Orders</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Manage handout invoices and payment status.</p>
          </div>
          <button
            onClick={exportInvoices}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Invoices</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-8">
        <div className="sticky top-14 z-10 p-4 md:p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student or invoice..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              {['', 'unpaid', 'paid'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  className={`px-2.5 md:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                    statusFilter === s
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s || 'All'}
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
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-l-lg">Student</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">Invoice #</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Items</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden sm:table-cell">Total</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Status</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Date</th>
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-r-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7}><TableSkeleton rows={5} cols={7} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={Receipt}
                    title="No handout orders"
                    description="Orders will appear here when students submit handout tracking forms."
                  />
                </td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm shrink-0">
                          {order.student?.fullNameSnapshot?.charAt(0) || '?'}
                        </div>
                        <div className="ml-3 md:ml-4 min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{order.student?.fullNameSnapshot || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 md:hidden">{order.student?.idNumberSnapshot}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-mono text-gray-500 hidden md:table-cell">{order.invoiceNumber || order.id?.slice(-8)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="text-sm text-gray-900">
                        {order.lines?.length || 0} item{(order.lines?.length || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px] md:max-w-none">
                        {order.lines?.map((l) => l.courseId).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                      {formatMoney(order.invoice?.totalAmount)}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <InvoiceBadge status={order.invoice?.invoiceStatus} />
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDate(order.createdAt)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => downloadPdf(order.id)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Download PDF Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {order.invoice?.invoiceStatus === 'unpaid' && (
                          <button
                            onClick={() => markPaid(order.id)}
                            disabled={actionLoading === order.id}
                            className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Mark Paid</span>
                          </button>
                        )}
                      </div>
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

function InvoiceBadge({ status }) {
  const styles = {
    unpaid: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    partially_paid: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status || 'unknown'}
    </span>
  );
}
