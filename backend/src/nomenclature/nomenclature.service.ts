import {
  Injectable, NotFoundException, BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  NomenclatureItem, NomenclatureDocument
} from './schemas/nomenclature.schema';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';
import { QueryNomenclatureDto } from './dto/query-nomenclature.dto';

@Injectable()
export class NomenclatureService {
  constructor(
    @InjectModel(NomenclatureItem.name)
    private nomenclatureModel: Model<NomenclatureDocument>,
  ) {}

  async findAll(query: QueryNomenclatureDto) {
    const { search, category, inStock, page = 1, limit = 50 } = query;
    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (category) {
      filter.category = category;
    }
    if (inStock !== undefined) {
      filter.inStock = inStock === 'true';
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.nomenclatureModel.find(filter).skip(skip).limit(limit).lean(),
      this.nomenclatureModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const item = await this.nomenclatureModel.findById(id).lean();
    if (!item) throw new NotFoundException('Позиция не найдена');
    return item;
  }

  async create(dto: CreateNomenclatureDto) {
    return this.nomenclatureModel.create(dto);
  }

  async update(id: string, dto: UpdateNomenclatureDto) {
    const item = await this.nomenclatureModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!item) throw new NotFoundException('Позиция не найдена');
    return item;
  }

  async remove(id: string) {
    const item = await this.nomenclatureModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Позиция не найдена');
    return { success: true };
  }

  // Получить все категории для фильтра
  async getCategories() {
    return this.nomenclatureModel.distinct('category');
  }

    // Excel импорт из МойСклад (полная замена номенклатуры)
  async importFromExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      throw new BadRequestException('Файл пустой или неверный формат');
    }

    // "440,00" | "1 234,50" | 440 → 440
    const parseNum = (v: any): number => {
      if (typeof v === 'number') return v;
      const s = String(v ?? '')
        .replace(/\s/g, '')      // убрать пробелы-разделители тысяч
        .replace(',', '.');      // запятая → точка
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const isYes = (v: any) =>
      String(v ?? '').trim().toLowerCase() === 'да';

    const noPrice: string[] = [];   // товары без цены продажи (взяли закупку или 0)
    const skipped: string[] = [];   // архивные / без имени
    const docs: any[] = [];
    const seenUuid = new Set<string>();

    for (const row of rows) {
      const name = String(row['Наименование'] ?? '').trim();

      // пропускаем архивные и пустые
      if (!name) { continue; }
      if (isYes(row['Архивный'])) { skipped.push(name); continue; }

      const salePrice = parseNum(row['Цена: Цена продажи']);
      const purchasePrice = parseNum(row['Закупочная цена']);

      // (Б) если цены продажи нет — берём закупочную
      let pricePerUnit = salePrice;
      if (pricePerUnit <= 0) {
        pricePerUnit = purchasePrice;
        noPrice.push(name);          // (А) пометим для менеджера
      }

      // категории: "3. Чистовая отделка/Вагонка/Абаш" → дерево
      const categoryPath = String(row['Группы'] ?? '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);

      const msUuid = String(row['UUID'] ?? '').trim() || null;
      if (msUuid) {
        // защита от дублей UUID внутри самого файла
        if (seenUuid.has(msUuid)) { continue; }
        seenUuid.add(msUuid);
      }

      // артикул: колонка "Артикул", если пусто — штрихкод EAN13
      const article =
        String(row['Артикул'] ?? '').trim() ||
        String(row['Штрихкод EAN13'] ?? '').trim();

      docs.push({
        name,
        msUuid,
        article,
        itemType: String(row['Тип'] ?? 'Товар').trim() || 'Товар',
        category: categoryPath[0] ?? '',
        subCategory: categoryPath.slice(1).join(' / '),
        categoryPath,
        unit: String(row['Единица измерения'] ?? 'шт').trim() || 'шт',
        pricePerUnit,
        purchasePrice,
        supplier: String(row['Поставщик'] ?? '').trim(),
        inStock: true,
      });
    }

    if (!docs.length) {
      throw new BadRequestException('Не найдено позиций для импорта');
    }

    // ПОЛНАЯ ЗАМЕНА: чистим коллекцию и заливаем заново (без дублей)
    await this.nomenclatureModel.deleteMany({});
    await this.nomenclatureModel.insertMany(docs, { ordered: false });

    return {
      imported: docs.length,
      skipped: skipped.length,          // сколько архивных/пустых пропущено
      noPriceCount: noPrice.length,     // сколько без цены продажи
      noPrice,                          // список имён для менеджера
    };
  }
}