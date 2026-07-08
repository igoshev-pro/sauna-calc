import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
  ) {}

  async findAll(query: QueryClientDto) {
    const { search, status, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.clientModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.clientModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(id: string) {
    const item = await this.clientModel.findById(id).lean();
    if (!item) throw new NotFoundException('Клиент не найден');
    return item;
  }

  async create(dto: CreateClientDto) {
    return this.clientModel.create(dto);
  }

  async update(id: string, dto: UpdateClientDto) {
    const item = await this.clientModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Клиент не найден');
    return item;
  }

  async remove(id: string) {
    const item = await this.clientModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Клиент не найден');
    return { success: true };
  }

  // Вызывается из ProjectsService при создании/удалении проекта
  async incrementProjectsCount(clientId: string, delta: 1 | -1) {
    await this.clientModel.findByIdAndUpdate(clientId, {
      $inc: { projectsCount: delta },
    });
  }
}