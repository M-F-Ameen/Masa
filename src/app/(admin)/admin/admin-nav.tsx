'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Wallet,
  Settings,
  Store,
  Contact,
  BarChart3,
  Armchair,
  LayoutGrid,
  ChefHat,
  Receipt,
  CalendarCheck,
  PhoneCall,
  LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Wallet,
  Settings,
  Store,
  Contact,
  BarChart3,
  Armchair,
  LayoutGrid,
  ChefHat,
  Receipt,
  CalendarCheck,
  PhoneCall,
};

export interface AdminNavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: string | number | null;
  badgeColor?: 'zinc' | 'emerald' | 'rose' | 'amber' | 'blue';
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

interface AdminNavProps {
  sections?: AdminNavSection[];
  items?: AdminNavItem[];
  onItemClick?: () => void;
  className?: string;
  searchQuery?: string;
}

export function AdminNav({ sections, items, onItemClick, className, searchQuery }: AdminNavProps) {
  const pathname = usePathname();

  // Normalize sections (backwards-compatible with flat items)
  const effectiveSections: AdminNavSection[] = sections
    ? sections
    : items
    ? [{ items }]
    : [];

  const query = (searchQuery ?? '').trim().toLowerCase();
  const visibleSections = query
    ? effectiveSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.label.toLowerCase().includes(query)),
        }))
        .filter((section) => section.items.length > 0)
    : effectiveSections;

  return (
    <nav className={className || 'space-y-4'}>
      {query && visibleSections.length === 0 && (
        <p className="admin-muted px-4 py-3 text-xs">لا توجد نتائج مطابقة.</p>
      )}
      {visibleSections.map((section, sIdx) => (
        <div key={section.title || `section-${sIdx}`} className="space-y-2">
          <div className="space-y-2">
            {section.items.map((item) => {
              const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              const badgeTone =
                item.badgeColor === 'rose'
                  ? 'admin-badge-danger'
                  : item.badgeColor === 'emerald'
                  ? 'admin-badge-success'
                  : item.badgeColor === 'amber'
                  ? 'admin-badge-warning'
                  : item.badgeColor === 'blue'
                  ? 'admin-badge-info'
                  : 'admin-badge-neutral';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                    className={`group flex min-h-12 shrink-0 items-center justify-between rounded-lg border border-transparent px-4 py-2.5 text-sm md:w-full ${
                    isActive
                      ? 'admin-nav-link-active font-bold'
                      : 'admin-nav-link font-medium'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3 truncate">
                    <Icon
                      className="admin-nav-icon size-6 shrink-0 transition-colors"
                      strokeWidth={isActive ? 2.1 : 1.8}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`admin-badge font-mono ${
                          isActive
                            ? 'admin-badge-active'
                            : `${badgeTone}${item.badgeColor === 'rose' ? ' animate-pulse' : ''}`
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                       <span className="size-1.5 rounded-full bg-[var(--admin-signal)] md:hidden" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
