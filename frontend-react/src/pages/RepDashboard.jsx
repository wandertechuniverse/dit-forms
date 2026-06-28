import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Activity, Clock, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import RepTutorial from '../components/onboarding/RepTutorial';
import FeedbackWidget from '../components/FeedbackWidget';

export default function RepDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('rep_tutorial_completed') !== 'true';
  });

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/my-performance?days=${days}`)
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></div>;

  if (!data?.metrics) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Activity size={48} className="mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
        <p className="text-gray-500">Start recording payments to see your performance insights.</p>
      </div>
    );
  }

  const m = data.metrics;
  const b = data.benchmarks;

  const errorProgress = Math.min(100, Math.max(0, 100 - (m.errorRate / b.targetErrorRate * 100)));
  const speedProgress = Math.min(100, (m.paymentsPerHour || 0) / b.targetPaymentsPerHour * 100);
  const consistencyProgress = m.consistencyScore;

  return (
    <>
      {showTutorial && (
        <RepTutorial onComplete={() => {
          localStorage.setItem('rep_tutorial_completed', 'true');
          setShowTutorial(false);
        }} />
      )}
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Performance</h1>
          <p className="text-sm text-gray-500">Track your progress &bull; Last {days} days</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressBarCard icon={AlertTriangle} label="Accuracy" value={`${m.errorRate}% error`} progress={errorProgress} target={`Target: \u2264${b.targetErrorRate}% errors`} />
        <ProgressBarCard icon={Clock} label="Speed" value={`${m.paymentsPerHour || 0}/hr`} progress={speedProgress} target={`Target: ${b.targetPaymentsPerHour} payments/hr`} />
        <ProgressBarCard icon={TrendingUp} label="Consistency" value={`${m.consistencyScore}/100`} progress={consistencyProgress} target={`Target: \u2265${b.targetConsistency} score`} />
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">Your Improvement Opportunities</h3>
        </div>
        <ul className="space-y-3 text-sm text-indigo-800">
          {m.errorRate > b.targetErrorRate && (
            <li className="flex items-start gap-2"><span>🎯</span><span><strong>Reduce errors:</strong> Double-check invoice numbers before submitting.</span></li>
          )}
          {m.paymentsPerHour && m.paymentsPerHour < b.targetPaymentsPerHour && (
            <li className="flex items-start gap-2"><span>⚡</span><span><strong>Increase speed:</strong> Use QR code scanning to auto-fill invoice numbers.</span></li>
          )}
          {m.consistencyScore < b.targetConsistency && (
            <li className="flex items-start gap-2"><span>📅</span><span><strong>Build routine:</strong> Set fixed daily collection windows.</span></li>
          )}
          {errorProgress >= 80 && speedProgress >= 80 && consistencyProgress >= 80 && (
            <li className="flex items-start gap-2"><span>🏆</span><span><strong>Outstanding!</strong> You're exceeding all benchmarks. Consider mentoring newer reps.</span></li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard value={m.totalRecorded} label="Total Recorded" />
        <StatCard value={m.activeDays} label="Active Days" />
        <StatCard value={m.dailyAverage.toFixed(1)} label="Daily Average" />
        <StatCard value={`${Math.round((1 - m.errorRate / 100) * 100)}%`} label="Success Rate" color="text-emerald-600" />
      </div>
    </div>
    <FeedbackWidget source="rep_dashboard" />
    </>
  );
}

function ProgressBarCard({ icon: Icon, label, value, progress, target }) {
  const barColor = progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const badgeColor = progress >= 80 ? 'bg-emerald-100 text-emerald-700' : progress >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Icon size={16} /> {label}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">{target}</p>
    </div>
  );
}

function StatCard({ value, label, color = 'text-gray-900' }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
