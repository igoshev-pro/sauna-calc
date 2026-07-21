import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Estimate, EstimateDocument } from './schemas/estimate.schema';
import { WorkType, WorkTypeDocument } from '../work-type/schemas/work-type.schema';
import { NomenclatureItem, NomenclatureDocument } from '../nomenclature/schemas/nomenclature.schema';
import { WorkStage, WorkStageDocument } from '../work-stages/schemas/work-stage.schema';
import { MarkupSettings, MarkupSettingsDocument } from '../markup/schemas/markup-settings.schema';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { evalFormula } from './formula-engine';
import { ProjectsService } from '../projects/projects.service';


@Injectable()
export class EstimateService {
    constructor(
        @InjectModel(Estimate.name) private estimateModel: Model<EstimateDocument>,
        @InjectModel(WorkType.name) private workTypeModel: Model<WorkTypeDocument>,
        @InjectModel(NomenclatureItem.name) private nomModel: Model<NomenclatureDocument>,
        @InjectModel(WorkStage.name) private workStageModel: Model<WorkStageDocument>,
        @InjectModel(MarkupSettings.name) private markupModel: Model<MarkupSettingsDocument>,
        private projectsService: ProjectsService,
    ) { }


    private round(n: number) {
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }


    // загрузка активных наценок → функции % для материала/работы
    private async loadMarkups() {
        const rows = await this.markupModel.find({ isActive: true }).lean();
        const global = rows.find(r => r.type === 'global');
        const byCategory = new Map<string, any>();
        rows.forEach(r => {
            if (r.type === 'category' && r.categoryName) {
                byCategory.set(r.categoryName, r);
            }
        });
        return {
            materialMarkup: (nom: any): number => {
                // 1) кастомная наценка позиции перекрывает всё
                if (nom?.markup && nom.markup.useGroupMarkup === false
                    && typeof nom.markup.customMarkup === 'number') {
                    return nom.markup.customMarkup;
                }
                // 2) по категории
                const cat = byCategory.get(nom?.category);
                if (cat) return cat.materialMarkup ?? 0;
                // 3) глобальная
                return global?.materialMarkup ?? 0;
            },
            laborMarkup: (): number => global?.laborMarkup ?? 0,
        };
    }


    // единицы, которые продаются штучно (округляем вверх до целого)
    private isDiscreteUnit(unit?: string): boolean {
        if (!unit) return false;
        const u = unit.trim().toLowerCase();
        const discrete = ['шт', 'шт.', 'штука', 'уп', 'уп.', 'упак', 'упаковка', 'рулон', 'лист', 'мешок'];
        return discrete.includes(u);
    }


    // расчёт кол-ва материала с учётом запаса (wasteFactor %) и упаковки
    private computeMaterialQty(nom: any, needed: number, unit?: string) {
        const waste = nom?.wasteFactor ?? 0;
        const withWaste = needed * (1 + waste / 100);


        let toOrder = withWaste;
        const pkg = nom?.packageLogic;


        if (pkg?.enabled && pkg.packageSize > 0) {
            // 1) приоритет — логика упаковки
            toOrder = Math.ceil(withWaste / pkg.packageSize) * pkg.packageSize;
        } else if (this.isDiscreteUnit(unit ?? nom?.unit)) {
            // 2) штучный материал без упаковки — округляем вверх до целого
            toOrder = Math.ceil(withWaste);
        }
        // 3) непрерывные единицы (м², м.п., кг, л) — оставляем дробное


        return {
            needed: this.round(needed),
            withWaste: this.round(withWaste),
            toOrder: this.round(toOrder),
        };
    }


    // Пересчёт всей сметы на основе входных данных
    private async compute(dto: CreateEstimateDto) {
        const zonesInput = dto.zones ?? [];


        // соберём все workTypeId и nomenclatureId
        const workTypeIds = new Set<string>();
        zonesInput.forEach(z => z.works?.forEach(w => workTypeIds.add(w.workTypeId)));


        const workTypes = await this.workTypeModel
            .find({ _id: { $in: [...workTypeIds].map(id => new Types.ObjectId(id)) } })
            .lean();
        const wtMap = new Map(workTypes.map(w => [String(w._id), w]));


        const nomIds = new Set<string>();
        workTypes.forEach(w =>
            (w.materialFormulas ?? []).forEach(mf => {
                if (mf.nomenclatureId) nomIds.add(String(mf.nomenclatureId));
            }),
        );
        const noms = await this.nomModel
            .find({ _id: { $in: [...nomIds].map(id => new Types.ObjectId(id)) } })
            .lean();
        const nomMap = new Map(noms.map(n => [String(n._id), n]));


        let laborTotal = 0;
        let materialsTotal = 0;


        const zones = zonesInput.map(z => {
            const area = z.area && z.area > 0 ? z.area : (z.length ?? 0) * (z.width ?? 0);
            const perimeter = 2 * ((z.length ?? 0) + (z.width ?? 0));
            const vars = {
                area,
                length: z.length ?? 0,
                width: z.width ?? 0,
                height: z.height ?? 0,
                perimeter,
                quantity: 0,
            };


            let zoneTotal = 0;


            const works = (z.works ?? []).map(wIn => {
                const wt = wtMap.get(wIn.workTypeId);
                const quantity = wIn.quantity && wIn.quantity > 0 ? wIn.quantity : area;
                const vv = { ...vars, quantity };


                if (!wt) {
                    return {
                        workTypeId: new Types.ObjectId(wIn.workTypeId),
                        name: 'Неизвестная работа',
                        unit: '',
                        quantity,
                        laborCostPerUnit: 0,
                        laborTotal: 0,
                        markupPercent: 0,
                        materials: [],
                        materialsTotal: 0,
                        total: 0,
                    };
                }


                const laborTotalWork = this.round((wt.laborCostPerUnit ?? 0) * quantity);


                const materials = (wt.materialFormulas ?? []).map(mf => {
                    const nom = nomMap.get(String(mf.nomenclatureId));
                    const qty = this.round(evalFormula(mf.formula, vv));
                    const price = nom?.pricePerUnit ?? 0;
                    const total = this.round(qty * price);
                    return {
                        nomenclatureId: mf.nomenclatureId,
                        name: nom?.name ?? '',
                        unit: nom?.unit ?? '',
                        quantity: qty,
                        pricePerUnit: price,
                        total,
                    };
                });


                const matTotal = this.round(
                    materials.reduce((s, m) => s + m.total, 0),
                );


                const markup = wt.markupPercent ?? 0;
                const base = laborTotalWork + matTotal;
                const workTotal = this.round(base * (1 + markup / 100));


                laborTotal += laborTotalWork;
                materialsTotal += matTotal;
                zoneTotal += workTotal;


                return {
                    workTypeId: wt._id,
                    name: wt.name,
                    unit: wt.unit,
                    quantity,
                    laborCostPerUnit: wt.laborCostPerUnit ?? 0,
                    laborTotal: laborTotalWork,
                    markupPercent: markup,
                    materials,
                    materialsTotal: matTotal,
                    total: workTotal,
                };
            });


            return {
                name: z.name,
                zoneType: z.zoneType ?? '',
                length: z.length ?? 0,
                width: z.width ?? 0,
                height: z.height ?? 0,
                area,
                works,
                total: this.round(zoneTotal),
            };
        });


        const zonesMarkup = zones.reduce((s, z) => s + z.works.reduce((ws, w) => {
            return ws + (w.total - (w.laborTotal + w.materialsTotal));
        }, 0), 0);


        // ============ ПАРНАЯ (SAUNA) ============
        const sauna = await this.computeSauna(dto);
        laborTotal += sauna.laborTotal;
        materialsTotal += sauna.materialsTotal;


        return {
            zones,
            saunaZones: sauna.saunaZones,
            laborTotal: this.round(laborTotal),
            materialsTotal: this.round(materialsTotal),
            grandTotal: this.round(laborTotal + materialsTotal + zonesMarkup),
        };
    }


    // Расчёт зон парной (snapshot из WorkStage)
    private async computeSauna(dto: CreateEstimateDto) {
        const saunaInput = dto.saunaZones ?? [];
        if (!saunaInput.length) {
            return { saunaZones: [] as any[], laborTotal: 0, materialsTotal: 0 };
        }

        const markups = await this.loadMarkups();

        const stageIds = new Set<string>();
        saunaInput.forEach(z => (z.stageIds ?? []).forEach(id => stageIds.add(id)));

        const stages = await this.workStageModel
            .find({ _id: { $in: [...stageIds].map(id => new Types.ObjectId(id)) } })
            .lean();
        const stageMap = new Map(stages.map(s => [String(s._id), s]));

        const nomIds = new Set<string>();
        stages.forEach(s =>
            (s.items ?? []).forEach(it => {
                if (it.nomenclatureId) nomIds.add(String(it.nomenclatureId));
            }),
        );
        const noms = await this.nomModel
            .find({ _id: { $in: [...nomIds].map(id => new Types.ObjectId(id)) } })
            .lean();
        const nomMap = new Map(noms.map(n => [String(n._id), n]));

        let laborTotalAll = 0;
        let materialsTotalAll = 0;

        const saunaZones = saunaInput.map(z => {
            const length = z.length ?? 0;
            const width = z.width ?? 0;
            const height = z.height ?? 0;

            const walls = (z.walls ?? []).filter(w => (w.length ?? 0) > 0);
            const perimeter = walls.length
                ? walls.reduce((s, w) => s + (w.length ?? 0), 0)
                : 2 * (length + width);

            const ceilW = z.ceiling?.width ?? width;
            const ceilL = z.ceiling?.length ?? length;
            const ceilArea = (z.ceiling && ceilW > 0 && ceilL > 0)
                ? ceilW * ceilL
                : (z.area && z.area > 0 ? z.area : length * width);

            const area = z.area && z.area > 0 ? z.area : length * width;
            const wallArea = perimeter * height;
            const floorArea = area;
            const S = wallArea + ceilArea;

            // отдельные стены А/Б/В/Г для формул Термоса
            const wallA = z.walls?.[0]?.length ?? 0;
            const wallB = z.walls?.[1]?.length ?? 0;
            const wallC = z.walls?.[2]?.length ?? 0;
            const wallD = z.walls?.[3]?.length ?? 0;
            const wallsSum = wallA + wallB + wallC + wallD; // A+B+C+D
            const ceilingArea = ceilW * ceilL;              // H*I

            // 🆕 полки для освещения (Вариант 1)
            // @ts-ignore
            const shArr = z.shelves ?? [];
            const shVal = (idx: number, f: 'width' | 'length') =>
                shArr[idx]?.[f] ?? 0;

            const shelf1Wid = shVal(0, 'width');
            const shelf1Len = shVal(0, 'length');
            const shelf2Len = shVal(1, 'length');
            const shelf3Wid = shVal(2, 'width');
            const shelf3Len = shVal(2, 'length');
            const shelf4Len = shVal(3, 'length');

            // периметры ленты (расшифровка Excel, проверено: 3.66 / 2.86)
            const shelfPerimTop = shelf2Len + (shelf1Len - shelf1Wid);
            const shelfPerimBottom =
                shelf4Len + (shelf3Len - shelf3Wid - shelf1Wid);

            const vars = {
                length,
                width,
                height,
                area,
                perimeter,
                wallArea,
                ceilArea,
                ceilingLen: ceilL,
                ceilingWidth: ceilW,
                floorArea,
                surfaceArea: S,
                S,
                volume: area * height,

                // переменные Термоса (соответствуют Excel A..I)
                wallA, wallB, wallC, wallD,
                wallsSum,        // A+B+C+D
                ceilingArea,     // H*I
                G: height,       // высота
                H: ceilW,        // ширина потолка
                I: ceilL,        // длина потолка
                A: wallA, B: wallB, C: wallC, D: wallD,

                // 🆕 полки (Вариант 1 — освещение)
                shelf1Wid, shelf1Len, shelf2Len,
                shelf3Wid, shelf3Len, shelf4Len,
                shelfPerimTop,      // верх полки (лента = /5)
                shelfPerimBottom,   // низ полки (лента = /5)
            };

            let zoneLabor = 0;
            let zoneMaterials = 0;

            const stagesOut = (z.stageIds ?? []).map(sid => {
                const st = stageMap.get(sid);

                if (!st) {
                    return {
                        stageId: new Types.ObjectId(sid),
                        name: 'Неизвестный этап',
                        sortOrder: 9999,
                        laborTotal: 0,
                        materials: [],
                        materialsTotal: 0,
                        total: 0,
                    };
                }

                const laborQty = this.round(evalFormula(st.laborFormula || '0', vars));
                const laborPct = markups.laborMarkup();
                const stageLabor = this.round(
                    laborQty * (st.laborPricePerUnit ?? 0) * (1 + laborPct / 100),
                );

                const materials = (st.items ?? []).map(it => {
                    const nom = nomMap.get(String(it.nomenclatureId));

                    const needed = it.isFixed
                        ? (it.fixedQty ?? 0)
                        : evalFormula(it.formula || '0', vars);

                    const q = this.computeMaterialQty(nom, needed, it.unit || nom?.unit);
                    const basePrice = nom?.pricePerUnit ?? 0;
                    const mPct = markups.materialMarkup(nom);
                    const price = this.round(basePrice * (1 + mPct / 100));
                    const total = this.round(q.toOrder * price);

                    return {
                        nomenclatureId: it.nomenclatureId,
                        name: nom?.name ?? '',
                        unit: it.unit || nom?.unit || '',
                        needed: q.needed,
                        withWaste: q.withWaste,
                        toOrder: q.toOrder,
                        pricePerUnit: price,
                        total,
                        comment: it.comment ?? '',   // 🆕
                    };
                });

                const stageMatTotal = this.round(
                    materials.reduce((s, m) => s + m.total, 0),
                );
                const stageTotal = this.round(stageLabor + stageMatTotal);

                zoneLabor += stageLabor;
                zoneMaterials += stageMatTotal;

                return {
                    stageId: st._id,
                    name: st.name,
                    sortOrder: st.sortOrder ?? 0,
                    laborTotal: stageLabor,
                    laborUnit: st.laborUnit ?? '',                 // 🆕
                    laborQty,                                       // 🆕
                    laborPricePerUnit: st.laborPricePerUnit ?? 0,   // 🆕
                    materials,
                    materialsTotal: stageMatTotal,
                    total: stageTotal,
                };
            })
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

            laborTotalAll += zoneLabor;
            materialsTotalAll += zoneMaterials;

            return {
                name: z.name,
                length,
                width,
                height,
                area,
                walls: walls.map(w => ({ name: w.name ?? '', length: w.length ?? 0 })),
                ceiling: (z.ceiling && ceilW > 0 && ceilL > 0)
                    ? { width: ceilW, length: ceilL }
                    : null,
                stages: stagesOut,
                laborTotal: this.round(zoneLabor),
                materialsTotal: this.round(zoneMaterials),
                total: this.round(zoneLabor + zoneMaterials),
            };
        });

        return {
            saunaZones,
            laborTotal: this.round(laborTotalAll),
            materialsTotal: this.round(materialsTotalAll),
        };
    }

    async create(dto: CreateEstimateDto, userId?: string) {
        const computed = await this.compute(dto);
        const doc = new this.estimateModel({
            name: dto.name,
            projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : undefined,
            clientId: dto.clientId ? new Types.ObjectId(dto.clientId) : undefined,
            status: dto.status ?? 'draft',
            createdBy: userId ? new Types.ObjectId(userId) : undefined,
            ...computed,
        });
        const saved = await doc.save();
        if (dto.projectId) {
            await this.projectsService.incrementEstimatesCount(dto.projectId, 1);
        }
        return saved;
    }


    async update(id: string, dto: CreateEstimateDto) {
        const computed = await this.compute(dto);
        const doc = await this.estimateModel.findByIdAndUpdate(
            id,
            {
                name: dto.name,
                projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : undefined,
                clientId: dto.clientId ? new Types.ObjectId(dto.clientId) : undefined,
                status: dto.status ?? 'draft',
                ...computed,
            },
            { new: true },
        );
        if (!doc) throw new NotFoundException('Смета не найдена');
        return doc;
    }


    async preview(dto: CreateEstimateDto) {
        return this.compute(dto);
    }


    async findAll(projectId?: string) {
        const filter: any = {};
        if (projectId) filter.projectId = new Types.ObjectId(projectId);
        return this.estimateModel.find(filter).sort({ createdAt: -1 }).lean();
    }


    async findOne(id: string) {
        const doc = await this.estimateModel.findById(id).lean();
        if (!doc) throw new NotFoundException('Смета не найдена');
        return doc;
    }


    async remove(id: string) {
        const doc = await this.estimateModel.findByIdAndDelete(id);
        if (!doc) throw new NotFoundException('Смета не найдена');
        if (doc.projectId) {
            await this.projectsService.incrementEstimatesCount(
                doc.projectId.toString(),
                -1,
            );
        }
        return { deleted: true };
    }
}