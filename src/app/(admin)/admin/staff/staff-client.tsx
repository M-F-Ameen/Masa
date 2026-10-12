'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  Building2,
  Phone,
  CheckCircle,
  XCircle,
  Pencil,
  KeyRound,
  Power,
  Search,
  X,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  createStaffAction,
  updateStaffAction,
  resetStaffPasswordAction,
  toggleStaffStatusAction,
} from '../../../actions/staff.actions';

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  role: { id: string; name: string; description: string | null };
  userBranches: { isDefault: boolean; branch: { id: string; nameAr: string; code: string } }[];
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  permissions?: {
    permission: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      category: string;
    };
  }[];
}

interface BranchOption {
  id: string;
  code: string;
  nameAr: string;
}

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

export function StaffClient({
  initialStaff,
  roles,
  branches,
  permissions,
  currentUserId,
}: {
  initialStaff: StaffUser[];
  roles: RoleOption[];
  branches: BranchOption[];
  permissions: PermissionItem[];
  currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'ROLES'>('STAFF');
  const [staffList, setStaffList] = useState<StaffUser[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [resettingPasswordStaff, setResettingPasswordStaff] = useState<StaffUser | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add staff form
  const [addUsername, setAddUsername] = useState('');
  const [addFullName, setAddFullName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRoleId, setAddRoleId] = useState(roles[0]?.id ?? '');
  const [addBranches, setAddBranches] = useState<string[]>(
    branches[0]?.id ? [branches[0].id] : []
  );

  // Edit staff form
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editBranches, setEditBranches] = useState<string[]>([]);

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  // Filter staff list
  const filteredStaff = staffList.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      user.fullName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.phone.includes(q) ||
      user.role.name.toLowerCase().includes(q)
    );
  });

  // Handle Add Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createStaffAction({
        username: addUsername,
        fullName: addFullName,
        phone: addPhone,
        password: addPassword,
        roleId: addRoleId,
        branchIds: addBranches,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      const selectedRole = roles.find((r) => r.id === addRoleId);
      const assigned = branches
        .filter((b) => addBranches.includes(b.id))
        .map((b, i) => ({ isDefault: i === 0, branch: b }));

      setStaffList((prev) => [
        {
          id: res.data.id,
          username: addUsername,
          fullName: addFullName,
          phone: addPhone,
          isActive: true,
          role: selectedRole ?? { id: addRoleId, name: 'STAFF', description: null },
          userBranches: assigned,
        },
        ...prev,
      ]);

      setIsAddModalOpen(false);
      setAddUsername('');
      setAddFullName('');
      setAddPhone('');
      setAddPassword('');
      setSuccessMessage('تمت إضافة الموظف الجديد بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة الموظف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditFullName(staff.fullName);
    setEditPhone(staff.phone);
    setEditRoleId(staff.role.id);
    setEditBranches(staff.userBranches.map((ub) => ub.branch.id));
    setError(null);
  };

  // Handle Update Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await updateStaffAction({
        userId: editingStaff.id,
        fullName: editFullName,
        phone: editPhone,
        roleId: editRoleId,
        branchIds: editBranches,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      const selectedRole = roles.find((r) => r.id === editRoleId);
      const assigned = branches
        .filter((b) => editBranches.includes(b.id))
        .map((b, i) => ({ isDefault: i === 0, branch: b }));

      setStaffList((prev) =>
        prev.map((u) =>
          u.id === editingStaff.id
            ? {
                ...u,
                fullName: editFullName,
                phone: editPhone,
                role: selectedRole ?? u.role,
                userBranches: assigned,
              }
            : u
        )
      );

      setEditingStaff(null);
      setSuccessMessage('تم تحديث بيانات الموظف بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الموظف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordStaff) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await resetStaffPasswordAction({
        userId: resettingPasswordStaff.id,
        newPassword,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      setResettingPasswordStaff(null);
      setNewPassword('');
      setSuccessMessage(`تم تغيير كلمة المرور للموظف (${resettingPasswordStaff.fullName}) بنجاح`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (user: StaffUser) => {
    if (user.id === currentUserId) {
      alert('لا يمكنك إيقاف حسابك الشخصي المسجل به حالياً.');
      return;
    }

    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `هل تريد تفعيل حساب الموظف "${user.fullName}"؟`
      : `هل أنت متأكد من إيقاف حساب الموظف "${user.fullName}"؟ لن يتمكن من تسجيل الدخول للنظام.`;

    if (!window.confirm(confirmMsg)) return;

    // Optimistic update
    setStaffList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
    );

    try {
      const res = await toggleStaffStatusAction(user.id, nextStatus);
      if (!res.success) {
        // Revert on failure
        setStaffList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
        );
        alert(res.error || 'تعذر تغيير حالة الحساب');
      }
    } catch (error) {
      console.error('Failed to toggle staff active status:', error);
      // Revert on failure
      setStaffList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
      );
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner and Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-foreground)] tracking-tight">
            الموظفين والصلاحيات
          </h1>
          <p className="text-xs sm:text-sm admin-muted mt-1 font-medium">
            إدارة طاقم العمل، تعديل الصلاحيات، وإعادة تعيين كلمات المرور، ونطاق الفروع
          </p>
        </div>

        {activeTab === 'STAFF' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl admin-primary-action text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="size-4" />
            <span>إضافة موظف جديد</span>
          </button>
        )}
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3 admin-status-success rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in border">
          <Check className="size-4 text-[var(--admin-accent-hover)]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-[var(--admin-background)] p-1 rounded-xl w-fit text-xs font-bold border border-[var(--admin-border)]">
        <button
          type="button"
          onClick={() => setActiveTab('STAFF')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'STAFF'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-foreground)] shadow-2xs'
              : 'admin-muted hover:text-[var(--admin-foreground)]'
          }`}
        >
          <Users className="size-4" />
          <span>طاقم العمل ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ROLES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'ROLES'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-foreground)] shadow-2xs'
              : 'admin-muted hover:text-[var(--admin-foreground)]'
          }`}
        >
          <Shield className="size-4" />
          <span>مصفوفة الصلاحيات والأدوار</span>
        </button>
      </div>

      {/* Tab 1: Staff List View */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="size-4 absolute right-3.5 top-3 admin-muted" />
            <input
              type="text"
              placeholder="بحث بالاسم، اسم المستخدم، رقم الهاتف، أو الدور الوظيفي..."
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
            {filteredStaff.length === 0 ? (
              <div className="bg-[var(--admin-surface)] p-8 text-center text-xs admin-muted rounded-2xl border border-[var(--admin-border)]">
                لا يوجد موظفين يطابقون معايير البحث.
              </div>
            ) : (
              filteredStaff.map((user) => (
                <div
                  key={user.id}
                  className="admin-card p-4 space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--admin-foreground)]">{user.fullName}</h3>
                      <span className="font-mono text-xs admin-muted mt-0.5 block">
                        @{user.username}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        user.isActive
                          ? 'admin-badge admin-badge-success'
                          : 'admin-badge admin-badge-neutral'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <CheckCircle className="size-3" />
                          <span>مفعل</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3" />
                          <span>معطل</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold admin-muted block">الدور الوظيفي:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--admin-background)] text-[var(--admin-foreground)] text-[11px] font-bold">
                        <Shield className="size-3 admin-muted" />
                        <span>{user.role.name}</span>
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold admin-muted block">رقم الهاتف:</span>
                      <a
                        href={`tel:${user.phone}`}
                        className="inline-flex items-center gap-1 font-mono text-[var(--admin-foreground)] font-medium hover:underline text-[11px]"
                      >
                        <Phone className="size-3 admin-muted" />
                        <span>{user.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Assigned Branches */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold admin-muted block">نطاق الفروع:</span>
                    <div className="flex flex-wrap gap-1">
                      {user.userBranches.length > 0 ? (
                        user.userBranches.map((ub) => (
                          <span
                            key={ub.branch.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--admin-background)] text-[var(--admin-foreground)] border border-[var(--admin-border)] font-medium"
                          >
                            <Building2 className="size-2.5 admin-muted" />
                            <span>{ub.branch.nameAr}</span>
                          </span>
                        ))
                      ) : (
                        <span className="admin-muted text-[11px]">كافة الفروع</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="pt-2 border-t border-[var(--admin-border)] grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="py-1.5 px-2 admin-control rounded-lg font-bold flex items-center justify-center gap-1 border"
                    >
                      <Pencil className="size-3 admin-muted" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResettingPasswordStaff(user);
                        setNewPassword('');
                        setError(null);
                      }}
                      className="py-1.5 px-2 admin-control rounded-lg font-bold flex items-center justify-center gap-1 border"
                    >
                      <KeyRound className="size-3 admin-muted" />
                      <span>كلمة السر</span>
                    </button>

                    <button
                      type="button"
                      disabled={user.id === currentUserId}
                      onClick={() => handleToggleStatus(user)}
                      className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                        user.id === currentUserId
                          ? 'bg-[var(--admin-background)] admin-muted border-[var(--admin-border)] cursor-not-allowed'
                          : user.isActive
                          ? 'admin-status-danger'
                          : 'admin-status-success'
                      }`}
                    >
                      <Power className="size-3" />
                      <span>{user.isActive ? 'إيقاف' : 'تفعيل'}</span>
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
                  <th className="p-4">اسم المستخدم</th>
                  <th className="p-4">الاسم الكامل</th>
                  <th className="p-4">الهاتف</th>
                  <th className="p-4">الدور الوظيفي</th>
                  <th className="p-4">الفروع المعينة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center admin-muted">
                      لا يوجد موظفين يطابقون معايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((user) => (
                    <tr key={user.id} className="admin-row-hover transition">
                      <td className="p-4 font-mono font-bold text-[var(--admin-foreground)]">
                        {user.username}
                      </td>
                      <td className="p-4 font-bold text-[var(--admin-foreground)]">{user.fullName}</td>
                      <td className="p-4 admin-muted">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="size-3 admin-muted" />
                          <span>{user.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[var(--admin-background)] text-[var(--admin-foreground)] border border-[var(--admin-border)]">
                          <Shield className="size-3 admin-muted" />
                          <span>{user.role.name}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {user.userBranches.length > 0 ? (
                            user.userBranches.map((ub) => (
                              <span
                                key={ub.branch.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--admin-background)] text-[var(--admin-foreground)] border border-[var(--admin-border)] font-medium"
                              >
                                <Building2 className="size-2.5 admin-muted" />
                                <span>{ub.branch.nameAr}</span>
                              </span>
                            ))
                          ) : (
                            <span className="admin-muted text-[11px]">كافة الفروع</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold admin-badge admin-badge-success">
                            <CheckCircle className="size-3" />
                            <span>مفعل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold admin-badge admin-badge-neutral">
                            <XCircle className="size-3" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg bg-[var(--admin-background)] hover:bg-[var(--admin-border)] text-[var(--admin-foreground)] font-bold transition"
                            title="تعديل بيانات الموظف"
                          >
                            <Pencil className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResettingPasswordStaff(user);
                              setNewPassword('');
                              setError(null);
                            }}
                            className="p-1.5 rounded-lg bg-[var(--admin-background)] hover:bg-[var(--admin-border)] text-[var(--admin-foreground)] font-bold transition"
                            title="تغيير كلمة المرور"
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={user.id === currentUserId}
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-lg font-bold transition ${
                              user.id === currentUserId
                                ? 'bg-[var(--admin-background)] admin-muted cursor-not-allowed'
                                : user.isActive
                                ? 'admin-status-danger border'
                                : 'admin-status-success border'
                            }`}
                            title={user.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
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
        </div>
      )}

      {/* Tab 2: Roles and Permissions Matrix */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">
          <div className="admin-card p-5 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-[var(--admin-foreground)]" />
              <h2 className="text-base font-bold text-[var(--admin-foreground)]">مصفوفة الصلاحيات والأدوار المعتمدة</h2>
            </div>
            <p className="text-xs admin-muted leading-relaxed">
              يوضح الجدول التالي الصلاحيات والقدرات الفنية الممنوحة لكل دور وظيفي في المنظومة. الصلاحيات محددة بدقة لضمان أمان العمليات المالية والميدانية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const rolePermCodes = (role.permissions || []).map((rp) => rp.permission.code);
              return (
                <div
                  key={role.id}
                  className="admin-card p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black bg-[var(--admin-foreground)] text-[var(--admin-surface)] px-2.5 py-1 rounded-lg">
                        {role.name}
                      </span>
                      <span className="text-[11px] admin-muted font-mono">
                        {rolePermCodes.length} صلاحيات
                      </span>
                    </div>

                    <p className="text-xs admin-muted font-medium leading-relaxed">
                      {role.description || 'دور مخصص في المنظومة'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-[var(--admin-border)]">
                    <span className="text-[10px] font-bold admin-muted block uppercase tracking-wider">
                      القدرات التشغيلية الممنوحة:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rolePermCodes.map((code) => {
                        const permDef = permissions.find((p) => p.code === code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--admin-background)] text-[var(--admin-foreground)] border border-[var(--admin-border)] font-medium"
                            title={permDef?.description || code}
                          >
                            <Check className="size-2.5 text-[var(--admin-accent-hover)]" />
                            <span>{permDef?.name || code}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal 1: Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[var(--admin-foreground)]" strokeWidth={1.8} />
                <h3 className="font-bold text-sm text-[var(--admin-foreground)]">إضافة موظف جديد</h3>
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

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">اسم المستخدم (لتسجيل الدخول)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: cashier_alex"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  required
                  placeholder="010xxxxxxxx"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">كلمة المرور الابتدائية</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="6 خانات على الأقل"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الدور الوظيفي (الصلاحيات)</label>
                <select
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `— ${r.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الفروع المعين لها الموظف</label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)]">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--admin-foreground)]"
                    >
                      <input
                        type="checkbox"
                        checked={addBranches.includes(b.id)}
                        onChange={() => {
                          setAddBranches((prev) =>
                            prev.includes(b.id)
                              ? prev.filter((id) => id !== b.id)
                              : [...prev, b.id]
                          );
                        }}
                        className="rounded border-[var(--admin-border)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
                      />
                      <span>{b.nameAr} ({b.code})</span>
                    </label>
                  ))}
                </div>
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
                  {isSubmitting ? 'جارٍ الحفظ...' : 'إضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-[var(--admin-foreground)]" />
                <h3 className="font-bold text-sm text-[var(--admin-foreground)]">تعديل بيانات الموظف</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="admin-muted hover:text-[var(--admin-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 bg-[var(--admin-background)] rounded-xl border border-[var(--admin-border)] flex items-center justify-between text-xs">
              <span className="admin-muted font-bold">اسم المستخدم:</span>
              <span className="font-mono font-black text-[var(--admin-foreground)]">@{editingStaff.username}</span>
            </div>

            {error && (
              <div className="p-3 rounded-xl admin-status-danger border text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] font-mono text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الدور الوظيفي (الصلاحيات)</label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `— ${r.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">الفروع المخصصة</label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)]">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--admin-foreground)]"
                    >
                      <input
                        type="checkbox"
                        checked={editBranches.includes(b.id)}
                        onChange={() => {
                          setEditBranches((prev) =>
                            prev.includes(b.id)
                              ? prev.filter((id) => id !== b.id)
                              : [...prev, b.id]
                          );
                        }}
                        className="rounded border-[var(--admin-border)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
                      />
                      <span>{b.nameAr} ({b.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
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

      {/* Modal 3: Reset Password Modal */}
      {resettingPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-[var(--admin-foreground)]" />
                <h3 className="font-bold text-sm text-[var(--admin-foreground)]">إعادة تعيين كلمة المرور</h3>
              </div>
              <button
                type="button"
                onClick={() => setResettingPasswordStaff(null)}
                className="admin-muted hover:text-[var(--admin-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="admin-muted">الموظف:</span>
              <p className="font-bold text-[var(--admin-foreground)] text-sm">{resettingPasswordStaff.fullName}</p>
              <span className="font-mono admin-muted block">@{resettingPasswordStaff.username}</span>
            </div>

            {error && (
              <div className="p-3 rounded-xl admin-status-danger border text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-foreground)] mb-1">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="أدخل كلمة مرور جديدة (6 خانات على الأقل)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-background)] text-xs focus:bg-[var(--admin-surface)] focus:ring-1 focus:ring-[var(--admin-primary)] outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setResettingPasswordStaff(null)}
                  className="px-4 py-2 rounded-xl border admin-control font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 6}
                  className="px-5 py-2 rounded-xl admin-primary-action font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ التغيير...' : 'تأكيد التغيير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
