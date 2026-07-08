'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/ui/layout/Header';
import { useAuthStore } from '@/store/auth.store';
import { clientsApi, projectsApi, estimatesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Users, FolderOpen, Calculator, TrendingUp,
} from 'lucide-react';

interface StatItem {
  label: string;
  value: number | null;
  icon: typeof Users;
  color: string;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [clients, setClients] = useState<number | null>(null);
  const [projects, setProjects] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<number | null>(null);
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, e] = await Promise.all([
          clientsApi.getAll({ limit: 1 }),
          projectsApi.getAll({ limit: 1 }),
          estimatesApi.getAll(),
        ]);
        setClients(c.data.total);
        setProjects(p.data.total);
        setEstimates(e.data.length);
        setSent(e.data.filter((x) => x.status === 'sent').length);
      } catch {
        setClients(0);
        setProjects(0);
        setEstimates(0);
        setSent(0);
      }
    };
    load();
  }, []);

  const stats: StatItem[] = [
    { label: 'Клиенты', value: clients, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Проекты', value: projects, icon: FolderOpen, color: 'bg-purple-50 text-purple-600' },
    { label: 'Расчёты', value: estimates, icon: Calculator, color: 'bg-amber-50 text-amber-600' },
    { label: 'КП отправлено', value: sent, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div>
      <Header title="Дашборд" />
      <div className="p-6">
        <p className="text-gray-600 mb-6">
          Добро пожаловать,{' '}
          <span className="font-semibold text-gray-900">{user?.fullName}</span>!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.color)}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value === null ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}