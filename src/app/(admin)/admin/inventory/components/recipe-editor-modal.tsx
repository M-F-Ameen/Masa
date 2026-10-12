'use client';

import React, { useState } from 'react';
import { X, Check, Loader2, Plus, Trash2, BookOpen } from 'lucide-react';
import { saveProductRecipesAction } from '../../../../actions/inventory.actions';
import { InventoryItemDto, RecipeItemDto } from '../../../../../domain/inventory/contracts/inventory.repository';
import { CatalogProductForRecipe } from '../inventory.types';

interface RecipeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: CatalogProductForRecipe;
  existingRecipes: RecipeItemDto[];
  inventoryItems: InventoryItemDto[];
}

interface EditableRecipeLine {
  id: string; // temporary key
  inventoryItemId: string;
  scopeType: 'PRODUCT' | 'SIZE' | 'MODIFIER';
  productSizeId?: string;
  modifierId?: string;
  quantity: number;
}

export function RecipeEditorModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  existingRecipes,
  inventoryItems,
}: RecipeEditorModalProps) {
  const [lines, setLines] = useState<EditableRecipeLine[]>(() => {
    if (existingRecipes.length === 0) return [];
    return existingRecipes.map((r) => ({
      id: r.id,
      inventoryItemId: r.inventoryItemId,
      scopeType: r.productSizeId ? 'SIZE' : r.modifierId ? 'MODIFIER' : 'PRODUCT',
      productSizeId: r.productSizeId ?? undefined,
      modifierId: r.modifierId ?? undefined,
      quantity: r.quantity,
    }));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddLine = () => {
    if (inventoryItems.length === 0) return;
    setLines((prev) => [
      ...prev,
      {
        id: 'tmp-' + Math.random().toString(),
        inventoryItemId: inventoryItems[0].id,
        scopeType: 'PRODUCT',
        quantity: 0.1,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, updates: Partial<EditableRecipeLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...updates };
        if (updates.scopeType === 'PRODUCT') {
          next.productSizeId = undefined;
          next.modifierId = undefined;
        } else if (updates.scopeType === 'SIZE' && !next.productSizeId && product.sizes[0]) {
          next.productSizeId = product.sizes[0].id;
          next.modifierId = undefined;
        } else if (updates.scopeType === 'MODIFIER' && !next.modifierId && product.modifiers[0]) {
          next.modifierId = product.modifiers[0].id;
          next.productSizeId = undefined;
        }
        return next;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const items = lines.map((l) => ({
      inventoryItemId: l.inventoryItemId,
      productSizeId: l.scopeType === 'SIZE' ? l.productSizeId ?? null : null,
      modifierId: l.scopeType === 'MODIFIER' ? l.modifierId ?? null : null,
      quantity: Number(l.quantity),
    }));

    const res = await saveProductRecipesAction({
      productId: product.id,
      items,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'حدث خطأ أثناء حفظ الوصفة');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--admin-foreground)]" strokeWidth={1.75} />
            <div>
              <h3 className="font-semibold text-[var(--admin-foreground)] text-base">
                وصفة ومكونات: {product.nameAr}
              </h3>
              <p className="text-xs admin-muted font-mono">
                {product.nameEn} • {product.categoryNameAr}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--admin-muted)] hover:text-[var(--admin-foreground)] hover:bg-[var(--admin-background)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 text-xs border admin-status-danger rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-lg p-3 text-xs text-[var(--admin-muted)] space-y-1">
            <p className="font-semibold text-[var(--admin-foreground)]">ملاحظة تشغيلية (الوصفات اختيارية):</p>
            <p>
              إذا لم تقم بإضافة مكونات، سيعمل الصنف بنظام التشغيل المباشر دون خصم تلقائي من الوصفات.
              يمكنك ربط المكونات بالصنف ككل، أو تخصيص مكونات لكل مقاس أو إضافة بشكل مستقل.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--admin-foreground)]">بنود الوصفة واستهلاك المواد الخام</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="admin-control inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مكون للطبق</span>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[var(--admin-border)] rounded-lg text-[var(--admin-muted)] text-xs">
                لا توجد مكونات مربوطة حالياً. الصنف يعمل بالتشغيل المباشر.
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => {
                  const selectedInv = inventoryItems.find((i) => i.id === line.inventoryItemId);
                  return (
                    <div
                      key={line.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)]"
                    >
                      {/* Component Item */}
                      <div className="flex-1 w-full sm:w-auto">
                        <select
                          value={line.inventoryItemId}
                          onChange={(e) => handleUpdateLine(line.id, { inventoryItemId: e.target.value })}
                          className="w-full text-xs border border-[var(--admin-border)] rounded-md px-2 py-1.5 bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                        >
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.nameAr} ({inv.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Scope Type */}
                      <div className="w-full sm:w-32">
                        <select
                          value={line.scopeType}
                          onChange={(e) =>
                            handleUpdateLine(line.id, {
                              scopeType: e.target.value as 'PRODUCT' | 'SIZE' | 'MODIFIER',
                            })
                          }
                          className="w-full text-xs border border-[var(--admin-border)] rounded-md px-2 py-1.5 bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                        >
                          <option value="PRODUCT">الصنف ككل</option>
                          {product.sizes.length > 0 && <option value="SIZE">لمقاس محدد</option>}
                          {product.modifiers.length > 0 && <option value="MODIFIER">لإضافة محددة</option>}
                        </select>
                      </div>

                      {/* Specific size/modifier selector */}
                      {line.scopeType === 'SIZE' && (
                        <div className="w-full sm:w-32">
                          <select
                            value={line.productSizeId ?? ''}
                            onChange={(e) => handleUpdateLine(line.id, { productSizeId: e.target.value })}
                            className="w-full text-xs border border-[var(--admin-border)] rounded-md px-2 py-1.5 bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                          >
                            {product.sizes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nameAr}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {line.scopeType === 'MODIFIER' && (
                        <div className="w-full sm:w-36">
                          <select
                            value={line.modifierId ?? ''}
                            onChange={(e) => handleUpdateLine(line.id, { modifierId: e.target.value })}
                            className="w-full text-xs border border-[var(--admin-border)] rounded-md px-2 py-1.5 bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                          >
                            {product.modifiers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nameAr} ({m.groupNameAr})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity */}
                      <div className="w-full sm:w-28 flex items-center gap-1">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          required
                          value={line.quantity || ''}
                          onChange={(e) => handleUpdateLine(line.id, { quantity: Number(e.target.value) })}
                          placeholder="الكمية"
                          className="w-full text-xs font-mono border border-[var(--admin-border)] rounded-md px-2 py-1.5 bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                        />
                        <span className="text-[10px] text-[var(--admin-muted)] whitespace-nowrap">
                          {selectedInv?.unit ?? ''}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="p-1.5 text-[var(--admin-muted)] hover:text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)] rounded-md self-end sm:self-auto"
                        title="حذف البند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
              <span>حفظ الوصفة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
