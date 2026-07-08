'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Upload, Search, Filter, Pencil, Trash2, Package } from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NomenclatureForm } from '@/components/nomenclature/NomenclatureForm';
import { useNomenclatureStore } from '@/store/nomenclature.store';
import { useAuthStore } from '@/store/auth.store';
import { NomenclatureItem } from '@/types';
import { cn } from '@/lib/utils';

export default function NomenclaturePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const {
    items, total, pages, currentPage,
    categories, loading, error, query,
    fetchItems, fetchCategories, setQuery,
    createItem, updateItem, removeItem, importExcel,
  } = useNomenclatureStore();

  // Модалки
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<NomenclatureItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<NomenclatureItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Импорт Excel
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number; created: number; updated: number
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Поиск с дебаунсом
  const [searchVal, setSearchVal] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery({ search: searchVal, page: 1 }), 400);
    return () => clearTimeout(t);
  }, [searchVal]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  // ── Открыть форму добавления
  const handleAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  // ── Открыть форму редактирования
  const handleEdit = (item: NomenclatureItem) => {
    setEditItem(item);
    setFormOpen(true);
  };

  // ── Сабмит формы
  const handleFormSubmit = async (data: Partial<NomenclatureItem>) => {
    if (editItem) {
      await updateItem(editItem._id, data);
    } else {
      await createItem(data);
    }
    setFormOpen(false);
  };

  // ── Удалить
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

  // ── Импорт Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const result = await importExcel(file);
      setImportResult(result);
    } catch {
      // ошибка
    } finally {
      setImportLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Номенклатура" />

      <div className="p-6 flex flex-col gap-4 flex-1">

        {/* Тулбар */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Поиск */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Поиск по названию, артикулу..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Фильтр категории */}
          <select
            value={query.category || ''}
            onChange={(e) => setQuery({ category: e.target.value || undefined, page: 1 })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Фильтр наличия */}
          <select
            value={query.inStock || ''}
            onChange={(e) => setQuery({ inStock: e.target.value || undefined, page: 1 })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Все статусы</option>
            <option value="true">В наличии</option>
            <option value="false">Нет в наличии</option>
          </select>

          <div className="flex gap-2 ml-auto">
            {/* Импорт Excel */}
            {isAdmin && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={importLoading}
                >
                  <Upload className="w-4 h-4" />
                  Импорт Excel
                </Button>
              </>
            )}

            {/* Добавить */}
            {isAdmin && (
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                Добавить
              </Button>
            )}
          </div>
        </div>

                {/* Результат импорта */}
        {importResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-green-700">
              ✅ Импортировано: <b>{importResult.imported}</b> позиций
              (новых: <b>{importResult.created}</b>, обновлено: <b>{importResult.updated}</b>)
            </p>
            <button
              onClick={() => setImportResult(null)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              ✕
            </button>
          </div>
        )}

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
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-500">Загрузка...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Номенклатура не найдена</p>
              {isAdmin && (
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="w-4 h-4" />
                  Добавить первую позицию
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Наименование</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Артикул</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Категория</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ед.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Цена</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Отход %</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Наличие</th>
                    {isAdmin && (
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.supplier && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.supplier}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {item.article || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {item.category ? (
                          <div>
                            <span className="text-gray-700">{item.category}</span>
                            {item.subCategory && (
                              <span className="text-gray-400 text-xs ml-1">
                                / {item.subCategory}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {item.pricePerUnit.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.wasteFactor}%
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.inStock ? 'green' : 'red'}>
                          {item.inStock ? 'В наличии' : 'Нет'}
                        </Badge>
                      </td>
                      {isAdmin && (
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
                      )}
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
              Показано {items.length} из {total} позиций
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
        title={editItem ? 'Редактировать позицию' : 'Добавить позицию'}
        size="lg"
      >
        <NomenclatureForm
          initial={editItem}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Диалог удаления */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить позицию"
        message={`Удалить «${deleteItem?.name}»? Это действие нельзя отменить.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}