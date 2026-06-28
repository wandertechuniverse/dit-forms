import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getScope } from '../lib/api';
import { useFormBuilderStore } from '../store/formBuilderStore';
import StatusBadge from '../components/form-builder/StatusBadge';
import ActionButtons from '../components/form-builder/ActionButtons';
import UnsavedChangesBanner from '../components/form-builder/UnsavedChangesBanner';
import LinearEditor from '../components/form-builder/LinearEditor';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Loader2,
  Type, List, CheckSquare, Calendar, Upload, Hash, AlignLeft,
  Settings, X, ChevronDown, ChevronUp, Eye, EyeOff, Send,
} from 'lucide-react';

export default function FormBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const scope = getScope();

  const {
    formDefinition, currentVersion, fields, saveState, publishState,
    isDirty, lastSavedAt, validationErrors, loadForm, setFields,
    addField, updateField, removeField, reorderFields, reset,
  } = useFormBuilderStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      loadForm(editId).finally(() => setLoadingEdit(false));
    }
    return () => reset();
  }, [editId]);

  useEffect(() => {
    if (formDefinition) {
      setTitle(formDefinition.name || '');
      setDescription(formDefinition.purpose || '');
    }
  }, [formDefinition]);

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/forms')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title={previewMode ? 'Exit preview' : 'Preview form'}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{previewMode ? 'Edit' : 'Preview'}</span>
            </button>
            <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="hidden md:block">
          <ActionButtons />
        </div>
      </div>

      <UnsavedChangesBanner />

      {previewMode ? (
        <FormPreview title={title} description={description} fields={fields} onExit={() => setPreviewMode(false)} />
      ) : (
        <LinearEditor
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-30 md:hidden">
        <ActionButtons />
      </div>
    </div>
  );
}

function FormPreview({ title, description, fields, onExit }) {
  const [previewAnswers, setPreviewAnswers] = useState({});

  const setAnswer = (fieldId, value) => {
    setPreviewAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const isVisible = (field) => {
    if (!field.visibleIf) return true;
    const depValue = String(previewAnswers[field.visibleIf.field] || '');
    switch (field.visibleIf.op) {
      case 'equals': return depValue === String(field.visibleIf.value);
      case 'not_equals': return depValue !== String(field.visibleIf.value);
      case 'contains': return depValue.includes(field.visibleIf.value);
      case 'not_empty': return depValue.length > 0;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-indigo-200">Form Preview</span>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <EyeOff className="w-4 h-4" /> Exit Preview
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{title || 'Untitled Form'}</h1>
          {description && <p className="text-indigo-100 mt-2">{description}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={previewAnswers._studentName || ''}
              onChange={(e) => setAnswer('_studentName', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="e.g., Ama Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Student ID Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={previewAnswers._studentId || ''}
              onChange={(e) => setAnswer('_studentId', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="e.g., 01240001C"
            />
          </div>

          <hr className="border-gray-100" />

          {fields.map((field) => {
            if (!isVisible(field)) return null;
            return (
              <div key={field.id} className="animate-fade-in">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={previewAnswers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={previewAnswers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={previewAnswers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={previewAnswers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select an option...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={previewAnswers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'file' && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click or drag files to upload</p>
                    {field.accept && <p className="text-xs text-gray-400 mt-1">Accepted: {field.accept}</p>}
                  </div>
                )}

                {field.type === 'handout_array' && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <List className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Dynamic handout line items</p>
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-4">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl opacity-50 cursor-not-allowed text-lg"
            >
              <Send className="w-5 h-5" />
              Submit (Preview Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
