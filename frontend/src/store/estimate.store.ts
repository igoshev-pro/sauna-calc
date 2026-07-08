import { create } from 'zustand';
import { Estimate, EstimateInput, EstimatePreview } from '@/types';
import { estimatesApi } from '@/lib/api';

interface EstimateState {
  items: Estimate[];
  loading: boolean;
  error: string | null;
  fetchItems: (projectId?: string) => Promise<void>;
  createItem: (data: EstimateInput) => Promise<Estimate>;
  updateItem: (id: string, data: EstimateInput) => Promise<Estimate>;
  removeItem: (id: string) => Promise<void>;
  preview: (data: EstimateInput) => Promise<EstimatePreview>;
}

export const useEstimateStore = create<EstimateState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await estimatesApi.getAll(projectId);
      set({ items: data });
    } catch {
      set({ error: 'Ошибка загрузки смет' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    const { data: res } = await estimatesApi.create(data);
    await get().fetchItems();
    return res;
  },

  updateItem: async (id, data) => {
    const { data: res } = await estimatesApi.update(id, data);
    await get().fetchItems();
    return res;
  },

  removeItem: async (id) => {
    await estimatesApi.remove(id);
    await get().fetchItems();
  },

  preview: async (data) => {
    const { data: res } = await estimatesApi.preview(data);
    return res;
  },
}));