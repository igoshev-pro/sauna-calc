import { create } from 'zustand';
import { AppUser, CreateUserInput } from '@/types';
import { usersApi } from '@/lib/api';

interface UserState {
  items: AppUser[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  createItem: (data: CreateUserInput) => Promise<void>;
  deactivateItem: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await usersApi.getAll();
      set({ items: data });
    } catch {
      set({ error: 'Ошибка загрузки пользователей' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    await usersApi.create(data);
    await get().fetchItems();
  },

  deactivateItem: async (id) => {
    await usersApi.deactivate(id);
    await get().fetchItems();
  },
}));