import { create } from 'zustand';
import { Client, ClientQuery } from '@/types';
import { clientsApi } from '@/lib/api';

interface ClientsState {
  items: Client[];
  total: number;
  pages: number;
  currentPage: number;
  query: ClientQuery;
  loading: boolean;
  error: string | null;

  setQuery: (q: Partial<ClientQuery>) => void;
  fetchItems: () => Promise<void>;
  createItem: (data: Partial<Client>) => Promise<void>;
  updateItem: (id: string, data: Partial<Client>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  items: [],
  total: 0,
  pages: 1,
  currentPage: 1,
  query: { page: 1, limit: 20 },
  loading: false,
  error: null,

  setQuery: (q) => {
    set((s) => ({ query: { ...s.query, ...q } }));
    get().fetchItems();
  },

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await clientsApi.getAll(get().query);
      set({
        items: data.items,
        total: data.total,
        pages: data.pages,
        currentPage: data.page,
      });
    } catch {
      set({ error: 'Ошибка загрузки клиентов' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    await clientsApi.create(data);
    await get().fetchItems();
  },

  updateItem: async (id, data) => {
    await clientsApi.update(id, data);
    await get().fetchItems();
  },

  removeItem: async (id) => {
    await clientsApi.remove(id);
    await get().fetchItems();
  },
}));