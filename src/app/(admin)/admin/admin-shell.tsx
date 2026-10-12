'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Store,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Building2,
} from 'lucide-react';
import { AdminNav, AdminNavItem, AdminNavSection, ICON_MAP } from './admin-nav';
import { BranchSwitcher } from './branch-switcher';

interface AdminShellProps {
  restaurantNameAr: string;
  restaurantNameEn: string;
  currency: string;
  currencySymbol: string;
  branches: Array<{ id: string; code: string; nameAr: string }>;
  activeBranchId: string | null;
  canSwitchBranches: boolean;
  displayName: string;
  roleName: string;
  visibleNavItems?: AdminNavItem[];
  navSections?: AdminNavSection[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

export function AdminShell({
  restaurantNameAr,
  restaurantNameEn,
  currency,
  currencySymbol,
  branches,
  activeBranchId,
  canSwitchBranches,
  displayName,
  roleName,
  visibleNavItems,
  navSections,
  logoutAction,
  children,
}: AdminShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  // Render standalone full-screen layout for Kitchen KDS without white sidebar
  if (pathname === '/admin/kitchen') {
    return (
      <div className="kitchen-shell h-screen w-screen overflow-hidden flex flex-col font-sans" dir="rtl">
        {children}
      </div>
    );
  }

  const effectiveSections =
    navSections && navSections.length > 0
      ? navSections
      : visibleNavItems
      ? [{ items: visibleNavItems }]
      : [];

  const allNavItems = visibleNavItems || effectiveSections.flatMap((s) => s.items);

  // Determine current active section for mobile header indicator
  const currentNavItem =
    allNavItems.find((item) =>
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname === item.href || pathname.startsWith(item.href + '/')
    ) ?? allNavItems[0];

  const CurrentIcon = currentNavItem ? (ICON_MAP[currentNavItem.iconName] || LayoutDashboard) : LayoutDashboard;

  return (
    <div className="admin-app flex min-h-screen flex-col bg-[var(--admin-background)] font-sans text-[var(--admin-foreground)] md:h-screen md:flex-row md:overflow-hidden" dir="rtl">
      {/* 1. Mobile Top App Bar (Sleek, Clean, Shows exactly where the user is) */}
      <header className="admin-topbar sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-3.5 backdrop-blur-md md:hidden">
        {/* Right side: Drawer Toggle Button + Current Page Title & Icon */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="فتح القائمة الرئيسية"
            className="admin-control grid size-9 place-items-center rounded-xl border active:scale-95"
          >
            <Menu className="size-4" strokeWidth={1.8} />
          </button>

          {/* Active Screen Indicator */}
          <div className="admin-soft-primary flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold">
            <CurrentIcon className="size-3.5" strokeWidth={2} />
            <span className="truncate max-w-[130px] sm:max-w-xs">{currentNavItem?.label ?? 'لوحة التحكم'}</span>
          </div>
        </div>

        {/* Center: compact restaurant identity when the mobile width allows it */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
          <div className="admin-primary-action grid size-8 shrink-0 place-items-center rounded-lg">
            <Store className="size-4 text-white" strokeWidth={1.75} />
          </div>
          <div className="hidden min-w-0 max-w-[28vw] text-right sm:block">
            <p className="truncate text-xs font-bold leading-tight text-[var(--admin-foreground)]">
              {restaurantNameAr}
            </p>
            <p className="admin-muted truncate font-mono text-[9px] leading-tight">
              {restaurantNameEn}
            </p>
          </div>
        </div>

        {/* Left side: Branch code pill + User Avatar */}
        <div className="flex shrink-0 items-center gap-2">
          {activeBranch && (
            <span className="admin-soft-primary flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium">
              <Building2 className="size-3" />
              <span>{activeBranch.code}</span>
            </span>
          )}
          <div className="admin-avatar grid size-8 place-items-center rounded-full text-xs font-bold shadow-2xs">
            {displayName.slice(0, 1)}
          </div>
        </div>
      </header>

      {/* 2. Mobile Slide-Over Drawer (Side Dashboard for Phones/Tablets) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop blur overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Sliding Drawer Container */}
          <aside className="admin-sidebar fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between shadow-2xl transition-transform duration-200 animate-in slide-in-from-right">
            <div>
              {/* Drawer Header */}
              <div className="admin-sidebar-header flex h-16 items-center justify-end border-b px-4">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="admin-control grid size-8 place-items-center rounded-lg border"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Branch Switcher & User Profile in Mobile Drawer */}
              <div className="admin-sidebar-profile space-y-2.5 border-b p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="admin-avatar grid size-8 place-items-center rounded-full text-xs font-bold">
                    {displayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-xs font-bold text-[var(--admin-foreground)]">{displayName}</p>
                    <p className="admin-muted text-[10px] font-mono">{roleName}</p>
                  </div>
                </div>

                <div className="admin-branch-switcher pt-1">
                  <BranchSwitcher
                    branches={branches}
                    activeBranchId={activeBranchId}
                    canSwitchBranches={canSwitchBranches}
                  />
                </div>
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="max-h-[55vh] overflow-y-auto scrollbar-none p-3">
                <AdminNav
                  sections={effectiveSections}
                  className="space-y-4"
                  onItemClick={() => setIsDrawerOpen(false)}
                />
              </div>
            </div>

            {/* Mobile Drawer Footer with Logout */}
            <div className="admin-sidebar-footer space-y-3 border-t p-4">
              <div className="flex items-center justify-between text-xs">
                <span>العملة: {currency} ({currencySymbol})</span>
                <span className="admin-soft-accent rounded-full border px-2 py-0.5 text-[10px] font-medium">
                  نشط
                </span>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="admin-sidebar-danger-action flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold transition shadow-2xs"
                >
                  <LogOut className="size-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* 3. Desktop Permanent Sidebar (Hidden on mobile, pristine on desktop) */}
      <aside className="admin-sidebar hidden h-screen overflow-hidden md:sticky md:top-0 md:flex md:w-64 md:shrink-0 md:flex-col md:justify-between border-l shadow-xs">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Navigation Items with Grouped Sections */}
          <div className="min-h-0 w-full flex-1 overflow-y-auto scrollbar-none p-3">
            <AdminNav sections={effectiveSections} className="space-y-4" />
          </div>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="admin-sidebar-footer border-t p-3.5 shrink-0">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>
              العملة: {currency} ({currencySymbol})
            </span>
            <span className="admin-soft-accent flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--admin-accent)] animate-pulse" />
              <span>متصل</span>
            </span>
          </div>
        </div>
      </aside>

      {/* 4. Main Content Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Desktop Top Header (Hidden on mobile) */}
        <header className="admin-topbar sticky top-0 z-40 hidden h-16 shrink-0 items-center justify-between gap-4 border-b px-6 md:flex">
          {/* RTL start/right zone: the single global restaurant identity */}
          <div className="flex min-w-0 flex-1 basis-0 items-center gap-3">
            <div className="admin-primary-action grid size-10 shrink-0 place-items-center rounded-xl shadow-2xs">
              <Store className="size-5 text-white" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-[var(--admin-foreground)]">
                {restaurantNameAr}
              </p>
              <p className="admin-muted truncate font-mono text-[10px] leading-tight">
                {restaurantNameEn}
              </p>
            </div>
          </div>

          {/* Flexible middle zone: branch scope */}
          <div className="admin-header-branch flex min-w-0 flex-1 basis-0 items-center justify-center">
            <BranchSwitcher
              branches={branches}
              activeBranchId={activeBranchId}
              canSwitchBranches={canSwitchBranches}
            />
          </div>

          {/* Opposite/left zone: user identity and session controls */}
          <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-3">
            <div className="admin-avatar grid size-8 place-items-center rounded-full text-xs font-bold">
              {displayName.slice(0, 1)}
            </div>
            <div className="min-w-0 max-w-48 flex-1 text-right text-xs">
              <p className="truncate font-medium text-[var(--admin-foreground)]">{displayName}</p>
              <p className="admin-muted truncate font-mono text-[10px]">{roleName}</p>
            </div>
            <form action={logoutAction}>
              <button
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="admin-control grid size-9 place-items-center rounded-xl border"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain scrollbar-none p-3.5 sm:p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
