import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Target, Users } from 'lucide-react';

function MetricCard({ title, value, target, color, icon: Icon, subtitle }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <div className={`p-5 rounded-xl border ${colors[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        <Icon size={18} className="opacity-60" />
      </div>
      <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
      <div className="text-xs opacity-70">{target}</div>
      {subtitle && <div className="text-xs opacity-60 mt-2 pt-2 border-t border-current/10">{subtitle}</div>}
    </div>
  );
}

export default function RepScorecard() {
  const [reps, setReps] = useState([]);
  const [selectedRep, setSelectedRep] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    api.get('/reps').then(res => {
      setReps(res.reps || []);
      if (res.reps?.length) setSelectedRep(res.reps[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRep) return;
    setLoading(true);
    api.get(`/reps/${selectedRep}/scorecard?days=${period}`)
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedRep, period]);

  const getStatus = (value, target, inverse = false) => {
    if (inverse) return value <= target ? 'emerald' : value <= target * 1.5 ? 'amber' : 'rose';
    return value >= target ? 'emerald' : value >= target * 0.7 ? 'amber' : 'rose';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rep Performance</h1>
          <p className="text-sm text-gray-500 mt-1">Coaching metrics based on audit trail data</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedRep || ''} onChange={(e) => setSelectedRep(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            {reps.map(r => <option key={r.id} value={r.id}>{r.fullName || r.email}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {!selectedRep ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Class Reps Found</h2>
            <p className="text-sm text-gray-500">Create class rep accounts first via User Management.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Success Rate"
              value={`${data.metrics.success_rate}%`}
              target={`${data.benchmark.target_success_rate}% target`}
              color={getStatus(data.metrics.success_rate, data.benchmark.target_success_rate)}
              icon={CheckCircle}
              subtitle={`${data.metrics.total_payments_recorded} total`}
            />
            <MetricCard
              title="Recording Speed"
              value={`${data.metrics.payments_per_hour}/hr`}
              target={`${data.benchmark.target_payments_per_hour}/hr target`}
              color={getStatus(data.metrics.payments_per_hour, data.benchmark.target_payments_per_hour)}
              icon={Clock}
              subtitle={`${data.metrics.active_days} active days`}
            />
            <MetricCard
              title="Error Rate"
              value={`${(data.metrics.error_count / Math.max(data.metrics.total_payments_recorded, 1) * 100).toFixed(1)}%`}
              target={`≤${data.benchmark.max_acceptable_error_rate}% acceptable`}
              color={getStatus(data.metrics.error_count / Math.max(data.metrics.total_payments_recorded, 1) * 100, data.benchmark.max_acceptable_error_rate, true)}
              icon={AlertTriangle}
              subtitle={`${data.metrics.error_count} failed`}
            />
            <MetricCard
              title="Total Volume"
              value={data.metrics.total_payments_recorded}
              target="Payments recorded"
              color="indigo"
              icon={TrendingUp}
              subtitle={`Avg ${(data.metrics.total_payments_recorded / Math.max(data.metrics.active_days, 1)).toFixed(1)}/day`}
            />
          </div>

          {data.top_errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target size={18} className="text-amber-500" />
                Improvement Opportunities
              </h3>
              <div className="space-y-3">
                {data.top_errors.map((err, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-sm text-amber-800">{err.message}</span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">{err.count}x</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">Tip: Most errors are caused by typos in invoice numbers or exceeding balance. Double-check before submitting.</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">No activity recorded for this period.</div>
      )}
    </div>
  );
}
