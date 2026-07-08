import {
  IsString, IsNumber, IsBoolean, IsOptional,
  IsArray, ValidateNested, Min
} from 'class-validator';
import { Type } from 'class-transformer';

class PackageLogicDto {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  @Min(0)
  packageSize: number;

  @IsString()
  packageUnit: string;
}

class NomenclatureMarkupDto {
  @IsBoolean()
  useGroupMarkup: boolean;

  @IsOptional()
  @IsNumber()
  customMarkup?: number;
}

export class CreateNomenclatureDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  article?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PackageLogicDto)
  packageLogic?: PackageLogicDto;

  @IsOptional()
  @IsNumber()
  wasteFactor?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NomenclatureMarkupDto)
  markup?: NomenclatureMarkupDto;
}