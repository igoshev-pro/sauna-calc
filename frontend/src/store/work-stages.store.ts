import { create } from 'zustand';
import { WorkStage } from '@/types';
import { workStagesApi } from '@/lib/api';


interface WorkStagesState {
  items: WorkStage[];
  loading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  createItem: (data: Partial<WorkStage>) => Promise<void>;
  updateItem: (id: string, data: Partial<WorkStage>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}


export const useWorkStagesStore = create<WorkStagesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await workStagesApi.getAll();
      set({ items: data });
    } catch {
      set({ error: 'Ошибка загрузки этапов работ' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    await workStagesApi.create(data);
    await get().fetchItems();
  },

  updateItem: async (id, data) => {
    await workStagesApi.update(id, data);
    await get().fetchItems();
  },

  removeItem: async (id) => {
    await workStagesApi.remove(id);
    await get().fetchItems();
  },
}));