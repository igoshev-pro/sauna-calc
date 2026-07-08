'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WorkStageForm } from '@/components/work-stages/WorkStageForm';
import { useWorkStagesStore } from '@/store/work-stages.store';
import { useNomenclatureStore } from '@/store/nomenclature.store';
import { useAuthStore } from '@/store/auth.store';
import { WorkStage } from '@/types';

export default function WorkStagesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { items, loading, error, fetchItems, createItem, updateItem, removeItem } =
    useWorkStagesStore();
  const { items: nomItems, fetchItems: fetchNom } = useNomenclatureStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkStage | null>(null);
  const [deleteItem, setDeleteItem] = useState<WorkStage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchNom();
  }, []);

  const handleAdd = () => { setEditItem(null); setFormOpen(true); };
  const handleEdit = (it: WorkStage) => { setEditItem(it); setFormOpen(true); };

  const handleSubmit = async (data: Partial<WorkStage>) => {
    if (editItem) await updateItem(editItem._id, data);
    else await createItem(data);
    setFormOpen(false);
  };

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

  return (
    <div className="flex flex-col h-full">
      <Header title="Этапы работ (Термос)" />

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex justify-end">
          {isAdmin && (
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4" /> Добавить
            </Button>
          )}
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
                <Layers className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Этапы работ не найдены</p>
              {isAdmin && (
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="w-4 h-4" /> Добавить первый
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">№</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Формула работ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Работа/ед.</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Шаблон</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Материалов</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <tr key={it._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{it.sortOrder}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <code className="text-xs">{it.laborFormula || '—'}</code>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {(it.laborPricePerUnit ?? 0).toLocaleString('ru-RU')} ₽
                        <span className="text-gray-400"> /{it.laborUnit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {it.isTemplate ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
                            шаблон
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {it.items?.length ?? 0}
                      </td>
                      {isAdmin && (
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
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editItem ? 'Редактировать этап работ' : 'Добавить этап работ'} size="lg">
        <WorkStageForm
          initial={editItem}
          nomenclature={nomItems}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить этап работ"
        message={`Удалить «${deleteItem?.name}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}