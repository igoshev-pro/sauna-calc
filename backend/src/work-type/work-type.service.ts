import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkType, WorkTypeDocument } from './schemas/work-type.schema';
import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';

class UpdateWorkTypeDto extends PartialType(CreateWorkTypeDto) {}

@Injectable()
export class WorkTypeService {
  constructor(
    @InjectModel(WorkType.name)
    private workTypeModel: Model<WorkTypeDocument>,
  ) {}

  findAll(applicableTo?: string, zoneType?: string) {
    const filter: any = {};
    if (applicableTo) filter.applicableTo = applicableTo;
    if (zoneType) filter.zoneTypes = zoneType;
    return this.workTypeModel.find(filter).lean();
  }

  async findOne(id: string) {
    const item = await this.workTypeModel.findById(id).lean();
    if (!item) throw new NotFoundException('Вид работы не найден');
    return item;
  }

  create(dto: CreateWorkTypeDto) {
    // @ts-ignore
    return this.workTypeModel.create(dto);
  }

  async update(id: string, dto: UpdateWorkTypeDto) {
    const item = await this.workTypeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Вид работы не найден');
    return item;
  }

  async remove(id: string) {
    const item = await this.workTypeModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Вид работы не найден');
    return { success: true };
  }
}