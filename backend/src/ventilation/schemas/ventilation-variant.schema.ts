import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VentilationVariantDocument = VentilationVariant & Document;

@Schema({ _id: false })
class VentilationItem {
  @Prop({ type: Types.ObjectId, ref: 'NomenclatureItem' })
  nomenclatureId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  unit: string;

  // фиксированное количество для этого варианта
  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: '' })
  comment: string;
}

@Schema({ timestamps: true })
export class VentilationVariant {
  @Prop({ required: true })
  name: string; // напр. "Базовая приточно-вытяжная"

  @Prop({ default: '' })
  description: string;

  // тип схемы: basic / залповая / принудительная и т.д.
  @Prop({ default: '' })
  schemeType: string;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [VentilationItem], default: [] })
  items: VentilationItem[];

  // стоимость работ по монтажу вентиляции (фиксированная за вариант)
  @Prop({ default: 0 })
  laborCost: number;
}

export const VentilationVariantSchema =
  SchemaFactory.createForClass(VentilationVariant);