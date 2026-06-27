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
  X, Users,
} from 'lucide-react';

export default function Students() {
  const scope = getScope();
  const { play } = useSound();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', idNumber: '' });
  const [addLoading, setAddLoading] = useState(false);

  const loadStudents = useCallback(async (q = '') => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      let url = `/students?programClassId=${scope.programClassId}&termId=${scope.termId}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      const res = await api.get(url);
      setStudents(res.students || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope.programClassId, scope.termId]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleSearch = useCallback(debounce((q) => loadStudents(q)), [loadStudents]);

  const handleImport = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('programClassId', scope.programClassId);
      fd.append('termId', scope.termId);
      const res = await api.uploadForm('/students/import', fd);
      setImportResult(res);
      play('success');
      toast.success(`Imported ${res.created} students. ${res.skipped_duplicates} duplicates skipped.`);
      e.target.reset();
      loadStudents();
    } catch (err) {
      play('error');
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/students', {
        ...addForm,
        programClassId: scope.programClassId,
        termId: scope.termId,
      });
      play('success');
      toast.success('Student added successfully');
      setShowAdd(false);
      setAddForm({ fullName: '', idNumber: '' });
      loadStudents();
    } catch (err) {
      play('error');
      toast.error(err.message);
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
                  <p className="text-indigo-100 text-xs md:text-sm mt-1">Upload an Excel (.xlsx) file to bulk import.</p>
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
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
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
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Program Class</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">Term</th>
                <th className="px-4 md:px-6 py-3 md:py-4 hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6}><TableSkeleton rows={5} cols={6} /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={Users}
                    title="No students yet"
                    description="Import from Excel or add students manually to get started."
                    actionLabel="Add Student"
                    onAction={() => setShowAdd(true)}
                  />
                </td></tr>
              ) : (
                students.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors animate-fade-in">
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-400 hidden sm:table-cell">{i + 1}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center min-w-0">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm shrink-0">
                          {s.fullName?.charAt(0) || '?'}
                        </div>
                        <div className="ml-3 md:ml-4 min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.fullName}</p>
                          <p className="text-xs text-gray-500 md:hidden">{s.idNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-gray-100 text-gray-800">
                        {s.idNumber}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden lg:table-cell">{s.programClassId}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden lg:table-cell">{s.termId}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-500 hidden xl:table-cell">{formatDate(s.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Student</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Number</label>
                <input
                  type="text"
                  value={addForm.idNumber}
                  onChange={(e) => setAddForm({ ...addForm, idNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Student
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
