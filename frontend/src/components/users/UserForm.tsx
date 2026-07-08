'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/store/user.store';
import { CreateUserInput, UserRole } from '@/types';

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

export function UserForm({ onSaved, onCancel }: Props) {
  const { createItem } = useUserStore();

  const [form, setForm] = useState<CreateUserInput>({
    fullName: '',
    email: '',
    password: '',
    role: 'manager',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<CreateUserInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.fullName.trim()) return setError('Укажите имя');
    if (!form.email.trim()) return setError('Укажите email');
    if (form.password.length < 6) return setError('Пароль минимум 6 символов');

    setSaving(true);
    try {
      await createItem({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      onSaved();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Полное имя</label>
        <input className={inputCls} value={form.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
          placeholder="Иван Петров" />
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input className={inputCls} type="email" value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="ivan@example.com" />
      </div>

      <div>
        <label className={labelCls}>Пароль</label>
        <input className={inputCls} type="password" value={form.password}
          onChange={(e) => set({ password: e.target.value })}
          placeholder="Минимум 6 символов" />
      </div>

      <div>
        <label className={labelCls}>Роль</label>
        <select className={inputCls} value={form.role}
          onChange={(e) => set({ role: e.target.value as UserRole })}>
          <option value="manager">Менеджер</option>
          <option value="admin">Администратор</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" type="button" onClick={onCancel}>Отмена</Button>
        <Button type="button" onClick={handleSubmit} loading={saving}>
          Создать
        </Button>
      </div>
    </div>
  );
}