import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSound } from '../hooks/useSound';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { muted, toggle } = useSound();

  useEffect(() => {
    document.body.classList.toggle('menu-open', mobileOpen);
    return () => document.body.classList.remove('menu-open');
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <button className={`hamburger ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
        <span /><span /><span />
      </button>

      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-indigo-600"
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
