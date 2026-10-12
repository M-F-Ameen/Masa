'use client';

import { useState } from 'react';
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Pencil,
  Power,
  Search,
  X,
  Check,
} from 'lucide-react';
import {
  createBranchAction,
  updateBranchAction,
  toggleBranchStatusAction,
} from '../../../actions/branch.actions';

interface BranchItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  address: string;
  isActive: boolean;
  _count?: { userBranches: number };
}

export function BranchClient({ initialBranches }: { initialBranches: BranchItem[] }) {
  const [branches, setBranches] = useState<BranchItem[]>(initialBranches);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);

  // Loading & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Branch Form State
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Edit Branch Form State
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Filter branches by search query
  const filteredBranches = branches.filter((branch) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      branch.code.toLowerCase().includes(q) ||
      branch.nameAr.toLowerCase().includes(q) ||
      branch.nameEn.toLowerCase().includes(q) ||
      branch.phone.includes(q) ||
      branch.address.toLowerCase().includes(q)
    );
  });

  // Handle Add Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createBranchAction({ code, nameAr, nameEn, phone, address });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setBranches((prev) => [...prev, { ...res.data, _count: { userBranches: 0 } }]);
      setIsAddModalOpen(false);
      setCode('');
      setNameAr('');
      setNameEn('');
      setPhone('');
      setAddress('');
      setSuccessMessage('تم إنشاء الفرع الجديد بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الفرع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (branch: BranchItem) => {
    setEditingBranch(branch);
    setEditNameAr(branch.nameAr);
    setEditNameEn(branch.nameEn);
    setEditPhone(branch.phone);
    setEditAddress(branch.address);
    setError(null);
  };

  // Handle Update Branch
  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await updateBranchAction(editingBranch.id, {
        nameAr: editNameAr,
        nameEn: editNameEn,
        phone: editPhone,
        address: editAddress,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      setBranches((prev) =>
        prev.map((b) =>
          b.id === editingBranch.id
            ? {
                ...b,
                nameAr: editNameAr,
                nameEn: editNameEn,
                phone: editPhone,
                address: editAddress,
              }
            : b
        )
      );

      setEditingBranch(null);
      setSuccessMessage('تم تحديث بيانات الفرع بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث بيانات الفرع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Branch Active Status
  const handleToggle = async (branchId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, isActive: nextStatus } : b))
    );

    try {
      const res = await toggleBranchStatusAction(branchId, nextStatus);
      if (!res.success) {
        // Revert on error
        setBranches((prev) =>
          prev.map((b) => (b.id === branchId ? { ...b, isActive: currentStatus } : b))
        );
        alert(res.error || 'تعذر تعديل حالة الفرع');
      }
    } catch (error) {
      console.error('Failed to toggle branch status:', error);
      // Revert on error
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? { ...b, isActive: currentStatus } : b))
      );
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-foreground)] tracking-tight">
            فروع المطعم
          </h1>
          <p className="text-xs sm:text-sm admin-muted mt-1 font-medium">
            إدارة كافة الفروع والمواقع الميدانية وتخصيص بيانات ونطاق تشغيل كل فرع
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl admin-primary-action text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          <span>إضافة فرع جديد</span>
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3 admin-status-success rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in border">
          <Check className="size-4 text-[var(--admin-accent-hover)]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="relative">
        <Search className="size-4 absolute right-3.5 top-3 admin-muted" />
        <input
          type="text"
          placeholder="بحث بكود الفرع، الاسم بالعربية أو الإنجليزية، الهاتف، أو العنوان..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-8 py-2.5 text-xs border border-[var(--admin-border)] rounded-xl focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium placeholder:text-[var(--admin-muted)] bg-[var(--admin-surface)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-3 admin-muted hover:text-[var(--admin-foreground)]"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Dual Responsive Engine: Mobile Cards View (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filteredBranches.length === 0 ? (
          <div className="bg-[var(--admin-surface)] p-8 text-center text-xs admin-muted rounded-2xl border border-[var(--admin-border)]">
            لا توجد فروع تطابق معايير البحث.
          </div>
        ) : (
          filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="admin-card p-4 space-y-3"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-[var(--admin-primary)] text-[var(--admin-surface)] font-mono font-bold text-xs grid place-items-center">
                    {branch.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--admin-foreground)]">{branch.nameAr}</h3>
                    <span className="font-mono text-xs admin-muted block">{branch.nameEn}</span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    branch.isActive
                      ? 'admin-badge admin-badge-success'
                      : 'admin-badge admin-badge-neutral'
                  }`}
                >
                  {branch.isActive ? (
                    <>
                      <CheckCircle className="size-3" />
                      <span>يعمل</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-3" />
                      <span>متوقف</span>
                    </>
                  )}
                </span>
              </div>

              {/* Card Body */}
              <div className="space-y-1.5 text-xs admin-muted">
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 admin-muted shrink-0" />
                  <a href={`tel:${branch.phone}`} className="font-mono font-medium hover:underline">
                    {branch.phone}
                  </a>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 admin-muted shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{branch.address}</span>
                </div>
              </div>

              {/* Mobile Actions Toolbar */}
              <div className="pt-2 border-t border-[var(--admin-border)] grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => openEditModal(branch)}
                  className="py-1.5 px-3 admin-control rounded-lg font-bold flex items-center justify-center gap-1.5 border"
                >
                  <Pencil className="size-3 admin-muted" />
                  <span>تعديل البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle(branch.id, branch.isActive)}
                  className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 border ${
                    branch.isActive
                      ? 'admin-status-danger'
                      : 'admin-status-success'
                  }`}
                >
                  <Power className="size-3" />
                  <span>{branch.isActive ? 'إيقاف مؤقت' : 'تفعيل الفرع'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="hidden md:block admin-card overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-[var(--admin-background)] border-b border-[var(--admin-border)] admin-muted font-bold">
            <tr>
              <th className="p-4">كود الفرع</th>
              <th className="p-4">اسم الفرع</th>
              <th className="p-4">الهاتف</th>
              <th className="p-4">العنوان</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)]">
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center admin-muted">
                  لا توجد فروع تطابق معايير البحث.
                </td>
              </tr>
            ) : (
              filteredBranches.map((branch) => (
                <tr key={branch.id} className="admin-row-hover transition">
                  <td className="p-4 font-mono font-bold text-[var(--admin-foreground)]">
                    <span className="px-2 py-1 admin-id-chip rounded-lg">
                      {branch.code}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-[var(--admin-foreground)]">{branch.nameAr}</div>
                    <div className="text-[11px] admin-muted font-mono">{branch.nameEn}</div>
                  </td>
                  <td className="p-4 admin-muted">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="size-3.5 admin-muted" />
                      <span>{branch.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 admin-muted">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 admin-muted shrink-0" />
                      <span className="truncate max-w-xs">{branch.address}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {branch.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold admin-badge admin-badge-success">
                        <CheckCircle className="size-3" />
                        <span>يعمل</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold admin-badge admin-badge-neutral">
                        <XCircle className="size-3" />
                        <span>متوقف</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 rounded-lg bg-[var(--admin-background)] hover:bg-[var(--admin-border)] text-[var(--admin-foreground)] font-bold transition"
                        title="تعديل بيانات الفرع"
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(branch.id, branch.isActive)}
                        className={`p-1.5 rounded-lg font-bold transition border ${
                          branch.isActive
                            ? 'admin-status-danger'
                            : 'admin-status-success'
                        }`}
                        title={branch.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                      >
                        <Power className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[var(--admin-foreground)]" strokeWidth={1.8} />
                <h3 className="font-bold text-sm text-[var(--admin-foreground)]">إضافة فرع جديد للمطعم</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="admin-muted hover:text-[var(--admin-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl admin-status-danger border text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">كود الفرع (فريد - مثال: CAIRO-01)</label>
                <input
                  type="text"
                  required
                  placeholder="CAIRO-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">اسم الفرع (بالعربية)</label>
                <input
                  type="text"
                  required
                  placeholder="فرع المعادي"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">اسم الفرع (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  placeholder="Maadi Branch"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="tel"
                  required
                  placeholder="010xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">العنوان التفصيلي</label>
                <textarea
                  required
                  rows={3}
                  placeholder="الشارع، المنطقة، المدينة..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border admin-control font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl admin-primary-action font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'إنشاء الفرع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-[var(--admin-foreground)]" />
                <h3 className="font-bold text-sm text-[var(--admin-foreground)]">تعديل بيانات الفرع ({editingBranch.code})</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="admin-muted hover:text-[var(--admin-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl admin-status-danger border text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">اسم الفرع (بالعربية)</label>
                <input
                  type="text"
                  required
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">اسم الفرع (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">العنوان التفصيلي</label>
                <textarea
                  required
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 rounded-xl border admin-control font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl admin-primary-action font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
