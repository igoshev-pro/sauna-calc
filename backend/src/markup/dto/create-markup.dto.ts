import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min } from 'class-validator';
import { MarkupType } from '../schemas/markup-settings.schema';

export class CreateMarkupDto {
  @IsEnum(MarkupType)
  type: MarkupType;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsNumber()
  @Min(0)
  materialMarkup: number;

  @IsNumber()
  @Min(0)
  laborMarkup: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}