import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getScope } from '../lib/api';
import { useFormBuilderStore } from '../store/formBuilderStore';
import StatusBadge from '../components/form-builder/StatusBadge';
import ActionButtons from '../components/form-builder/ActionButtons';
import UnsavedChangesBanner from '../components/form-builder/UnsavedChangesBanner';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Loader2,
  Type, List, CheckSquare, Calendar, Upload, Hash, AlignLeft,
  Settings, X, ChevronDown, ChevronUp,
} from 'lucide-react';

const fieldTypes = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'handout_array', label: 'Handout Items', icon: List },
];

const defaultField = (type) => ({
  id: crypto.randomUUID().slice(0, 8),
  type,
  key: `field_${Date.now()}`,
  label: `${type === 'handout_array' ? 'Handout Items' : type.charAt(0).toUpperCase() + type.slice(1)} Field`,
  required: false,
  placeholder: '',
  options: type === 'select' ? [{ label: 'Option 1', value: 'option_1' }, { label: 'Option 2', value: 'option_2' }] : undefined,
});

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
  const [selectedField, setSelectedField] = useState(null);
  const [showCondition, setShowCondition] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [showFieldPanel, setShowFieldPanel] = useState(false);

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

  const handleAddField = (type) => {
    addField();
    setShowFieldPanel(false);
  };

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/forms')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
          {currentVersion && <StatusBadge status={currentVersion.status} />}
          <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <UnsavedChangesBanner />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
          <input
            type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl md:text-2xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 mb-2"
            placeholder="Untitled Form"
          />
          <input
            type="text" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm text-gray-500 bg-transparent border-none outline-none placeholder-gray-300"
            placeholder="Add a description..."
          />
        </div>

        <button
          onClick={() => setShowFieldPanel(!showFieldPanel)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 mb-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors md:hidden"
        >
          <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Field</span>
          {showFieldPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFieldPanel && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 p-2 bg-white rounded-xl border border-gray-200 shadow-sm md:hidden animate-fade-in">
            {fieldTypes.map((ft) => (
              <button
                key={ft.type}
                onClick={() => handleAddField(ft.type)}
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
              >
                <ft.icon className="w-4 h-4 text-gray-400" />
                {ft.label}
              </button>
            ))}
          </div>
        )}

        <div className="hidden md:grid md:grid-cols-[200px_1fr] gap-6">
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Field Types</h2>
            {fieldTypes.map((ft) => (
              <button
                key={ft.type}
                onClick={() => handleAddField(ft.type)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all group"
              >
                <ft.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                {ft.label}
              </button>
            ))}
          </div>

          <div>
            {fields.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start building your form</h3>
                <p className="text-gray-500">Select a field type from the left panel to add your first field.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    index={index}
                    total={fields.length}
                    selected={selectedField === field.id}
                    validationError={validationErrors?.[index]}
                    onSelect={() => setSelectedField(selectedField === field.id ? null : field.id)}
                    onUpdate={(updates) => updateField(field.id, updates)}
                    onRemove={() => { removeField(field.id); setSelectedField(null); }}
                    onMoveUp={() => reorderFields(index, index - 1)}
                    onMoveDown={() => reorderFields(index, index + 1)}
                    showCondition={showCondition === field.id}
                    onToggleCondition={() => setShowCondition(showCondition === field.id ? null : field.id)}
                    onSetCondition={(cond) => { updateField(field.id, { visibleIf: cond }); setShowCondition(null); }}
                    onClearCondition={() => { updateField(field.id, { visibleIf: undefined }); setShowCondition(null); }}
                    allFields={fields}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden">
          {fields.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No fields yet</h3>
              <p className="text-sm text-gray-500">Tap "Add Field" above to start building.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  total={fields.length}
                  selected={selectedField === field.id}
                  validationError={validationErrors?.[index]}
                  onSelect={() => setSelectedField(selectedField === field.id ? null : field.id)}
                  onUpdate={(updates) => updateField(field.id, updates)}
                  onRemove={() => { removeField(field.id); setSelectedField(null); }}
                  onMoveUp={() => reorderFields(index, index - 1)}
                  onMoveDown={() => reorderFields(index, index + 1)}
                  showCondition={showCondition === field.id}
                  onToggleCondition={() => setShowCondition(showCondition === field.id ? null : field.id)}
                  onSetCondition={(cond) => { updateField(field.id, { visibleIf: cond }); setShowCondition(null); }}
                  onClearCondition={() => { updateField(field.id, { visibleIf: undefined }); setShowCondition(null); }}
                  allFields={fields}
                  mobile
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-30 md:hidden">
        <ActionButtons />
      </div>
    </div>
  );
}

function FieldCard({ field, index, total, selected, validationError, onSelect, onUpdate, onRemove, onMoveUp, onMoveDown, showCondition, onToggleCondition, onSetCondition, onClearCondition, allFields, mobile }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 transition-all animate-fade-in ${
        selected ? 'border-indigo-500 shadow-md' : 'border-gray-100 hover:border-gray-200'
      }`}
      onClick={onSelect}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-2 md:gap-3">
          <div className="hidden md:flex flex-col gap-1 pt-1">
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30">
              <GripVertical className="w-4 h-4 rotate-180" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30">
              <GripVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-md bg-gray-100 text-gray-500 capitalize">{field.type}</span>
              {field.required && <span className="px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-md bg-amber-100 text-amber-700">Required</span>}
              {validationError && <span className="px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-md bg-red-100 text-red-700">{Object.values(validationError).join(', ')}</span>}
            </div>

            <input
              type="text" value={field.label}
              onChange={(e) => { e.stopPropagation(); onUpdate({ label: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm md:text-base font-semibold text-gray-900 bg-transparent border-none outline-none mb-1.5"
            />

            <div className="pointer-events-none opacity-60">
              {field.type === 'text' && <input type="text" disabled placeholder={field.placeholder || 'Text input...'} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />}
              {field.type === 'number' && <input type="number" disabled placeholder="0" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />}
              {field.type === 'textarea' && <textarea disabled placeholder={field.placeholder || 'Text area...'} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm h-16 resize-none" />}
              {field.type === 'select' && (
                <select disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                  <option>Select...</option>
                  {(field.options || []).map((o) => <option key={o.value || o}>{o.label || o}</option>)}
                </select>
              )}
              {field.type === 'date' && <input type="date" disabled className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />}
              {field.type === 'file' && <div className="px-3 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">Click or drag to upload</div>}
              {field.type === 'handout_array' && <div className="px-3 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">Dynamic handout line items</div>}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggleCondition(); }} className="p-1.5 md:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Visibility condition">
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {selected && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={field.required} onChange={(e) => onUpdate({ required: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm text-gray-700">Required</span>
              </label>
              <input
                type="text" value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder..."
                className="w-full sm:flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {field.type === 'select' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Options (one per line: label|value)</label>
                <textarea
                  value={(field.options || []).map(o => `${o.label}|${o.value}`).join('\n')}
                  onChange={(e) => onUpdate({
                    options: e.target.value.split('\n').filter(Boolean).map(line => {
                      const [label, value] = line.split('|');
                      return { label: label.trim(), value: (value || label).trim() };
                    })
                  })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20 font-mono"
                  placeholder={"Option 1|opt1\nOption 2|opt2"}
                />
              </div>
            )}
          </div>
        )}

        {showCondition && (
          <div className="mt-3 pt-3 border-t border-purple-100 bg-purple-50/50 -mx-4 md:-mx-5 -mb-4 md:-mb-5 p-4 md:p-5 rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs md:text-sm font-semibold text-purple-800">Visibility Condition</h4>
              <button onClick={onToggleCondition} className="p-1 hover:bg-purple-100 rounded"><X className="w-3.5 h-3.5 text-purple-400" /></button>
            </div>
            <ConditionBuilder field={field} allFields={allFields} onSet={onSetCondition} onClear={onClearCondition} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionBuilder({ field, allFields, onSet, onClear }) {
  const otherFields = allFields.filter((f) => f.id !== field.id && f.type !== 'file');
  const [cond, setCond] = useState(field.visibleIf || { field: '', op: 'equals', value: '' });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <select value={cond.field} onChange={(e) => setCond({ ...cond, field: e.target.value })} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm outline-none">
          <option value="">When field...</option>
          {otherFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select value={cond.op} onChange={(e) => setCond({ ...cond, op: e.target.value })} className="w-full sm:w-auto px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm outline-none">
          <option value="equals">Equals</option>
          <option value="not_equals">Not equal</option>
          <option value="contains">Contains</option>
          <option value="not_empty">Not empty</option>
        </select>
      </div>
      {!['not_empty'].includes(cond.op) && (
        <input type="text" value={cond.value} onChange={(e) => setCond({ ...cond, value: e.target.value })} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm outline-none" placeholder="Value..." />
      )}
      <div className="flex gap-2">
        <button onClick={() => onSet(cond)} disabled={!cond.field} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50">Apply</button>
        {field.visibleIf && <button onClick={onClear} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300">Remove</button>}
      </div>
    </div>
  );
}
