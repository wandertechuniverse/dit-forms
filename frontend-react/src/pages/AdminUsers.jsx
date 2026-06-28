import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserPlus, Trash2, Shield, Users, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'class_rep', label: 'Class Rep', desc: 'Record payments for assigned class/term' },
  { value: 'auditor', label: 'Auditor', desc: 'Read-only access to records and logs' },
  { value: 'admin', label: 'Admin', desc: 'Full system access' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState({ email: '', fullName: '', role: 'class_rep', password: '', assignedClassTerms: [] });
  const [scopeClass, setScopeClass] = useState('');
  const [scopeTerm, setScopeTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(Array.isArray(res) ? res : res.users || []);
    } catch { setUsers([]); } finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const payload = { ...form };
      if (form.role === 'class_rep' && scopeClass && scopeTerm) {
        payload.assignedClassTerms = [{ programClassId: scopeClass, termId: scopeTerm }];
      } else {
        payload.assignedClassTerms = [];
      }
      await api.post('/admin/users/class-rep', payload);
      setSuccess(`Account created for ${form.email}`);
      setForm({ email: '', fullName: '', role: 'class_rep', password: '', assignedClassTerms: [] });
      setScopeClass(''); setScopeTerm('');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id, email) {
    if (!window.confirm(`Delete ${email}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${id}`); fetchUsers(); } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage admin, class rep, and auditor accounts</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('create')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${tab === 'create' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>
            <UserPlus size={16} /> Create
          </button>
          <button onClick={() => setTab('list')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${tab === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>
            <Users size={16} /> Accounts ({users.length})
          </button>
        </div>
      </div>

      {tab === 'create' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Account Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ROLES.map((r) => (
                  <label key={r.value} className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${form.role === r.value ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={(e) => setForm({ ...form, role: e.target.value })} className="sr-only" />
                    <Shield size={20} className={`mb-2 ${form.role === r.value ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className="font-medium text-gray-900">{r.label}</span>
                    <span className="text-xs text-gray-500 mt-1">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., Ama Serwaa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="rep@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Minimum 8 characters" />
            </div>

            {form.role === 'class_rep' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm"><AlertTriangle size={16} /> Class Rep Scope Required</div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required value={scopeClass} onChange={(e) => setScopeClass(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Program Class ID" />
                  <input type="text" required value={scopeTerm} onChange={(e) => setScopeTerm(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Term ID" />
                </div>
                <p className="text-xs text-amber-700">This rep can ONLY record payments for this specific class/term.</p>
              </div>
            )}

            {error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2"><AlertTriangle size={16} className="text-rose-600 mt-0.5" /><p className="text-sm text-rose-700">{error}</p></div>}
            {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2"><CheckCircle size={16} className="text-emerald-600 mt-0.5" /><p className="text-sm text-emerald-700">{success}</p></div>}

            <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {tab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? <div className="p-12 text-center text-gray-500">Loading...</div> : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Name / Email</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Scopes</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><div className="font-medium text-gray-900">{u.fullName || u.email}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'class_rep' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role?.replace('_', ' ')}</span></td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono">{u.assignedClassTerms?.length ? u.assignedClassTerms.map(s => `${s.programClassId}/${s.termId}`).join(', ') : 'Global'}</td>
                      <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(u.id, u.email)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
