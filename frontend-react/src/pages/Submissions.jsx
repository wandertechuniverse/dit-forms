import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getScope } from '../lib/api';
import { formatDate, debounce } from '../lib/utils';
import { TableSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ExportButton from '../components/ui/ExportButton';
import toast from 'react-hot-toast';
import {
  Search, Eye, Loader2, Filter, Inbox,
} from 'lucide-react';

export default function Submissions() {
  const navigate = useNavigate();
  const scope = getScope();
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSubmissions = useCallback(async (q = '', status = '') => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      let url = `/submissions?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      if (status) url += `&status=${status}`;
      const res = await api.get(url);
      setSubmissions(res.submissions || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const handleSearch = useCallback(debounce((q) => loadSubmissions(q, statusFilter)), [loadSubmissions, statusFilter]);
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    loadSubmissions(search, status);
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Review and manage all form submissions.</p>
          </div>
          <ExportButton endpoint="submissions" label="Export CSV" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-8">
        <div className="sticky top-14 z-10 p-4 md:p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              {['', 'pending', 'reviewed', 'approved', 'rejected'].map((s) => (
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
            <span className="text-sm text-gray-500 shrink-0">{total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-l-lg">Student</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">ID Number</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Form</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden sm:table-cell">Submitted</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Status</th>
                <th className="px-4 md:px-6 py-3 md:py-4 rounded-r-lg text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6}><TableSkeleton rows={5} cols={6} /></td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={Inbox}
                    title="No submissions yet"
                    description="Submissions will appear here once students start filling out your forms."
                  />
                </td></tr>
              ) : (
                submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/submissions/${s.id}`)}
                  >
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm shrink-0">
                          {s.studentMatch?.fullNameSnapshot?.charAt(0) || '?'}
                        </div>
                        <div className="ml-3 md:ml-4 min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {s.studentMatch?.fullNameSnapshot || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 md:hidden">{s.studentMatch?.idNumberSnapshot}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 font-mono hidden md:table-cell">
                      {s.studentMatch?.idNumberSnapshot || '—'}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden lg:table-cell">{s.formDefinitionId?.slice(-6)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden sm:table-cell">{formatDate(s.submittedAt)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/submissions/${s.id}`); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status || 'unknown'}
    </span>
  );
}
