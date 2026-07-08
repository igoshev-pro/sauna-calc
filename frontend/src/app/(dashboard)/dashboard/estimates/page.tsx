'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EstimateBuilder } from '@/components/estimates/EstimateBuilder';
import { useEstimateStore } from '@/store/estimate.store';
import { Estimate } from '@/types';

export default function EstimatesPage() {
  const { items, loading, error, fetchItems, removeItem } = useEstimateStore();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editItem, setEditItem] = useState<Estimate | null>(null);
  const [deleteItem, setDeleteItem] = useState<Estimate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = () => { setEditItem(null); setBuilderOpen(true); };
  const handleEdit = (it: Estimate) => { setEditItem(it); setBuilderOpen(true); };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await removeItem(deleteItem._id);
      setDeleteItem(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('ru-RU');

  return (
    <div className="flex flex-col h-full">
      <Header title="Расчёты" />

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex justify-end">
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Новая смета
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Загрузка...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Смет пока нет</p>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4" /> Создать первую
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Зон</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Работы</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Материалы</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Итого</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <tr key={it._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{it.zones?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(it.laborTotal)} ₽</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(it.materialsTotal)} ₽</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">{fmt(it.grandTotal)} ₽</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(it)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteItem(it)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={builderOpen} onClose={() => setBuilderOpen(false)}
        title={editItem ? 'Редактировать смету' : 'Новая смета'} size="lg">
        <EstimateBuilder
          initial={editItem}
          onSaved={() => setBuilderOpen(false)}
          onCancel={() => setBuilderOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить смету"
        message={`Удалить «${deleteItem?.name}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}