'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, Link as LinkIcon, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadProductImageAction } from '../../../actions/catalog.actions';

interface ProductImagePickerProps {
  initialUrl?: string | null;
  name?: string;
}

export function ProductImagePicker({
  initialUrl = '',
  name = 'imageUrl',
}: ProductImagePickerProps) {
  const [mode, setMode] = useState<'upload' | 'url'>(initialUrl?.startsWith('http') ? 'url' : 'upload');
  const [imageUrl, setImageUrl] = useState<string>(initialUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
      return;
    }

    // Validate MIME
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('صيغة الملف غير مدعومة. الصيغ المقبولة: JPEG, PNG, WEBP, AVIF');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadProductImageAction(formData);
      if (!res.success) {
        setUploadError(res.error || 'فشل في رفع الصورة');
        return;
      }
      setImageUrl(res.data.url);
    } catch (err) {
      console.error('Failed to upload product image:', err);
      setUploadError('حدث خطأ أثناء رفع الصورة، يرجى المحاولة ثانية');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Hidden input submitted with the form */}
      <input type="hidden" name={name} value={imageUrl} />

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[var(--admin-foreground)]">صورة الصنف</label>
        {/* Toggle Mode */}
        <div className="flex items-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'upload' ? 'bg-[var(--admin-surface)] text-[var(--admin-foreground)] shadow-2xs font-semibold' : 'text-[var(--admin-muted)] hover:text-[var(--admin-foreground)]'
            }`}
          >
            <UploadCloud size={13} />
            <span>رفع من الجهاز</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'url' ? 'bg-[var(--admin-surface)] text-[var(--admin-foreground)] shadow-2xs font-semibold' : 'text-[var(--admin-muted)] hover:text-[var(--admin-foreground)]'
            }`}
          >
            <LinkIcon size={13} />
            <span>رابط خارجي</span>
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        /* Upload Area */
        <div className="space-y-2">
          {!imageUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
                dragOver
                  ? 'border-[var(--admin-primary)] bg-[var(--admin-background)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-primary)] hover:bg-[var(--admin-primary-soft)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-[var(--admin-muted)]">
                  <Loader2 className="size-6 animate-spin text-[var(--admin-foreground)]" />
                  <span className="text-xs font-semibold">جارٍ رفع ومعالجة الصورة...</span>
                </div>
              ) : (
                <>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--admin-background)] text-[var(--admin-muted)] transition group-hover:bg-[var(--admin-primary-soft)]">
                    <UploadCloud size={20} />
                  </div>
                  <p className="mt-2.5 text-xs font-semibold text-[var(--admin-foreground)]">
                    اسحب وأفلت الصورة هنا أو <span className="text-[var(--admin-foreground)] underline underline-offset-2">تصفح ملفاتك</span>
                  </p>
                  <p className="mt-1 text-3xs text-[var(--admin-muted)]">
                    صيغ: PNG, JPG, WEBP, AVIF (الحد الأقصى: 5 ميجابايت)
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Uploaded Preview Card */
            <div className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)]">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold admin-status-success-text">
                    <CheckCircle2 size={13} />
                    <span>تم رفع الصورة بنجاح</span>
                  </div>
                  <p className="mt-0.5 truncate text-3xs text-[var(--admin-muted)] font-mono" dir="ltr">
                    {imageUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeImage}
                aria-label="حذف الصورة"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--admin-muted)] hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)] transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* External URL Mode */
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.example.com/dish.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 text-xs text-[var(--admin-foreground)] outline-none placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-primary-soft)] font-mono"
            />
            {imageUrl && (
              <button
                type="button"
                onClick={removeImage}
                aria-label="مسح الرابط"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)]"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {imageUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-2.5">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-background)]">
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="text-3xs admin-muted">
                <p className="font-semibold text-[var(--admin-foreground)]">معاينة حية للرابط</p>
                <p className="truncate max-w-xs font-mono" dir="ltr">{imageUrl}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p role="alert" className="text-xs font-medium admin-status-danger-text">
          {uploadError}
        </p>
      )}
    </div>
  );
}
