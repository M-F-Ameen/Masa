'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Users,
  Phone,
  MessageSquare,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { BookingStatus, BOOKING_STATUS_CONFIG } from '../../../../domain/bookings/enums/booking-status.enum';
import { updateBookingStatusAction } from '../../../actions/booking.actions';

interface BookingRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  guestsCount: number;
  eventDate: Date | string;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  branch: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    phone: string;
  };
}

interface BookingsClientProps {
  initialBookings: BookingRecord[];
  branches: { id: string; nameAr: string }[];
  defaultBranchId?: string;
}

export function BookingsClient({ initialBookings, branches, defaultBranchId }: BookingsClientProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>(defaultBranchId ?? 'ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === BookingStatus.PENDING).length,
      confirmed: bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length,
      completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchBranch = branchFilter === 'ALL' || b.branch.id === branchFilter;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        b.customerName.toLowerCase().includes(term) ||
        b.customerPhone.includes(term) ||
        (b.notes && b.notes.toLowerCase().includes(term));
      return matchStatus && matchBranch && matchSearch;
    });
  }, [bookings, statusFilter, branchFilter, search]);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdatingId(bookingId);
    try {
      const res = await updateBookingStatusAction({ bookingId, status });
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <section className="admin-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--admin-primary)] text-[var(--admin-surface)]">
                <CalendarDays size={20} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[var(--admin-foreground)]">إدارة الحجوزات والمناسبات</h1>
                <p className="text-xs admin-muted">
                  متابعة طلبات الفعاليات، البوفيهات، والحفلات الخاصة والتواصل المباشر مع العملاء
                </p>
              </div>
            </div>
          </div>

          {/* Metric Pills */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-3 text-center">
              <span className="block text-2xs admin-muted font-medium">الإجمالي</span>
              <span className="text-lg font-black text-[var(--admin-foreground)] font-mono">{stats.total}</span>
            </div>
            <div className="rounded-2xl border admin-status-warning p-3 text-center">
              <span className="block text-2xs admin-status-warning-text font-medium">قيد الانتظار</span>
              <span className="text-lg font-black text-[var(--admin-warning)] font-mono">{stats.pending}</span>
            </div>
            <div className="rounded-2xl border admin-status-success p-3 text-center">
              <span className="block text-2xs admin-status-success-text font-medium">مؤكد</span>
              <span className="text-lg font-black text-[var(--admin-accent-hover)] font-mono">{stats.confirmed}</span>
            </div>
            <div className="rounded-2xl border admin-status-info p-3 text-center">
              <span className="block text-2xs admin-status-info-text font-medium">مكتمل</span>
              <span className="text-lg font-black text-[var(--admin-info)] font-mono">{stats.completed}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 admin-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 admin-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] pr-10 pl-4 py-2.5 text-xs text-[var(--admin-foreground)] outline-none focus:border-[var(--admin-primary)] focus:bg-[var(--admin-surface)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="appearance-none rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] px-3.5 py-2.5 pl-8 text-xs font-semibold text-[var(--admin-foreground)] outline-none focus:border-[var(--admin-primary)] cursor-pointer"
            >
              <option value="ALL">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 admin-muted" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] px-3.5 py-2.5 pl-8 text-xs font-semibold text-[var(--admin-foreground)] outline-none focus:border-[var(--admin-primary)] cursor-pointer"
            >
              <option value="ALL">جميع الحالات</option>
              <option value={BookingStatus.PENDING}>قيد الانتظار</option>
              <option value={BookingStatus.CONFIRMED}>مؤكد</option>
              <option value={BookingStatus.COMPLETED}>مكتمل</option>
              <option value={BookingStatus.CANCELLED}>ملغي</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 admin-muted" />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-12 text-center">
          <CalendarDays size={40} className="mx-auto admin-muted mb-3" />
          <h3 className="text-sm font-bold text-[var(--admin-foreground)]">لا توجد طلبات حجز مطابقة</h3>
          <p className="mt-1 text-xs admin-muted">ستظهر هنا أي طلبات حجز بوفيهات أو فعاليات من الموقع العام فور تسجيلها.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => {
            const statusConf =
              BOOKING_STATUS_CONFIG[booking.status as BookingStatus] ||
              BOOKING_STATUS_CONFIG[BookingStatus.PENDING];
            const eventDateStr = new Date(booking.eventDate).toLocaleDateString('ar-EG', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            // Clean phone for WhatsApp
            const cleanPhone = booking.customerPhone.replace(/\D/g, '');
            const waLink = `https://wa.me/${cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`مرحباً أستاذ ${booking.customerName}، بخصوص طلب الحجز في ${booking.branch.nameAr}:`)}`;

            return (
              <article
                key={booking.id}
                className="overflow-hidden admin-card admin-card-hover transition"
              >
                <div className="p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Customer & Details */}
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-[var(--admin-foreground)]">
                        {booking.customerName}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-semibold ${statusConf.color}`}>
                        {statusConf.labelAr}
                      </span>
                      <span className="rounded-lg bg-[var(--admin-background)] px-2.5 py-0.5 text-xs font-medium text-[var(--admin-foreground)]">
                        {booking.branch.nameAr}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs admin-muted">
                      <span className="flex items-center gap-1.5 text-[var(--admin-foreground)] font-mono font-semibold" dir="ltr">
                        <Phone size={13} className="text-[var(--admin-warning)]" />
                        {booking.customerPhone}
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--admin-foreground)] font-medium">
                        <CalendarDays size={13} className="text-[var(--admin-warning)]" />
                        {eventDateStr}
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--admin-foreground)] font-medium">
                        <Users size={13} className="text-[var(--admin-warning)]" />
                        {booking.guestsCount} فرد
                      </span>
                    </div>

                    {booking.notes && (
                      <p className="text-xs admin-muted bg-[var(--admin-background)] rounded-xl p-2.5 border border-[var(--admin-border)] max-w-2xl leading-relaxed">
                        <span className="font-semibold text-[var(--admin-foreground)] ml-1">ملاحظات:</span>
                        {booking.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 border-t border-[var(--admin-border)] pt-3 lg:border-none lg:pt-0">
                    {/* Call Direct */}
                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border admin-control px-3 py-2 text-xs font-semibold"
                      title="اتصال هاتفي"
                    >
                      <Phone size={13} />
                      <span>اتصال</span>
                    </a>

                    {/* WhatsApp Direct */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border admin-soft-accent px-3 py-2 text-xs font-semibold"
                      title="مراسلة واتساب"
                    >
                      <MessageSquare size={13} />
                      <span>واتساب</span>
                    </a>

                    {/* Status Modifiers */}
                    {booking.status === BookingStatus.PENDING && (
                      <button
                        disabled={updatingId === booking.id}
                        onClick={() => handleUpdateStatus(booking.id, BookingStatus.CONFIRMED)}
                        className="inline-flex items-center gap-1.5 rounded-xl admin-primary-action px-3.5 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        <span>تأكيد الحجز</span>
                      </button>
                    )}

                    {booking.status === BookingStatus.CONFIRMED && (
                      <button
                        disabled={updatingId === booking.id}
                        onClick={() => handleUpdateStatus(booking.id, BookingStatus.COMPLETED)}
                        className="inline-flex items-center gap-1.5 rounded-xl admin-primary-action px-3.5 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        <span>اكتمال الفعالية</span>
                      </button>
                    )}

                    {booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.COMPLETED && (
                      <button
                        disabled={updatingId === booking.id}
                        onClick={() => handleUpdateStatus(booking.id, BookingStatus.CANCELLED)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--admin-border)] px-2.5 py-2 text-xs font-medium admin-muted hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)] hover:border-[var(--admin-danger)] disabled:opacity-50"
                        title="إلغاء الحجز"
                      >
                        <XCircle size={13} />
                        <span>إلغاء</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
