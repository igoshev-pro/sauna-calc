import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MarkupService } from './markup.service';
import { CreateMarkupDto } from './dto/create-markup.dto';
import { UserRole } from 'src/users/schemas/user.schema';

@Controller('markup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarkupController {
  constructor(private readonly service: MarkupService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMarkupDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: CreateMarkupDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}