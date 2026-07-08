import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NomenclatureDocument = NomenclatureItem & Document;

@Schema()
class PackageLogic {
  @Prop({ default: false })
  enabled: boolean;

  @Prop({ default: 1 })
  packageSize: number;

  @Prop({ default: '' })
  packageUnit: string;
}

@Schema()
class NomenclatureMarkup {
  @Prop({ default: true })
  useGroupMarkup: boolean;

  @Prop()
  customMarkup?: number;
}

@Schema({ timestamps: true })
export class NomenclatureItem {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  article: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ default: '' })
  subCategory: string;

  @Prop({ required: true })
  unit: string; // шт/м/м²/м³/кг/л

  @Prop({ required: true, default: 0 })
  pricePerUnit: number;

  @Prop({ type: PackageLogic, default: () => ({}) })
  packageLogic: PackageLogic;

  @Prop({ default: 10 })
  wasteFactor: number;

  @Prop({ default: '' })
  supplier: string;

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ type: NomenclatureMarkup, default: () => ({}) })
  markup: NomenclatureMarkup;
}

export const NomenclatureSchema = SchemaFactory.createForClass(NomenclatureItem);

// Индексы для поиска
NomenclatureSchema.index({ name: 'text', article: 'text' });
NomenclatureSchema.index({ category: 1 });
NomenclatureSchema.index({ inStock: 1 });