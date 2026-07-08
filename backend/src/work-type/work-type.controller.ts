import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkTypeService } from './work-type.service';
import { UserRole } from 'src/users/schemas/user.schema';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';

@Controller('work-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkTypeController {
  constructor(private readonly service: WorkTypeService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(
    @Query('applicableTo') applicableTo?: string,
    @Query('zoneType') zoneType?: string,
  ) {
    return this.service.findAll(applicableTo, zoneType);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateWorkTypeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: CreateWorkTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}