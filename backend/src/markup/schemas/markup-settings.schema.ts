import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarkupSettingsDocument = MarkupSettings & Document;

export enum MarkupType {
  GLOBAL = 'global',
  CATEGORY = 'category',
  WORKTYPE = 'worktype',
}

@Schema({ timestamps: true })
export class MarkupSettings {
  @Prop({ enum: MarkupType, required: true })
  type: MarkupType;

  @Prop({ default: '' })
  categoryName: string;

  @Prop({ required: true, default: 0 })
  materialMarkup: number;

  @Prop({ required: true, default: 0 })
  laborMarkup: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const MarkupSettingsSchema = SchemaFactory.createForClass(MarkupSettings);