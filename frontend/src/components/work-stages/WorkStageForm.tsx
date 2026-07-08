'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WorkStage, StageItem, NomenclatureItem } from '@/types';

interface Props {
  initial?: WorkStage | null;
  nomenclature: NomenclatureItem[];
  onSubmit: (data: Partial<WorkStage>) => Promise<void>;
  onCancel: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

const emptyItem = (): StageItem => ({
  nomenclatureId: '',
  formula: '',
  isFixed: false,
  fixedQty: 0,
  unit: '',
  comment: '',
});

export function WorkStageForm({ initial, nomenclature, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isTemplate, setIsTemplate] = useState(initial?.isTemplate ?? false);
  const [laborFormula, setLaborFormula] = useState(initial?.laborFormula ?? '');
  const [laborPricePerUnit, setLaborPrice] = useState(initial?.laborPricePerUnit ?? 0);
  const [laborUnit, setLaborUnit] = useState(initial?.laborUnit ?? 'м²');
  const [items, setItems] = useState<StageItem[]>(initial?.items ?? []);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems((it) => [...it, emptyItem()]);

  const updateItem = (idx: number, patch: Partial<StageItem>) =>
    setItems((it) => it.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const removeItem = (idx: number) =>
    setItems((it) => it.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        name,
        sortOrder: Number(sortOrder),
        isTemplate,
        laborFormula,
        laborPricePerUnit: Number(laborPricePerUnit),
        laborUnit,
        items: items
          .filter((i) => i.nomenclatureId)
          .map((i) => ({
            nomenclatureId: i.nomenclatureId,
            formula: i.isFixed ? '' : i.formula,
            isFixed: !!i.isFixed,
            fixedQty: i.isFixed ? Number(i.fixedQty) : undefined,
            unit: i.unit,
            comment: i.comment,
          })),
      });
    } finally {
      setSaving(false);
    }
  };

    return (
    <div className="flex flex-col gap-4">
      {/* Основное */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Название этапа</label>
          <input className={inputCls} value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: [Термос] 1. Силовой каркас стен и потолка" />
        </div>

        <div>
          <label className={labelCls}>Порядок (sortOrder)</label>
          <input className={inputCls} type="number" value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            Шаблон (isTemplate)
          </label>
        </div>
      </div>

      {/* Работа */}
      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
        <label className={labelCls} style={{ marginBottom: 8 }}>
          Стоимость работ по этапу
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Формула объёма</label>
            <input className={inputCls} value={laborFormula}
              onChange={(e) => setLaborFormula(e.target.value)}
              placeholder="напр. S" />
          </div>
          <div>
            <label className={labelCls}>Цена за ед. (₽)</label>
            <input className={inputCls} type="number" value={laborPricePerUnit}
              onChange={(e) => setLaborPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Единица</label>
            <select className={inputCls} value={laborUnit}
              onChange={(e) => setLaborUnit(e.target.value)}>
              <option value="м²">м²</option>
              <option value="м">м</option>
              <option value="м³">м³</option>
              <option value="шт">шт</option>
            </select>
          </div>
        </div>
      </div>

      {/* Материалы */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls} style={{ marginBottom: 0 }}>
            Материалы этапа
          </label>
          <Button size="sm" variant="secondary" onClick={addItem} type="button">
            <Plus className="w-4 h-4" /> Добавить
          </Button>
        </div>

        <div className="text-xs text-gray-400 mb-2">
          Переменные: <code>S, area, perimeter, height, wallArea, ceilArea, ceilingLen,
          ceilingWidth, wallA, wallB, wallC, wallD, wallsSum</code>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">
            Нет материалов. Добавьте позицию.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
                <div className="flex-1 grid grid-cols-1 gap-2">
                  {/* Номенклатура */}
                  <select className={inputCls} value={it.nomenclatureId}
                    onChange={(e) => updateItem(idx, { nomenclatureId: e.target.value })}>
                    <option value="">— выберите материал —</option>
                    {nomenclature.map((n) => (
                      <option key={n._id} value={n._id}>
                        {n.name} ({n.unit}, {n.pricePerUnit}₽)
                      </option>
                    ))}
                  </select>

                  {/* Режим: формула / фикс. */}
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={!!it.isFixed}
                        onChange={(e) => updateItem(idx, { isFixed: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                      Фикс. кол-во
                    </label>

                    {it.isFixed ? (
                      <input className={inputCls} type="number" value={it.fixedQty ?? 0}
                        onChange={(e) => updateItem(idx, { fixedQty: Number(e.target.value) })}
                        placeholder="Кол-во" />
                    ) : (
                      <input className={inputCls} value={it.formula}
                        onChange={(e) => updateItem(idx, { formula: e.target.value })}
                        placeholder="Формула, напр. (perimeter / 0.5) + 2" />
                    )}
                  </div>

                  {/* Единица + пометка */}
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={it.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      placeholder="Ед. (шт, м, м²)" />
                    <input className={inputCls} value={it.comment ?? ''}
                      onChange={(e) => updateItem(idx, { comment: e.target.value })}
                      placeholder="Пометка: стены / потолок" />
                  </div>
                </div>

                <button type="button" onClick={() => removeItem(idx)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кнопки */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={onCancel} type="button">Отмена</Button>
        <Button onClick={handleSubmit} loading={saving} disabled={!name}>
          {initial ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </div>
  );
}