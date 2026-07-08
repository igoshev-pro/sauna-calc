'use client';

import { useAuthStore } from '@/store/auth.store';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{user?.fullName}</span>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium capitalize">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}