import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NomenclatureService } from './nomenclature.service';
import { UserRole } from 'src/users/schemas/user.schema';
import { QueryNomenclatureDto } from './dto/query-nomenclature.dto';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';

@Controller('nomenclature')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NomenclatureController {
  constructor(private readonly service: NomenclatureService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query() query: QueryNomenclatureDto) {
    return this.service.findAll(query);
  }

  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getCategories() {
    return this.service.getCategories();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateNomenclatureDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateNomenclatureDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('import/excel')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.service.importFromExcel(file.buffer);
  }
}