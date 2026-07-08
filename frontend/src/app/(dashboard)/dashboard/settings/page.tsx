'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Percent } from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { markupApi } from '@/lib/api';
import { MarkupSettings, MarkupType } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ── Форма наценки ────────────────────────────────────────────

const markupSchema = z.object({
  type: z.enum(['global', 'category', 'worktype']),
  categoryName: z.string().optional().default(''),
  materialMarkup: z.coerce.number().min(0).max(1000),
  laborMarkup: z.coerce.number().min(0).max(1000),
});

type MarkupFormData = z.infer<typeof markupSchema>;

const TYPE_OPTIONS = [
  { value: 'global', label: 'Глобальная (по умолчанию)' },
  { value: 'category', label: 'По категории материала' },
  { value: 'worktype', label: 'По виду работ' },
];

const TYPE_LABELS: Record<MarkupType, string> = {
  global: 'Глобальная',
  category: 'По категории',
  worktype: 'По виду работ',
};

const TYPE_BADGE: Record<MarkupType, 'amber' | 'blue' | 'green'> = {
  global: 'amber',
  category: 'blue',
  worktype: 'green',
};

interface MarkupFormProps {
  initial?: MarkupSettings | null;
  onSubmit: (data: MarkupFormData) => Promise<void>;
  onCancel: () => void;
}

function MarkupForm({ initial, onSubmit, onCancel }: MarkupFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkupFormData>({ resolver: zodResolver(markupSchema) });

  const type = watch('type');

  useEffect(() => {
    if (initial) {
      reset({
        type: initial.type,
        categoryName: initial.categoryName,
        materialMarkup: initial.materialMarkup,
        laborMarkup: initial.laborMarkup,
      });
    } else {
      reset({
        type: 'global',
        categoryName: '',
        materialMarkup: 0,
        laborMarkup: 0,
      });
    }
  }, [initial, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Тип наценки *"
        options={TYPE_OPTIONS}
        error={errors.type?.message}
        {...register('type')}
      />

      {type !== 'global' && (
        <Input
          label="Название категории / вида работ *"
          placeholder="Отделка, Монтаж полка, ..."
          error={errors.categoryName?.message}
          {...register('categoryName')}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Наценка на материалы (%)"
          type="number"
          placeholder="0"
          step="0.1"
          error={errors.materialMarkup?.message}
          {...register('materialMarkup')}
        />
        <Input
          label="Наценка на работы (%)"
          type="number"
          placeholder="0"
          step="0.1"
          error={errors.laborMarkup?.message}
          {...register('laborMarkup')}
        />
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700">
          💡 Наценки применяются при формировании КП. Категорийные наценки
          перекрывают глобальную. Значения в процентах (например, 30 = +30%).
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {initial ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}

// ── Страница ─────────────────────────────────────────────────

export default function SettingsPage() {
  const [markups, setMarkups] = useState<MarkupSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarkupSettings | null>(null);
  const [deleteItem, setDeleteItem] = useState<MarkupSettings | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadMarkups = async () => {
    setLoading(true);
    try {
      const { data } = await markupApi.getAll();
      setMarkups(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMarkups(); }, []);

  const handleSubmit = async (data: MarkupFormData) => {
    if (editItem) {
      await markupApi.update(editItem._id, data);
    } else {
      await markupApi.create(data);
    }
    setFormOpen(false);
    await loadMarkups();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await markupApi.remove(deleteItem._id);
      setDeleteItem(null);
      await loadMarkups();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (item: MarkupSettings) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Настройки" />

      <div className="p-6 flex flex-col gap-6">

        {/* Блок наценок */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Заголовок блока */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Наценки</h2>
                <p className="text-xs text-gray-500">
                  Управление коэффициентами для расчёта КП
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Добавить
            </Button>
          </div>

          {/* Контент */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <svg className="animate-spin h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : markups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-gray-500">Наценки не настроены</p>
              <Button size="sm" variant="secondary" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                Добавить первую
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Тип</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Категория</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Материалы</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Работы</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {markups.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Badge variant={TYPE_BADGE[item.type]}>
                        {TYPE_LABELS[item.type]}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {item.categoryName || '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {item.materialMarkup}%
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {item.laborMarkup}%
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Модалка формы */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? 'Редактировать наценку' : 'Добавить наценку'}
        size="sm"
      >
        <MarkupForm
          initial={editItem}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Диалог удаления */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить наценку"
        message={`Удалить настройку «${deleteItem ? TYPE_LABELS[deleteItem.type] : ''}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}