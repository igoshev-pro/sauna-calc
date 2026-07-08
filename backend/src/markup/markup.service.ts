import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMarkupDto } from './dto/create-markup.dto';
import { MarkupSettings, MarkupSettingsDocument, MarkupType } from './schemas/markup-settings.schema';

@Injectable()
export class MarkupService {
  constructor(
    @InjectModel(MarkupSettings.name)
    private markupModel: Model<MarkupSettingsDocument>,
  ) {}

  findAll() {
    return this.markupModel.find({ isActive: true }).lean();
  }

  async findOne(id: string) {
    const item = await this.markupModel.findById(id).lean();
    if (!item) throw new NotFoundException('Настройка не найдена');
    return item;
  }

  create(dto: CreateMarkupDto) {
    return this.markupModel.create(dto);
  }

  async update(id: string, dto: Partial<CreateMarkupDto>) {
    const item = await this.markupModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Настройка не найдена');
    return item;
  }

  async remove(id: string) {
    const item = await this.markupModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Настройка не найдена');
    return { success: true };
  }

  // Получить наценку для конкретной категории
  async getMarkupForCategory(category: string) {
    // Сначала ищем точную настройку по категории
    const categoryMarkup = await this.markupModel.findOne({
      type: MarkupType.CATEGORY,
      categoryName: category,
      isActive: true,
    }).lean();

    if (categoryMarkup) return categoryMarkup;

    // Иначе — глобальная
    return this.markupModel.findOne({ type: MarkupType.GLOBAL, isActive: true }).lean();
  }
}