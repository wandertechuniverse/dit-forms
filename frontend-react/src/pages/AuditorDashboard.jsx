import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Download, User, Activity, CheckCircle, XCircle,
} from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-rose-100 text-rose-700',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  PUBLISH_FORM: 'bg-purple-100 text-purple-700',
  RECORD_PAYMENT: 'bg-amber-100 text-amber-700',
  ASSIGN_GROUP: 'bg-cyan-100 text-cyan-700',
};

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  class_rep: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
  auditor: 'bg-gray-100 text-gray-600',
  anonymous: 'bg-gray-100 text-gray-500',
};

export default function AuditorDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', resourceType: '', userId: '' });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  async function fetchLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (filters.action) params.append('action', filters.action);
      if (filters.resourceType) params.append('resource_type', filters.resourceType);
      if (filters.userId) params.append('user_id', filters.userId);
      const res = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(res.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = ['Timestamp', 'User ID', 'Role', 'IP', 'Action', 'Resource', 'Resource ID', 'Success', 'Error'];
    const rows = logs.map(l => [
      l.timestamp, l.user_id || '', l.user_role || '', l.ip_address || '',
      l.action, l.resource_type, l.resource_id || '', l.success ? 'Yes' : 'No', l.error_message || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">Read-only compliance log</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="PUBLISH_FORM">Publish Form</option>
          <option value="RECORD_PAYMENT">Record Payment</option>
          <option value="ASSIGN_GROUP">Assign Group</option>
        </select>
        <select
          value={filters.resourceType}
          onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Resources</option>
          <option value="Student">Students</option>
          <option value="HandoutOrder">Orders</option>
          <option value="Payment">Payments</option>
          <option value="FormVersion">Forms</option>
          <option value="StudentGroup">Groups</option>
        </select>
        <input
          type="text"
          placeholder="Filter by User ID..."
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Resource</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No audit logs match filters</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-gray-400" />
                        <span className="font-mono text-xs text-gray-600">{log.user_id?.slice(0, 8)}...</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[log.user_role] || 'bg-gray-100 text-gray-500'}`}>
                          {log.user_role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Activity size={13} className="text-gray-400" />
                        <span className="text-gray-700 text-xs">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="font-mono text-[10px] text-gray-400">{log.resource_id.slice(0, 8)}...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <CheckCircle size={15} className="text-emerald-500" />
                      ) : (
                        <XCircle size={15} className="text-rose-500" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
