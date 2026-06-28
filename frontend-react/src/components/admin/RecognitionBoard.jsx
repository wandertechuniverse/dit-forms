import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Trophy, Copy, CheckCircle } from 'lucide-react';

export default function RecognitionBoard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.post('/analytics/rep-recognition/check')
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;

  if (!data?.reps?.length) {
    return (
      <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl">
        <Trophy size={32} className="mx-auto mb-2 opacity-40" />
        <p>No recognitions this week. Keep encouraging your reps!</p>
      </div>
    );
  }

  function copyRecognition(rep) {
    const msg = `Congratulations ${rep.fullName}! ${rep.badges.map(b => b.title).join(' & ')} — ${rep.badges.map(b => b.description).join('. ')}`;
    navigator.clipboard.writeText(msg);
    setCopied(rep.userId);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <Trophy size={20} className="text-amber-500" />
        Weekly Rep Recognition ({data.recognized_count} reps)
      </h3>

      {data.reps.map((rep) => (
        <div key={rep.userId} className="bg-white p-4 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900">{rep.fullName}</span>
            <button
              onClick={() => copyRecognition(rep)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {copied === rep.userId ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <div className="space-y-2">
            {rep.badges.map((badge, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl">{badge.type === 'accuracy_champion' ? '🎯' : badge.type === 'volume_leader' ? '⚡' : '📅'}</div>
                <div>
                  <div className="font-medium text-amber-800">{badge.title}</div>
                  <div className="text-sm text-amber-700">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
