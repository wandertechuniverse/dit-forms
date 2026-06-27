import { useState, useEffect, useCallback } from 'react';
import { api, getScope } from '../lib/api';
import { formatDate } from '../lib/utils';
import { TableSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useSound } from '../hooks/useSound';
import toast from 'react-hot-toast';
import {
  Plus, Loader2, X, Tag, Users, Palette,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function Groups() {
  const scope = getScope();
  const { play } = useSound();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [createLoading, setCreateLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      const res = await api.get(`/groups?programClassId=${scope.programClassId}&termId=${scope.termId}`);
      setGroups(res.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/groups', {
        ...createForm,
        programClassId: scope.programClassId,
        termId: scope.termId,
      });
      toast.success('Group created');
      play('success');
      setShowCreate(false);
      setCreateForm({ name: '', description: '', color: '#6366f1' });
      loadGroups();
    } catch (err) {
      toast.error(err.message);
      play('error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Delete this group? Students will be ungrouped but not deleted.')) return;
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success('Group deleted');
      loadGroups();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Organize students into groups for filtering and bulk actions.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Group</span>
          </button>
        </div>
      </div>

      <div className="mx-4 md:mx-8">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No groups yet"
            description="Create groups to organize students by shift, section, lab, or any category."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: group.color + '20' }}>
                      <Tag className="w-5 h-5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{group.studentCount} student{group.studentCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(group.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Group</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Morning Shift, Lab Group 3"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Brief description of this group"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex items-center gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${createForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
