import {
  IsString, IsOptional, IsNumber, IsArray, IsBoolean,
  ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/* ============ ОБЫЧНЫЕ ЗОНЫ (без изменений) ============ */

class ZoneWorkInputDto {
  @IsString()
  workTypeId: string;

  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;
}

class ZoneInputDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  zoneType?: string;

  @IsOptional() @IsNumber() @Min(0)
  length?: number;

  @IsOptional() @IsNumber() @Min(0)
  width?: number;

  @IsOptional() @IsNumber() @Min(0)
  height?: number;

  @IsOptional() @IsNumber() @Min(0)
  area?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneWorkInputDto)
  works?: ZoneWorkInputDto[];
}

/* ============ ПАРНАЯ (SAUNA) вход v2 ============ */

// БЛОК 0: Размеры — стены А/Б/В/Г + потолок
class WallDimInputDto {
  @IsOptional() @IsString()
  name?: string;   // 'А' | 'Б' | 'В' | 'Г'

  @IsOptional() @IsNumber() @Min(0)
  length?: number; // длина стены, м
}

class CeilingDimInputDto {
  @IsOptional() @IsNumber() @Min(0)
  width?: number;  // ширина потолка, м

  @IsOptional() @IsNumber() @Min(0)
  length?: number; // длина потолка, м
}

// БЛОК 2: Финиш (вагонка) — параметры одной поверхности
class FinishSurfaceInputDto {
  // 'wall' | 'ceiling'
  @IsOptional() @IsString()
  surface?: string;

  // необязательное имя ("Стена А", "Потолок")
  @IsOptional() @IsString()
  name?: string;

  // габариты поверхности (если не заданы — берутся из зоны)
  @IsOptional() @IsNumber() @Min(0)
  width?: number;   // ширина поверхности, м

  @IsOptional() @IsNumber() @Min(0)
  height?: number;  // высота поверхности, м (для потолка = длина)

  // номенклатура вагонки
  @IsOptional() @IsString()
  nomenclatureId?: string;

  // 'horizontal' | 'vertical'
  @IsOptional() @IsString()
  orientation?: string;

  // размеры доски (мм и м)
  @IsOptional() @IsNumber() @Min(0)
  boardWidth?: number;   // рабочая ширина доски, мм

  @IsOptional() @IsNumber() @Min(0)
  boardLength?: number;  // длина доски, м (напр. 3 или 6)

  // work type установки вагонки (опционально)
  @IsOptional() @IsString()
  workTypeId?: string;

  // площадь вычесть (проёмы) — опционально
  @IsOptional() @IsNumber() @Min(0)
  deductArea?: number;
}

class FinishInputDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinishSurfaceInputDto)
  walls?: FinishSurfaceInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FinishSurfaceInputDto)
  ceiling?: FinishSurfaceInputDto;
}

// БЛОК 3: Столярка (полки, спинки, панно, трап)
class WoodenItemInputDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nomenclatureId?: string;

  @IsOptional() @IsString()
  workTypeId?: string;

  // размеры (для расчёта площади/погонажа)
  @IsOptional() @IsNumber() @Min(0)
  length?: number;

  @IsOptional() @IsNumber() @Min(0)
  width?: number;

  // кол-во штук
  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  // формула кол-ва материала (опционально, иначе length*width*quantity)
  @IsOptional() @IsString()
  formula?: string;
}

// БЛОК 4: Проёмы (дверь/окно) + откосы
class OpeningInputDto {
  // 'door' | 'window'
  @IsOptional() @IsString()
  kind?: string;

  @IsOptional() @IsString()
  name?: string;

  // номенклатура изделия (сама дверь/окно)
  @IsOptional() @IsString()
  nomenclatureId?: string;

  // work type установки
  @IsOptional() @IsString()
  workTypeId?: string;

  @IsOptional() @IsNumber() @Min(0)
  width?: number;   // м

  @IsOptional() @IsNumber() @Min(0)
  height?: number;  // м

  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  // откосы
  @IsOptional() @IsBoolean()
  hasSlopes?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  slopeDepth?: number;   // глубина откоса, м

  @IsOptional() @IsString()
  slopeNomenclatureId?: string;

  // наличники (погонаж по периметру)
  @IsOptional() @IsBoolean()
  hasCasing?: boolean;

  @IsOptional() @IsString()
  casingNomenclatureId?: string;
}

// БЛОК 6: Освещение
class LightingSegmentInputDto {
  @IsOptional() @IsString()
  name?: string;

  // погонаж ленты, м
  @IsOptional() @IsNumber() @Min(0)
  length?: number;

  @IsOptional() @IsString()
  nomenclatureId?: string;   // лента

  @IsOptional() @IsString()
  cableNomenclatureId?: string; // кабель

  @IsOptional() @IsString()
  workTypeId?: string;
}

class LightingInputDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LightingSegmentInputDto)
  segments?: LightingSegmentInputDto[];
}

// БЛОК 7: Оборудование
class EquipmentInputDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nomenclatureId?: string;

  @IsOptional() @IsString()
  workTypeId?: string;   // монтаж

  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;
}

class SaunaZoneInputDto {
  @IsString()
  name: string;

  @IsOptional() @IsNumber() @Min(0)
  length?: number;

  @IsOptional() @IsNumber() @Min(0)
  width?: number;

  @IsOptional() @IsNumber() @Min(0)
  height?: number;

  @IsOptional() @IsNumber() @Min(0)
  area?: number;

  // БЛОК 0: Стены А/Б/В/Г (если заданы — периметр = сумма их длин)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WallDimInputDto)
  walls?: WallDimInputDto[];

  // Потолок (отдельные размеры; если не заданы — берётся площадь зоны)
  @IsOptional()
  @ValidateNested()
  @Type(() => CeilingDimInputDto)
  ceiling?: CeilingDimInputDto;

  // БЛОК 1: Термос — этапы (WorkStage), snapshot
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stageIds?: string[];

  // БЛОК 2: Финиш (вагонка)
  @IsOptional()
  @ValidateNested()
  @Type(() => FinishInputDto)
  finish?: FinishInputDto;

  // БЛОК 3: Столярка
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WoodenItemInputDto)
  woodenItems?: WoodenItemInputDto[];

  // БЛОК 4: Проёмы
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningInputDto)
  openings?: OpeningInputDto[];

  // БЛОК 5: Вентиляция (вариант)
  @IsOptional() @IsString()
  ventilationVariantId?: string;

  // БЛОК 6: Освещение
  @IsOptional()
  @ValidateNested()
  @Type(() => LightingInputDto)
  lighting?: LightingInputDto;

  // БЛОК 7: Оборудование
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentInputDto)
  equipment?: EquipmentInputDto[];
}

export class CreateEstimateDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  projectId?: string;

  @IsOptional() @IsString()
  clientId?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneInputDto)
  zones?: ZoneInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaunaZoneInputDto)
  saunaZones?: SaunaZoneInputDto[];
}