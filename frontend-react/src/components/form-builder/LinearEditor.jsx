import { useFormBuilderStore } from '../../store/formBuilderStore';
import { validateField } from '../../lib/validators';
import {
  Plus, Trash2, ArrowUp, ArrowDown, GripVertical,
  Type, Hash, Calendar, Upload, List, AlignLeft, CheckSquare,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const FIELD_TYPES = [
  { type: 'text', icon: Type, label: 'Short Answer' },
  { type: 'number', icon: Hash, label: 'Number' },
  { type: 'textarea', icon: AlignLeft, label: 'Paragraph' },
  { type: 'select', icon: List, label: 'Dropdown' },
  { type: 'date', icon: Calendar, label: 'Date' },
  { type: 'file', icon: Upload, label: 'File Upload' },
  { type: 'handout_array', icon: List, label: 'Handout Items' },
];

export default function LinearEditor({ title, onTitleChange, description, onDescriptionChange }) {
  const { fields, addField, updateField, removeField, reorderFields } = useFormBuilderStore();
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [showTypeMenu, setShowTypeMenu] = useState(null);

  const insertField = useCallback((afterIndex, type = 'text') => {
    const n = fields.length + 1;
    const newField = {
      id: `field_${Date.now()}_${n}`,
      key: `field_${n}`,
      label: '',
      type,
      required: false,
      placeholder: '',
      options: type === 'select' ? [{ label: 'Option 1', value: 'option_1' }] : undefined,
    };
    const newFields = [...fields];
    newFields.splice(afterIndex + 1, 0, newField);
    useFormBuilderStore.getState().setFields(newFields);
    setActiveFieldId(newField.id);
    setShowTypeMenu(null);
  }, [fields]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeFieldId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const idx = fields.findIndex(f => f.id === activeFieldId);
        if (idx >= 0) insertField(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFieldId, fields, insertField]);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-3xl font-bold w-full border-none outline-none bg-transparent placeholder:text-gray-300"
          placeholder="Untitled Form"
        />
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full mt-2 text-gray-500 border-none outline-none bg-transparent resize-none placeholder:text-gray-300"
          placeholder="Add a description..."
          rows={2}
        />
      </div>

      {fields.map((field, index) => (
        <FieldCard
          key={field.id}
          field={field}
          index={index}
          isActive={activeFieldId === field.id}
          onFocus={() => setActiveFieldId(field.id)}
          onBlur={() => { if (activeFieldId === field.id) setActiveFieldId(null); }}
          onUpdate={(updates) => updateField(field.id, updates)}
          onRemove={() => { removeField(field.id); setActiveFieldId(null); }}
          onMoveUp={() => reorderFields(index, index - 1)}
          onMoveDown={() => reorderFields(index, index + 1)}
          onAddAfter={() => insertField(index)}
          totalFields={fields.length}
          showTypeMenu={showTypeMenu === field.id}
          onToggleTypeMenu={() => setShowTypeMenu(showTypeMenu === field.id ? null : field.id)}
        />
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => insertField(fields.length - 1)}
          className="flex-1 py-3 flex items-center justify-center gap-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors font-medium border-2 border-dashed border-indigo-200 hover:border-indigo-400"
        >
          <Plus size={18} />
          Add Question
        </button>
      </div>
    </div>
  );
}

function FieldCard({ field, index, isActive, onFocus, onBlur, onUpdate, onRemove, onMoveUp, onMoveDown, onAddAfter, totalFields, showTypeMenu, onToggleTypeMenu }) {
  const [validation, setValidation] = useState({ valid: true, errors: [] });
  const labelRef = useRef(null);

  useEffect(() => {
    const result = validateField(field);
    setValidation(result);
  }, [field]);

  useEffect(() => {
    if (isActive && labelRef.current) {
      labelRef.current.focus();
    }
  }, [isActive]);

  const typeConfig = FIELD_TYPES.find(f => f.type === field.type) || FIELD_TYPES[0];
  const TypeIcon = typeConfig.icon;

  return (
    <div
      onClick={onFocus}
      className={`group relative bg-white rounded-xl shadow-sm border transition-all cursor-pointer
        ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
        ${!validation.valid ? 'border-rose-300' : ''}`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />}

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" size={16} />
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleTypeMenu(); }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <TypeIcon size={13} />
                {typeConfig.label}
              </button>
              {showTypeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                  {FIELD_TYPES.map(ft => {
                    const Icon = ft.icon;
                    return (
                      <button
                        key={ft.type}
                        onClick={(e) => { e.stopPropagation(); onUpdate({ type: ft.type }); onToggleTypeMenu(); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors ${field.type === ft.type ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-700'}`}
                      >
                        <Icon size={14} />
                        {ft.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === totalFields - 1} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAddAfter(); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                <Plus size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        <input
          ref={labelRef}
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`w-full text-base font-medium border-b-2 outline-none bg-transparent pb-1 transition-colors
            ${validation.valid ? 'border-transparent focus:border-indigo-500' : 'border-rose-300 focus:border-rose-500'}`}
          placeholder="Question"
        />

        {!validation.valid && (
          <div className="mt-2 text-xs text-rose-600 space-y-0.5">
            {validation.errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <div className="mt-3">
          {field.type === 'text' && (
            <input
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400"
              placeholder={field.placeholder || 'Short answer text'}
            />
          )}
          {field.type === 'number' && (
            <input
              disabled
              type="number"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400"
              placeholder="0"
            />
          )}
          {field.type === 'textarea' && (
            <textarea
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 h-20 resize-none"
              placeholder={field.placeholder || 'Long answer text'}
            />
          )}
          {field.type === 'select' && (
            <div className="space-y-2">
              <select disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
                <option>Select...</option>
                {(field.options || []).map((o, i) => (
                  <option key={i}>{typeof o === 'string' ? o : o.label}</option>
                ))}
              </select>
              {isActive && (
                <div className="space-y-1.5 mt-2">
                  {(field.options || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
                      <input
                        value={typeof opt === 'string' ? opt : opt.label}
                        onChange={(e) => {
                          const newOpts = [...(field.options || [])];
                          const val = e.target.value;
                          if (typeof newOpts[i] === 'string') {
                            newOpts[i] = val;
                          } else {
                            newOpts[i] = { label: val, value: val.toLowerCase().replace(/\s+/g, '_') };
                          }
                          onUpdate({ options: newOpts });
                        }}
                        className="flex-1 px-2 py-1 bg-transparent border-b border-gray-200 outline-none focus:border-indigo-500 text-sm"
                        placeholder={`Option ${i + 1}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newOpts = (field.options || []).filter((_, j) => j !== i);
                          onUpdate({ options: newOpts });
                        }}
                        className="p-1 text-gray-400 hover:text-rose-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const n = (field.options || []).length + 1;
                      onUpdate({ options: [...(field.options || []), { label: `Option ${n}`, value: `option_${n}` }] });
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add option
                  </button>
                </div>
              )}
            </div>
          )}
          {field.type === 'date' && (
            <input disabled type="date" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400" />
          )}
          {field.type === 'file' && (
            <div className="px-3 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
              <Upload className="w-5 h-5 mx-auto mb-1 text-gray-300" />
              Click or drag to upload
            </div>
          )}
          {field.type === 'handout_array' && (
            <div className="px-3 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
              Dynamic handout line items
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => { e.stopPropagation(); onUpdate({ required: e.target.checked }); }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Required
          </label>

          {isActive && (
            <input
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-indigo-500 w-48"
              placeholder="Help text..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
