/**
 * Helpers de exportación CSV / XLSX para los módulos del admin.
 * Se usa desde la BulkActionsBar y los botones "Exportar".
 */
import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  key: string;
  label: string;
  accessor: (row: T) => string | number | null | undefined;
};

const escapeCsv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

export function downloadCSV<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(c.accessor(r))).join(","));
  const csv = "\uFEFF" + [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadXLSX<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = "Datos",
) {
  const aoa = [
    columns.map((c) => c.label),
    ...rows.map((r) => columns.map((c) => c.accessor(r) ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Ancho automático aproximado por columna
  const colWidths = columns.map((c, idx) => {
    const headerLen = c.label.length;
    const sample = rows.slice(0, 200).reduce((max, r) => {
      const v = c.accessor(r);
      const len = v == null ? 0 : String(v).length;
      return Math.max(max, len);
    }, 0);
    return { wch: Math.min(60, Math.max(10, Math.max(headerLen, sample) + 2)) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const todayStamp = () => new Date().toISOString().slice(0, 10);
