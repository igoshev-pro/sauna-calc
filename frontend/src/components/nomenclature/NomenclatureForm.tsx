'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { NomenclatureItem } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  article: z.string().optional().default(''),
  category: z.string().min(1, 'Обязательное поле'),
  subCategory: z.string().optional().default(''),
  unit: z.string().min(1, 'Обязательное поле'),
  pricePerUnit: z.coerce.number().min(0, 'Не может быть отрицательным'),
  wasteFactor: z.coerce.number().min(0).max(100).default(10),
  supplier: z.string().optional().default(''),
  inStock: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

const UNITS = [
  { value: 'шт', label: 'шт — штука' },
  { value: 'м', label: 'м — метр' },
  { value: 'м²', label: 'м² — кв. метр' },
  { value: 'м³', label: 'м³ — куб. метр' },
  { value: 'кг', label: 'кг — килограмм' },
  { value: 'л', label: 'л — литр' },
  { value: 'уп', label: 'уп — упаковка' },
];

interface NomenclatureFormProps {
  initial?: NomenclatureItem | null;
  categories: string[];
  onSubmit: (data: Partial<NomenclatureItem>) => Promise<void>;
  onCancel: () => void;
}

export function NomenclatureForm({
  initial,
  categories,
  onSubmit,
  onCancel,
}: NomenclatureFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        article: initial.article,
        category: initial.category,
        subCategory: initial.subCategory,
        unit: initial.unit,
        pricePerUnit: initial.pricePerUnit,
        wasteFactor: initial.wasteFactor,
        supplier: initial.supplier,
        inStock: initial.inStock,
      });
    } else {
      reset({
        name: '',
        article: '',
        category: '',
        subCategory: '',
        unit: 'шт',
        pricePerUnit: 0,
        wasteFactor: 10,
        supplier: '',
        inStock: true,
      });
    }
  }, [initial, reset]);

  const categoryOptions = categories.map((c) => ({ value: c, label: c }));

  const submit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Название */}
      <Input
        label="Наименование *"
        placeholder="Вагонка липа 96×14 мм"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Артикул */}
        <Input
          label="Артикул"
          placeholder="ВЛ-96-14"
          {...register('article')}
        />

        {/* Единица */}
        <Select
          label="Единица измерения *"
          options={UNITS}
          error={errors.unit?.message}
          {...register('unit')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Категория */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Категория *
          </label>
          <input
            list="categories-list"
            placeholder="Отделка / Лес / ..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            {...register('category')}
          />
          <datalist id="categories-list">
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value} />
            ))}
          </datalist>
          {errors.category && (
            <span className="text-xs text-red-500">{errors.category.message}</span>
          )}
        </div>

        {/* Подкатегория */}
        <Input
          label="Подкатегория"
          placeholder="Вагонка, Полок, ..."
          {...register('subCategory')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Цена */}
        <Input
          label="Цена за единицу (₽) *"
          type="number"
          placeholder="0"
          step="0.01"
          error={errors.pricePerUnit?.message}
          {...register('pricePerUnit')}
        />

        {/* Отход */}
        <Input
          label="Коэф. отхода (%)"
          type="number"
          placeholder="10"
          step="0.1"
          error={errors.wasteFactor?.message}
          {...register('wasteFactor')}
        />
      </div>

      {/* Поставщик */}
      <Input
        label="Поставщик"
        placeholder="ООО Лесторг"
        {...register('supplier')}
      />

      {/* В наличии */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-amber-600"
          {...register('inStock')}
        />
        <span className="text-sm text-gray-700">В наличии</span>
      </label>

      {/* Кнопки */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
        >
          {initial ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}