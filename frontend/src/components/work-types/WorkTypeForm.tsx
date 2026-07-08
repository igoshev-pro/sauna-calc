'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WorkType, MaterialFormula, NomenclatureItem } from '@/types';

interface Props {
  initial?: WorkType | null;
  nomenclature: NomenclatureItem[];
  onSubmit: (data: Partial<WorkType>) => Promise<void>;
  onCancel: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

export function WorkTypeForm({ initial, nomenclature, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'м²');
  const [laborCostPerUnit, setLabor] = useState(initial?.laborCostPerUnit ?? 0);
  const [markupPercent, setMarkup] = useState(initial?.markupPercent ?? 0);
  const [formulas, setFormulas] = useState<MaterialFormula[]>(
    initial?.materialFormulas ?? [],
  );
  const [saving, setSaving] = useState(false);

  const addFormula = () =>
    setFormulas((f) => [...f, { nomenclatureId: '', formula: '', description: '' }]);

  const updateFormula = (idx: number, patch: Partial<MaterialFormula>) =>
    setFormulas((f) => f.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeFormula = (idx: number) =>
    setFormulas((f) => f.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        name,
        unit,
        laborCostPerUnit: Number(laborCostPerUnit),
        markupPercent: Number(markupPercent),
        materialFormulas: formulas.filter((f) => f.nomenclatureId && f.formula),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Название работы</label>
          <input className={inputCls} value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Монтаж вагонки" />
        </div>
        <div>
          <label className={labelCls}>Единица</label>
          <select className={inputCls} value={unit}
            onChange={(e) => setUnit(e.target.value)}>
            <option value="м²">м²</option>
            <option value="м">м</option>
            <option value="м³">м³</option>
            <option value="шт">шт</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Стоимость работы за ед. (₽)</label>
          <input className={inputCls} type="number" value={laborCostPerUnit}
            onChange={(e) => setLabor(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Наценка (%)</label>
          <input className={inputCls} type="number" value={markupPercent}
            onChange={(e) => setMarkup(Number(e.target.value))} />
        </div>
      </div>

      {/* Формулы материалов */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls} style={{ marginBottom: 0 }}>
            Материалы (формулы расхода)
          </label>
          <Button size="sm" variant="secondary" onClick={addFormula} type="button">
            <Plus className="w-4 h-4" /> Добавить
          </Button>
        </div>

        <div className="text-xs text-gray-400 mb-2">
          Доступные переменные: <code>area, length, width, height, perimeter, quantity</code>
        </div>

        {formulas.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">
            Нет формул. Добавьте материал.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {formulas.map((f, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <select className={inputCls} value={f.nomenclatureId}
                    onChange={(e) => updateFormula(idx, { nomenclatureId: e.target.value })}>
                    <option value="">— выберите материал —</option>
                    {nomenclature.map((n) => (
                      <option key={n._id} value={n._id}>
                        {n.name} ({n.unit}, {n.pricePerUnit}₽)
                      </option>
                    ))}
                  </select>
                  <input className={inputCls} value={f.formula}
                    onChange={(e) => updateFormula(idx, { formula: e.target.value })}
                    placeholder="Формула, напр. area * 1.1" />
                  <input className={inputCls} value={f.description}
                    onChange={(e) => updateFormula(idx, { description: e.target.value })}
                    placeholder="Описание (необязательно)" />
                </div>
                <button type="button" onClick={() => removeFormula(idx)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={onCancel} type="button">Отмена</Button>
        <Button onClick={handleSubmit} loading={saving} disabled={!name}>
          {initial ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </div>
  );
}