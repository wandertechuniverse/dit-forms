import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getScope, setScope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/utils';
import ExportButton from '../components/ui/ExportButton';
import { CardSkeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  Users, FileText, Inbox, AlertCircle, TrendingUp,
  ArrowUpRight, Settings, Loader2, Lock, PenLine, DollarSign,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClassRep = user?.role === 'class_rep';
  const lockedScope = isClassRep && user?.assignedClassTerms?.length > 0
    ? user.assignedClassTerms[0]
    : null;

  const [scope, setScopeState] = useState(getScope);
  const [stats, setStats] = useState({ students: 0, forms: 0, submissions: 0, unpaid: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [programClassId, setProgramClassId] = useState(lockedScope?.programClassId || scope.programClassId);
  const [termId, setTermId] = useState(lockedScope?.termId || scope.termId);

  const loadDashboard = async () => {
    if (!programClassId || !termId) return;
    setScope(programClassId, termId);
    setScopeState({ programClassId, termId });
    setLoading(true);
    setStatsLoading(true);
    try {
      const [students, forms, submissions, orders] = await Promise.all([
        api.get(`/students?programClassId=${programClassId}&termId=${termId}`),
        api.get(`/forms?programClassId=${programClassId}&termId=${termId}`),
        api.get(`/submissions?programClassId=${programClassId}&termId=${termId}`),
        api.get(`/handout-orders?programClassId=${programClassId}&termId=${termId}&invoiceStatus=unpaid`),
      ]);
      setStats({
        students: students.total || 0,
        forms: forms.length || 0,
        submissions: submissions.total || 0,
        unpaid: orders.total || 0,
      });
      setRecent((submissions.submissions || []).slice(0, 5));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (scope.programClassId && scope.termId) loadDashboard();
  }, []);

  const statCards = [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Forms', value: stats.forms, icon: FileText, color: 'bg-emerald-500' },
    { label: 'Submissions', value: stats.submissions, icon: Inbox, color: 'bg-violet-500' },
    { label: 'Unpaid Invoices', value: stats.unpaid, icon: AlertCircle, color: 'bg-rose-500' },
  ];

  if (isClassRep && lockedScope) {
    return (
      <div className="pb-24 md:pb-8">
        <div className="px-4 pt-6 md:px-8 md:pt-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm mb-6">Welcome back, {user?.email?.split('@')[0]}</p>
        </div>

        <div className="px-4 md:px-8 mb-6">
          <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-indigo-200" />
              <span className="text-xs font-medium text-indigo-200 uppercase tracking-wide">My Scope</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white/20 rounded-lg font-mono font-bold text-lg backdrop-blur-sm">
                {lockedScope.programClassId}
              </span>
              <span className="text-indigo-200">/</span>
              <span className="px-3 py-1.5 bg-white/20 rounded-lg font-mono font-bold text-lg backdrop-blur-sm">
                {lockedScope.termId}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const publicForms = stats.forms > 0;
                if (publicForms) {
                  navigate('/submissions');
                } else {
                  toast.error('No published forms available');
                }
              }}
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all active:scale-95"
            >
              <div className="p-3 bg-indigo-100 rounded-xl">
                <PenLine className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">New Submission</span>
            </button>
            <button
              onClick={() => navigate('/handouts')}
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all active:scale-95"
            >
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Handout Orders</span>
            </button>
          </div>
        </div>

        {statsLoading ? (
          <div className="px-4 md:px-8"><CardSkeleton /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 md:px-8 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500">Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.students}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500">Submissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.submissions}</p>
            </div>
          </div>
        )}

        <div className="mx-4 md:mx-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">Recent Activity</h2>
            <a href="/submissions" className="text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {recent.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No recent submissions.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                    {s.studentMatch?.fullNameSnapshot?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.studentMatch?.fullNameSnapshot}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(s.submittedAt)}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Welcome back! Here's what's happening today.</p>
          </div>
          <ExportButton endpoint="students" label="Export Students" />
        </div>
      </div>

      <div className="px-4 md:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Scope</h2>
          </div>
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Program Class ID</label>
              <input
                type="text"
                value={programClassId}
                onChange={(e) => setProgramClassId(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g., DIT-2026-A"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Term ID</label>
              <input
                type="text"
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g., 2026-S1"
              />
            </div>
            <button
              onClick={loadDashboard}
              disabled={loading || !programClassId || !termId}
              className="px-5 md:px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Load
            </button>
          </div>
        </div>
      </div>

      {statsLoading ? (
        <div className="px-4 md:px-8"><CardSkeleton /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4 mb-6 md:mb-8 px-4 md:px-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`${stat.color} p-2 md:p-3 rounded-xl shadow-lg`}>
                  <stat.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">Active</span>
                <span className="text-gray-400 ml-1 md:ml-2 hidden sm:inline">in current scope</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mx-4 md:mx-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Recent Submissions</h2>
          <a href="/submissions" className="text-xs md:text-sm text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
          </a>
        </div>
        {recent.length === 0 ? (
          <p className="text-center text-gray-400 py-6 md:py-8 text-sm">No submissions yet. Set a scope and load the dashboard.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-2.5 md:py-3 rounded-l-lg">Student</th>
                  <th className="px-3 md:px-6 py-2.5 md:py-3 hidden sm:table-cell">Form</th>
                  <th className="px-3 md:px-6 py-2.5 md:py-3 hidden md:table-cell">Date</th>
                  <th className="px-3 md:px-6 py-2.5 md:py-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm shrink-0">
                          {s.studentMatch?.fullNameSnapshot?.charAt(0) || '?'}
                        </div>
                        <div className="ml-2.5 md:ml-4 min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{s.studentMatch?.fullNameSnapshot}</div>
                          <div className="text-[10px] md:text-xs text-gray-500 sm:hidden">{s.studentMatch?.idNumberSnapshot}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden sm:table-cell">{s.formDefinitionId?.slice(-6)}</td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(s.submittedAt)}</td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <span className="px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
