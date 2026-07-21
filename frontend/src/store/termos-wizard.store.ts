import { create } from 'zustand';
import { workStagesApi, estimatesApi, projectsApi } from '@/lib/api';

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
  shelves: ShelfInput[];
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
  comment?: string;            // 🆕
}

export interface PreviewStage {
  stageId: string;
  name: string;
  laborTotal: number;
  laborUnit?: string;          // 🆕
  laborQty?: number;           // 🆕
  laborPricePerUnit?: number;  // 🆕
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

  // ── сохранение к проекту ──
  projectId: string | null;
  clientId: string | null;
  estimateId: string | null;
  estimateName: string;
  saveLoading: boolean;
  savedOk: boolean;

  setStep: (step: number) => void;
  setHeight: (v: number) => void;
  setWall: (name: WallInput['name'], v: number) => void;
  setCeiling: (field: 'width' | 'length', v: number) => void;
  setShelf: (index: number, field: 'width' | 'length', v: number) => void;

  toggleStage: (id: string) => void;
  selectVentilation: (id: string | null) => void;

  setEstimateName: (v: string) => void;
  setProjectId: (id: string | null) => void;
  loadEstimate: (id: string) => Promise<void>;
  save: () => Promise<boolean>;

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
  shelves: [
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
  return msg || 'Ошибка. Проверьте данные.';
}

// сборка payload для preview/save
function buildPayload(state: TermosWizardState) {
  const { measurements, selectedStageIds, estimateName, projectId, clientId } = state;
  return {
    name: estimateName?.trim() || 'Расчёт парной',
    projectId: projectId || undefined,
    clientId: clientId || undefined,
    saunaZones: [
      {
        name: 'Парная',
        height: measurements.height,
        walls: measurements.walls,
        ceiling: measurements.ceiling,
        shelves: measurements.shelves,
        stageIds: selectedStageIds,
      },
    ],
  };
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

  projectId: null,
  clientId: null,
  estimateId: null,
  estimateName: 'Расчёт парной',
  saveLoading: false,
  savedOk: false,

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

  setEstimateName: (v) => set({ estimateName: v }),

  setProjectId: async (id: string | null) => {
    set({ projectId: id });
    if (!id) {
      set({ clientId: null });
      return;
    }
    try {
      const { data } = await projectsApi.getOne(id);
      const cid = (data as any).clientId?._id ?? (data as any).clientId ?? null;
      set({ clientId: typeof cid === 'string' ? cid : null });
    } catch {
      // молча — clientId необязателен
    }
  },

  // загрузка существующей сметы для редактирования
  loadEstimate: async (id: string) => {
    set({ error: '' });
    try {
      const { data } = await estimatesApi.getOne(id);
      const zone: any = data.saunaZones?.[0];

      if (zone) {
        const walls: WallInput[] = ['А', 'Б', 'В', 'Г'].map((n, i) => ({
          name: n as WallInput['name'],
          length: zone.walls?.[i]?.length ?? 0,
        }));

        set((s) => ({
          measurements: {
            height: zone.height ?? 2.4,
            walls,
            ceiling: {
              width: zone.ceiling?.width ?? 0,
              length: zone.ceiling?.length ?? 0,
            },
            shelves: s.measurements.shelves, // размеры полков в снапшоте не хранятся
          },
          selectedStageIds: (zone.stages ?? []).map((st: any) => String(st.stageId)),
        }));
      }

      set({
        estimateId: data._id,
        estimateName: data.name ?? 'Расчёт парной',
        projectId: (data as any).projectId
          ? String((data as any).projectId)
          : get().projectId,
        clientId: (data as any).clientId
          ? String((data as any).clientId)
          : get().clientId,
        result: {
          saunaZones: data.saunaZones as any,
          laborTotal: data.laborTotal,
          materialsTotal: data.materialsTotal,
          grandTotal: data.grandTotal,
        },
      });
    } catch (e) {
      set({ error: extractError(e) });
    }
  },

    save: async () => {
    const state = get();
    set({ saveLoading: true, error: '', savedOk: false });
    try {
      const payload = buildPayload(state);
      if (state.estimateId) {
        await estimatesApi.update(state.estimateId, payload as never);
      } else {
        const { data } = await estimatesApi.create(payload as never);
        set({ estimateId: data._id });
      }
      set({ saveLoading: false, savedOk: true });
      return true;
    } catch (e) {
      set({ error: extractError(e), saveLoading: false, savedOk: false });
      return false;
    }
  },

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

      set((s) => {
        // если сметы ещё не грузили (нет выбранных этапов) — выбираем все Термос по умолчанию
        const alreadySelected = s.selectedStageIds.length > 0;
        const defaultSelected = stages
          .filter((st) => detectCategory(st.name) === 'termos')
          .map((st) => st._id);

        return {
          allStages: stages,
          selectedStageIds: alreadySelected ? s.selectedStageIds : defaultSelected,
          stagesLoading: false,
        };
      });
    } catch (e) {
      set({ error: extractError(e), stagesLoading: false });
    }
  },

  calculate: async () => {
    set({ calcLoading: true, error: '' });
    try {
      const payload = buildPayload(get());
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
      estimateId: null,
      estimateName: 'Расчёт парной',
      savedOk: false,
      // projectId / clientId НЕ сбрасываем — остаёмся в контексте проекта
    })),

  stagesByCategory: (cat) =>
    get().allStages.filter((st) => detectCategory(st.name) === cat),
}));