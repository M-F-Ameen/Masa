'use client';

import React, { useState } from 'react';
import { X, Check, Loader2, Truck } from 'lucide-react';
import { saveSupplierAction } from '../../../../actions/inventory.actions';
import { SupplierDto } from '../../../../../domain/inventory/contracts/inventory.repository';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: SupplierDto | null;
}

export function SupplierModal({ isOpen, onClose, onSuccess, supplierToEdit }: SupplierModalProps) {
  const [name, setName] = useState(supplierToEdit?.name ?? '');
  const [contactName, setContactName] = useState(supplierToEdit?.contactName ?? '');
  const [phone, setPhone] = useState(supplierToEdit?.phone ?? '');
  const [email, setEmail] = useState(supplierToEdit?.email ?? '');
  const [address, setAddress] = useState(supplierToEdit?.address ?? '');
  const [taxNumber, setTaxNumber] = useState(supplierToEdit?.taxNumber ?? '');
  const [isActive, setIsActive] = useState(supplierToEdit?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await saveSupplierAction({
      id: supplierToEdit?.id,
      name: name.trim(),
      contactName: contactName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
      isActive,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'حدث خطأ أثناء حفظ بيانات المورد');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <h3 className="font-semibold text-[var(--admin-foreground)] text-base">
              {supplierToEdit ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--admin-muted)] hover:text-[var(--admin-foreground)] hover:bg-[var(--admin-background)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-xs border admin-status-danger rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">اسم المورد / الشركة *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شركة النيل للحوم"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">اسم المسؤول / مندوب المبيعات</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="مثال: أ. محمد أحمد"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">العنوان أو المقر</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: المنطقة الصناعية، العبور"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-foreground)] mb-1">الرقم الضريبي / السجل التجاري</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="123-456-789"
                className="w-full text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[var(--admin-foreground)] focus:outline-hidden focus:border-[var(--admin-primary)] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveSupplier"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded-sm border-[var(--admin-border)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
            />
            <label htmlFor="isActiveSupplier" className="text-xs font-medium text-[var(--admin-foreground)]">
              المورد نشط ومتاح لإصدار أوامر التوريد
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--admin-border)]">
            <button
              type="button"
              onClick={onClose}
              className="admin-control px-4 py-2 text-xs font-medium rounded-lg border"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium admin-primary-action rounded-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{supplierToEdit ? 'حفظ التعديلات' : 'إضافة المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
