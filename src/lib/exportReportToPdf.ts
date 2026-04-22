import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesReportSummary, SalesReportDetailRow } from '@/hooks/useSalesReport';

const PAGE_MARGIN = 20;
const TEXT_DARK = [30, 30, 30] as [number, number, number];
const TEXT_MUTED = [70, 70, 70] as [number, number, number];
const LINE_LIGHT = [200, 200, 200] as [number, number, number];

const ROBOTO_URLS = {
  normal:
    'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
  bold:
    'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf',
};

let fontCacheNormal: string | null = null;
let fontCacheBold: string | null = null;

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadCyrillicFonts(doc: jsPDF): Promise<void> {
  const [normalB64, boldB64] = await Promise.all([
    fontCacheNormal
      ? Promise.resolve(fontCacheNormal)
      : fetch(ROBOTO_URLS.normal)
          .then((r) => r.arrayBuffer())
          .then(arrayBufferToBase64),
    fontCacheBold
      ? Promise.resolve(fontCacheBold)
      : fetch(ROBOTO_URLS.bold)
          .then((r) => r.arrayBuffer())
          .then(arrayBufferToBase64),
  ]);

  fontCacheNormal = normalB64;
  fontCacheBold = boldB64;

  doc.addFileToVFS('Roboto-Regular.ttf', normalB64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}

function formatRevenueForPdf(amount: number): string {
  const n = Math.round(Number(amount));
  const s = String(n);
  const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withCommas + ' MKD';
}

export interface ExportReportParams {
  period: string;
  summary: SalesReportSummary;
  details: SalesReportDetailRow[];
  appName?: string;
  logoDataUrl?: string;
}

export async function exportReportToPdf({
  period,
  summary,
  details,
  appName,
  logoDataUrl,
}: ExportReportParams): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  await loadCyrillicFonts(doc);
  const fontName = 'Roboto';

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = PAGE_MARGIN;

  // ----- Logo -----
  if (logoDataUrl) {
    try {
      const logoW = 22;
      const logoH = 22;
      const fmt =
        logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg')
          ? 'JPEG'
          : 'PNG';
      doc.addImage(logoDataUrl, fmt, PAGE_MARGIN, y, logoW, logoH);
      y += logoH + 6;
    } catch {
      // skip logo on error
    }
  }

  // ----- Header -----
  const centerX = pageWidth / 2;
  if (appName) {
    doc.setFontSize(23);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(appName.toUpperCase(), centerX, y, { align: 'center' });
    y += 10;
    doc.setFontSize(15);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Sales Report', centerX, y, { align: 'center' });
    y += 8;
  } else {
    doc.setFontSize(23);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text('Sales Report', centerX, y, { align: 'center' });
    y += 10;
  }
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Period: ${period}`, centerX, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(...LINE_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 12;

  doc.setTextColor(...TEXT_DARK);

  // ----- Summary -----
  doc.setFontSize(11);
  doc.setFont(fontName, 'bold');
  doc.text('Summary', PAGE_MARGIN, y);
  y += 7;

  doc.setFont(fontName, 'normal');
  doc.setFontSize(10);
  const summaryRows: [string, string][] = [
    ['Total Orders', String(summary.total_orders)],
    ['Total Items Sold', String(summary.total_items_sold)],
    ['Total Revenue', formatRevenueForPdf(summary.total_revenue)],
    ['Best Selling Product', summary.best_selling_product],
    ['Best Selling Category', summary.best_selling_category],
  ];
  const labelW = 48;
  const valX = PAGE_MARGIN + labelW;
  summaryRows.forEach(([label, value]) => {
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${label}:`, PAGE_MARGIN, y);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, valX, y);
    y += 5.5;
  });
  y += 12;

  // ----- Sales by product table -----
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.text('Sales by Product', PAGE_MARGIN, y);
  y += 7;

  const headers = ['Product', 'Category', 'Qty Sold', 'Revenue'];
  const body = details.map((row) => [
    row.product_name,
    row.category_name,
    String(row.quantity_sold),
    formatRevenueForPdf(row.total_revenue),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    theme: 'plain',
    styles: {
      font: fontName,
      fontSize: 9,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      textColor: TEXT_DARK,
      lineColor: LINE_LIGHT,
      lineWidth: 0.15,
    },
    headStyles: {
      fontStyle: 'bold',
      textColor: TEXT_DARK,
      fillColor: false,
      lineWidth: 0.15,
      lineColor: LINE_LIGHT,
      cellPadding: { top: 4, right: 5, bottom: 5, left: 5 },
    },
    bodyStyles: {
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'left' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  const tbl = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
  y = (tbl?.finalY ?? y + 20) + 14;

  // ----- Total revenue -----
  doc.setDrawColor(...LINE_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 8;

  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Total Revenue: ${formatRevenueForPdf(summary.total_revenue)}`, PAGE_MARGIN, y);
  y += 8;

  // ----- Footer -----
  doc.setDrawColor(...LINE_LIGHT);
  doc.setLineWidth(0.15);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 5;

  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Generated: ${generatedAt}`, PAGE_MARGIN, y);

  const safePeriod = period.replace(/\s*—\s*/g, '-').replace(/,?\s+/g, '-');
  doc.save(`sales-report-${safePeriod}.pdf`);
}
