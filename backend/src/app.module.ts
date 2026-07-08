import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NomenclatureModule } from './nomenclature/nomenclature.module';
import { MarkupModule } from './markup/markup.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkTypeModule } from './work-type/work-type.module';
import { EstimateModule } from './estimate/estimate.module';
import { WorkStagesModule } from './work-stages/work-stages.module';
import { VentilationModule } from './ventilation/ventilation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    NomenclatureModule,
    MarkupModule,
    ClientsModule,
    ProjectsModule,
    WorkTypeModule,
    WorkStagesModule,
    VentilationModule,
    EstimateModule,
  ],
})
export class AppModule {}