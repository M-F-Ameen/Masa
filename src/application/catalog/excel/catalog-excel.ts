import ExcelJS from 'exceljs';
import { toMinorUnits } from '../dto/catalog.dto';

export const CATALOG_SHEET_NAMES = {
  instructions: 'إرشادات',
  categories: 'التصنيفات',
  products: 'الأصناف',
  sizes: 'مقاسات الأصناف',
} as const;

const MAX_CATEGORY_ROWS = 5_000;
const MAX_PRODUCT_ROWS = 10_000;
const MAX_SIZE_ROWS = 30_000;
const MAX_ERROR_DETAILS = 15;

type ExcelRow = Record<string, unknown>;

export type CatalogImportCategory = {
  rowNumber: number;
  id?: string;
  nameAr: string;
  nameEn: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogImportProduct = {
  rowNumber: number;
  id?: string;
  categoryId?: string;
  categoryAr?: string;
  categoryEn?: string;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

export type CatalogImportSize = {
  rowNumber: number;
  id?: string;
  productId?: string;
  productAr?: string;
  productEn?: string;
  nameAr: string;
  nameEn: string;
  priceMinor: number;
  isActive: boolean;
  sortOrder: number;
};

export type ParsedCatalogWorkbook = {
  categories: CatalogImportCategory[];
  products: CatalogImportProduct[];
  sizes: CatalogImportSize[];
};

export type CatalogImportSummary = {
  categoriesCreated: number;
  categoriesUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  sizesCreated: number;
  sizesUpdated: number;
};

export class CatalogImportValidationError extends Error {
  public readonly details: string[];

  constructor(details: string[]) {
    super(details.slice(0, MAX_ERROR_DETAILS).join('\n'));
    this.name = 'CatalogImportValidationError';
    this.details = details;
  }
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar-EG');
}

function getCell(row: ExcelRow, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalize));
  const entry = Object.entries(row).find(([key]) => aliasSet.has(normalize(key)));
  return entry?.[1];
}

function textCell(row: ExcelRow, aliases: string[]) {
  const value = getCell(row, aliases);
  return value === undefined || value === null ? '' : String(value).trim();
}

function optionalTextCell(row: ExcelRow, aliases: string[]) {
  const value = textCell(row, aliases);
  return value || undefined;
}

function booleanCell(row: ExcelRow, aliases: string[], defaultValue: boolean, rowNumber: number, errors: string[]) {
  const value = normalize(textCell(row, aliases));
  if (!value) return defaultValue;
  if (['1', 'true', 'yes', 'y', 'نعم', 'ن'].includes(value)) return true;
  if (['0', 'false', 'no', 'n', 'لا', 'ل'].includes(value)) return false;
  errors.push(`الصف ${rowNumber}: قيمة الحالة يجب أن تكون نعم/لا أو true/false.`);
  return defaultValue;
}

function integerCell(row: ExcelRow, aliases: string[], defaultValue: number, rowNumber: number, errors: string[]) {
  const value = textCell(row, aliases);
  if (!value) return defaultValue;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  errors.push(`الصف ${rowNumber}: الترتيب يجب أن يكون رقماً صحيحاً موجباً أو صفراً.`);
  return defaultValue;
}

function idCell(row: ExcelRow, aliases: string[], rowNumber: number, errors: string[]) {
  const value = optionalTextCell(row, aliases);
  if (!value) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    errors.push(`الصف ${rowNumber}: المعرف ليس UUID صالحاً.`);
    return undefined;
  }
  return value;
}

function requiredTextCell(
  row: ExcelRow,
  aliases: string[],
  label: string,
  rowNumber: number,
  errors: string[],
  maxLength: number,
) {
  const value = textCell(row, aliases);
  if (!value) errors.push(`الصف ${rowNumber}: ${label} مطلوب.`);
  if (value.length > maxLength) errors.push(`الصف ${rowNumber}: ${label} يتجاوز الحد المسموح.`);
  return value;
}

function priceCell(row: ExcelRow, rowNumber: number, errors: string[]) {
  const value = textCell(row, ['السعر', 'price']);
  if (!value) {
    errors.push(`الصف ${rowNumber}: سعر المقاس مطلوب.`);
    return 0;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    errors.push(`الصف ${rowNumber}: السعر يجب أن يكون رقماً موجباً حتى خانتين عشريتين.`);
    return 0;
  }
  try {
    return toMinorUnits(value);
  } catch {
    errors.push(`الصف ${rowNumber}: السعر خارج النطاق المدعوم.`);
    return 0;
  }
}

function sheetRows(workbook: ExcelJS.Workbook, sheetName: string) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet || sheet.rowCount < 1) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  for (let index = 1; index <= headerRow.cellCount; index += 1) {
    headers.push(headerRow.getCell(index).text.trim());
  }
  const rows: ExcelRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = headers.map((_, index) => row.getCell(index + 1).text.trim());
    if (values.every((value) => !value)) continue;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }
  return rows;
}

export async function parseCatalogWorkbook(buffer: Buffer): Promise<ParsedCatalogWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new CatalogImportValidationError(['ملف Excel غير صالح أو تالف.']);
  }

  const supportedSheetExists = [CATALOG_SHEET_NAMES.categories, CATALOG_SHEET_NAMES.products, CATALOG_SHEET_NAMES.sizes]
    .some((name) => Boolean(workbook.getWorksheet(name)));
  if (!supportedSheetExists) {
    throw new CatalogImportValidationError([
      `يجب أن يحتوي الملف على ورقة واحدة على الأقل باسم: ${CATALOG_SHEET_NAMES.categories} أو ${CATALOG_SHEET_NAMES.products}.`,
    ]);
  }

  const errors: string[] = [];
  const categoryRows = sheetRows(workbook, CATALOG_SHEET_NAMES.categories);
  const productRows = sheetRows(workbook, CATALOG_SHEET_NAMES.products);
  const sizeRows = sheetRows(workbook, CATALOG_SHEET_NAMES.sizes);

  if (categoryRows.length > MAX_CATEGORY_ROWS) errors.push(`عدد التصنيفات يتجاوز الحد الأقصى ${MAX_CATEGORY_ROWS}.`);
  if (productRows.length > MAX_PRODUCT_ROWS) errors.push(`عدد الأصناف يتجاوز الحد الأقصى ${MAX_PRODUCT_ROWS}.`);
  if (sizeRows.length > MAX_SIZE_ROWS) errors.push(`عدد المقاسات يتجاوز الحد الأقصى ${MAX_SIZE_ROWS}.`);

  const categories = categoryRows.map((row, index) => {
    const rowNumber = index + 2;
    return {
      rowNumber,
      id: idCell(row, ['المعرف', 'id'], rowNumber, errors),
      nameAr: requiredTextCell(row, ['اسم التصنيف بالعربية', 'nameAr', 'name_ar'], 'اسم التصنيف بالعربية', rowNumber, errors, 160),
      nameEn: requiredTextCell(row, ['اسم التصنيف بالإنجليزية', 'nameEn', 'name_en'], 'اسم التصنيف بالإنجليزية', rowNumber, errors, 160),
      description: textCell(row, ['الوصف', 'description']).slice(0, 500),
      isActive: booleanCell(row, ['نشط', 'active', 'isActive'], true, rowNumber, errors),
      sortOrder: integerCell(row, ['الترتيب', 'sortOrder', 'sort_order'], 0, rowNumber, errors),
    };
  });

  const products = productRows.map((row, index) => {
    const rowNumber = index + 2;
    return {
      rowNumber,
      id: idCell(row, ['المعرف', 'id'], rowNumber, errors),
      categoryId: optionalTextCell(row, ['معرف التصنيف', 'categoryId', 'category_id']),
      categoryAr: optionalTextCell(row, ['التصنيف بالعربية', 'categoryAr', 'category_name_ar']),
      categoryEn: optionalTextCell(row, ['التصنيف بالإنجليزية', 'categoryEn', 'category_name_en']),
      nameAr: requiredTextCell(row, ['اسم الصنف بالعربية', 'nameAr', 'name_ar'], 'اسم الصنف بالعربية', rowNumber, errors, 200),
      nameEn: requiredTextCell(row, ['اسم الصنف بالإنجليزية', 'nameEn', 'name_en'], 'اسم الصنف بالإنجليزية', rowNumber, errors, 200),
      description: textCell(row, ['الوصف', 'description']).slice(0, 1000),
      imageUrl: textCell(row, ['رابط الصورة', 'imageUrl', 'image_url']).slice(0, 1000),
      isActive: booleanCell(row, ['نشط', 'active', 'isActive'], true, rowNumber, errors),
      isFeatured: booleanCell(row, ['مميز', 'featured', 'isFeatured'], false, rowNumber, errors),
      sortOrder: integerCell(row, ['الترتيب', 'sortOrder', 'sort_order'], 0, rowNumber, errors),
    };
  });

  const sizes = sizeRows.map((row, index) => {
    const rowNumber = index + 2;
    return {
      rowNumber,
      id: idCell(row, ['المعرف', 'id'], rowNumber, errors),
      productId: optionalTextCell(row, ['معرف الصنف', 'productId', 'product_id']),
      productAr: optionalTextCell(row, ['اسم الصنف بالعربية', 'productAr', 'product_name_ar']),
      productEn: optionalTextCell(row, ['اسم الصنف بالإنجليزية', 'productEn', 'product_name_en']),
      nameAr: requiredTextCell(row, ['اسم المقاس بالعربية', 'nameAr', 'name_ar'], 'اسم المقاس بالعربية', rowNumber, errors, 120),
      nameEn: requiredTextCell(row, ['اسم المقاس بالإنجليزية', 'nameEn', 'name_en'], 'اسم المقاس بالإنجليزية', rowNumber, errors, 120),
      priceMinor: priceCell(row, rowNumber, errors),
      isActive: booleanCell(row, ['نشط', 'active', 'isActive'], true, rowNumber, errors),
      sortOrder: integerCell(row, ['الترتيب', 'sortOrder', 'sort_order'], 0, rowNumber, errors),
    };
  });

  const duplicateIds = new Set<string>();
  for (const row of [...categories, ...products, ...sizes]) {
    if (!row.id) continue;
    if (duplicateIds.has(row.id)) errors.push(`الصف ${row.rowNumber}: المعرف مكرر داخل ملف الاستيراد.`);
    duplicateIds.add(row.id);
  }

  if (errors.length > 0) throw new CatalogImportValidationError(errors);
  return { categories, products, sizes };
}

type ExportCategory = {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ExportProduct = {
  id: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  category: { id: string; nameAr: string; nameEn: string };
  sizes: Array<{ id: string; nameAr: string; nameEn: string; price: number; isActive: boolean; sortOrder: number }>;
};

function columnLetter(columnNumber: number) {
  let result = '';
  let number = columnNumber;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function addSheet(workbook: ExcelJS.Workbook, sheetName: string, headers: string[], rows: Array<Array<string | number>>, widths: number[]) {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  sheet.columns = headers.map((header, index) => ({ header, key: `column${index}`, width: widths[index] ?? 18 }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2859D9' } };
  headerRow.alignment = { horizontal: 'right', vertical: 'middle' };
  rows.forEach((row) => sheet.addRow(row));
  sheet.eachRow((row) => {
    row.alignment = { vertical: 'middle', horizontal: 'right', wrapText: false };
  });
  if (rows.length > 0) {
    sheet.autoFilter = { from: 'A1', to: `${columnLetter(headers.length)}${rows.length + 1}` };
  }
}

export function buildCatalogWorkbook(
  categories: ExportCategory[],
  products: ExportProduct[],
  template = false,
) {
  const workbook = new ExcelJS.Workbook();
  const instructions = workbook.addWorksheet(CATALOG_SHEET_NAMES.instructions, { views: [{ rightToLeft: true }] });
  const instructionRows: string[][] = [
    ['استيراد وتصدير المنيو'],
    ['استخدم ورقتي التصنيفات والأصناف لإضافة أو تعديل البيانات. ورقة مقاسات الأصناف اختيارية للمقاسات المتعددة.'],
    ['المعرف اختياري عند إضافة سجل جديد، ومطلوب فقط لتعديل سجل موجود. لا يتم حذف أي سجل من خلال الاستيراد.'],
    ['عند ترك معرف التصنيف فارغاً، استخدم اسم التصنيف بالعربية أو الإنجليزية الموجود في ورقة التصنيفات أو في النظام.'],
    ['عند ترك معرف الصنف فارغاً في ورقة المقاسات، استخدم اسم الصنف بالعربية أو الإنجليزية الموجود في ورقة الأصناف.'],
    ['القيم المقبولة للحالة: نعم/لا أو true/false. الأسعار بالمبلغ الرئيسي وبحد أقصى خانتين عشريتين.'],
  ];
  instructionRows.forEach((row) => instructions.addRow(row));
  instructions.getColumn(1).width = 110;
  instructions.getColumn(1).alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
  instructions.getRow(1).font = { bold: true, size: 14, color: { argb: '142644' } };

  addSheet(
    workbook,
    CATALOG_SHEET_NAMES.categories,
    ['المعرف', 'اسم التصنيف بالعربية', 'اسم التصنيف بالإنجليزية', 'الوصف', 'نشط', 'الترتيب'],
    template ? [] : categories.map((category) => [category.id, category.nameAr, category.nameEn, category.description ?? '', category.isActive ? 'نعم' : 'لا', category.sortOrder]),
    [38, 28, 30, 48, 12, 12],
  );

  addSheet(
    workbook,
    CATALOG_SHEET_NAMES.products,
    ['المعرف', 'معرف التصنيف', 'التصنيف بالعربية', 'التصنيف بالإنجليزية', 'اسم الصنف بالعربية', 'اسم الصنف بالإنجليزية', 'الوصف', 'رابط الصورة', 'مميز', 'نشط', 'الترتيب'],
    template ? [] : products.map((product) => [product.id, product.categoryId, product.category.nameAr, product.category.nameEn, product.nameAr, product.nameEn, product.description ?? '', product.imageUrl ?? '', product.isFeatured ? 'نعم' : 'لا', product.isActive ? 'نعم' : 'لا', product.sortOrder]),
    [38, 38, 26, 28, 28, 30, 48, 48, 12, 12, 12],
  );

  addSheet(
    workbook,
    CATALOG_SHEET_NAMES.sizes,
    ['المعرف', 'معرف الصنف', 'اسم الصنف بالعربية', 'اسم الصنف بالإنجليزية', 'اسم المقاس بالعربية', 'اسم المقاس بالإنجليزية', 'السعر', 'نشط', 'الترتيب'],
    template ? [] : products.flatMap((product) => product.sizes.map((size) => [size.id, product.id, product.nameAr, product.nameEn, size.nameAr, size.nameEn, Number((size.price / 100).toFixed(2)), size.isActive ? 'نعم' : 'لا', size.sortOrder])),
    [38, 38, 28, 30, 24, 26, 14, 12, 12],
  );

  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function catalogNameKey(nameAr: string, nameEn: string) {
  return `${normalize(nameAr)}|${normalize(nameEn)}`;
}

export function catalogSingleNameKey(value: string) {
  return normalize(value);
}
