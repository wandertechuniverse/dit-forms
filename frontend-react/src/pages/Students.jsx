import { useState, useEffect, useCallback } from 'react';
import { api, getScope } from '../lib/api';
import { formatDate, debounce } from '../lib/utils';
import { TableSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ExportButton from '../components/ui/ExportButton';
import { useSound } from '../hooks/useSound';
import toast from 'react-hot-toast';
import {
  Search, Upload, UserPlus, FileSpreadsheet, Loader2,
  X, Users, Filter,
} from 'lucide-react';

export default function Students() {
  const scope = getScope();
  const { play } = useSound();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', idNumber: '' });
  const [addLoading, setAddLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!scope.programClassId || !scope.termId) return;
    try {
      const res = await api.get(`/students/all-groups?programClassId=${scope.programClassId}&termId=${scope.termId}`);
      setGroups(res || []);
    } catch (err) {
      console.error(err);
    }
  }, [scope.programClassId, scope.termId]);

  const loadStudents = useCallback(async (q = '', grp = '') => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      let url = `/students?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      if (grp) url += `&group=${encodeURIComponent(grp)}`;
      const res = await api.get(url);
      setStudents(res.students || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadStudents(); loadGroups(); }, [loadStudents, loadGroups]);

  const handleSearch = useCallback(debounce((q) => loadStudents(q, groupFilter)), [loadStudents, groupFilter]);

  const handleGroupFilter = (grp) => {
    setGroupFilter(grp);
    loadStudents(search, grp);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (scope.programClassId) formData.append('programClassId', scope.programClassId);
      if (scope.termId) formData.append('termId', scope.termId);

      const result = await api.uploadForm('/students/import', formData);
      setImportResult(result);
      play('success');
      loadStudents(search, groupFilter);
      loadGroups();
    } catch (err) {
      toast.error(err.message);
      play('error');
    } finally {
      setImporting(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/students', {
        programClassId: scope.programClassId,
        termId: scope.termId,
        fullName: addForm.fullName,
        idNumber: addForm.idNumber,
      });
      toast.success('Student added');
      play('success');
      setShowAdd(false);
      setAddForm({ fullName: '', idNumber: '' });
      loadStudents(search, groupFilter);
      loadGroups();
    } catch (err) {
      toast.error(err.message);
      play('error');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Manage and import your student records.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ExportButton endpoint="students" label="Export CSV" />
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Student</span>
            </button>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 text-white shadow-xl shadow-indigo-500/20">
          <form onSubmit={handleImport}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold">Import Student List</h3>
                  <p className="text-indigo-100 text-xs md:text-sm mt-1">Upload an Excel (.xlsx) file. Add a "groups" column for tagging.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  name="file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/20 file:text-white hover:file:bg-white/30 file:cursor-pointer text-sm flex-1 md:flex-none"
                  required
                />
                <button
                  type="submit"
                  disabled={importing}
                  className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 shrink-0"
                >
                  {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="hidden sm:inline">{importing ? 'Importing...' : 'Upload'}</span>
                </button>
              </div>
            </div>
            {importResult && !importResult.error && (
              <div className="mt-4 p-3 bg-white/20 rounded-xl text-sm animate-fade-in">
                Imported {importResult.created} students. {importResult.skipped_duplicates} duplicates skipped.
                {importResult.errors?.length > 0 && (
                  <span className="text-red-200"> Errors: {importResult.errors.join(', ')}</span>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-8">
        <div className="sticky top-14 z-10 p-4 md:p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            {groups.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <button
                  onClick={() => handleGroupFilter('')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                    !groupFilter ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {groups.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => handleGroupFilter(g.name)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                      groupFilter === g.name ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {g.name} ({g.count})
                  </button>
                ))}
              </div>
            )}
            <span className="text-sm text-gray-500 shrink-0">{total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 text-gray-400 w-10 hidden sm:table-cell">#</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Student Name</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">ID Number</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Groups</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5}><TableSkeleton rows={5} cols={5} /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title="No students found"
                    description="Import students via Excel or add them manually."
                  />
                </td></tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-400 hidden sm:table-cell">{idx + 1}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                          {student.fullName?.charAt(0) || '?'}
                        </div>
                        <div className="ml-3 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</div>
                          <div className="text-xs text-gray-500 md:hidden">{student.idNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-mono text-gray-500 hidden md:table-cell">{student.idNumber}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                      {student.groups?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.groups.map((g) => (
                            <span key={g} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{g}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Ungrouped</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden xl:table-cell">{formatDate(student.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Student</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  value={addForm.idNumber}
                  onChange={(e) => setAddForm({ ...addForm, idNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
