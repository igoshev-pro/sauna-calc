'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Users, Pencil,
  Trash2, FolderOpen, Phone, Mail,
} from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ClientForm } from '@/components/clients/ClientForm';
import { useClientsStore } from '@/store/clients.store';
import { Client } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  active: 'Активный',
  inactive: 'Неактивный',
  vip: 'VIP',
};

const STATUS_BADGE: Record<string, 'green' | 'gray' | 'amber'> = {
  active: 'green',
  inactive: 'gray',
  vip: 'amber',
};

const SOURCE_LABEL: Record<string, string> = {
  referral: 'Рекомендация',
  instagram: 'Instagram',
  vk: 'ВКонтакте',
  avito: 'Авито',
  yandex: 'Яндекс',
  site: 'Сайт',
  other: 'Другое',
};

export default function ClientsPage() {
  const router = useRouter();
  const {
    items, total, pages, currentPage,
    loading, error, query,
    fetchItems, setQuery,
    createItem, updateItem, removeItem,
  } = useClientsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Client | null>(null);
  const [deleteItem, setDeleteItem] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Дебаунс поиска
  useEffect(() => {
    const t = setTimeout(() => setQuery({ search: searchVal, page: 1 }), 400);
    return () => clearTimeout(t);
  }, [searchVal]);

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = () => { setEditItem(null); setFormOpen(true); };
  const handleEdit = (item: Client) => { setEditItem(item); setFormOpen(true); };

  const handleFormSubmit = async (data: Partial<Client>) => {
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
      <Header title="Клиенты" />

      <div className="p-6 flex flex-col gap-4 flex-1">

        {/* Тулбар */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Поиск по имени, телефону, email..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={query.status || ''}
            onChange={(e) => setQuery({ status: e.target.value || undefined, page: 1 })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="vip">VIP</option>
          </select>

          <Button onClick={handleAdd} className="ml-auto">
            <Plus className="w-4 h-4" />
            Добавить клиента
          </Button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Таблица */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Клиенты не найдены</p>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                Добавить первого клиента
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Клиент</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Контакты</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Город</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Источник</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Проекты</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.fullName}</p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {item.phone && (
                            <a
                              href={`tel:${item.phone}`}
                              className="flex items-center gap-1.5 text-gray-600 hover:text-amber-600 transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              {item.phone}
                            </a>
                          )}
                          {item.email && (
                            <a
                              href={`mailto:${item.email}`}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-amber-600 transition-colors text-xs"
                            >
                              <Mail className="w-3 h-3" />
                              {item.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.city || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {SOURCE_LABEL[item.source] || item.source || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[item.status]}>
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/dashboard/projects?clientId=${item._id}`)}
                          className="inline-flex items-center gap-1 text-gray-500 hover:text-amber-600 transition-colors"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span className="font-medium">{item.projectsCount}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

                {/* Пагинация */}
        {pages > 1 && (
          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-gray-500">
              Показано {items.length} из {total} клиентов
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
        title={editItem ? 'Редактировать клиента' : 'Добавить клиента'}
        size="md"
      >
        <ClientForm
          initial={editItem}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Диалог удаления */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить клиента"
        message={`Удалить клиента «${deleteItem?.fullName}»? Все связанные проекты останутся в системе.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
                