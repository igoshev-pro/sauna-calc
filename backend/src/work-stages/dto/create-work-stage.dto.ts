import {
  IsString, IsOptional, IsNumber, IsArray, IsBoolean,
  ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class StageItemDto {
  @IsOptional() @IsString()
  nomenclatureId?: string;

  @IsOptional() @IsString()
  formula?: string;

  @IsOptional() @IsBoolean()
  isFixed?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  fixedQty?: number;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsString()
  comment?: string;
}

export class CreateWorkStageDto {
  @IsString()
  name: string;

  @IsOptional() @IsNumber()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageItemDto)
  items?: StageItemDto[];

  @IsOptional() @IsString()
  laborFormula?: string;

  @IsOptional() @IsNumber() @Min(0)
  laborPricePerUnit?: number;

  @IsOptional() @IsString()
  laborUnit?: string;
}