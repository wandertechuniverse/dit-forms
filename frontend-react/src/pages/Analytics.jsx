import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader2, TrendingUp, TrendingDown, Users, FileText, DollarSign, AlertTriangle } from 'lucide-react';

function MetricCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <div className={`p-5 rounded-xl border ${colors[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={18} className="opacity-60" />}
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && <p className="text-xs mt-2 opacity-70">{subtitle}</p>}
    </div>
  );
}

function GroupHealthRow({ group }) {
  const healthColors = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    neutral: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || '#6366f1' }} />
        <div>
          <span className="text-sm font-medium text-gray-900">{group.name}</span>
          <span className="text-xs text-gray-500 ml-2">{group.student_count} students</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{group.orders_unpaid}/{group.orders_total} unpaid</span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${healthColors[group.health]}`}>
          {group.health}
        </span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const programClassId = searchParams.get('classId') || '';
  const termId = searchParams.get('termId') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!programClassId || !termId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/analytics/dashboard?programClassId=${programClassId}&termId=${termId}`)
      .then(res => { setData(res); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [programClassId, termId]);

  if (!programClassId || !termId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Select a Class and Term</h2>
          <p className="text-sm text-gray-500">Navigate from the dashboard with a class/term selected.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { collection, completion, groups } = data || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time health metrics for this class/term</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Collection Rate"
          value={`${collection?.collection_rate_pct || 0}%`}
          subtitle={`${collection?.total_paid?.toLocaleString() || 0} / ${collection?.total_invoiced?.toLocaleString() || 0}`}
          icon={DollarSign}
          color={collection?.collection_rate_pct >= 80 ? 'emerald' : collection?.collection_rate_pct >= 50 ? 'amber' : 'rose'}
        />
        <MetricCard
          title="Form Completion"
          value={`${completion?.completion_rate_pct || 0}%`}
          subtitle={`${completion?.total_submitted || 0} / ${completion?.total_students || 0} students`}
          icon={FileText}
          color={completion?.completion_rate_pct >= 80 ? 'emerald' : completion?.completion_rate_pct >= 50 ? 'amber' : 'rose'}
        />
        <MetricCard
          title="Total Invoiced"
          value={`${collection?.total_invoiced?.toLocaleString() || 0}`}
          subtitle={`${collection?.orders_total || 0} orders`}
          icon={DollarSign}
          color="indigo"
        />
        <MetricCard
          title="Unpaid Orders"
          value={collection?.orders_unpaid || 0}
          subtitle={`${collection?.orders_paid || 0} paid`}
          icon={AlertTriangle}
          color={collection?.orders_unpaid > 0 ? 'amber' : 'emerald'}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Health</h2>
        {groups && groups.length > 0 ? (
          <div>
            {groups.map((group, i) => (
              <GroupHealthRow key={i} group={group} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4">No groups found for this class/term.</p>
        )}
      </div>
    </div>
  );
}
