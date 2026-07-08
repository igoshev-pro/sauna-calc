import { PartialType } from '@nestjs/mapped-types';
import { CreateNomenclatureDto } from './create-nomenclature.dto';

export class UpdateNomenclatureDto extends PartialType(CreateNomenclatureDto) {}