'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Armchair,
  Layers,
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  QrCode,
  Clock,
  ShoppingBag,
  X,
  Check,
  AlertCircle,
  Copy,
  Printer,
  Square,
  Circle,
  RectangleHorizontal,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { TableStatus, TableShape } from '../../../../domain/tables/enums';
import { TableItemView } from '../../../../application/tables/use-cases/list-tables.use-case';
import {
  listTablesAction,
  createTableAction,
  updateTableAction,
  deleteTableAction,
  createTableSectionAction,
  updateTableSectionAction,
  deleteTableSectionAction,
} from '../../../actions/table.actions';
import { EditTableModal, SectionItem } from './components/edit-table-modal';
import { ManageSectionsModal } from './components/manage-sections-modal';
import { TableQrModal } from './components/table-qr-modal';

interface TablesClientProps {
  initialSections: SectionItem[];
  initialTables: TableItemView[];
  branches: Array<{ id: string; nameAr: string; code: string }>;
  activeBranchId: string;
  currencySymbol: string;
  restaurantNameAr: string;
}

export function TablesClient({
  initialSections,
  initialTables,
  branches,
  activeBranchId,
  currencySymbol,
  restaurantNameAr,
}: TablesClientProps) {
  const [currentBranchId, setCurrentBranchId] = useState(activeBranchId);
  const [sections, setSections] = useState<SectionItem[]>(initialSections);
  const [tables, setTables] = useState<TableItemView[]>(initialTables);

  // Filters & Search
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItemView | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  const [qrModalTable, setQrModalTable] = useState<TableItemView | null>(null);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState<TableItemView | null>(null);

  // Form states - Table
  const [tableNumber, setTableNumber] = useState('');
  const [tableSectionId, setTableSectionId] = useState<string>('');
  const [tableCapacity, setTableCapacity] = useState<number>(4);
  const [tableShape, setTableShape] = useState<TableShape>(TableShape.SQUARE);
  const [tableSortOrder, setTableSortOrder] = useState<number>(0);
  const [tableStatus, setTableStatus] = useState<TableStatus>(TableStatus.AVAILABLE);

  // Form states - Section
  const [sectionNameAr, setSectionNameAr] = useState('');
  const [sectionNameEn, setSectionNameEn] = useState('');
  const [sectionSortOrder, setSectionSortOrder] = useState<number>(0);

  // Action states
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refresh tables list for selected branch
  const refreshBranchData = async (branchId: string) => {
    startTransition(async () => {
      setErrorMessage(null);
      const res = await listTablesAction(branchId);
      if (res.success) {
        setSections(res.data.sections);
        setTables(res.data.tables);
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  const handleBranchChange = (newBranchId: string) => {
    setCurrentBranchId(newBranchId);
    setSelectedSectionId('ALL');
    refreshBranchData(newBranchId);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalTables = tables.length;
    const totalSeats = tables.reduce((acc, t) => acc + t.capacity, 0);
    const availableCount = tables.filter((t) => t.status === TableStatus.AVAILABLE).length;
    const occupiedCount = tables.filter((t) => t.status === TableStatus.OCCUPIED).length;
    const billPrintedCount = tables.filter((t) => t.status === TableStatus.BILL_PRINTED).length;
    return { totalTables, totalSeats, availableCount, occupiedCount, billPrintedCount };
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

  // Open Create Table Modal
  const openCreateTableModal = () => {
    setEditingTable(null);
    setTableNumber('');
    setTableSectionId(sections[0]?.id || '');
    setTableCapacity(4);
    setTableShape(TableShape.SQUARE);
    setTableSortOrder(tables.length + 1);
    setTableStatus(TableStatus.AVAILABLE);
    setErrorMessage(null);
    setIsTableModalOpen(true);
  };

  // Open Edit Table Modal
  const openEditTableModal = (table: TableItemView) => {
    setEditingTable(table);
    setTableNumber(table.tableNumber);
    setTableSectionId(table.sectionId || '');
    setTableCapacity(table.capacity);
    setTableShape((table.shape as TableShape) || TableShape.SQUARE);
    setTableSortOrder(0);
    setTableStatus(table.status);
    setErrorMessage(null);
    setIsTableModalOpen(true);
  };

  // Submit Table (Create or Update)
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      setErrorMessage('يرجى إدخال رقم أو اسم الطاولة');
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      if (editingTable) {
        const res = await updateTableAction({
          id: editingTable.id,
          tableNumber: tableNumber.trim(),
          sectionId: tableSectionId || null,
          capacity: tableCapacity,
          shape: tableShape,
          status: tableStatus,
          sortOrder: tableSortOrder,
        });
        if (res.success) {
          setIsTableModalOpen(false);
          setSuccessMessage('تم تحديث بيانات الطاولة بنجاح');
          refreshBranchData(currentBranchId);
        } else {
          setErrorMessage(res.error);
        }
      } else {
        const res = await createTableAction({
          branchId: currentBranchId,
          tableNumber: tableNumber.trim(),
          sectionId: tableSectionId || null,
          capacity: tableCapacity,
          shape: tableShape,
          sortOrder: tableSortOrder,
        });
        if (res.success) {
          setIsTableModalOpen(false);
          setSuccessMessage('تمت إضافة الطاولة بنجاح');
          refreshBranchData(currentBranchId);
        } else {
          setErrorMessage(res.error);
        }
      }
    });
  };

  // Delete Table
  const handleDeleteTable = async () => {
    if (!deleteConfirmTable) return;
    startTransition(async () => {
      setErrorMessage(null);
      const res = await deleteTableAction(deleteConfirmTable.id);
      if (res.success) {
        setDeleteConfirmTable(null);
        setSuccessMessage('تم حذف الطاولة بنجاح');
        refreshBranchData(currentBranchId);
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  // Open Section Modal
  const openManageSectionsModal = () => {
    setEditingSection(null);
    setSectionNameAr('');
    setSectionNameEn('');
    setSectionSortOrder(sections.length + 1);
    setErrorMessage(null);
    setIsSectionModalOpen(true);
  };

  // Save Section (Create or Update)
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionNameAr.trim() || !sectionNameEn.trim()) {
      setErrorMessage('يرجى إدخال اسم القسم بالعربية والإنجليزية');
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      if (editingSection) {
        const res = await updateTableSectionAction({
          id: editingSection.id,
          nameAr: sectionNameAr.trim(),
          nameEn: sectionNameEn.trim(),
          sortOrder: sectionSortOrder,
        });
        if (res.success) {
          setEditingSection(null);
          setSectionNameAr('');
          setSectionNameEn('');
          setSuccessMessage('تم تحديث القسم بنجاح');
          refreshBranchData(currentBranchId);
        } else {
          setErrorMessage(res.error);
        }
      } else {
        const res = await createTableSectionAction({
          branchId: currentBranchId,
          nameAr: sectionNameAr.trim(),
          nameEn: sectionNameEn.trim(),
          sortOrder: sectionSortOrder,
        });
        if (res.success) {
          setSectionNameAr('');
          setSectionNameEn('');
          setSectionSortOrder(sections.length + 2);
          setSuccessMessage('تمت إضافة القسم بنجاح');
          refreshBranchData(currentBranchId);
        } else {
          setErrorMessage(res.error);
        }
      }
    });
  };

  // Delete Section
  const handleDeleteSection = async (sectionId: string) => {
    startTransition(async () => {
      setErrorMessage(null);
      const res = await deleteTableSectionAction(sectionId);
      if (res.success) {
        setSuccessMessage('تم حذف القسم بنجاح');
        refreshBranchData(currentBranchId);
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  // Copy QR URL
  const getTableMenuUrl = (table: TableItemView) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/menu?table=${encodeURIComponent(table.tableNumber)}`;
  };

  const handleCopyLink = (table: TableItemView) => {
    const url = getTableMenuUrl(table);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return {
          label: 'متاحة',
          bg: 'admin-status-success',
          dot: 'admin-status-dot-success',
        };
      case TableStatus.OCCUPIED:
        return {
          label: 'مشغولة',
          bg: 'admin-primary-action',
          dot: 'admin-status-dot-danger',
        };
      case TableStatus.BILL_PRINTED:
        return {
          label: 'مطبوع الشيك',
          bg: 'admin-status-warning',
          dot: 'admin-status-dot-warning',
        };
      case TableStatus.RESERVED:
        return {
          label: 'محجوزة',
          bg: 'admin-status-warning',
          dot: 'admin-status-dot-warning',
        };
      case TableStatus.CLEANING:
        return {
          label: 'قيد التنظيف',
          bg: 'admin-status-info',
          dot: 'admin-status-dot-info',
        };
      default:
        return {
          label: status,
          bg: 'admin-status-info',
          dot: 'admin-status-dot-info',
        };
    }
  };

  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="size-3.5 admin-muted" strokeWidth={1.8} />;
      case TableShape.RECTANGLE:
        return <RectangleHorizontal className="size-3.5 admin-muted" strokeWidth={1.8} />;
      case TableShape.SQUARE:
      default:
        return <Square className="size-3.5 admin-muted" strokeWidth={1.8} />;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--admin-border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl admin-primary-action shadow-xs">
              <Armchair className="size-5" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--admin-foreground)]">الصالة والطاولات</h1>
              <p className="text-xs admin-muted">
                إدارة خريطة الطاولات، سعة الصالة، أقسام القاعات، وبطاقات الـ QR الرقمية
              </p>
            </div>
          </div>
        </div>

        {/* Top actions & Branch selection */}
        <div className="flex flex-wrap items-center gap-2.5">
          {branches.length > 1 && (
            <div className="relative">
              <select
                aria-label="تحديد الفرع الحالي"
                value={currentBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="h-10 rounded-xl border px-3.5 py-1.5 text-xs font-semibold shadow-2xs admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    فرع: {b.nameAr} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={openManageSectionsModal}
            className="flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-2xs admin-control active:scale-95 transition"
          >
            <Layers className="size-4 admin-muted" strokeWidth={1.8} />
            <span>إدارة الأقسام ({sections.length})</span>
          </button>

          <button
            type="button"
            onClick={openCreateTableModal}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs admin-primary-action active:scale-95 transition"
          >
            <Plus className="size-4" strokeWidth={2} />
            <span>إضافة طاولة</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border admin-status-danger p-3.5 text-xs font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 admin-status-danger-text" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="admin-status-danger-text hover:opacity-80"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border admin-status-success p-3.5 text-xs font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="size-4 shrink-0 admin-status-success-text" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="admin-status-success-text hover:opacity-80"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-[11px] font-medium">إجمالي الطاولات</span>
            <Armchair className="size-4 admin-muted" strokeWidth={1.8} />
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--admin-foreground)]">{stats.totalTables}</p>
        </div>

        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between admin-muted">
            <span className="text-[11px] font-medium">سعة المقاعد</span>
            <Users className="size-4 admin-muted" strokeWidth={1.8} />
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--admin-foreground)]">
            {stats.totalSeats} <span className="text-xs font-normal admin-muted">فرد</span>
          </p>
        </div>

        <div className="rounded-xl border admin-status-success p-3.5 shadow-2xs">
          <div className="flex items-center justify-between admin-status-success-text">
            <span className="text-[11px] font-semibold">متاحة حالياً</span>
            <span className="size-2 rounded-full admin-status-dot-success" />
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--admin-accent-hover)]">{stats.availableCount}</p>
        </div>

        <div className="rounded-xl border border-[var(--admin-primary)] bg-[var(--admin-primary)] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--admin-primary-soft)]">
            <span className="text-[11px] font-semibold">مشغولة</span>
            <span className="size-2 rounded-full admin-status-dot-danger" />
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--admin-surface)]">{stats.occupiedCount}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border admin-status-warning p-3.5 shadow-2xs">
          <div className="flex items-center justify-between admin-status-warning-text">
            <span className="text-[11px] font-semibold">مطبوع الشيك</span>
            <span className="size-2 rounded-full admin-status-dot-warning" />
          </div>
          <p className="mt-2 text-xl font-bold admin-status-warning-text">{stats.billPrintedCount}</p>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div className="flex flex-col gap-3 admin-card p-4">
        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedSectionId('ALL')}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition ${
              selectedSectionId === 'ALL'
                ? 'admin-primary-action shadow-2xs'
                : 'bg-[var(--admin-background)] admin-muted hover:bg-[var(--admin-border)]'
            }`}
          >
            كافة الأقسام ({tables.length})
          </button>

          {sections.map((sec) => {
            const count = tables.filter((t) => t.sectionId === sec.id).length;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionId(sec.id)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  selectedSectionId === sec.id
                    ? 'admin-primary-action shadow-2xs'
                    : 'bg-[var(--admin-background)] admin-muted hover:bg-[var(--admin-border)]'
                }`}
              >
                {sec.nameAr} ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedSectionId('NONE')}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition ${
              selectedSectionId === 'NONE'
                ? 'admin-primary-action shadow-2xs'
                : 'bg-[var(--admin-background)] admin-muted hover:bg-[var(--admin-border)]'
            }`}
          >
            بدون قسم ({tables.filter((t) => !t.sectionId).length})
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--admin-border)]">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 admin-muted" />
            <input
              type="text"
              placeholder="بحث برقم الطاولة أو اسم القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border py-2 pr-9 pl-3 text-xs admin-control placeholder:text-[var(--admin-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 admin-muted" strokeWidth={1.8} />
            <select
              aria-label="تصفية حسب حالة الطاولة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border px-3 py-1 text-xs font-medium admin-control focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            >
              <option value="ALL">جميع الحالات</option>
              <option value={TableStatus.AVAILABLE}>المتاحة فقط</option>
              <option value={TableStatus.OCCUPIED}>المشغولة فقط</option>
              <option value={TableStatus.BILL_PRINTED}>مطبوع الشيك</option>
              <option value={TableStatus.RESERVED}>المحجوزة</option>
              <option value={TableStatus.CLEANING}>قيد التنظيف</option>
            </select>

            <button
              type="button"
              onClick={() => refreshBranchData(currentBranchId)}
              disabled={isPending}
              title="تحديث البيانات"
              aria-label="تحديث البيانات"
              className="grid size-9 place-items-center rounded-xl border admin-control active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Table Floor Grid */}
      {filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] py-16 px-4 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-[var(--admin-background)] admin-muted">
            <Armchair className="size-6" strokeWidth={1.5} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[var(--admin-foreground)]">لا توجد طاولات مطابقة</h3>
          <p className="mt-1 max-w-sm text-xs admin-muted">
            لم يتم العثور على أي طاولة مطابقة للبحث أو معايير التصفية المحددة.
          </p>
          <button
            type="button"
            onClick={openCreateTableModal}
            className="mt-4 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold admin-primary-action"
          >
            <Plus className="size-3.5" />
            <span>إضافة طاولة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTables.map((table) => {
            const statusInfo = getStatusBadge(table.status);
            const isBusy =
              table.status === TableStatus.OCCUPIED || table.status === TableStatus.BILL_PRINTED;

            return (
              <div
                key={table.id}
                className="group relative flex flex-col justify-between admin-card admin-card-hover p-4"
              >
                <div>
                  {/* Card Top: Number + Shape + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid size-9 place-items-center rounded-xl bg-[var(--admin-background)] text-[var(--admin-foreground)] font-bold text-sm">
                        {table.tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--admin-foreground)]">
                            طاولة {table.tableNumber}
                          </span>
                          <span title={`شكل الطاولة: ${table.shape}`}>
                            {getShapeIcon(table.shape)}
                          </span>
                        </div>
                        <p className="text-[11px] admin-muted truncate max-w-[120px]">
                          {table.sectionNameAr || 'بدون قسم'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${statusInfo.bg}`}
                    >
                      <span className={`size-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Attributes: Capacity & Section */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] admin-muted">
                    <span className="flex items-center gap-1 rounded-md bg-[var(--admin-background)] px-2 py-0.5 border border-[var(--admin-border)]">
                      <Users className="size-3 admin-muted" />
                      <span>{table.capacity} مقاعد</span>
                    </span>

                    {table.sectionNameAr && (
                      <span className="flex items-center gap-1 rounded-md bg-[var(--admin-background)] px-2 py-0.5 border border-[var(--admin-border)] truncate">
                        <Layers className="size-3 admin-muted shrink-0" />
                        <span className="truncate">{table.sectionNameAr}</span>
                      </span>
                    )}
                  </div>

                  {/* Active Order Details (if occupied) */}
                  {isBusy && table.activeOrder && (
                    <div className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[var(--admin-foreground)]">
                        <span className="font-mono text-[11px] font-bold">
                          #{table.activeOrder.orderNumber}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] admin-muted">
                          <Clock className="size-3 admin-muted" />
                          <span>{table.activeOrder.minutesSeated} دقيقة</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border)] font-bold">
                        <span className="flex items-center gap-1 text-[11px] admin-muted font-normal">
                          <ShoppingBag className="size-3" />
                          <span>{table.activeOrder.itemsCount} أصناف</span>
                        </span>
                        <span className="text-[var(--admin-foreground)]">
                          {(table.activeOrder.totalMinor / 100).toFixed(2)} {currencySymbol}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border)] pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setQrModalTable(table)}
                    className="flex items-center gap-1 admin-muted hover:text-[var(--admin-foreground)] font-medium"
                    title="رمز QR للطاولة"
                  >
                    <QrCode className="size-3.5" />
                    <span>رمز QR</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditTableModal(table)}
                      className="grid size-7 place-items-center rounded-lg admin-muted hover:bg-[var(--admin-background)] hover:text-[var(--admin-foreground)] transition"
                      title="تعديل الطاولة"
                      aria-label="تعديل الطاولة"
                    >
                      <Edit2 className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTable(table)}
                      disabled={isBusy}
                      title={isBusy ? 'لا يمكن حذف طاولة مشغولة' : 'حذف الطاولة'}
                      aria-label={isBusy ? 'لا يمكن حذف طاولة مشغولة' : 'حذف الطاولة'}
                      className={`grid size-7 place-items-center rounded-lg transition ${
                        isBusy
                          ? 'cursor-not-allowed admin-muted'
                          : 'admin-muted hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)]'
                      }`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Add / Edit Table */}
      <EditTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        editingTable={editingTable}
        sections={sections}
        isPending={isPending}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        tableSectionId={tableSectionId}
        setTableSectionId={setTableSectionId}
        tableCapacity={tableCapacity}
        setTableCapacity={setTableCapacity}
        tableShape={tableShape}
        setTableShape={setTableShape}
        tableSortOrder={tableSortOrder}
        setTableSortOrder={setTableSortOrder}
        tableStatus={tableStatus}
        setTableStatus={setTableStatus}
        onSave={handleSaveTable}
      />

      {/* 6. Modal: Manage Sections */}
      <ManageSectionsModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        sections={sections}
        tables={tables}
        editingSection={editingSection}
        setEditingSection={setEditingSection}
        sectionNameAr={sectionNameAr}
        setSectionNameAr={setSectionNameAr}
        sectionNameEn={sectionNameEn}
        setSectionNameEn={setSectionNameEn}
        sectionSortOrder={sectionSortOrder}
        setSectionSortOrder={setSectionSortOrder}
        isPending={isPending}
        onSaveSection={handleSaveSection}
        onDeleteSection={handleDeleteSection}
      />

      {/* 7. Modal: Table QR Code & Standee Card */}
      <TableQrModal
        table={qrModalTable}
        onClose={() => setQrModalTable(null)}
        restaurantNameAr={restaurantNameAr}
        getTableMenuUrl={getTableMenuUrl}
        onCopyLink={handleCopyLink}
        copiedLink={copiedLink}
      />

      {/* 8. Modal: Delete Confirm Table */}
      {deleteConfirmTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(20,32,51,0.5)] backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--admin-surface)] p-5 shadow-2xl animate-in zoom-in-95 text-right">
            <h3 className="text-base font-bold text-[var(--admin-foreground)]">تأكيد حذف الطاولة</h3>
            <p className="mt-2 text-xs admin-muted">
              هل أنت متأكد من رغبتك في حذف الطاولة رقم{' '}
              <strong className="text-[var(--admin-foreground)]">{deleteConfirmTable.tableNumber}</strong>؟ لا يمكن
              التراجع عن هذه الخطوة.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmTable(null)}
                className="rounded-xl border px-4 py-2 font-semibold admin-control"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteTable}
                disabled={isPending}
                className="rounded-xl px-4 py-2 font-semibold shadow-xs admin-action-danger disabled:opacity-50"
              >
                {isPending ? 'جاري الحذف...' : 'نعم، حذف الطاولة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
