'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Client } from '@/types';

const schema = z.object({
  fullName: z.string().min(1, 'Обязательное поле'),
  phone: z.string().min(1, 'Обязательное поле'),
  email: z.string().email('Неверный email').or(z.literal('')).default(''),
  city: z.string().optional().default(''),
  source: z.string().optional().default(''),
  status: z.enum(['active', 'inactive', 'vip']).default('active'),
  notes: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активный' },
  { value: 'inactive', label: 'Неактивный' },
  { value: 'vip', label: 'VIP' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Не указан' },
  { value: 'referral', label: 'Рекомендация' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'vk', label: 'ВКонтакте' },
  { value: 'avito', label: 'Авито' },
  { value: 'yandex', label: 'Яндекс' },
  { value: 'site', label: 'Сайт' },
  { value: 'other', label: 'Другое' },
];

interface ClientFormProps {
  initial?: Client | null;
  onSubmit: (data: Partial<Client>) => Promise<void>;
  onCancel: () => void;
}

export function ClientForm({ initial, onSubmit, onCancel }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (initial) {
      reset({
        fullName: initial.fullName,
        phone: initial.phone,
        email: initial.email,
        city: initial.city,
        source: initial.source,
        status: initial.status,
        notes: initial.notes,
      });
    } else {
      reset({
        fullName: '',
        phone: '',
        email: '',
        city: '',
        source: '',
        status: 'active',
        notes: '',
      });
    }
  }, [initial, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="ФИО *"
        placeholder="Иванов Иван Иванович"
        error={errors.fullName?.message}
        {...register('fullName')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Телефон *"
          placeholder="+7 (999) 000-00-00"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email"
          placeholder="ivan@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Город"
          placeholder="Москва"
          {...register('city')}
        />
        <Select
          label="Источник"
          options={SOURCE_OPTIONS}
          {...register('source')}
        />
      </div>

      <Select
        label="Статус"
        options={STATUS_OPTIONS}
        error={errors.status?.message}
        {...register('status')}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Заметки</label>
        <textarea
          rows={3}
          placeholder="Дополнительная информация..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          {...register('notes')}
        />
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