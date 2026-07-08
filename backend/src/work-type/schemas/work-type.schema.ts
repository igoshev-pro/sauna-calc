import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkTypeDocument = WorkType & Document;

@Schema()
class MaterialFormula {
  @Prop({ type: Types.ObjectId, ref: 'NomenclatureItem' })
  nomenclatureId: Types.ObjectId;

  @Prop({ required: true })
  formula: string; // "area * 1.1"

  @Prop({ default: '' })
  description: string;
}

@Schema({ timestamps: true })
export class WorkType {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, default: 0 })
  laborCostPerUnit: number;

  @Prop({ type: [MaterialFormula], default: [] })
  materialFormulas: MaterialFormula[];

  @Prop({ type: [String], default: [] })
  applicableTo: string[]; // wall/ceiling/floor/opening/equipment/lighting

  @Prop({ type: [String], default: [] })
  zoneTypes: string[]; // steam_room/hallway/rest_room/bathroom/terrace

  @Prop({ default: 0 })
  markupPercent: number;
}

export const WorkTypeSchema = SchemaFactory.createForClass(WorkType);