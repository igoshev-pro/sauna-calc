import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Estimate, EstimateSchema } from './schemas/estimate.schema';
import { WorkType, WorkTypeSchema } from '../work-type/schemas/work-type.schema';
import { NomenclatureItem, NomenclatureSchema } from '../nomenclature/schemas/nomenclature.schema';
import { WorkStage, WorkStageSchema } from '../work-stages/schemas/work-stage.schema';
import { MarkupSettings, MarkupSettingsSchema } from '../markup/schemas/markup-settings.schema';
import { EstimateService } from './estimate.service';
import { EstimatePdfService } from './estimate-pdf.service';
import { EstimateController } from './estimate.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estimate.name, schema: EstimateSchema },
      { name: WorkType.name, schema: WorkTypeSchema },
      { name: NomenclatureItem.name, schema: NomenclatureSchema },
      { name: WorkStage.name, schema: WorkStageSchema },
      { name: MarkupSettings.name, schema: MarkupSettingsSchema },
    ]),
    ProjectsModule,
  ],
  providers: [EstimateService, EstimatePdfService],
  controllers: [EstimateController],
  exports: [EstimateService],
})
export class EstimateModule {}