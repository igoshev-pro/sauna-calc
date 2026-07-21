import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private projectModel: Model<ProjectDocument>,
    private clientsService: ClientsService,
  ) {}

  async findAll(query: QueryProjectDto) {
    const { search, status, clientId, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (status) {
      filter.status = status;
    }
    if (clientId) {
      filter.clientId = clientId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('clientId', 'fullName phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.projectModel.countDocuments(filter),
    ]);

    // Переименовываем clientId → client для фронта
    const mapped = items.map((p: any) => ({
      ...p,
      client: p.clientId,
      clientId: p.clientId?._id ?? p.clientId,
    }));

    return {
      items: mapped,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(id: string) {
    const item = await this.projectModel
      .findById(id)
      .populate('clientId', 'fullName phone email')
      .lean();
    if (!item) throw new NotFoundException('Проект не найден');
    return item;
  }

  async create(dto: CreateProjectDto, managerId: string) {
    const project = await this.projectModel.create({
      ...dto,
      managerId,
    });
    // Увеличиваем счётчик проектов у клиента
    await this.clientsService.incrementProjectsCount(dto.clientId, 1);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const item = await this.projectModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Проект не найден');
    return item;
  }

  async remove(id: string) {
    const item = await this.projectModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Проект не найден');
    // Уменьшаем счётчик проектов у клиента
    await this.clientsService.incrementProjectsCount(
      item.clientId.toString(),
      -1,
    );
    return { success: true };
  }

  async incrementEstimatesCount(projectId: string, delta: number) {
    await this.projectModel.findByIdAndUpdate(projectId, {
      $inc: { estimatesCount: delta },
    });
  }
}