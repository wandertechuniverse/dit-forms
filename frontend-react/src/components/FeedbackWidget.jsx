import { useState } from 'react';
import { api } from '../lib/api';
import { Star, X, MessageSquare } from 'lucide-react';

export default function FeedbackWidget({ source, context }) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hovered, setHovered] = useState(0);

  async function handleSubmit() {
    if (rating === 0) return;
    try {
      await api.post('/feedback/submit', { source, rating, comment: comment.trim() || undefined, context });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
        <Star size={18} fill="currentColor" />
        <span className="text-sm font-medium">Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
      <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
        <span className="text-sm font-semibold">How was your experience?</span>
        <button onClick={() => setSubmitted(true)} className="p-1 hover:bg-indigo-700 rounded"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(star)} className="p-1 transition-transform hover:scale-110">
              <Star size={28} fill={star <= (hovered || rating) ? "#FBBF24" : "none"} stroke={star <= (hovered || rating) ? "#FBBF24" : "#D1D5DB"} className="transition-colors" />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Any suggestions? (optional)" maxLength={300} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        )}
        {rating > 0 && (
          <button onClick={handleSubmit} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <MessageSquare size={14} /> Send Feedback
          </button>
        )}
      </div>
    </div>
  );
}
