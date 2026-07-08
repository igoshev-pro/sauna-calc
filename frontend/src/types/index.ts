export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Номенклатура ───────────────────────────────────────────

export interface PackageLogic {
  enabled: boolean;
  packageSize: number;
  packageUnit: string;
}

export interface NomenclatureMarkup {
  useGroupMarkup: boolean;
  customMarkup?: number;
}

export interface NomenclatureItem {
  _id: string;
  name: string;
  article: string;
  category: string;
  subCategory: string;
  unit: string;
  pricePerUnit: number;
  packageLogic: PackageLogic;
  wasteFactor: number;
  supplier: string;
  inStock: boolean;
  markup: NomenclatureMarkup;
  createdAt: string;
  updatedAt: string;
}

export interface NomenclatureListResponse {
  items: NomenclatureItem[];
  total: number;
  page: number;
  pages: number;
}

export interface NomenclatureQuery {
  search?: string;
  category?: string;
  inStock?: string;
  page?: number;
  limit?: number;
}

// ─── Виды работ ─────────────────────────────────────────────

export interface MaterialFormula {
  nomenclatureId: string;
  formula: string;
  description: string;
}

export interface WorkType {
  _id: string;
  name: string;
  unit: string;
  laborCostPerUnit: number;
  materialFormulas: MaterialFormula[];
  applicableTo: string[];
  zoneTypes: string[];
  markupPercent: number;
}

// ─── Наценки ────────────────────────────────────────────────

export type MarkupType = 'global' | 'category' | 'worktype';

export interface MarkupSettings {
  _id: string;
  type: MarkupType;
  categoryName: string;
  materialMarkup: number;
  laborMarkup: number;
  isActive: boolean;
}

// ─── Клиенты ────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'vip';

export interface Client {
  _id: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  status: ClientStatus;
  notes: string;
  projectsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  pages: number;
}

export interface ClientQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ─── Проекты ────────────────────────────────────────────────

export type ProjectStatus =
  | 'new'
  | 'measuring'
  | 'estimate'
  | 'negotiation'
  | 'production'
  | 'installation'
  | 'done'
  | 'cancelled';

export interface Project {
  _id: string;
  name: string;
  clientId: string;
  client?: Client;
  status: ProjectStatus;
  address: string;
  area: number;
  budget: number;
  description: string;
  managerId: string;
  manager?: User;
  estimatesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  pages: number;
}

export interface ProjectQuery {
  search?: string;
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

// ─── Сметы (СТАРАЯ структура — не удаляем, скрыта в UI) ──────

export interface EstimateComputedMaterial {
  nomenclatureId: string;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface EstimateZoneWork {
  workTypeId: string;
  name: string;
  unit: string;
  quantity: number;
  laborCostPerUnit: number;
  laborTotal: number;
  markupPercent: number;
  materials: EstimateComputedMaterial[];
  materialsTotal: number;
  total: number;
}

export interface EstimateZone {
  name: string;
  zoneType: string;
  length: number;
  width: number;
  height: number;
  area: number;
  works: EstimateZoneWork[];
  total: number;
}

// ─── КП (форма из вкладки «Клиент») ─────────────────────────

export interface KpData {
  clientFullName: string;
  phone: string;
  email: string;
  objectAddress: string;
  calculatedBy: string;
  calculatedById: string;
  organizationName: string;
  date: string;
  comment: string;
}

// ─── Этапы конструктива «Термос» ────────────────────────────

export interface StageItem {
  nomenclatureId: string;
  formula: string;       // напр. "(perimeter / 0.5) + 2"
  isFixed: boolean;      // фикс. кол-во (огнебиозащита = 1)
  fixedQty?: number;
  unit: string;
  comment?: string;
}

export interface WorkStage {
  _id: string;
  name: string;
  sortOrder: number;
  isTemplate: boolean;
  items: StageItem[];
  laborFormula: string;      // "S"
  laborPricePerUnit: number; // 1000
  laborUnit: string;         // "м²"
}

// ─── Размеры парной ─────────────────────────────────────────

export type WallName = 'А' | 'Б' | 'В' | 'Г';

export interface WallDim {
  name: WallName;
  length: number; // м
}

export interface StoveCorner {
  size1: number;
  size2: number;
  height: number;
}

export interface CeilingDim {
  width: number;
  length: number;
}

// ─── Столярка (полки, спинки, панно, трап) ──────────────────

export type WoodenItemType = 'polok' | 'spinka' | 'panno' | 'trap';

export interface WoodenItem {
  type: WoodenItemType;
  name: string;
  width: number;
  length: number;
  nomenclatureId: string;
  workTypeId: string;
  quantity: number;
}

// ─── Проёмы (окна/дверь) ────────────────────────────────────

export interface Opening {
  type: 'door' | 'window';
  name: string;
  width: number;
  height: number;
  depth: number; // глубина проёма = откосы
  wallName: WallName;
  productNomenclatureId: string;
  installWorkTypeId: string;
  hasSlopes: boolean;
  slopeNomenclatureId?: string;
  hasFraming: boolean;
  framingNomenclatureId?: string;
}

// ─── Вентиляция ─────────────────────────────────────────────

export interface VentilationVariant {
  _id: string;
  name: string;
  items: StageItem[];
  laborPrice: number; // 20000
  isActive: boolean;
}

// ─── Освещение ──────────────────────────────────────────────

export interface LightingBlock {
  enabled: boolean;
  items: StageItem[];
  laborFormula: string;
  laborPrice: number;
}

export interface LightingSpec {
  stoveCorner: LightingBlock;
  shelves: LightingBlock;
}

// ─── Финишная отделка ───────────────────────────────────────

export type FinishType = 'lining' | 'thermo_lining' | 'none';

export interface LiningParams {
  direction: 'horizontal' | 'vertical';
  boardWidth: number; // мм
  boardLength: number; // м
  nomenclatureId: string;
  hasVentGap: boolean;
  ventGapMaterialId?: string;
}

export interface WallFinish {
  wallName: WallName;
  finishType: FinishType;
  liningParams?: LiningParams;
}

export interface FinishSpec {
  walls: WallFinish[];
  ceiling: { finishType: FinishType; liningParams?: LiningParams };
}

// ─── Зона «Парная» ──────────────────────────────────────────

export interface SaunaZone {
  type: 'steam_room';
  name: string;
  dimensions: {
    walls: WallDim[];
    height: number;
    ceiling: CeilingDim;
    stoveCorner: StoveCorner;
  };
  finishStageIds: string[];
  finish: FinishSpec;
  woodenItems: WoodenItem[];
  openings: Opening[];
  ventilationVariantId?: string;
  lighting: LightingSpec;
}

// ─── Смета (расширена аддитивно) ────────────────────────────

export interface Estimate {
  _id: string;
  name: string;
  projectId?: string;
  clientId?: string;
  zones: EstimateZone[];
  laborTotal: number;
  materialsTotal: number;
  grandTotal: number;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // ── новое (опционально, для парной) ──
  kpData?: KpData;
  saunaZones?: SaunaZone[];
}

// то, что фронт отправляет на бэк (input) — СТАРОЕ
export interface ZoneWorkInput {
  workTypeId: string;
  quantity?: number;
}

export interface ZoneInput {
  name: string;
  zoneType?: string;
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  works?: ZoneWorkInput[];
}

export interface EstimateInput {
  name: string;
  projectId?: string;
  clientId?: string;
  status?: string;
  zones?: ZoneInput[];
  // ── новое (опционально) ──
  kpData?: KpData;
  saunaZones?: SaunaZone[];
}

// результат preview (без сохранения)
export interface EstimatePreview {
  zones: EstimateZone[];
  laborTotal: number;
  materialsTotal: number;
  grandTotal: number;
}

// ─── Пользователи (админка) ─────────────────────────────────

export interface AppUser {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}