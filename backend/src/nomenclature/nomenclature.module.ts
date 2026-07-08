import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { NomenclatureItem, NomenclatureSchema } from './schemas/nomenclature.schema';
import { NomenclatureService } from './nomenclature.service';
import { NomenclatureController } from './nomenclature.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NomenclatureItem.name, schema: NomenclatureSchema },
    ]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10MB
  ],
  providers: [NomenclatureService],
  controllers: [NomenclatureController],
  exports: [NomenclatureService],
})
export class NomenclatureModule {}