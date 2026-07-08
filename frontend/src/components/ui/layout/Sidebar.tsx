'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderOpen,
  Calculator,
  Settings,
  LogOut,
  Hammer,
  Flame,
  Layers,
} from 'lucide-react';

const navigation = [
  {
    name: 'Дашборд',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager'],
  },
  {
    name: 'Клиенты',
    href: '/dashboard/clients',
    icon: Users,
    roles: ['admin', 'manager'],
  },
  {
    name: 'Проекты',
    href: '/dashboard/projects',
    icon: FolderOpen,
    roles: ['admin', 'manager'],
  },
  // {
  //   name: 'Расчёты',
  //   href: '/dashboard/estimates',
  //   icon: Calculator,
  //   roles: ['admin', 'manager'],
  // },
  {
    name: 'Расчёт парной',
    href: '/dashboard/termos',
    icon: Flame,
    roles: ['admin', 'manager'],
  },
  {
    name: 'Этапы работ',
    href: '/dashboard/work-stages',
    icon: Layers,
    roles: ['admin'],
  },
  {
    name: 'Номенклатура',
    href: '/dashboard/nomenclature',
    icon: BookOpen,
    roles: ['admin'],
  },
  // {
  //   name: 'Виды работ',
  //   href: '/dashboard/work-types',
  //   icon: Hammer,
  //   roles: ['admin'],
  // },
  {
    name: 'Пользователи',
    href: '/dashboard/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Настройки',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filtered = navigation.filter((item) =>
    item.roles.includes(user?.role ?? ''),
  );

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      {/* Логотип */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">🪵</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Sauna Calc</p>
            <p className="text-gray-400 text-xs">v1.0</p>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-4 space-y-1">
        {filtered.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Пользователь */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.fullName?.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.fullName}
            </p>
            <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}