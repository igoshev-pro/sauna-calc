import { create } from 'zustand';
import { workStagesApi, estimatesApi } from '@/lib/api';

// ─── Локальные типы под РЕАЛЬНЫЙ ответ бэка ───

export interface WallInput {
  name: 'А' | 'Б' | 'В' | 'Г';
  length: number;
}

export interface ShelfInput {
  width: number;
  length: number;
}

export interface Measurements {
  height: number;
  walls: WallInput[];
  ceiling: { width: number; length: number };
  shelves: ShelfInput[];   // 🆕 4 полка (для освещения)
}

export interface PreviewMaterial {
  nomenclatureId: string;
  name: string;
  unit: string;
  needed: number;
  withWaste: number;
  toOrder: number;
  pricePerUnit: number;
  total: number;
}

export interface PreviewStage {
  stageId: string;
  name: string;
  laborTotal: number;
  materials: PreviewMaterial[];
  materialsTotal: number;
  total: number;
}

export interface PreviewSaunaZone {
  name: string;
  height: number;
  walls: WallInput[];
  ceiling: { width: number; length: number };
  stages: PreviewStage[];
  laborTotal: number;
  materialsTotal: number;
  total: number;
}

export interface PreviewResult {
  saunaZones: PreviewSaunaZone[];
  laborTotal: number;
  materialsTotal: number;
  grandTotal: number;
}

export interface StageOption {
  _id: string;
  name: string;
  sortOrder: number;
}

// 🆕 категории этапов по префиксу в названии
export type StageCategory = 'termos' | 'ventilation' | 'lighting' | 'other';

const PREFIX: Record<Exclude<StageCategory, 'other'>, string> = {
  termos: '[Термос]',
  ventilation: '[Вентиляция]',
  lighting: '[Освещение]',
};

export function detectCategory(name: string): StageCategory {
  if (name?.includes(PREFIX.termos)) return 'termos';
  if (name?.includes(PREFIX.ventilation)) return 'ventilation';
  if (name?.includes(PREFIX.lighting)) return 'lighting';
  return 'other';
}

// красивое имя без префикса
export function cleanStageName(name: string): string {
  return (name ?? '')
    .replace(PREFIX.termos, '')
    .replace(PREFIX.ventilation, '')
    .replace(PREFIX.lighting, '')
    .trim();
}

interface TermosWizardState {
  step: number;
  measurements: Measurements;
  allStages: StageOption[];
  selectedStageIds: string[];
  stagesLoading: boolean;
  calcLoading: boolean;
  result: PreviewResult | null;
  error: string;

  setStep: (step: number) => void;
  setHeight: (v: number) => void;
  setWall: (name: WallInput['name'], v: number) => void;
  setCeiling: (field: 'width' | 'length', v: number) => void;
  setShelf: (index: number, field: 'width' | 'length', v: number) => void; // 🆕

  toggleStage: (id: string) => void;
  selectVentilation: (id: string | null) => void;

  fetchStages: () => Promise<void>;
  calculate: () => Promise<void>;
  reset: () => void;

  stagesByCategory: (cat: StageCategory) => StageOption[];
}

const DEFAULT_MEASUREMENTS: Measurements = {
  height: 2.4,
  walls: [
    { name: 'А', length: 0 },
    { name: 'Б', length: 0 },
    { name: 'В', length: 0 },
    { name: 'Г', length: 0 },
  ],
  ceiling: { width: 0, length: 0 },
  shelves: [                       // 🆕 Полок 1..4
    { width: 0, length: 0 },
    { width: 0, length: 0 },
    { width: 0, length: 0 },
    { width: 0, length: 0 },
  ],
};

function extractError(e: unknown): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || 'Ошибка расчёта. Проверьте данные.';
}

export const useTermosWizardStore = create<TermosWizardState>((set, get) => ({
  step: 1,
  measurements: DEFAULT_MEASUREMENTS,
  allStages: [],
  selectedStageIds: [],
  stagesLoading: false,
  calcLoading: false,
  result: null,
  error: '',

  setStep: (step) => set({ step }),

  setHeight: (v) =>
    set((s) => ({ measurements: { ...s.measurements, height: v } })),

  setWall: (name, v) =>
    set((s) => ({
      measurements: {
        ...s.measurements,
        walls: s.measurements.walls.map((w) =>
          w.name === name ? { ...w, length: v } : w,
        ),
      },
    })),

  setCeiling: (field, v) =>
    set((s) => ({
      measurements: {
        ...s.measurements,
        ceiling: { ...s.measurements.ceiling, [field]: v },
      },
    })),

  // 🆕 полки
  setShelf: (index, field, v) =>
    set((s) => ({
      measurements: {
        ...s.measurements,
        shelves: s.measurements.shelves.map((sh, i) =>
          i === index ? { ...sh, [field]: v } : sh,
        ),
      },
    })),

  toggleStage: (id) =>
    set((s) => ({
      selectedStageIds: s.selectedStageIds.includes(id)
        ? s.selectedStageIds.filter((x) => x !== id)
        : [...s.selectedStageIds, id],
    })),

  // вентиляция — только ОДИН вариант
  selectVentilation: (id) =>
    set((s) => {
      const ventIds = new Set(
        s.allStages
          .filter((st) => detectCategory(st.name) === 'ventilation')
          .map((st) => st._id),
      );
      const withoutVent = s.selectedStageIds.filter((x) => !ventIds.has(x));
      return {
        selectedStageIds: id ? [...withoutVent, id] : withoutVent,
      };
    }),

  fetchStages: async () => {
    set({ stagesLoading: true, error: '' });
    try {
      const { data } = await workStagesApi.getAll();
      const stages: StageOption[] = data
        .map((st) => ({
          _id: st._id,
          name: st.name,
          sortOrder: st.sortOrder ?? 0,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // по умолчанию выбираем все этапы ТЕРМОСА
      const defaultSelected = stages
        .filter((st) => detectCategory(st.name) === 'termos')
        .map((st) => st._id);

      set({
        allStages: stages,
        selectedStageIds: defaultSelected,
        stagesLoading: false,
      });
    } catch (e) {
      set({ error: extractError(e), stagesLoading: false });
    }
  },

  calculate: async () => {
    const { measurements, selectedStageIds } = get();
    set({ calcLoading: true, error: '' });
    try {
      const payload = {
        name: 'Расчёт парной',
        saunaZones: [
          {
            name: 'Парная',
            height: measurements.height,
            walls: measurements.walls,
            ceiling: measurements.ceiling,
            shelves: measurements.shelves,   // 🆕
            stageIds: selectedStageIds,
          },
        ],
      };
      const { data } = await estimatesApi.preview(payload as never);
      set({ result: data as unknown as PreviewResult, calcLoading: false });
    } catch (e) {
      set({ error: extractError(e), calcLoading: false, result: null });
    }
  },

  reset: () =>
    set((s) => ({
      step: 1,
      measurements: DEFAULT_MEASUREMENTS,
      selectedStageIds: s.allStages
        .filter((st) => detectCategory(st.name) === 'termos')
        .map((st) => st._id),
      result: null,
      error: '',
    })),

  stagesByCategory: (cat) =>
    get().allStages.filter((st) => detectCategory(st.name) === cat),
}));