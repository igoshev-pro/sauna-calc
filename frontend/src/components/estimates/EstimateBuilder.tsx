'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useWorkTypeStore } from '@/store/work-type.store';
import { useEstimateStore } from '@/store/estimate.store';
import {
  Estimate, EstimateInput, EstimatePreview, ZoneInput, ZoneWorkInput,
} from '@/types';

interface Props {
  initial?: Estimate | null;
  onSaved: () => void;
  onCancel: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

// внутреннее состояние зоны
interface LocalZone extends ZoneInput {
  works: ZoneWorkInput[];
}

export function EstimateBuilder({ initial, onSaved, onCancel }: Props) {
  const { items: workTypes, fetchItems: fetchWT } = useWorkTypeStore();
  const { createItem, updateItem, preview } = useEstimateStore();

  const [name, setName] = useState(initial?.name ?? '');
  const [zones, setZones] = useState<LocalZone[]>(
    initial?.zones?.map((z) => ({
      name: z.name,
      zoneType: z.zoneType,
      length: z.length,
      width: z.width,
      height: z.height,
      works: z.works?.map((w) => ({
        workTypeId: w.workTypeId,
        quantity: w.quantity,
      })) ?? [],
    })) ?? [],
  );
  const [openZones, setOpenZones] = useState<Record<number, boolean>>({});
  const [previewData, setPreviewData] = useState<EstimatePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => { fetchWT(); }, []);

  const buildInput = (): EstimateInput => ({
    name: name || 'Новая смета',
    projectId: initial?.projectId,
    clientId: initial?.clientId,
    zones: zones.map((z) => ({
      name: z.name,
      zoneType: z.zoneType,
      length: Number(z.length) || 0,
      width: Number(z.width) || 0,
      height: Number(z.height) || 0,
      works: z.works.filter((w) => w.workTypeId),
    })),
  });

  // live-превью с дебаунсом
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (zones.length === 0) { setPreviewData(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await preview(buildInput());
        setPreviewData(res);
      } catch {
        // тихо
      } finally {
        setPreviewing(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [zones, name]);

  // ── зоны
  const addZone = () => {
    setZones((z) => [...z, { name: `Зона ${z.length + 1}`, zoneType: '', length: 0, width: 0, height: 0, works: [] }]);
    setOpenZones((o) => ({ ...o, [zones.length]: true }));
  };
  const updateZone = (idx: number, patch: Partial<LocalZone>) =>
    setZones((z) => z.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeZone = (idx: number) =>
    setZones((z) => z.filter((_, i) => i !== idx));
  const toggleZone = (idx: number) =>
    setOpenZones((o) => ({ ...o, [idx]: !o[idx] }));

  // ── работы внутри зоны
  const addWork = (zi: number) =>
    updateZone(zi, { works: [...zones[zi].works, { workTypeId: '', quantity: undefined }] });
  const updateWork = (zi: number, wi: number, patch: Partial<ZoneWorkInput>) =>
    updateZone(zi, {
      works: zones[zi].works.map((w, i) => (i === wi ? { ...w, ...patch } : w)),
    });
  const removeWork = (zi: number, wi: number) =>
    updateZone(zi, { works: zones[zi].works.filter((_, i) => i !== wi) });

  const handleSave = async () => {
    setSaving(true);
    try {
      if (initial) await updateItem(initial._id, buildInput());
      else await createItem(buildInput());
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('ru-RU');

  return (
    <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
      {/* Название */}
      <div>
        <label className={labelCls}>Название сметы</label>
        <input className={inputCls} value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Смета — баня на Лесной" />
      </div>

      {/* Зоны */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls} style={{ marginBottom: 0 }}>Зоны</label>
          <Button size="sm" variant="secondary" type="button" onClick={addZone}>
            <Plus className="w-4 h-4" /> Зона
          </Button>
        </div>

        {zones.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
            Добавьте зону (парная, моечная и т.д.)
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {zones.map((z, zi) => {
              const zonePreview = previewData?.zones?.[zi];
              return (
                <div key={zi} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Шапка зоны */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                    <button type="button" onClick={() => toggleZone(zi)}
                      className="text-gray-400 hover:text-gray-600">
                      {openZones[zi] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <input
                      className="flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
                      value={z.name}
                      onChange={(e) => updateZone(zi, { name: e.target.value })}
                    />
                    {zonePreview && (
                      <span className="text-sm font-semibold text-amber-700">
                        {fmt(zonePreview.total)} ₽
                      </span>
                    )}
                    <button type="button" onClick={() => removeZone(zi)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {openZones[zi] && (
                    <div className="p-3 flex flex-col gap-3">
                      {/* Габариты */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className={labelCls}>Тип</label>
                          <input className={inputCls} value={z.zoneType ?? ''}
                            onChange={(e) => updateZone(zi, { zoneType: e.target.value })}
                            placeholder="парная" />
                        </div>
                        <div>
                          <label className={labelCls}>Длина (м)</label>
                          <input className={inputCls} type="number" value={z.length ?? 0}
                            onChange={(e) => updateZone(zi, { length: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className={labelCls}>Ширина (м)</label>
                          <input className={inputCls} type="number" value={z.width ?? 0}
                            onChange={(e) => updateZone(zi, { width: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className={labelCls}>Высота (м)</label>
                          <input className={inputCls} type="number" value={z.height ?? 0}
                            onChange={(e) => updateZone(zi, { height: Number(e.target.value) })} />
                        </div>
                      </div>
                      {zonePreview && (
                        <p className="text-xs text-gray-400">
                          Площадь: {fmt(zonePreview.area)} м²
                        </p>
                      )}

                      {/* Работы */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={labelCls} style={{ marginBottom: 0 }}>Работы</span>
                          <Button size="sm" variant="ghost" type="button" onClick={() => addWork(zi)}>
                            <Plus className="w-3.5 h-3.5" /> работа
                          </Button>
                        </div>

                        {z.works.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">Работы не добавлены</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {z.works.map((w, wi) => {
                              const wp = zonePreview?.works?.[wi];
                              return (
                                <div key={wi} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                                  <select
                                    className={inputCls + ' flex-1'}
                                    value={w.workTypeId}
                                    onChange={(e) => updateWork(zi, wi, { workTypeId: e.target.value })}
                                  >
                                    <option value="">— вид работ —</option>
                                    {workTypes.map((wt) => (
                                      <option key={wt._id} value={wt._id}>
                                        {wt.name} ({wt.unit})
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    className={inputCls + ' w-24'}
                                    type="number"
                                    placeholder="кол-во"
                                    value={w.quantity ?? ''}
                                    onChange={(e) => updateWork(zi, wi, {
                                      quantity: e.target.value === '' ? undefined : Number(e.target.value),
                                    })}
                                    title="Оставьте пустым — посчитается по площади"
                                  />
                                  {wp && (
                                    <span className="text-xs font-medium text-gray-700 w-24 text-right">
                                      {fmt(wp.total)} ₽
                                    </span>
                                  )}
                                  <button type="button" onClick={() => removeWork(zi, wi)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Итоги */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sticky bottom-0">
        {previewing && <p className="text-xs text-amber-600 mb-1">Пересчёт...</p>}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Работы:</span>
          <span>{fmt(previewData?.laborTotal ?? 0)} ₽</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Материалы:</span>
          <span>{fmt(previewData?.materialsTotal ?? 0)} ₽</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-amber-800 mt-2 pt-2 border-t border-amber-200">
          <span>Итого:</span>
          <span>{fmt(previewData?.grandTotal ?? 0)} ₽</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" type="button" onClick={onCancel}>Отмена</Button>
        <Button type="button" onClick={handleSave} loading={saving} disabled={!name || zones.length === 0}>
          {initial ? 'Сохранить' : 'Создать смету'}
        </Button>
      </div>
    </div>
  );
}