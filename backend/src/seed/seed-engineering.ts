import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkStage } from '../work-stages/schemas/work-stage.schema';

/**
 * Seed этапов "Инженерка": Вентиляция + Освещение.
 * Стиль полностью повторяет seed-termos.ts.
 * Все материалы — формулами (isFixed:false), без фиксов.
 *
 * Запуск:  npx ts-node src/seed/seed-engineering.ts
 */

// ✅ реальные nomenclatureId из БД
const NOM = {
  ventTisS:   '6a4d32a0a3aaa21138386f12', // ТиС Вент-С (через стену)
  ventTisP:   '6a4d32a0a3aaa21138386f0f', // ТиС Вент-П (через кровлю)
  klapanTis:  '6a4d32a0a3aaa21138386f15', // Клапан ТиС-Вент D115
  fanMmotors: '6a4d32a0a3aaa21138386fb7', // Вентилятор Mmotors ВOK 120/100
  ventVihod:  '6a4d32a0a3aaa21138386fbd', // Выход стенной с решёткой
  vozduhovod: '6a4d32a0a3aaa21138386f87', // Воздуховод гибкий Эра D125 3м
};

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const model = app.get<Model<any>>(getModelToken(WorkStage.name));

  // идемпотентность
  const del = await model.deleteMany({
    name: { $in: [/^\[Вентиляция\]/, /^\[Освещение\]/] },
  });
  console.log(`🗑  Удалено старых этапов [Вентиляция]/[Освещение]: ${del.deletedCount}`);

  const stages = [
    // ── ВЕНТИЛЯЦИЯ (radio — один вариант) ────────────────────────
    {
      name: '[Вентиляция] Приточно-вытяжная с вкл/выкл',
      sortOrder: 10,
      isTemplate: true,
      laborFormula: '1',
      laborPricePerUnit: 20000,
      laborUnit: 'компл',
      items: [
        { nomenclatureId: NOM.ventTisS,   formula: '1', isFixed: false, unit: 'шт', comment: 'Комплект вентиляции ТиС Вент-С (через стену)' },
        { nomenclatureId: NOM.klapanTis,  formula: '1', isFixed: false, unit: 'шт', comment: 'Клапан ТиС-Вент D115' },
        { nomenclatureId: NOM.fanMmotors, formula: '1', isFixed: false, unit: 'шт', comment: 'Вентилятор Mmotors ВOK 120/100 (вкл/выкл)' },
        { nomenclatureId: NOM.ventVihod,  formula: '1', isFixed: false, unit: 'шт', comment: 'Выход стенной с решёткой' },
        { nomenclatureId: NOM.vozduhovod, formula: '1', isFixed: false, unit: 'шт', comment: 'Воздуховод гибкий D125 3м' },
      ],
    },
    {
      name: '[Вентиляция] С подключением к системе заказчика',
      sortOrder: 11,
      isTemplate: true,
      laborFormula: '1',
      laborPricePerUnit: 20000,
      laborUnit: 'компл',
      items: [
        { nomenclatureId: NOM.ventTisP,   formula: '1', isFixed: false, unit: 'шт', comment: 'Комплект вентиляции ТиС Вент-П (через кровлю)' },
        { nomenclatureId: NOM.klapanTis,  formula: '1', isFixed: false, unit: 'шт', comment: 'Клапан ТиС-Вент D115' },
        { nomenclatureId: NOM.vozduhovod, formula: '1', isFixed: false, unit: 'шт', comment: 'Воздуховод гибкий D125 3м' },
      ],
    },

    // ── ОСВЕЩЕНИЕ (тумблеры) ─────────────────────────────────────
    // ⚠️ В номенклатуре НЕТ: LED-лента, диммер, кабель ПРКС, крепёж.
    //    Этапы созданы как каркас (только работа), материалы добавишь,
    //    когда заведёшь позиции в номенклатуру.
    {
      name: '[Освещение] Подсветка печного угла',
      sortOrder: 20,
      isTemplate: true,
      laborFormula: '1',
      laborPricePerUnit: 2000,
      laborUnit: 'компл',
      items: [
        // TODO: добавить LED-ленту, диммер, ПРКС, крепёж после заведения в номенклатуру
      ],
    },
    {
      name: '[Освещение] Подсветка полков',
      sortOrder: 21,
      isTemplate: true,
      laborFormula: '1',
      laborPricePerUnit: 2000,
      laborUnit: 'компл',
      items: [
        // TODO: добавить LED-ленту (верх/низ), диммер, ПРКС, крепёж после заведения в номенклатуру
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