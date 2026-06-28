import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-[10rem] font-black leading-none tracking-tighter text-indigo-500 select-none mb-4">
          404
        </h1>

        <h2 className="text-3xl font-bold text-white mb-4">
          Page Not Found
        </h2>

        <p className="text-lg text-slate-400 mb-10 max-w-md mx-auto">
          The form, student record, or dashboard you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            to="/"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Back to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500 mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Students', 'Forms', 'Groups', 'Payments'].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2"
              >
                <Search size={14} />
                Browse {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
