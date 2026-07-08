import {
  IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min
} from 'class-validator';
import { Type } from 'class-transformer';

class MaterialFormulaDto {
  @IsString()
  nomenclatureId: string;

  @IsString()
  formula: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWorkTypeDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  laborCostPerUnit: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialFormulaDto)
  materialFormulas?: MaterialFormulaDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableTo?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zoneTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  markupPercent?: number;
}