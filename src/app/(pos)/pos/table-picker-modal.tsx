'use client';

import { useState, useMemo } from 'react';
import {
  Armchair,
  Search,
  Users,
  X,
  Check,
  Square,
  Circle,
  RectangleHorizontal,
} from 'lucide-react';
import { TableStatus, TableShape } from '../../../domain/tables/enums';
import { TableItemView } from '../../../application/tables/use-cases/list-tables.use-case';
import { PosSection } from './pos.types';

interface TablePickerModalProps {
  tables: TableItemView[];
  sections: PosSection[];
  selectedTableId: string | null;
  onSelectTable: (table: TableItemView) => void;
  onSelectOccupiedTable?: (table: TableItemView) => void;
  onClose: () => void;
}

export function TablePickerModal({
  tables,
  sections,
  selectedTableId,
  onSelectTable,
  onSelectOccupiedTable,
  onClose,
}: TablePickerModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (selectedSectionId !== 'ALL') {
        if (selectedSectionId === 'NONE' && table.sectionId !== null) return false;
        if (selectedSectionId !== 'NONE' && table.sectionId !== selectedSectionId) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesNumber = table.tableNumber.toLowerCase().includes(query);
        const matchesSection = table.sectionNameAr?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesSection) return false;
      }
      return true;
    });
  }, [tables, selectedSectionId, searchQuery]);

  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="size-3 text-zinc-400" strokeWidth={1.8} />;
      case TableShape.RECTANGLE:
        return <RectangleHorizontal className="size-3 text-zinc-400" strokeWidth={1.8} />;
      case TableShape.SQUARE:
      default:
        return <Square className="size-3 text-zinc-400" strokeWidth={1.8} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10204a]/35 p-3 backdrop-blur-[2px] sm:p-4 animate-in fade-in" dir="rtl">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-[#e1e7f3] bg-white p-4 text-[#243663] shadow-[0_24px_80px_rgba(31,50,105,0.18)] sm:p-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#edf0f7] pb-3">
          <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-[#2D61C9] text-white shadow-[0_6px_14px_rgba(45,97,201,0.2)]">
              <Armchair className="size-4" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#142957] sm:text-base">تحديد طاولة للطلب</h3>
              <p className="text-[11px] text-[#7b89a9]">اختر طاولة متاحة لفتح الشيك أو فتح طلبها المفتوح</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#8a96b0] hover:bg-[#eef0ff] hover:text-[#40527c]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Section Pills & Search */}
        <div className="py-3 space-y-2 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSectionId('ALL')}
              className={`shrink-0 rounded-xl px-3 py-1 font-semibold transition ${
                selectedSectionId === 'ALL'
                ? 'bg-[#2D61C9] text-white'
                  : 'bg-[#f1f3fb] text-[#526286] hover:bg-[#e7eaf7]'
              }`}
            >
              كافة الأقسام ({tables.length})
            </button>
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionId(sec.id)}
                className={`shrink-0 rounded-xl px-3 py-1 font-semibold transition ${
                  selectedSectionId === sec.id
                ? 'bg-[#2D61C9] text-white'
                    : 'bg-[#f1f3fb] text-[#526286] hover:bg-[#e7eaf7]'
                }`}
              >
                {sec.nameAr}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث برقم الطاولة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#DCE3EF] bg-[#F7F9FD] py-1.5 pr-8 pl-3 text-xs text-[#142644] placeholder-[#8D9AB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D61C9]/25"
            />
          </div>
        </div>

        {/* Tables Grid */}
        <div className="flex-1 overflow-y-auto py-3">
          {filteredTables.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">لا توجد طاولات مطابقة للبحث أو التصفية</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredTables.map((table) => {
                const isSelected = table.id === selectedTableId;
                const isAvailable = table.status === TableStatus.AVAILABLE;
                const isOccupied = table.status === TableStatus.OCCUPIED || table.status === TableStatus.BILL_PRINTED;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        onSelectTable(table);
                        onClose();
                      } else if (isOccupied && onSelectOccupiedTable) {
                        onSelectOccupiedTable(table);
                        onClose();
                      }
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-right transition ${
                      isSelected
                        ? 'border-[#2D61C9] bg-[#2D61C9] text-white shadow-[0_6px_14px_rgba(45,97,201,0.2)]'
                        : isAvailable
                        ? 'border-emerald-200/80 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50'
                        : 'border-[#e0e6f3] bg-[#f8faff] hover:bg-[#f0f2fb]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">
                          طاولة {table.tableNumber}
                        </span>
                        {getShapeIcon(table.shape)}
                      </div>

                      {isSelected ? (
                        <span className="grid size-4 place-items-center rounded-full bg-white text-zinc-900">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOccupied
                              ? 'bg-zinc-200 text-zinc-800'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {isAvailable ? 'متاحة' : isOccupied ? 'مشغولة' : table.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] w-full opacity-80">
                      <span className="truncate max-w-[80px]">
                        {table.sectionNameAr || 'عامة'}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Users className="size-3" />
                        <span>{table.capacity}</span>
                      </span>
                    </div>

                    {isOccupied && table.activeOrder && (
                      <div className="mt-2 w-full pt-1.5 border-t border-zinc-200/60 text-[10px] font-bold text-zinc-700 flex justify-between">
                        <span>طلب جاري:</span>
                        <span>{(table.activeOrder.totalMinor / 100).toFixed(2)} ج.م</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs shrink-0">
          <p className="text-[11px] text-zinc-500">
            اضغط على طاولة متاحة لربطها فوراً بالطلب الحالي.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e0e6f3] px-4 py-1.5 font-semibold text-[#526286] hover:bg-[#f7f8ff]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
