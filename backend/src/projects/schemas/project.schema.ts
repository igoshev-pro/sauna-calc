import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  NEW = 'new',
  MEASURING = 'measuring',
  ESTIMATE = 'estimate',
  NEGOTIATION = 'negotiation',
  PRODUCTION = 'production',
  INSTALLATION = 'installation',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ enum: ProjectStatus, default: ProjectStatus.NEW })
  status: ProjectStatus;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: 0 })
  area: number;

  @Prop({ default: 0 })
  budget: number;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId: Types.ObjectId;

  @Prop({ default: 0 })
  estimatesCount: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ name: 'text', address: 'text' });
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ managerId: 1 });