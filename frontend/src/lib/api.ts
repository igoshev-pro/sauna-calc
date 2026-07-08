import axios from 'axios';
import {
  NomenclatureItem,
  NomenclatureListResponse,
  NomenclatureQuery,
  WorkType,
  MarkupSettings,
  Client,
  ClientListResponse,
  ClientQuery,
  Project,
  ProjectListResponse,
  ProjectQuery,
  Estimate,
  EstimateInput,
  EstimatePreview,
  AppUser,
  CreateUserInput,
  WorkStage,
  VentilationVariant,
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Номенклатура ───────────────────────────────────────────

export const nomenclatureApi = {
  getAll: (query: NomenclatureQuery = {}) =>
    api.get<NomenclatureListResponse>('/nomenclature', { params: query }),
  getOne: (id: string) =>
    api.get<NomenclatureItem>(`/nomenclature/${id}`),
  getCategories: () =>
    api.get<string[]>('/nomenclature/categories'),
  create: (data: Partial<NomenclatureItem>) =>
    api.post<NomenclatureItem>('/nomenclature', data),
  update: (id: string, data: Partial<NomenclatureItem>) =>
    api.put<NomenclatureItem>(`/nomenclature/${id}`, data),
  remove: (id: string) =>
    api.delete(`/nomenclature/${id}`),
  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ imported: number; created: number; updated: number }>(
      '/nomenclature/import/excel',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};

// ─── Виды работ ─────────────────────────────────────────────

export const workTypesApi = {
  getAll: (applicableTo?: string, zoneType?: string) =>
    api.get<WorkType[]>('/work-types', { params: { applicableTo, zoneType } }),
  create: (data: Partial<WorkType>) =>
    api.post<WorkType>('/work-types', data),
  update: (id: string, data: Partial<WorkType>) =>
    api.put<WorkType>(`/work-types/${id}`, data),
  remove: (id: string) =>
    api.delete(`/work-types/${id}`),
};

// ─── Этапы конструктива (термос) ────────────────────────────

export const workStagesApi = {
  getAll: () =>
    api.get<WorkStage[]>('/work-stages'),
  getTemplates: () =>
    api.get<WorkStage[]>('/work-stages/templates'),
  getOne: (id: string) =>
    api.get<WorkStage>(`/work-stages/${id}`),
  create: (data: Partial<WorkStage>) =>
    api.post<WorkStage>('/work-stages', data),
  update: (id: string, data: Partial<WorkStage>) =>
    api.put<WorkStage>(`/work-stages/${id}`, data),
  remove: (id: string) =>
    api.delete(`/work-stages/${id}`),
};

// ─── Вентиляция ─────────────────────────────────────────────

export const ventilationApi = {
  getAll: () =>
    api.get<VentilationVariant[]>('/ventilation-variants'),
  getOne: (id: string) =>
    api.get<VentilationVariant>(`/ventilation-variants/${id}`),
  create: (data: Partial<VentilationVariant>) =>
    api.post<VentilationVariant>('/ventilation-variants', data),
  update: (id: string, data: Partial<VentilationVariant>) =>
    api.put<VentilationVariant>(`/ventilation-variants/${id}`, data),
  remove: (id: string) =>
    api.delete(`/ventilation-variants/${id}`),
};

// ─── Наценки ────────────────────────────────────────────────

export const markupApi = {
  getAll: () =>
    api.get<MarkupSettings[]>('/markup'),
  create: (data: Partial<MarkupSettings>) =>
    api.post<MarkupSettings>('/markup', data),
  update: (id: string, data: Partial<MarkupSettings>) =>
    api.put<MarkupSettings>(`/markup/${id}`, data),
  remove: (id: string) =>
    api.delete(`/markup/${id}`),
};

// ─── Клиенты ────────────────────────────────────────────────

export const clientsApi = {
  getAll: (query: ClientQuery = {}) =>
    api.get<ClientListResponse>('/clients', { params: query }),
  getOne: (id: string) =>
    api.get<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) =>
    api.post<Client>('/clients', data),
  update: (id: string, data: Partial<Client>) =>
    api.put<Client>(`/clients/${id}`, data),
  remove: (id: string) =>
    api.delete(`/clients/${id}`),
};

// ─── Проекты ────────────────────────────────────────────────

export const projectsApi = {
  getAll: (query: ProjectQuery = {}) =>
    api.get<ProjectListResponse>('/projects', { params: query }),
  getOne: (id: string) =>
    api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data),
  remove: (id: string) =>
    api.delete(`/projects/${id}`),
};

// ─── Сметы ──────────────────────────────────────────────────

export const estimatesApi = {
  getAll: (projectId?: string) =>
    api.get<Estimate[]>('/estimates', { params: { projectId } }),
  getOne: (id: string) =>
    api.get<Estimate>(`/estimates/${id}`),
  preview: (data: EstimateInput) =>
    api.post<EstimatePreview>('/estimates/preview', data),
  create: (data: EstimateInput) =>
    api.post<Estimate>('/estimates', data),
  update: (id: string, data: EstimateInput) =>
    api.put<Estimate>(`/estimates/${id}`, data),
  remove: (id: string) =>
    api.delete(`/estimates/${id}`),
};

// ─── Пользователи ───────────────────────────────────────────

export const usersApi = {
  getAll: () =>
    api.get<AppUser[]>('/users'),
  getOne: (id: string) =>
    api.get<AppUser>(`/users/${id}`),
  create: (data: CreateUserInput) =>
    api.post<AppUser>('/users', data),
  deactivate: (id: string) =>
    api.patch<AppUser>(`/users/${id}/deactivate`),
};