'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, FolderOpen,
  Pencil, Trash2, Calculator,
  MapPin, User,
} from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useProjectsStore } from '@/store/projects.store';
import { Project, ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';

// ── Конфиг статусов ──────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badge: 'gray' | 'blue' | 'amber' | 'green' | 'red' }
> = {
  new:          { label: 'Новый',        badge: 'gray' },
  measuring:    { label: 'Замер',        badge: 'blue' },
  estimate:     { label: 'Расчёт',       badge: 'blue' },
  negotiation:  { label: 'Переговоры',   badge: 'amber' },
  production:   { label: 'Производство', badge: 'amber' },
  installation: { label: 'Монтаж',       badge: 'amber' },
  done:         { label: 'Завершён',     badge: 'green' },
  cancelled:    { label: 'Отменён',      badge: 'red' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '',             label: 'Все статусы' },
  { value: 'new',          label: 'Новые' },
  { value: 'measuring',    label: 'Замер' },
  { value: 'estimate',     label: 'Расчёт' },
  { value: 'negotiation',  label: 'Переговоры' },
  { value: 'production',   label: 'Производство' },
  { value: 'installation', label: 'Монтаж' },
  { value: 'done',         label: 'Завершённые' },
  { value: 'cancelled',    label: 'Отменённые' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get('clientId') || undefined;

  const {
    items, total, pages, currentPage,
    loading, error, query,
    fetchItems, setQuery,
    createItem, updateItem, removeItem,
  } = useProjectsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [deleteItem, setDeleteItem] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Если открыли со страницы клиента — фильтруем
  useEffect(() => {
    if (defaultClientId) {
      setQuery({ clientId: defaultClientId, page: 1 });
    } else {
      fetchItems();
    }
  }, [defaultClientId]);

  // Дебаунс поиска
  useEffect(() => {
    const t = setTimeout(() => setQuery({ search: searchVal, page: 1 }), 400);
    return () => clearTimeout(t);
  }, [searchVal]);

  const handleAdd = () => { setEditItem(null); setFormOpen(true); };
  const handleEdit = (item: Project) => { setEditItem(item); setFormOpen(true); };

  const handleFormSubmit = async (data: Partial<Project>) => {
    if (editItem) {
      await updateItem(editItem._id, data);
    } else {
      await createItem(data);
    }
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
      <Header title="Проекты" />

      <div className="p-6 flex flex-col gap-4 flex-1">

        {/* Тулбар */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Поиск по названию, адресу..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={query.status || ''}
            onChange={(e) => setQuery({ status: e.target.value || undefined, page: 1 })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Сброс фильтра по клиенту */}
          {query.clientId && (
            <button
              onClick={() => {
                setQuery({ clientId: undefined, page: 1 });
                router.push('/dashboard/projects');
              }}
              className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm hover:bg-amber-100 transition-colors"
            >
              ✕ Фильтр по клиенту
            </button>
          )}

          <Button onClick={handleAdd} className="ml-auto">
            <Plus className="w-4 h-4" />
            Создать проект
          </Button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Контент */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Проекты не найдены</p>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Создать первый проект
            </Button>
          </div>
        ) : (
          // ── Карточки проектов ──────────────────────────────
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status];
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                      {item.name}
                    </h3>
                    <Badge variant={statusCfg.badge} className="flex-shrink-0">
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Клиент */}
                  {item.client && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.client.fullName}</span>
                    </div>
                  )}

                  {/* Адрес */}
                  {item.address && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  )}

                  {/* Метрики */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Площадь</p>
                      <p className="text-sm font-medium text-gray-700">
                        {item.area > 0 ? `${item.area} м²` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Бюджет</p>
                      <p className="text-sm font-medium text-gray-700">
                        {item.budget > 0
                          ? `${(item.budget / 1000).toFixed(0)}к ₽`
                          : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Расчёты</p>
                      <p className="text-sm font-medium text-gray-700">
                        {item.estimatesCount}
                      </p>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => router.push(`/dashboard/estimates?projectId=${item._id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Расчёты
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Редактировать"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Пагинация */}
        {pages > 1 && (
          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-gray-500">
              Показано {items.length} из {total} проектов
            </p>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setQuery({ page: currentPage - 1 })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                ← Назад
              </button>

              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1.5 text-gray-400 text-sm">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setQuery({ page: p as number })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        currentPage === p
                          ? 'bg-amber-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}

              <button
                disabled={currentPage === pages}
                onClick={() => setQuery({ page: currentPage + 1 })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  currentPage === pages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка формы */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? 'Редактировать проект' : 'Создать проект'}
        size="md"
      >
        <ProjectForm
          initial={editItem}
          defaultClientId={defaultClientId}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Диалог удаления */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить проект"
        message={`Удалить проект «${deleteItem?.name}»? Все расчёты по проекту также будут удалены.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}