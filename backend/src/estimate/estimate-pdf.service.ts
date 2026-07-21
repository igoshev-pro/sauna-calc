import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Estimate, EstimateDocument } from './schemas/estimate.schema';
import { ProjectsService } from '../projects/projects.service';
import * as path from 'path';
import * as fs from 'fs';

const CONTRACTOR = {
  name: 'Горбунов Александр Иванович',
  address:
    '143581, Россия, Московская обл., г. Истра, село Павловская Слобода, ул. Ленина, 83а',
  phone: '+7 927 844-07-47',
};

const fmt = (n: number) =>
  (n ?? 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function cleanName(name: string): string {
  return (name || '').replace(/^\[[^\]]+\]\s*/, '').trim();
}

// Шрифты Roboto из локальной папки assets/fonts.
// В dev пути от dist/estimate, в prod — тоже от dist. Ищем в нескольких местах.
function fontFile(name: string): Buffer {
  const candidates = [
    path.join(process.cwd(), 'assets', 'fonts', name),
    path.join(__dirname, '..', '..', 'assets', 'fonts', name),
    path.join(__dirname, '..', '..', '..', 'assets', 'fonts', name),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  throw new Error(`Шрифт не найден: ${name}. Проверьте assets/fonts. Искали: ${candidates.join(' | ')}`);
}

const fonts = {
  Roboto: {
    normal: fontFile('Roboto-Regular.ttf'),
    bold: fontFile('Roboto-Medium.ttf'),
    italics: fontFile('Roboto-Italic.ttf'),
    bolditalics: fontFile('Roboto-MediumItalic.ttf'),
  },
};

@Injectable()
export class EstimatePdfService {
  private printer = new (PdfPrinter as any)(fonts);

  constructor(
    @InjectModel(Estimate.name)
    private estimateModel: Model<EstimateDocument>,
    private projectsService: ProjectsService,
  ) {}

  async generate(id: string): Promise<Buffer> {
    const est: any = await this.estimateModel.findById(id).lean();
    if (!est) throw new NotFoundException('Смета не найдена');

    let clientName = '—';
    let objectAddress = '—';
    if (est.projectId) {
      try {
        const project: any = await this.projectsService.findOne(
          String(est.projectId),
        );
        objectAddress = project?.address || '—';
        clientName = project?.clientId?.fullName || '—';
      } catch {
        /* проект мог быть удалён — не критично */
      }
    }

    const def = this.buildDoc(est, clientName, objectAddress);
    return this.render(def);
  }

  private render(def: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(def);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (c: Buffer) => chunks.push(c));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  private buildDoc(
    est: any,
    clientName: string,
    objectAddress: string,
  ): TDocumentDefinitions {
    const created = est.createdAt
      ? new Date(est.createdAt).toLocaleDateString('ru-RU')
      : new Date().toLocaleDateString('ru-RU');

    const stages: any[] = est.saunaZones?.[0]?.stages ?? [];

    const content: Content[] = [
      {
        text: 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      {
        text: est.name || 'Смета',
        alignment: 'center',
        color: '#666',
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'ПОДРЯДЧИК', style: 'lbl' },
              { text: CONTRACTOR.name, bold: true },
              { text: CONTRACTOR.address, fontSize: 8, color: '#555' },
              { text: 'тел. ' + CONTRACTOR.phone, fontSize: 8, color: '#555' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'ЗАКАЗЧИК', style: 'lbl' },
              { text: clientName, bold: true },
              { text: 'Объект: ' + objectAddress, fontSize: 8, color: '#555' },
              { text: 'Дата: ' + created, fontSize: 8, color: '#555' },
            ],
          },
        ],
        margin: [0, 0, 0, 14],
      },
    ];

    stages.forEach((s, idx) => {
      content.push({
        text: `${idx + 1}. ${cleanName(s.name)}`,
        style: 'stageHead',
        margin: [0, 10, 0, 4],
      });

      const body: any[] = [
        [
          { text: '№', style: 'th' },
          { text: 'Наименование', style: 'th' },
          { text: 'Кол-во', style: 'th', alignment: 'right' },
          { text: 'Ед.', style: 'th' },
          { text: 'Цена, ₽', style: 'th', alignment: 'right' },
          { text: 'Сумма, ₽', style: 'th', alignment: 'right' },
        ],
      ];

      body.push([
        { text: `${idx + 1}`, style: 'td' },
        { text: `Работы: ${cleanName(s.name)}`, style: 'td', bold: true },
        {
          text: s.laborQty ? fmt(s.laborQty) : '—',
          style: 'td',
          alignment: 'right',
        },
        { text: s.laborUnit || '', style: 'td' },
        {
          text: s.laborPricePerUnit ? fmt(s.laborPricePerUnit) : '—',
          style: 'td',
          alignment: 'right',
        },
        {
          text: fmt(s.laborTotal),
          style: 'td',
          alignment: 'right',
          bold: true,
        },
      ]);

      (s.materials ?? []).forEach((m: any, mi: number) => {
        body.push([
          { text: `${idx + 1}.${mi + 1}`, style: 'tdSub' },
          {
            text: m.comment ? `${m.name}\n${m.comment}` : m.name,
            style: 'tdSub',
          },
          { text: fmt(m.toOrder), style: 'tdSub', alignment: 'right' },
          { text: m.unit || '', style: 'tdSub' },
          { text: fmt(m.pricePerUnit), style: 'tdSub', alignment: 'right' },
          { text: fmt(m.total), style: 'tdSub', alignment: 'right' },
        ]);
      });

      body.push([
        { text: '', border: [false, false, false, false] },
        {
          text: 'Итого по этапу:',
          style: 'tdTotalLbl',
          colSpan: 4,
          alignment: 'right',
          border: [false, true, false, false],
        },
        {},
        {},
        {},
        {
          text: fmt(s.total),
          style: 'tdTotal',
          alignment: 'right',
          border: [false, true, false, false],
        },
      ]);

      content.push({
        table: { headerRows: 1, widths: [28, '*', 45, 30, 55, 65], body },
        layout: {
          hLineColor: () => '#e0e0e0',
          vLineColor: () => '#e0e0e0',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      });
    });

    content.push({
      margin: [0, 18, 0, 0],
      table: {
        widths: ['*', 100],
        body: [
          [
            { text: 'Работы', style: 'sumLbl' },
            { text: fmt(est.laborTotal) + ' ₽', style: 'sumVal' },
          ],
          [
            { text: 'Материалы', style: 'sumLbl' },
            { text: fmt(est.materialsTotal) + ' ₽', style: 'sumVal' },
          ],
          [
            { text: 'ИТОГО', style: 'grandLbl' },
            { text: fmt(est.grandTotal) + ' ₽', style: 'grandVal' },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number) => (i === 2 ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => '#ccc',
      },
    });

    content.push({
      margin: [0, 40, 0, 0],
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'ПОДРЯДЧИК', style: 'lbl' },
            {
              text: '_______________ / ' + CONTRACTOR.name,
              margin: [0, 20, 0, 0],
              fontSize: 9,
            },
          ],
        },
        {
          width: '50%',
          stack: [
            { text: 'ЗАКАЗЧИК', style: 'lbl' },
            {
              text: '_______________ / ' + clientName,
              margin: [0, 20, 0, 0],
              fontSize: 9,
            },
          ],
        },
      ],
    });

    return {
      pageSize: 'A4',
      pageMargins: [36, 40, 36, 50],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      footer: (currentPage: number, pageCount: number) =>
        ({
          text: `Страница ${currentPage} из ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          color: '#999',
          margin: [0, 10, 0, 0],
        }) as Content,
      content,
      styles: {
        title: { fontSize: 16, bold: true },
        lbl: { fontSize: 8, color: '#999', bold: true, margin: [0, 0, 0, 3] },
        stageHead: { fontSize: 11, bold: true, color: '#b45309' },
        th: {
          fontSize: 8,
          bold: true,
          fillColor: '#f5f5f5',
          margin: [0, 3, 0, 3],
        },
        td: { fontSize: 8, margin: [0, 2, 0, 2] },
        tdSub: { fontSize: 8, color: '#555', margin: [0, 1, 0, 1] },
        tdTotalLbl: { fontSize: 8, bold: true, margin: [0, 3, 0, 3] },
        tdTotal: {
          fontSize: 9,
          bold: true,
          color: '#b45309',
          margin: [0, 3, 0, 3],
        },
        sumLbl: { fontSize: 10, margin: [0, 3, 0, 3] },
        sumVal: { fontSize: 10, alignment: 'right', margin: [0, 3, 0, 3] },
        grandLbl: { fontSize: 12, bold: true, margin: [0, 5, 0, 3] },
        grandVal: {
          fontSize: 12,
          bold: true,
          alignment: 'right',
          color: '#b45309',
          margin: [0, 5, 0, 3],
        },
      },
    };
  }
}