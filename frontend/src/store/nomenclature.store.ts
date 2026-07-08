import { create } from 'zustand';
import { NomenclatureItem, NomenclatureQuery } from '@/types';
import { nomenclatureApi } from '@/lib/api';

interface NomenclatureState {
  items: NomenclatureItem[];
  total: number;
  pages: number;
  currentPage: number;
  query: NomenclatureQuery;
  categories: string[];
  loading: boolean;
  error: string | null;

  setQuery: (q: Partial<NomenclatureQuery>) => void;
  fetchItems: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createItem: (data: Partial<NomenclatureItem>) => Promise<void>;
  updateItem: (id: string, data: Partial<NomenclatureItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  importExcel: (file: File) => Promise<{ imported: number; created: number; updated: number }>;
}

export const useNomenclatureStore = create<NomenclatureState>((set, get) => ({
  items: [],
  total: 0,
  pages: 1,
  currentPage: 1,
  query: { page: 1, limit: 50 },
  categories: [],
  loading: false,
  error: null,

  setQuery: (q) => {
    set((s) => ({ query: { ...s.query, ...q } }));
    get().fetchItems();
  },

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await nomenclatureApi.getAll(get().query);
      set({
        items: data.items,
        total: data.total,
        pages: data.pages,
        currentPage: data.page,
      });
    } catch {
      set({ error: 'Ошибка загрузки номенклатуры' });
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await nomenclatureApi.getCategories();
      set({ categories: data });
    } catch {
      // тихо
    }
  },

  createItem: async (data) => {
    await nomenclatureApi.create(data);
    await get().fetchItems();
    await get().fetchCategories();
  },

  updateItem: async (id, data) => {
    await nomenclatureApi.update(id, data);
    await get().fetchItems();
    await get().fetchCategories();
  },

  removeItem: async (id) => {
    await nomenclatureApi.remove(id);
    await get().fetchItems();
  },

  importExcel: async (file) => {
    const { data } = await nomenclatureApi.importExcel(file);
    await get().fetchItems();
    await get().fetchCategories();
    return data;
  },
}));