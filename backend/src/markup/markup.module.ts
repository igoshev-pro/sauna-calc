import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarkupService } from './markup.service';
import { MarkupController } from './markup.controller';
import { MarkupSettings, MarkupSettingsSchema } from './schemas/markup-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarkupSettings.name, schema: MarkupSettingsSchema },
    ]),
  ],
  providers: [MarkupService],
  controllers: [MarkupController],
  exports: [MarkupService],
})
export class MarkupModule {}