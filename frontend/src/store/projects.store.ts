import { create } from 'zustand';
import { Project, ProjectQuery } from '@/types';
import { projectsApi } from '@/lib/api';

interface ProjectsState {
  items: Project[];
  total: number;
  pages: number;
  currentPage: number;
  query: ProjectQuery;
  loading: boolean;
  error: string | null;

  setQuery: (q: Partial<ProjectQuery>) => void;
  fetchItems: () => Promise<void>;
  createItem: (data: Partial<Project>) => Promise<void>;
  updateItem: (id: string, data: Partial<Project>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
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
      const { data } = await projectsApi.getAll(get().query);
      set({
        items: data.items,
        total: data.total,
        pages: data.pages,
        currentPage: data.page,
      });
    } catch {
      set({ error: 'Ошибка загрузки проектов' });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    await projectsApi.create(data);
    await get().fetchItems();
  },

  updateItem: async (id, data) => {
    await projectsApi.update(id, data);
    await get().fetchItems();
  },

  removeItem: async (id) => {
    await projectsApi.remove(id);
    await get().fetchItems();
  },
}));