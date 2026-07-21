'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Calculator, Pencil, Trash2,
  User, MapPin,
} from 'lucide-react';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useEstimateStore } from '@/store/estimate.store';
import { projectsApi } from '@/lib/api';
import { Project, Estimate } from '@/types';

const fmt = (n: number) => (n ?? 0).toLocaleString('ru-RU');

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { items, loading, error, fetchItems, removeItem } = useEstimateStore();

  const [project, setProject] = useState<Project | null>(null);
  const [deleteItem, setDeleteItem] = useState<Estimate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchItems(projectId);
    projectsApi.getOne(projectId).then((r) => setProject(r.data)).catch(() => {});
  }, [projectId]);

  const handleNew = () => {
    router.push(`/dashboard/termos?projectId=${projectId}`);
  };

  const handleEdit = (est: Estimate) => {
    router.push(`/dashboard/termos?projectId=${projectId}&estimateId=${est._id}`);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await removeItem(deleteItem._id);
      await fetchItems(projectId);
      setDeleteItem(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={project?.name || 'Проект'} />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Назад + инфо */}
        <div className="flex items-start justify-between gap-4">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> К проектам
          </button>

          <Button onClick={handleNew}>
            <Plus className="w-4 h-4" /> Новый расчёт
          </Button>
        </div>

        {/* Карточка проекта */}
        {project && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
            <h2 className="font-semibold text-gray-900">{project.name}</h2>
            {project.client && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="w-4 h-4" /> {project.client.fullName}
              </div>
            )}
            {project.address && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" /> {project.address}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Список смет */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Расчёты по проекту</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Загрузка...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Смет пока нет</p>
              <Button size="sm" onClick={handleNew}>
                <Plus className="w-4 h-4" /> Создать первую
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Дата</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Работы</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Материалы</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Итого</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <tr key={it._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {it.createdAt
                          ? new Date(it.createdAt).toLocaleDateString('ru-RU')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(it.laborTotal)} ₽</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(it.materialsTotal)} ₽</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">{fmt(it.grandTotal)} ₽</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(it)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                            title="Открыть"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(it)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
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
      </div>

      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить смету"
        message={`Удалить «${deleteItem?.name}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleteLoading}
      />
    </div>
  );
}