'use client';

import { useEffect, useState } from 'react';
import { Plus, UserX, Users as UsersIcon } from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserForm } from '@/components/users/UserForm';
import { useUserStore } from '@/store/user.store';
import { AppUser } from '@/types';

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
};

export default function UsersPage() {
  const { items, loading, error, fetchItems, deactivateItem } = useUserStore();

  const [formOpen, setFormOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await deactivateItem(deactivateTarget._id);
      setDeactivateTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Пользователи" />

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Новый пользователь
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
                <UsersIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Пользователей пока нет</p>
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" /> Создать первого
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Имя</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Роль</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Активен
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            Отключён
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.isActive && (
                            <button
                              onClick={() => setDeactivateTarget(u)}
                              title="Деактивировать"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Новый пользователь">
        <UserForm onSaved={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать пользователя"
        message={`Отключить доступ для «${deactivateTarget?.fullName}»?`}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        loading={actionLoading}
      />
    </div>
  );
}