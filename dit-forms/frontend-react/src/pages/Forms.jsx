import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getScope } from '../lib/api';
import { formatDate } from '../lib/utils';
import StatusBadge from '../components/form-builder/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import ExportButton from '../components/ui/ExportButton';
import { CardSkeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  Plus, FileText, Edit, Link as LinkIcon,
} from 'lucide-react';

export default function Forms() {
  const navigate = useNavigate();
  const scope = getScope();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadForms = async () => {
    if (!scope.programClassId || !scope.termId) return;
    setLoading(true);
    try {
      const res = await api.get(`/forms?programClassId=${scope.programClassId}&termId=${scope.termId}`);
      setForms(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadForms(); }, [scope.programClassId, scope.termId]);

  const filteredForms = statusFilter === 'all' ? forms : forms.filter(f => f.status === statusFilter);

  const statusCounts = {
    all: forms.length,
    draft: forms.filter(f => f.status === 'draft').length,
    published: forms.filter(f => f.status === 'published').length,
    archived: forms.filter(f => f.status === 'archived').length,
  };

  const copyPublicUrl = (formId) => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${formId}`);
    setCopiedId(formId);
    toast.success('Public link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Forms</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Create and manage your submission forms.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ExportButton endpoint="forms" label="Export CSV" />
            <button
              onClick={() => navigate('/forms/builder')}
              className="flex items-center gap-2 px-3 md:px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Form</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
          {['all', 'draft', 'published', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all capitalize whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s} ({statusCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-4 md:px-8"><CardSkeleton /></div>
      ) : filteredForms.length === 0 ? (
        <div className="mx-4 md:mx-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <EmptyState
            icon={FileText}
            title={statusFilter === 'all' ? 'No forms yet' : `No ${statusFilter} forms`}
            description="Create your first form to start collecting submissions."
            actionLabel="Create Form"
            onAction={() => navigate('/forms/builder')}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 px-4 md:px-8">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition-shadow animate-fade-in"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 md:gap-4 min-w-0 flex-1">
                  <div className={`p-2.5 md:p-3 rounded-xl shrink-0 ${form.status === 'published' ? 'bg-emerald-100' : form.status === 'draft' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                    <FileText className={`w-5 h-5 md:w-6 md:h-6 ${form.status === 'published' ? 'text-emerald-600' : form.status === 'draft' ? 'text-amber-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">{form.name}</h3>
                    {form.purpose && (
                      <p className="text-gray-500 text-xs md:text-sm mt-1 line-clamp-2">{form.purpose}</p>
                    )}
                    <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-3">
                      <StatusBadge status={form.status} />
                      <span className="text-[10px] md:text-xs text-gray-400 hidden sm:inline">
                        Created {formatDate(form.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  {form.status === 'published' && (
                    <button
                      onClick={() => copyPublicUrl(form.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Copy public link"
                    >
                      {copiedId === form.id ? (
                        <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                      ) : (
                        <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/forms/builder?edit=${form.id}`)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Edit form"
                  >
                    <Edit className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
