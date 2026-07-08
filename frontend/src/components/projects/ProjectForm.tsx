'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Project, Client } from '@/types';
import { clientsApi } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  clientId: z.string().min(1, 'Выберите клиента'),
  status: z.enum([
    'new', 'measuring', 'estimate',
    'negotiation', 'production', 'installation',
    'done', 'cancelled',
  ]).default('new'),
  address: z.string().optional().default(''),
  area: z.coerce.number().min(0).default(0),
  budget: z.coerce.number().min(0).default(0),
  description: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 Новый' },
  { value: 'measuring', label: '📐 Замер' },
  { value: 'estimate', label: '🧮 Расчёт' },
  { value: 'negotiation', label: '🤝 Переговоры' },
  { value: 'production', label: '🏗️ Производство' },
  { value: 'installation', label: '🔧 Монтаж' },
  { value: 'done', label: '✅ Завершён' },
  { value: 'cancelled', label: '❌ Отменён' },
];

interface ProjectFormProps {
  initial?: Project | null;
  defaultClientId?: string;
  onSubmit: (data: Partial<Project>) => Promise<void>;
  onCancel: () => void;
}

export function ProjectForm({
  initial,
  defaultClientId,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Загружаем клиентов для выбора
  useEffect(() => {
    const load = async () => {
      setClientsLoading(true);
      try {
        const { data } = await clientsApi.getAll({
          search: clientSearch,
          limit: 50,
        });
        setClients(data.items);
      } finally {
        setClientsLoading(false);
      }
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        clientId: initial.clientId,
        status: initial.status,
        address: initial.address,
        area: initial.area,
        budget: initial.budget,
        description: initial.description,
      });
    } else {
      reset({
        name: '',
        clientId: defaultClientId || '',
        status: 'new',
        address: '',
        area: 0,
        budget: 0,
        description: '',
      });
    }
  }, [initial, defaultClientId, reset]);

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: `${c.fullName} — ${c.phone}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Название проекта *"
        placeholder="Баня под ключ — Иванов И.И."
        error={errors.name?.message}
        {...register('name')}
      />

      {/* Клиент */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Клиент *</label>
        <input
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Поиск клиента..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-1"
        />
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          {...register('clientId')}
        >
          <option value="">— Выберите клиента —</option>
          {clientsLoading ? (
            <option disabled>Загрузка...</option>
          ) : (
            clientOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        {errors.clientId && (
          <span className="text-xs text-red-500">{errors.clientId.message}</span>
        )}
      </div>

      <Select
        label="Статус"
        options={STATUS_OPTIONS}
        error={errors.status?.message}
        {...register('status')}
      />

      <Input
        label="Адрес объекта"
        placeholder="г. Москва, ул. Лесная, д. 1"
        {...register('address')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Площадь (м²)"
          type="number"
          placeholder="0"
          step="0.1"
          error={errors.area?.message}
          {...register('area')}
        />
        <Input
          label="Бюджет (₽)"
          type="number"
          placeholder="0"
          error={errors.budget?.message}
          {...register('budget')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Описание</label>
        <textarea
          rows={3}
          placeholder="Детали проекта, пожелания клиента..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          {...register('description')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {initial ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}