import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VentilationVariant,
  VentilationVariantSchema,
} from './schemas/ventilation-variant.schema';
import { VentilationService } from './ventilation.service';
import { VentilationController } from './ventilation.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VentilationVariant.name, schema: VentilationVariantSchema },
    ]),
  ],
  providers: [VentilationService],
  controllers: [VentilationController],
  exports: [VentilationService],
})
export class VentilationModule {}