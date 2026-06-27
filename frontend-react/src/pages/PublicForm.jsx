import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSound } from '../hooks/useSound';
import {
  GraduationCap, Loader2, Send, CheckCircle2, Upload, X,
} from 'lucide-react';

export default function PublicForm() {
  const { id } = useParams();
  const { play } = useSound();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/public/forms/${id}`);
      setForm(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setAnswer = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId, fileList) => {
    setFiles((prev) => ({ ...prev, [fieldId]: Array.from(fileList) }));
  };

  const isVisible = (field) => {
    if (!field.visibleIf) return true;
    const depValue = String(answers[field.visibleIf.field] || '');
    switch (field.visibleIf.op) {
      case 'equals': return depValue === String(field.visibleIf.value);
      case 'not_equals': return depValue !== String(field.visibleIf.value);
      case 'contains': return depValue.includes(field.visibleIf.value);
      case 'not_empty': return depValue.length > 0;
      default: return true;
    }
  };

  const uploadFile = async (submissionId, fieldId, file) => {
    const presignRes = await api.post(`/submissions/${submissionId}/files/presign`, {
      fieldKey: fieldId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });

    const { uploadUrl } = presignRes;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const answerDict = {};
      form.schema.fields
        .filter((f) => f.id !== '_studentId' && isVisible(f))
        .forEach((f) => {
          if (f.type === 'handout_array') {
            answerDict[f.id] = Array.isArray(answers[f.id]) ? answers[f.id] : [];
          } else if (f.type === 'file') {
            answerDict[f.id] = [];
          } else {
            answerDict[f.id] = answers[f.id] || '';
          }
        });

      const payload = {
        fullName: answers._studentName || answers._studentId || '',
        idNumber: answers._studentId || '',
        answers: answerDict,
      };
      const result = await api.post(`/public/forms/${id}/submit`, payload);

      const fileFields = form.schema.fields.filter(
        (f) => f.type === 'file' && files[f.id]?.length > 0 && isVisible(f)
      );

      for (const field of fileFields) {
        for (const file of files[field.id]) {
          try {
            await uploadFile(result.submissionId, field.id, file);
          } catch (uploadErr) {
            console.error(`File upload failed for ${file.name}:`, uploadErr);
          }
        }
      }

      play('success');
      setSubmitted(true);
    } catch (err) {
      play('error');
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Received!</h2>
          <p className="text-gray-500">Thank you for your submission. Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{form?.name || 'Form'}</h1>
          {form?.purpose && <p className="text-indigo-100 mt-2">{form.purpose}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={answers._studentName || ''}
              onChange={(e) => setAnswer('_studentName', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="e.g., Ama Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Student ID Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={answers._studentId || ''}
              onChange={(e) => setAnswer('_studentId', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="e.g., 01240001C"
              required
            />
          </div>

          <hr className="border-gray-100" />

          {form?.schema?.fields?.map((field) => {
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
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select an option...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!answers[field.id]}
                      onChange={(e) => setAnswer(field.id, e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="text-gray-700">Yes</span>
                  </label>
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={answers[field.id] || ''}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                )}

                {field.type === 'file' && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors relative">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      multiple={!field.maxFiles || field.maxFiles > 1}
                      accept={field.accept || undefined}
                      onChange={(e) => handleFileChange(field.id, e.target.files)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <p className="text-sm text-gray-500">Click or drag files to upload</p>
                    {field.accept && (
                      <p className="text-xs text-gray-400 mt-1">Accepted: {field.accept}</p>
                    )}
                    {field.maxFiles && (
                      <p className="text-xs text-gray-400">Max files: {field.maxFiles}</p>
                    )}
                    {files[field.id]?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {files[field.id].map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFiles(prev => ({
                                  ...prev,
                                  [field.id]: prev[field.id].filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-red-400 hover:text-red-600 ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {field.type === 'handout_array' && (
                  <HandoutField field={field} answers={answers} setAnswer={setAnswer} />
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 text-lg shadow-lg shadow-indigo-600/20"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

function HandoutField({ field, answers, setAnswer }) {
  const lines = Array.isArray(answers[field.id]) ? answers[field.id] : [];

  const add = () => {
    setAnswer(field.id, [...lines, { item: '', qty: 1, unitCost: 0, currency: 'GHS' }]);
  };

  const remove = (i) => {
    setAnswer(field.id, lines.filter((_, idx) => idx !== i));
  };

  const update = (i, key, val) => {
    setAnswer(field.id, lines.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  };

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[1fr_4rem_6rem_5rem_2rem] gap-2 items-center animate-slide-in">
          <input
            type="text" value={line.item} onChange={e => update(i, 'item', e.target.value)}
            placeholder="Item name" required
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <input
            type="number" value={line.qty} min={1}
            onChange={e => update(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <input
            type="number" value={line.unitCost} min={0} step={0.01}
            onChange={e => update(i, 'unitCost', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <span className="text-xs font-medium text-gray-500 text-center">{line.currency || 'GHS'}</span>
          <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
        + Add Item
      </button>
    </div>
  );
}
