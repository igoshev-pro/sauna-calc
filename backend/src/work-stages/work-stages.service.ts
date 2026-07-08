import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkStage, WorkStageDocument } from './schemas/work-stage.schema';
import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkStageDto } from './dto/create-work-stage.dto';

class UpdateWorkStageDto extends PartialType(CreateWorkStageDto) {}

@Injectable()
export class WorkStagesService {
  constructor(
    @InjectModel(WorkStage.name)
    private workStageModel: Model<WorkStageDocument>,
  ) {}

  findAll() {
    return this.workStageModel.find().sort({ sortOrder: 1 }).lean();
  }

  findTemplates() {
    return this.workStageModel
      .find({ isTemplate: true })
      .sort({ sortOrder: 1 })
      .lean();
  }

  async findOne(id: string) {
    const item = await this.workStageModel.findById(id).lean();
    if (!item) throw new NotFoundException('Этап работ не найден');
    return item;
  }

  create(dto: CreateWorkStageDto) {
    // @ts-ignore
    return this.workStageModel.create(dto);
  }

  async update(id: string, dto: UpdateWorkStageDto) {
    const item = await this.workStageModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Этап работ не найден');
    return item;
  }

  async remove(id: string) {
    const item = await this.workStageModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Этап работ не найден');
    return { success: true };
  }
}