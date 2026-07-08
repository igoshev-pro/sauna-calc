import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkType, WorkTypeSchema } from './schemas/work-type.schema';
import { WorkTypeService } from './work-type.service';
import { WorkTypeController } from './work-type.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkType.name, schema: WorkTypeSchema },
    ]),
  ],
  providers: [WorkTypeService],
  controllers: [WorkTypeController],
  exports: [WorkTypeService],
})
export class WorkTypeModule {}