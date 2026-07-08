import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VentilationVariant,
  VentilationVariantDocument,
} from './schemas/ventilation-variant.schema';
import { PartialType } from '@nestjs/mapped-types';
import { CreateVentilationVariantDto } from './dto/create-ventilation-variant.dto';

class UpdateVentilationVariantDto extends PartialType(
  CreateVentilationVariantDto,
) {}

@Injectable()
export class VentilationService {
  constructor(
    @InjectModel(VentilationVariant.name)
    private ventilationModel: Model<VentilationVariantDocument>,
  ) {}

  findAll(onlyActive?: boolean) {
    const filter: any = {};
    if (onlyActive) filter.isActive = true;
    return this.ventilationModel.find(filter).sort({ sortOrder: 1 }).lean();
  }

  async findOne(id: string) {
    const item = await this.ventilationModel.findById(id).lean();
    if (!item) throw new NotFoundException('Вариант вентиляции не найден');
    return item;
  }

  create(dto: CreateVentilationVariantDto) {
    // @ts-ignore
    return this.ventilationModel.create(dto);
  }

  async update(id: string, dto: UpdateVentilationVariantDto) {
    const item = await this.ventilationModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Вариант вентиляции не найден');
    return item;
  }

  async remove(id: string) {
    const item = await this.ventilationModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Вариант вентиляции не найден');
    return { success: true };
  }
}