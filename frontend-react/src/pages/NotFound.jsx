import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"
          style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }}
        />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <h1
          className="text-[12rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 select-none"
          style={{
            textShadow: '0 0 80px rgba(129, 140, 248, 0.3)',
            transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
            animation: 'bounce-slow 4s ease-in-out infinite',
          }}
        >
          404
        </h1>

        <h2 className="text-3xl font-bold text-white mb-4 mt-[-2rem]">
          Page Not Found
        </h2>

        <p className="text-lg text-indigo-200/80 mb-10 max-w-md mx-auto">
          The form, student record, or dashboard you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 group"
          >
            <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
            Back to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-sm text-indigo-300/60 mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Students', 'Forms', 'Groups', 'Payments'].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-indigo-200 text-sm transition-colors flex items-center gap-2"
              >
                <Search size={14} />
                Browse {item}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}
