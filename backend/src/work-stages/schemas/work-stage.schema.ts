import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkStageDocument = WorkStage & Document;

@Schema({ _id: false })
class StageItem {
  @Prop({ type: Types.ObjectId, ref: 'NomenclatureItem' })
  nomenclatureId: Types.ObjectId;

  // формула количества, напр. "(perimeter / 0.5) + 2"
  @Prop({ default: '' })
  formula: string;

  // фиксированное количество (напр. огнебиозащита = 1)
  @Prop({ default: false })
  isFixed: boolean;

  @Prop({ default: 0 })
  fixedQty: number;

  @Prop({ default: '' })
  unit: string;

  @Prop({ default: '' })
  comment: string;
}

@Schema({ timestamps: true })
export class WorkStage {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  sortOrder: number;

  // является ли шаблоном (для быстрого добавления в парную)
  @Prop({ default: true })
  isTemplate: boolean;

  @Prop({ type: [StageItem], default: [] })
  items: StageItem[];

  // формула работы, напр. "S" (площадь)
  @Prop({ default: 'S' })
  laborFormula: string;

  @Prop({ default: 0 })
  laborPricePerUnit: number;

  @Prop({ default: 'м²' })
  laborUnit: string;
}

export const WorkStageSchema = SchemaFactory.createForClass(WorkStage);