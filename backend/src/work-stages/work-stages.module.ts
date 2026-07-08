import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkStage, WorkStageSchema } from './schemas/work-stage.schema';
import { WorkStagesService } from './work-stages.service';
import { WorkStagesController } from './work-stages.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkStage.name, schema: WorkStageSchema },
    ]),
  ],
  providers: [WorkStagesService],
  controllers: [WorkStagesController],
  exports: [WorkStagesService],
})
export class WorkStagesModule {}