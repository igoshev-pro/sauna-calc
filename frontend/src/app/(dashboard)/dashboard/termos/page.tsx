'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Ruler, Layers, Wind, Paintbrush, Hammer, FileText,
  ChevronLeft, ChevronRight, Calculator, Lock, RotateCcw,
  ChevronDown, Package, Wrench, Info, Lightbulb, Save, Check, Printer,
} from 'lucide-react';
import { estimatesApi } from '@/lib/api';
import { Header } from '@/components/ui/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useTermosWizardStore,
  WallInput,
  PreviewMaterial,
  cleanStageName,
} from '@/store/termos-wizard.store';

const STEPS = [
  { id: 1, label: 'Замеры', icon: Ruler },
  { id: 2, label: 'Термос', icon: Layers },
  { id: 3, label: 'Инженерные сети', icon: Wind },
  { id: 4, label: 'Отделка', icon: Paintbrush, locked: true },
  { id: 5, label: 'Столярка', icon: Hammer, locked: true },
  { id: 6, label: 'Смета', icon: FileText },
];

const LAST_STEP = 6;

const fmt = (n: number) =>
  (n ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

export default function TermosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const estimateId = searchParams.get('estimateId');

  const {
    step, measurements, allStages, selectedStageIds,
    stagesLoading, calcLoading, result, error,
    estimateName, saveLoading, savedOk,
    setStep, setHeight, setWall, setCeiling, setShelf,
    toggleStage, selectVentilation, stagesByCategory,
    fetchStages, calculate, reset,
    setProjectId, loadEstimate, save, setEstimateName,
  } = useTermosWizardStore();

  // инициализация: сначала грузим этапы, потом (если есть) смету/проект
  useEffect(() => {
    const init = async () => {
      if (allStages.length === 0) await fetchStages();
      if (estimateId) {
        await loadEstimate(estimateId);
      } else if (projectId) {
        await setProjectId(projectId);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, estimateId]);

  const goStep = (id: number) => {
    const target = STEPS.find((s) => s.id === id);
    if (target?.locked) return;
    setStep(id);
  };

  const next = () => {
    let n = step + 1;
    while (STEPS.find((s) => s.id === n)?.locked) n++;
    if (n <= LAST_STEP) setStep(n);
  };
  const prev = () => {
    let p = step - 1;
    while (STEPS.find((s) => s.id === p)?.locked) p--;
    if (p >= 1) setStep(p);
  };

  const termosStages = stagesByCategory('termos');
  const ventStages = stagesByCategory('ventilation');
  const lightStages = stagesByCategory('lighting');

  return (
    <div className="flex flex-col h-full">
      <Header title="Расчёт парной" />

      <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
        {/* Степпер */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step && !s.locked;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => goStep(s.id)}
                  disabled={s.locked}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={[
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                      active ? 'bg-amber-600 text-white'
                        : done ? 'bg-amber-100 text-amber-700'
                          : s.locked ? 'bg-gray-50 text-gray-300'
                            : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {s.locked ? <Lock className="w-4 h-4" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={[
                      'text-xs font-medium text-center',
                      active ? 'text-amber-700'
                        : s.locked ? 'text-gray-300' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={[
                    'h-0.5 flex-1 mx-2',
                    s.id < step ? 'bg-amber-300' : 'bg-gray-100',
                  ].join(' ')} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Контент шага */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1">
          {/* ── ШАГ 1: ЗАМЕРЫ ── */}
          {step === 1 && (
            <div className="flex flex-col gap-6 max-w-lg">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Замеры парной</h3>
                <p className="text-sm text-gray-500">Вводятся один раз, используются во всех расчётах.</p>
              </div>

              <NumberInput
                label="Высота потолка, м"
                value={measurements.height}
                onChange={(v) => setHeight(v)}
              />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Длина стен, м</p>
                <div className="grid grid-cols-2 gap-3">
                  {measurements.walls.map((w: WallInput) => (
                    <NumberInput
                      key={w.name}
                      label={`Стена ${w.name}`}
                      value={w.length}
                      onChange={(v) => setWall(w.name, v)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Потолок, м</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Ширина"
                    value={measurements.ceiling.width}
                    onChange={(v) => setCeiling('width', v)}
                  />
                  <NumberInput
                    label="Длина"
                    value={measurements.ceiling.length}
                    onChange={(v) => setCeiling('length', v)}
                  />
                </div>
              </div>

              {/* Полки (для освещения полков) */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Полки, м</p>
                <p className="text-xs text-gray-400 mb-2">
                  Нужны для расчёта подсветки полков (шаг «Инженерные сети»). Можно оставить пустыми.
                </p>
                <div className="flex flex-col gap-3">
                  {measurements.shelves.map((sh, i) => (
                    <div key={i} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-end">
                      <span className="text-sm text-gray-600 pb-2.5">Полок {i + 1}</span>
                      <NumberInput
                        label="Ширина"
                        value={sh.width}
                        onChange={(v) => setShelf(i, 'width', v)}
                      />
                      <NumberInput
                        label="Длина"
                        value={sh.length}
                        onChange={(v) => setShelf(i, 'length', v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ШАГ 2: ТЕРМОС ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Конструктив «Термос»</h3>
                <p className="text-sm text-gray-500">Выберите этапы, которые входят в расчёт.</p>
              </div>

              {stagesLoading ? (
                <div className="text-sm text-gray-400 py-8">Загрузка этапов...</div>
              ) : termosStages.length === 0 ? (
                <div className="text-sm text-gray-400 py-8">Этапы Термоса не найдены.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {termosStages.map((st) => {
                    const checked = selectedStageIds.includes(st._id);
                    return (
                      <label
                        key={st._id}
                        className={[
                          'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                          checked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStage(st._id)}
                          className="w-4 h-4 accent-amber-600"
                        />
                        <span className="text-sm text-gray-800">{cleanStageName(st.name)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ШАГ 3: ИНЖЕНЕРНЫЕ СЕТИ ── */}
          {step === 3 && (
            <div className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Инженерные сети</h3>
                <p className="text-sm text-gray-500">Вентиляция и освещение парной.</p>
              </div>

              {stagesLoading ? (
                <div className="text-sm text-gray-400 py-8">Загрузка этапов...</div>
              ) : (
                <>
                  {/* Вентиляция — radio (один вариант) */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-gray-400" /> Вентиляция
                    </p>
                    {ventStages.length === 0 ? (
                      <p className="text-sm text-gray-400">Варианты вентиляции не найдены.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Нет вентиляции */}
                        <label
                          className={[
                            'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                            !ventStages.some((v) => selectedStageIds.includes(v._id))
                              ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <input
                            type="radio"
                            name="ventilation"
                            checked={!ventStages.some((v) => selectedStageIds.includes(v._id))}
                            onChange={() => selectVentilation(null)}
                            className="w-4 h-4 accent-amber-600"
                          />
                          <span className="text-sm text-gray-800">Без вентиляции</span>
                        </label>

                        {ventStages.map((st) => {
                          const checked = selectedStageIds.includes(st._id);
                          return (
                            <label
                              key={st._id}
                              className={[
                                'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                                checked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50',
                              ].join(' ')}
                            >
                              <input
                                type="radio"
                                name="ventilation"
                                checked={checked}
                                onChange={() => selectVentilation(st._id)}
                                className="w-4 h-4 accent-amber-600"
                              />
                              <span className="text-sm text-gray-800">{cleanStageName(st.name)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Освещение — тумблеры (несколько) */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-gray-400" /> Освещение
                    </p>
                    {lightStages.length === 0 ? (
                      <p className="text-sm text-gray-400">Варианты освещения не найдены.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {lightStages.map((st) => {
                          const checked = selectedStageIds.includes(st._id);
                          return (
                            <label
                              key={st._id}
                              className={[
                                'flex items-center justify-between gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                                checked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50',
                              ].join(' ')}
                            >
                              <span className="text-sm text-gray-800">{cleanStageName(st.name)}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStage(st._id)}
                                className="w-4 h-4 accent-amber-600"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ШАГИ 4-5: ЗАГЛУШКИ ── */}
          {(step === 4 || step === 5) && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Этот раздел в разработке</p>
            </div>
          )}

          {/* ── ШАГ 6: СМЕТА ── */}
          {step === LAST_STEP && (
            <ResultView
              result={result}
              loading={calcLoading}
              onCalc={calculate}
              estimateName={estimateName}
              onNameChange={setEstimateName}
              onSave={save}
              saveLoading={saveLoading}
              savedOk={savedOk}
              projectId={projectId}
              estimateId={estimateId}
              onBackToProject={() =>
                projectId && router.push(`/dashboard/projects/${projectId}`)
              }
            />
          )}
        </div>

        {/* Навигация */}
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4" /> Назад
          </Button>

          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" /> Сбросить
          </Button>

          {step < LAST_STEP ? (
            <Button onClick={next}>
              Далее <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={calculate} loading={calcLoading}>
              <Calculator className="w-4 h-4" /> Рассчитать
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Результат: клиент (проваливание) + закупка ─────────────

type ResultTab = 'client' | 'purchase';

function ResultView({
  result, loading, onCalc,
  estimateName, onNameChange, onSave, saveLoading, savedOk,
  projectId, estimateId, onBackToProject,
}: {
  result: ReturnType<typeof useTermosWizardStore.getState>['result'];
  loading: boolean;
  onCalc: () => void;
  estimateName: string;
  onNameChange: (v: string) => void;
  onSave: () => Promise<boolean>;
  saveLoading: boolean;
  savedOk: boolean;
  projectId: string | null;
  estimateId: string | null;
  onBackToProject: () => void;
}) {
  const [tab, setTab] = useState<ResultTab>('client');

  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    if (!estimateId) return;
    setPrinting(true);
    try {
      const { data } = await estimatesApi.downloadPdf(estimateId);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setPrinting(false);
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
          <Calculator className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm text-gray-500">Нажмите «Рассчитать», чтобы получить смету</p>
        <Button onClick={onCalc} loading={loading}>
          <Calculator className="w-4 h-4" /> Рассчитать
        </Button>
      </div>
    );
  }

  const zone = result.saunaZones[0];

  const purchaseMap = new Map<string, {
    key: string; name: string; unit: string;
    needed: number; toOrder: number; pricePerUnit: number; total: number;
  }>();

  zone?.stages.forEach((s) =>
    s.materials.forEach((m) => {
      const key = m.nomenclatureId || m.name;
      const ex = purchaseMap.get(key);
      if (ex) {
        ex.needed += m.needed ?? 0;
        ex.toOrder += m.toOrder ?? 0;
        ex.total += m.total ?? 0;
      } else {
        purchaseMap.set(key, {
          key,
          name: m.name,
          unit: m.unit,
          needed: m.needed ?? 0,
          toOrder: m.toOrder ?? 0,
          pricePerUnit: m.pricePerUnit ?? 0,
          total: m.total ?? 0,
        });
      }
    }),
  );
  const purchaseList = Array.from(purchaseMap.values());
  const purchaseSum = purchaseList.reduce((acc, m) => acc + m.total, 0);
  const mismatch = Math.abs(purchaseSum - result.materialsTotal) > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Панель сохранения ── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex-1">
          <Input
            label="Название сметы"
            value={estimateName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Расчёт парной"
          />
        </div>
        <Button onClick={onSave} loading={saveLoading}>
          {savedOk ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedOk ? 'Сохранено' : 'Сохранить смету'}
        </Button>
        {estimateId && (
          <Button variant="secondary" onClick={handlePrint} loading={printing}>
            <Printer className="w-4 h-4" /> Распечатать
          </Button>
        )}
        {projectId && savedOk && (
          <Button variant="secondary" onClick={onBackToProject}>
            К проекту
          </Button>
        )}
      </div>

      {/* Итоги */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Работы" value={result.laborTotal} icon={Wrench} />
        <SummaryCard label="Материалы" value={result.materialsTotal} icon={Package} />
        <SummaryCard label="Итого клиенту" value={result.grandTotal} accent icon={FileText} />
      </div>

      {/* Переключатель */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <TabBtn active={tab === 'client'} onClick={() => setTab('client')}>
          <FileText className="w-4 h-4" /> Для клиента
        </TabBtn>
        <TabBtn active={tab === 'purchase'} onClick={() => setTab('purchase')}>
          <Package className="w-4 h-4" /> Закупка материалов
        </TabBtn>
      </div>

      {/* ── КЛИЕНТ: аккордеон по этапам ── */}
      {tab === 'client' && (
        <div className="flex flex-col gap-2">
          {zone?.stages.map((s) => (
            <StageAccordion key={s.stageId} stage={s} />
          ))}
          <div className="flex justify-end mt-2 px-2 border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-500 mr-3 self-center">Итого по смете:</span>
            <span className="text-lg font-semibold text-amber-700">{fmt(result.grandTotal)} ₽</span>
          </div>
        </div>
      )}

      {/* ── ЗАКУПКА: свод ── */}
      {tab === 'purchase' && (
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Одинаковые материалы из разных этапов объединены. «К заказу» — то, что реально покупаем.
          </div>

          {mismatch && (
            <div className="mb-3 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-700">
              ⚠️ Сумма строк ({fmt(purchaseSum)} ₽) не совпадает с «Материалы» в итогах
              ({fmt(result.materialsTotal)} ₽). Проверьте данные расчёта (наценка / коэффициент).
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Материал</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">Нужно</th>
                  <th className="text-right px-3 py-2.5 font-medium text-amber-700">К заказу</th>
                  <th className="text-left px-2 py-2.5 font-medium text-gray-600">Ед.</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">Цена</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseList.map((m) => (
                  <tr key={m.key} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">{m.name}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmt(m.needed)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-700">{fmt(m.toOrder)}</td>
                    <td className="px-2 py-2.5 text-gray-500">{m.unit}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(m.pricePerUnit)} ₽</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{fmt(m.total)} ₽</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-2.5 text-right font-medium text-gray-700">
                    Итого на закупку:
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                    {fmt(purchaseSum)} ₽
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Аккордеон этапа: работы общей строкой, материалы детально ─

function StageAccordion({
  stage,
}: {
  stage: NonNullable<ReturnType<typeof useTermosWizardStore.getState>['result']>['saunaZones'][number]['stages'][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Шапка этапа */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <ChevronDown
          className={['w-4 h-4 text-gray-400 transition-transform', open ? 'rotate-180' : ''].join(' ')}
        />
        <span className="flex-1 text-left text-sm font-medium text-gray-800">
          {cleanStageName(stage.name)}
        </span>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" /> {fmt(stage.laborTotal)} ₽
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> {fmt(stage.materialsTotal)} ₽
          </span>
        </div>
        <span className="text-sm font-semibold text-amber-700 w-28 text-right">
          {fmt(stage.total)} ₽
        </span>
      </button>

      {/* Детализация */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 flex flex-col gap-4">
          {/* Работы — с расшифровкой объёма */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Работы
            </p>
            <div className="bg-white rounded border border-gray-200 px-4 py-2.5 flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="text-gray-700">
                  {cleanStageName(stage.name)}
                </span>
                {stage.laborQty ? (
                  <span className="text-xs text-gray-400 mt-0.5">
                    {fmt(stage.laborQty)} {stage.laborUnit} × {fmt(stage.laborPricePerUnit ?? 0)} ₽
                  </span>
                ) : null}
              </div>
              <span className="font-medium text-gray-900">{fmt(stage.laborTotal)} ₽</span>
            </div>
          </div>

          {/* Материалы — детально */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Материалы
            </p>
            {stage.materials.length === 0 ? (
              <p className="text-xs text-gray-400 px-1">Нет материалов</p>
            ) : (
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Наименование</th>
                      <th className="text-right px-3 py-2 font-medium">Нужно</th>
                      <th className="text-right px-3 py-2 font-medium">К заказу</th>
                      <th className="text-left px-2 py-2 font-medium">Ед.</th>
                      <th className="text-right px-3 py-2 font-medium">Цена</th>
                      <th className="text-right px-4 py-2 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stage.materials.map((m: PreviewMaterial, i: number) => (
                      <tr key={`${m.nomenclatureId}-${i}`}>
                        <td className="px-4 py-2 text-gray-700">
                          <div className="flex flex-col">
                            <span>{m.name}</span>
                            {m.comment ? (
                              <span className="text-xs text-gray-400 mt-0.5">{m.comment}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{fmt(m.needed)}</td>
                        <td className="px-3 py-2 text-right font-medium text-amber-700">{fmt(m.toOrder)}</td>
                        <td className="px-2 py-2 text-gray-400">{m.unit}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{fmt(m.pricePerUnit)} ₽</td>
                        <td className="px-4 py-2 text-right text-gray-700">{fmt(m.total)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Вспомогательные ─────────────────────────────────────────

// ─── Числовой инпут с поддержкой ввода 0 и десятичной запятой/точки ─

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  // локальное строковое состояние — чтобы можно было печатать "0", "0,", "0.8"
  const [text, setText] = useState<string>(
    value === 0 ? '' : String(value),
  );

  // синхронизация при внешнем изменении (загрузка сметы, reset и т.д.)
  useEffect(() => {
    const currentNum = text.replace(',', '.') === '' ? 0 : Number(text.replace(',', '.'));
    if (currentNum !== value) {
      setText(value === 0 ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (raw: string) => {
    // разрешаем только цифры, запятую и точку
    const cleaned = raw.replace(/[^0-9.,]/g, '');
    setText(cleaned);
    const normalized = cleaned.replace(',', '.');
    const num = normalized === '' || normalized === '.' ? 0 : Number(normalized);
    if (!Number.isNaN(num)) onChange(num);
  };

  return (
    <Input
      label={label}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}

function TabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
        active ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label, value, accent, icon: Icon,
}: {
  label: string;
  value: number;
  accent?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={[
      'rounded-xl border p-4',
      accent ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['w-3.5 h-3.5', accent ? 'text-amber-600' : 'text-gray-400'].join(' ')} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={['text-lg font-semibold', accent ? 'text-amber-700' : 'text-gray-900'].join(' ')}>
        {fmt(value)} ₽
      </p>
    </div>
  );
}
