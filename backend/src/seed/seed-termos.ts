import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkStage } from '../work-stages/schemas/work-stage.schema';

/**
 * ВРЕМЕННЫЙ seed этапов "Термос".
 * Формулы проверены на эталоне (36.516 / 29.016 / 19.93 / 7.6075).
 * Цены НЕ хранятся тут — движок берёт их из номенклатуры по nomenclatureId.
 *
 * Запуск:  npx ts-node src/seed/seed-termos.ts
 */

// ✅ nomenclatureId из твоей БД (строки — как в DTO)
const NOM = {
  brus50x40:    '6a4d32a0a3aaa21138386a8f', // Брус 50х40х3000 (323₽)
  utepRockwool: '6a4d32a0a3aaa21138386a6e', // Роквул Сауна-Батс 4.8м2 (3100₽)
  foilIzospan:  '6a4d32a0a3aaa21138386a20', // Фольга Изоспан FB 35м2 (3266₽)
  reika20x90:   '6a4d32a0a3aaa21138386aa7', // Брус/рейка 20х90х3000 (340₽)
};

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const model = app.get<Model<any>>(getModelToken(WorkStage.name));

  // удаляем прошлые сид-этапы Термоса (идемпотентность)
  const del = await model.deleteMany({ name: /^\[Термос\]/ });
  console.log(`🗑  Удалено старых этапов [Термос]: ${del.deletedCount}`);

  const stages = [
    {
      name: '[Термос] 1. Силовой каркас стен и потолка',
      sortOrder: 1,
      isTemplate: true,
      laborFormula: 'wallArea + ceilingArea*2', // = 36.516 ✅
      laborPricePerUnit: 1000,
      laborUnit: 'м²',
      items: [
        {
          nomenclatureId: NOM.brus50x40,
          formula: 'wallsSum/0.45',   // = 19.93 (брус на стены) ✅
          isFixed: false,
          unit: 'шт',
          comment: 'Брус стены',
        },
        {
          nomenclatureId: NOM.brus50x40,
          formula: '',
          isFixed: true,
          fixedQty: 14,               // брус потолок в 2 слоя (фикс. как в Excel)
          unit: 'шт',
          comment: 'Брус потолок 2 слоя',
        },
        // ⛔ НЕТ в номенклатуре — завести и добавить:
        //   - NEOMID 450-1 огнебиозащита  → isFixed:true, fixedQty:1
        //   - Расходка каркас (комплект)  → formula:'wallArea + ceilingArea*2' (=36.516)
      ],
    },
    {
      name: '[Термос] 2. Монтаж утеплителя',
      sortOrder: 2,
      isTemplate: true,
      laborFormula: 'wallArea + ceilingArea*2', // = 36.516 ✅
      laborPricePerUnit: 1000,
      laborUnit: 'м²',
      items: [
        {
          nomenclatureId: NOM.utepRockwool,
          formula: '(wallArea + ceilingArea*2)/4.8', // = 7.6075 ✅
          isFixed: false,
          unit: 'шт',
          comment: 'Утеплитель Роквул (стены 1 слой + потолок 2 слоя)',
        },
        // ⛔ НЕТ: Расходка утеплитель → formula:'wallArea + ceilingArea*2' (=36.516)
      ],
    },
    {
      name: '[Термос] 3. Монтаж фольги с проклейкой швов',
      sortOrder: 3,
      isTemplate: true,
      laborFormula: 'wallArea + ceilingArea', // = 29.016 ✅
      laborPricePerUnit: 1000,
      laborUnit: 'м²',
      items: [
        {
          nomenclatureId: NOM.foilIzospan,
          formula: '(wallArea + ceilingArea)/35', // = 0.829 ✅ (рулон 35м²)
          isFixed: false,
          unit: 'шт',
          comment: 'Фольга Изоспан FB',
        },
        // ⛔ НЕТ: Скобы, Лезвия, Скотч алюминиевый
      ],
    },
    {
      name: '[Термос] 4. Контр-рейка с выравниванием геометрии',
      sortOrder: 4,
      isTemplate: true,
      laborFormula: 'wallArea + ceilingArea', // = 29.016 ✅
      laborPricePerUnit: 500,
      laborUnit: 'м²',
      items: [
        {
          nomenclatureId: NOM.reika20x90,
          formula: '',
          isFixed: true,
          fixedQty: 18.94166667,      // рейка стены (фикс. как в Excel)
          unit: 'шт',
          comment: 'Рейка стены',
        },
        {
          nomenclatureId: NOM.reika20x90,
          formula: '',
          isFixed: true,
          fixedQty: 8,                // рейка потолок
          unit: 'шт',
          comment: 'Рейка потолок',
        },
        // ⛔ НЕТ: Сверло 3.5мм, Саморез 3.5х45
      ],
    },
  ];

  const created = await model.insertMany(stages);
  console.log(`\n✅ Создано этапов: ${created.length}\n`);
  created.forEach((s: any) =>
    console.log(`  [${s.sortOrder}] ${s.name}\n      _id: ${s._id}`),
  );

  await app.close();
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Seed error:', e);
  process.exit(1);
});