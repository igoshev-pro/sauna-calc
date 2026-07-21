import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Req, Res,
} from '@nestjs/common';
import express from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';
import { EstimateService } from './estimate.service';
import { EstimatePdfService } from './estimate-pdf.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';

@Controller('estimates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstimateController {
  constructor(
    private readonly service: EstimateService,
    private readonly pdfService: EstimatePdfService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId);
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async pdf(@Param('id') id: string, @Res() res: express.Response) {
    const buffer = await this.pdfService.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="estimate-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('preview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  preview(@Body() dto: CreateEstimateDto) {
    return this.service.preview(dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateEstimateDto, @Req() req: any) {
    return this.service.create(dto, req.user?._id ?? req.user?.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: CreateEstimateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}