import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkStagesService } from './work-stages.service';
import { UserRole } from 'src/users/schemas/user.schema';
import { CreateWorkStageDto } from './dto/create-work-stage.dto';

@Controller('work-stages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkStagesController {
  constructor(private readonly service: WorkStagesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.service.findAll();
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findTemplates() {
    return this.service.findTemplates();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateWorkStageDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: CreateWorkStageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}