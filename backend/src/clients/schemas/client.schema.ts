import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  VIP = 'vip',
}

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  fullName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  source: string;

  @Prop({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: 0 })
  projectsCount: number;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index({ fullName: 'text', phone: 'text', email: 'text' });
ClientSchema.index({ status: 1 });