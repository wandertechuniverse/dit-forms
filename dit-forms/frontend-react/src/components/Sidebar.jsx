import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  LayoutDashboard, Users, FileText, Inbox, Receipt, CreditCard,
  LogOut, GraduationCap, ChevronLeft,
} from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/forms', label: 'Forms', icon: FileText },
  { to: '/submissions', label: 'Submissions', icon: Inbox },
  { to: '/handouts', label: 'Handout Orders', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();

  const handleNav = () => {
    if (mobileOpen && onMobileClose) onMobileClose();
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        {!collapsed && <span className="text-xl font-bold text-gray-900">DIT Forms</span>}
        <button onClick={onToggle} className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition-colors hidden md:block">
          <ChevronLeft className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={handleNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
            title={collapsed ? link.label : undefined}
          >
            <link.icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
