'use client';

import { useState, useMemo } from 'react';
import {
  Armchair,
  Search,
  Users,
  Clock,
  RefreshCw,
  Plus,
  Square,
  Circle,
  RectangleHorizontal,
  X,
} from 'lucide-react';
import { TableStatus, TableShape } from '../../../domain/tables/enums';
import { TableItemView } from '../../../application/tables/use-cases/list-tables.use-case';
import { PosSection } from './pos.types';

interface PosFloorPlanProps {
  tables: TableItemView[];
  sections: PosSection[];
  currencySymbol: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectAvailableTable: (table: TableItemView, guestCount: number) => void;
  onSelectOccupiedTable: (table: TableItemView) => void;
  onSwitchToCatalog: () => void;
}

export function PosFloorPlan({
  tables,
  sections,
  currencySymbol,
  isRefreshing,
  onRefresh,
  onSelectAvailableTable,
  onSelectOccupiedTable,
  onSwitchToCatalog,
}: PosFloorPlanProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Open Table Modal State
  const [openModalTable, setOpenModalTable] = useState<TableItemView | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);

  // Stats
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === TableStatus.AVAILABLE).length;
    const occupied = tables.filter((t) => t.status === TableStatus.OCCUPIED).length;
    const billPrinted = tables.filter((t) => t.status === TableStatus.BILL_PRINTED).length;
    return { total, available, occupied, billPrinted };
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (selectedSectionId !== 'ALL') {
        if (selectedSectionId === 'NONE' && table.sectionId !== null) return false;
        if (selectedSectionId !== 'NONE' && table.sectionId !== selectedSectionId) return false;
      }
      if (statusFilter !== 'ALL' && table.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesNumber = table.tableNumber.toLowerCase().includes(query);
        const matchesSection = table.sectionNameAr?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesSection) return false;
      }
      return true;
    });
  }, [tables, selectedSectionId, statusFilter, searchQuery]);

  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="size-3 text-[var(--pos-muted)]" strokeWidth={1.8} />;
      case TableShape.RECTANGLE:
        return <RectangleHorizontal className="size-3 text-[var(--pos-muted)]" strokeWidth={1.8} />;
      case TableShape.SQUARE:
      default:
        return <Square className="size-3 text-[var(--pos-muted)]" strokeWidth={1.8} />;
    }
  };

  const handleStartOpenTable = (table: TableItemView) => {
    setOpenModalTable(table);
    setGuestCount(Math.min(table.capacity, 2) || 2);
  };

  const handleConfirmOpenTable = () => {
    if (!openModalTable) return;
    onSelectAvailableTable(openModalTable, guestCount);
    setOpenModalTable(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--pos-soft)]" dir="rtl">
      {/* 1. Floor Plan Control Bar */}
      <div className="shrink-0 space-y-2.5 border-b border-[var(--pos-border)] bg-white p-3 shadow-[0_4px_18px_rgba(19,20,23,0.04)] sm:px-6 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Section Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSectionId('ALL')}
              className={`shrink-0 rounded-xl px-3 py-1.5 font-bold transition ${
                selectedSectionId === 'ALL'
                ? 'pos-selected'
                  : 'bg-[var(--pos-soft)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
              }`}
            >
              كافة الصالة ({tables.length})
            </button>
            {sections.map((sec) => {
              const count = tables.filter((t) => t.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 font-bold transition ${
                    selectedSectionId === sec.id
                ? 'pos-selected'
                       : 'bg-[var(--pos-soft)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]'
                  }`}
                >
                  {sec.nameAr} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick KPI badges */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>متاحة: {stats.available}</span>
            </span>

            <span className="flex items-center gap-1.5 rounded-lg border border-[var(--pos-foreground)] bg-[var(--pos-foreground)] px-2 py-1 font-bold text-white">
              <span className="size-2 rounded-full bg-rose-400" />
              <span>مشغولة: {stats.occupied}</span>
            </span>

            {stats.billPrinted > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-bold text-amber-800">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>مطبوع: {stats.billPrinted}</span>
              </span>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="تحديث حالات الصالة"
              aria-label="تحديث حالات الصالة"
              className="grid size-8 place-items-center rounded-lg border border-[var(--pos-border)] text-[var(--pos-muted)] hover:bg-[var(--pos-soft)] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 border-t border-[var(--pos-border)] pt-1 text-xs">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--pos-muted)]" />
            <input
              type="text"
              placeholder="بحث برقم الطاولة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-soft)] py-1 pr-8 pl-3 text-xs text-[var(--pos-foreground)] placeholder-[var(--pos-muted)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pos-signal)]/25"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-lg border border-[var(--pos-border)] bg-white px-2 py-0.5 text-xs text-[var(--pos-muted)]"
          >
            <option value="ALL">جميع الحالات</option>
            <option value={TableStatus.AVAILABLE}>المتاحة</option>
            <option value={TableStatus.OCCUPIED}>المشغولة</option>
            <option value={TableStatus.BILL_PRINTED}>مطبوع الشيك</option>
          </select>

          <button
            type="button"
            onClick={onSwitchToCatalog}
            className="mr-auto rounded-lg bg-[var(--pos-soft)] px-3 py-1 text-xs font-semibold text-[var(--pos-primary)] hover:bg-[var(--pos-soft-hover)]"
          >
            الذهاب للطلب السريع / المنيو
          </button>
        </div>
      </div>

      {/* 2. Floor Tables Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-[var(--pos-soft)] text-[var(--pos-muted)]">
              <Armchair className="size-6" strokeWidth={1.5} />
            </div>
          <p className="mt-3 text-sm font-bold text-[var(--pos-muted)]">لا توجد طاولات مطابقة</p>
          <p className="mt-1 text-xs text-[var(--pos-muted)]">تأكد من اختيار القسم الصحيح أو إلغاء فلتر البحث.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTables.map((table) => {
              const isAvailable = table.status === TableStatus.AVAILABLE;
              const isOccupied = table.status === TableStatus.OCCUPIED;
              const isBillPrinted = table.status === TableStatus.BILL_PRINTED;

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    if (isAvailable) {
                      handleStartOpenTable(table);
                    } else if (isOccupied || isBillPrinted) {
                      onSelectOccupiedTable(table);
                    }
                  }}
                  className={`group relative flex min-h-[214px] flex-col justify-between rounded-[14px] border p-3 text-right shadow-[0_4px_12px_rgba(19,20,23,0.05)] transition cursor-pointer select-none active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(19,20,23,0.1)] ${
                    isAvailable
                      ? 'border-emerald-200/90 bg-white hover:border-emerald-300'
                    : isBillPrinted
                      ? 'border-amber-200/90 bg-white hover:border-amber-300'
                      : 'border-[var(--pos-border)] bg-white hover:border-[var(--pos-metal)]'
                  }`}
                >
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div
                      className={`relative mb-3 flex min-h-[92px] items-center justify-center overflow-hidden rounded-[12px] bg-[radial-gradient(circle_at_50%_48%,var(--pos-surface)_0%,var(--pos-canvas)_70%,var(--pos-soft-hover)_100%)] ${
                        isAvailable
                          ? 'ring-1 ring-inset ring-emerald-100'
                          : isBillPrinted
                          ? 'ring-1 ring-inset ring-amber-100'
                          : 'ring-1 ring-inset ring-[var(--pos-border)]'
                      }`}
                    >
                    {/* Top row: Table number & status */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`grid size-12 place-items-center rounded-[14px] font-bold text-base shadow-[0_5px_10px_rgba(19,20,23,0.12)] ${
                            isAvailable
                              ? 'bg-emerald-600 text-white'
                              : isBillPrinted
                              ? 'bg-amber-600 text-white'
                              : 'bg-[var(--pos-foreground)] text-white'
                          }`}
                        >
                          {table.tableNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-[var(--pos-foreground)]">
                              طاولة {table.tableNumber}
                            </span>
                            {getShapeIcon(table.shape)}
                          </div>
                          <p className="max-w-[80px] truncate text-[10px] text-[var(--pos-muted)]">
                            {table.sectionNameAr || 'عامة'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : isBillPrinted
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[var(--pos-foreground)] text-white'
                        }`}
                      >
                        {isAvailable ? 'متاحة' : isBillPrinted ? 'مطبوع الشيك' : 'مشغولة'}
                      </span>
                    </div>
                    </div>

                    {/* Capacity */}
                    <div className="mt-auto flex items-center justify-between border-t border-[var(--pos-border)] pt-2 text-[11px] text-[var(--pos-muted)]">
                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-[var(--pos-muted)]" />
                        <span>{table.capacity} مقاعد</span>
                      </span>
                      {isAvailable && (
                        <span className="text-[10px] font-bold text-emerald-700">اضغط للفتح</span>
                      )}
                    </div>
                  </div>

                  {/* Active tab summary (if occupied) */}
                  {(isOccupied || isBillPrinted) && table.activeOrder && (
                    <div className="mt-3 space-y-1 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[var(--pos-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-[var(--pos-muted)]" />
                          <span>{table.activeOrder.minutesSeated} د</span>
                        </span>
                        <span>{table.activeOrder.itemsCount} صنف</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--pos-border)] pt-1 text-[11px] font-bold text-[var(--pos-foreground)]">
                        <span>المستحق:</span>
                        <span className="font-mono">
                          {(table.activeOrder.totalMinor / 100).toFixed(2)} {currencySymbol}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Modal: Quick Open Table */}
      {openModalTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--pos-foreground)]/35 p-4 backdrop-blur-[2px] animate-in fade-in"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-[24px] border border-[var(--pos-border)] bg-white p-5 text-[var(--pos-foreground)] shadow-[0_24px_80px_rgba(19,20,23,0.18)] animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--pos-border)] pb-3">
              <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-xl bg-[var(--pos-primary)] text-white font-bold text-xs shadow-[0_6px_14px_rgba(19,20,23,0.2)]">
                  {openModalTable.tableNumber}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--pos-foreground)]">
                    فتح طاولة {openModalTable.tableNumber}
                  </h3>
                  <p className="text-[11px] text-[var(--pos-muted)]">
                    {openModalTable.sectionNameAr || 'صالة عامة'} · السعة {openModalTable.capacity} أفراد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModalTable(null)}
                className="rounded-[10px] p-1 text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[var(--pos-muted)]">عدد الضيوف (الرواد):</label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-[12px] border border-[var(--pos-border)] bg-[var(--pos-soft)] p-1">
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                      className="size-8 rounded-lg border border-[var(--pos-border)] bg-white font-bold text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center text-sm font-bold text-[var(--pos-foreground)]">
                      {guestCount} ضيوف
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                      className="size-8 rounded-lg border border-[var(--pos-border)] bg-white font-bold text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--pos-border)] pt-3 text-xs">
              <button
                type="button"
                onClick={() => setOpenModalTable(null)}
                className="rounded-[12px] border border-[var(--pos-border)] px-4 py-2 font-medium text-[var(--pos-muted)] hover:bg-[var(--pos-soft)]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmOpenTable}
          className="pos-primary-action flex items-center gap-1.5 rounded-xl bg-[var(--pos-primary)] px-4 py-2 font-bold text-white shadow-[0_8px_18px_rgba(19,20,23,0.2)] hover:bg-[var(--pos-primary-hover)]"
              >
                <Plus className="size-3.5" />
                <span>فتح الطاولة واختيار الأصناف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
