import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EstimateDocument = Estimate & Document;

@Schema({ _id: false })
class ComputedMaterial {
  @Prop({ type: Types.ObjectId, ref: 'NomenclatureItem' })
  nomenclatureId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  unit: string;

  @Prop({ default: 0 })
  quantity: number;

  @Prop({ default: 0 })
  pricePerUnit: number;

  @Prop({ default: 0 })
  total: number;
}

@Schema({ _id: false })
class ZoneWork {
  @Prop({ type: Types.ObjectId, ref: 'WorkType', required: true })
  workTypeId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  unit: string;

  @Prop({ default: 0 })
  quantity: number;

  @Prop({ default: 0 })
  laborCostPerUnit: number;

  @Prop({ default: 0 })
  laborTotal: number;

  @Prop({ default: 0 })
  markupPercent: number;

  @Prop({ type: [ComputedMaterial], default: [] })
  materials: ComputedMaterial[];

  @Prop({ default: 0 })
  materialsTotal: number;

  @Prop({ default: 0 })
  total: number;
}

@Schema({ _id: false })
class Zone {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  zoneType: string;

  @Prop({ default: 0 })
  length: number;

  @Prop({ default: 0 })
  width: number;

  @Prop({ default: 0 })
  height: number;

  @Prop({ default: 0 })
  area: number;

  @Prop({ type: [ZoneWork], default: [] })
  works: ZoneWork[];

  @Prop({ default: 0 })
  total: number;
}

/* ============ ПАРНАЯ (SAUNA) — обобщённая snapshot-модель v2 ============ */

// Материал внутри любой секции парной (единый формат)
@Schema({ _id: false })
class SaunaMaterial {
  @Prop({ type: Types.ObjectId, ref: 'NomenclatureItem' })
  nomenclatureId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  unit: string;

  // сырое кол-во по формуле/расчёту
  @Prop({ default: 0 })
  needed: number;

  // с учётом запаса (wasteFactor)
  @Prop({ default: 0 })
  withWaste: number;

  // к заказу (с учётом упаковки)
  @Prop({ default: 0 })
  toOrder: number;

  @Prop({ default: 0 })
  pricePerUnit: number;

  @Prop({ default: 0 })
  total: number;

  // произвольная пояснялка (напр. "Стена А, вагонка гориз")
  @Prop({ default: '' })
  comment: string;
}

// Обобщённая секция парной.
// type: 'stage' | 'finish' | 'wooden' | 'opening' | 'ventilation' | 'lighting' | 'equipment'
@Schema({ _id: false })
class SaunaSection {
  @Prop({ default: '' })
  type: string;

  @Prop({ default: '' })
  name: string;

  // ссылка на источник (stageId / workTypeId / ventilationVariantId) — опционально
  @Prop({ type: Types.ObjectId })
  refId: Types.ObjectId;

  @Prop({ default: 0 })
  laborTotal: number;

  @Prop({ type: [SaunaMaterial], default: [] })
  materials: SaunaMaterial[];

  @Prop({ default: 0 })
  materialsTotal: number;

  @Prop({ default: 0 })
  total: number;
}

// Размеры стены (snapshot)
@Schema({ _id: false })
class SaunaWallDim {
  @Prop({ default: '' })
  name: string;

  @Prop({ default: 0 })
  length: number;
}

// Позиция этапа термоса в снапшоте сметы
@Schema({ _id: false })
class SaunaStage {
  @Prop({ type: Types.ObjectId, ref: 'WorkStage' })
  stageId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: 0 })
  laborTotal: number;

  @Prop({ type: [SaunaMaterial], default: [] })
  materials: SaunaMaterial[];

  @Prop({ default: 0 })
  materialsTotal: number;

  @Prop({ default: 0 })
  total: number;
}

@Schema({ _id: false })
class SaunaZone {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  length: number;

  @Prop({ default: 0 })
  width: number;

  @Prop({ default: 0 })
  height: number;

  @Prop({ default: 0 })
  area: number;

  // размеры стен А/Б/В/Г (snapshot)
  @Prop({ type: [SaunaWallDim], default: [] })
  walls: SaunaWallDim[];

  // размеры потолка
  @Prop({ type: Object, default: null })
  ceiling: { width: number; length: number } | null;

  // этапы термоса (snapshot детализации)
  @Prop({ type: [SaunaStage], default: [] })
  stages: SaunaStage[];

  // обобщённые секции (финиш, столярка, проёмы, вентиляция, освещение, оборудование)
  @Prop({ type: [SaunaSection], default: [] })
  sections: SaunaSection[];

  @Prop({ default: 0 })
  laborTotal: number;

  @Prop({ default: 0 })
  materialsTotal: number;

  @Prop({ default: 0 })
  total: number;
}

@Schema({ timestamps: true })
export class Estimate {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client' })
  clientId: Types.ObjectId;

  @Prop({ type: [Zone], default: [] })
  zones: Zone[];

  // ← зоны парной (обобщённая модель v2)
  @Prop({ type: [SaunaZone], default: [] })
  saunaZones: SaunaZone[];

  @Prop({ default: 0 })
  laborTotal: number;

  @Prop({ default: 0 })
  materialsTotal: number;

  @Prop({ default: 0 })
  grandTotal: number;

  @Prop({ default: 'draft' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const EstimateSchema = SchemaFactory.createForClass(Estimate);