import {
  IsString, IsOptional, IsNumber, IsArray, IsBoolean,
  ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class VentilationItemDto {
  @IsOptional() @IsString()
  nomenclatureId?: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @IsOptional() @IsString()
  comment?: string;
}

export class CreateVentilationVariantDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  schemeType?: string;

  @IsOptional() @IsNumber()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentilationItemDto)
  items?: VentilationItemDto[];

  @IsOptional() @IsNumber() @Min(0)
  laborCost?: number;
}