import { create } from 'zustand';
import { WorkType } from '@/types';
import { workTypesApi } from '@/lib/api';

interface WorkTypeState {
  items: WorkType[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  createItem: (data: Partial<WorkType>) => Promise<void>;
  updateItem: (id: string, data: Partial<WorkType>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useWorkTypeStore = create<WorkTypeState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await workTypesApi.getAll();
      set({ items: data });
    } catch {
      set({ error: 'Ошибка загрузки видов работ' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    await workTypesApi.create(data);
    await get().fetchItems();
  },

  updateItem: async (id, data) => {
    await workTypesApi.update(id, data);
    await get().fetchItems();
  },

  removeItem: async (id) => {
    await workTypesApi.remove(id);
    await get().fetchItems();
  },
}));