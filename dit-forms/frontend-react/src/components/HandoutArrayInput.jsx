import { Plus, Trash2, GripVertical } from 'lucide-react';

const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP'];

export default function HandoutArrayInput({ value, onChange }) {
  const lines = Array.isArray(value) ? value : [];

  const add = () => {
    onChange([...lines, { item: '', qty: 1, unitCost: 0, currency: 'GHS' }]);
  };

  const remove = (i) => {
    onChange(lines.filter((_, idx) => idx !== i));
  };

  const update = (i, field, val) => {
    const updated = lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    onChange(updated);
  };

  const move = (from, to) => {
    if (to < 0 || to >= lines.length) return;
    const arr = [...lines];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      {lines.length > 0 && (
        <div className="grid grid-cols-[2rem_1fr_5rem_8rem_8rem_2rem] gap-2 text-xs font-medium text-gray-500 px-1">
          <span></span><span>Item</span><span>Qty</span><span>Unit Cost</span><span>Currency</span><span></span>
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_5rem_8rem_8rem_2rem] gap-2 items-center animate-slide-in">
          <div className="flex gap-0.5">
            <button type="button" onClick={() => move(i, i - 1)} className="p-0.5 text-gray-400 hover:text-gray-600" disabled={i === 0}>
              <GripVertical className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>
          <input
            type="text" value={line.item} onChange={e => update(i, 'item', e.target.value)}
            placeholder="Item name"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="number" value={line.qty} min={1}
            onChange={e => update(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="number" value={line.unitCost} min={0} step={0.01}
            onChange={e => update(i, 'unitCost', parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <select
            value={line.currency || 'GHS'}
            onChange={e => update(i, 'currency', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Add Handout Item
      </button>
    </div>
  );
}
