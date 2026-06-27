import { create } from 'zustand';
import { api } from '../lib/api';
import { validateFormSchema } from '../lib/validators';
import toast from 'react-hot-toast';

let autoSaveTimer = null;

export const useFormBuilderStore = create((set, get) => ({
  formDefinition: null,
  currentVersion: null,
  allVersions: [],
  fields: [],
  saveState: 'idle',
  publishState: 'idle',
  isDirty: false,
  lastSavedAt: null,
  errorMessage: null,
  validationErrors: null,
  _fieldCounter: 0,

  loadForm: async (formId) => {
    try {
      const detail = await api.get(`/forms/${formId}`);
      const draftId = detail.draftVersionId;
      const publishedId = detail.publishedVersionId;
      const versionToLoad =
        detail.versions.find(v => v.id === draftId) ||
        detail.versions.find(v => v.id === publishedId);
      set({
        formDefinition: {
          id: detail.id, name: detail.name, programClassId: detail.programClassId,
          termId: detail.termId, purpose: detail.purpose, courseId: detail.courseId,
          formType: detail.formType, status: detail.status,
        },
        currentVersion: versionToLoad || null,
        allVersions: detail.versions,
        fields: versionToLoad?.schema?.fields || [],
        saveState: 'idle', publishState: 'idle', isDirty: false,
        lastSavedAt: versionToLoad ? new Date(versionToLoad.updatedAt) : null,
        errorMessage: null, validationErrors: null,
      });
    } catch (err) {
      set({ errorMessage: err.message });
      toast.error('Failed to load form');
    }
  },

  setFields: (fields) => {
    set({ fields, isDirty: true, validationErrors: null });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => get().saveDraft(), 1500);
  },

  addField: () => {
    const { fields, _fieldCounter } = get();
    const n = _fieldCounter + 1;
    set({
      fields: [...fields, { id: `field_${Date.now()}_${n}`, key: `field_${n}`, label: `New Field ${n}`, type: 'text', required: false }],
      _fieldCounter: n, isDirty: true,
    });
  },

  updateField: (id, updates) => {
    set({ fields: get().fields.map(f => f.id === id ? { ...f, ...updates } : f), isDirty: true, validationErrors: null });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => get().saveDraft(), 1500);
  },

  removeField: (id) => {
    set({ fields: get().fields.filter(f => f.id !== id), isDirty: true });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => get().saveDraft(), 1500);
  },

  reorderFields: (fromIdx, toIdx) => {
    const fields = [...get().fields];
    const [moved] = fields.splice(fromIdx, 1);
    fields.splice(toIdx, 0, moved);
    set({ fields, isDirty: true });
  },

  saveDraft: async () => {
    const { currentVersion, formDefinition, fields } = get();
    if (!currentVersion || !formDefinition) return false;
    if (currentVersion.status !== 'draft') {
      toast.error('Cannot save — this is a published version');
      return false;
    }
    const validation = validateFormSchema(fields);
    if (!validation.valid) {
      set({ validationErrors: validation.errors, saveState: 'error' });
      return false;
    }
    set({ saveState: 'saving', errorMessage: null });
    try {
      const updated = await api.patch(`/forms/${formDefinition.id}/versions/${currentVersion.id}`, { schema: { fields } });
      set({ currentVersion: updated, saveState: 'saved', isDirty: false, lastSavedAt: new Date(), validationErrors: null });
      setTimeout(() => { if (get().saveState === 'saved') set({ saveState: 'idle' }); }, 2000);
      return true;
    } catch (err) {
      set({ saveState: 'error', errorMessage: err.message });
      toast.error('Failed to save draft');
      return false;
    }
  },

  publishVersion: async () => {
    const { currentVersion, formDefinition, fields } = get();
    if (!currentVersion || !formDefinition) return false;
    const validation = validateFormSchema(fields);
    if (!validation.valid) {
      set({ validationErrors: validation.errors });
      toast.error('Fix validation errors before publishing');
      return false;
    }
    set({ publishState: 'publishing' });
    try {
      if (get().isDirty) {
        const saved = await get().saveDraft();
        if (!saved) { set({ publishState: 'error' }); return false; }
      }
      await api.post(`/forms/${formDefinition.id}/versions/${currentVersion.id}/publish`, {});
      set({ publishState: 'published', saveState: 'idle', isDirty: false, formDefinition: { ...formDefinition, status: 'published' } });
      toast.success('Form published!');
      await get().loadForm(formDefinition.id);
      return true;
    } catch (err) {
      set({ publishState: 'error', errorMessage: err.message });
      toast.error('Failed to publish: ' + err.message);
      return false;
    }
  },

  deleteDraft: async () => {
    const { currentVersion, formDefinition } = get();
    if (!currentVersion || !formDefinition) return;
    if (currentVersion.status !== 'draft') { toast.error('Can only delete drafts'); return; }
    try {
      await api.delete(`/forms/${formDefinition.id}/versions/${currentVersion.id}`);
      toast.success('Draft deleted');
      await get().loadForm(formDefinition.id);
    } catch (err) {
      toast.error('Failed to delete draft');
    }
  },

  createNewVersionFromPublished: async () => {
    const { formDefinition, allVersions } = get();
    if (!formDefinition) return;
    const published = allVersions.find(v => v.status === 'published');
    if (!published) { toast.error('No published version to copy from'); return; }
    try {
      await api.post(`/forms/${formDefinition.id}/versions`, { schema: published.schema, status: 'draft' });
      toast.success('New draft created');
      await get().loadForm(formDefinition.id);
    } catch (err) {
      toast.error('Failed to create new version');
    }
  },

  reset: () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    set({
      formDefinition: null, currentVersion: null, allVersions: [], fields: [],
      saveState: 'idle', publishState: 'idle', isDirty: false,
      lastSavedAt: null, errorMessage: null, validationErrors: null,
    });
  },
}));
