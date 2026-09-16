"use client";

import { Building2, ClipboardCheck, LayoutGrid, Settings, Users } from "lucide-react";

export type ViewId = "home" | "directory" | "review" | "close";

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof LayoutGrid;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "홈", icon: LayoutGrid },
  { id: "directory", label: "임직원", icon: Users },
  { id: "review", label: "검토함", icon: ClipboardCheck },
  { id: "close", label: "마감", icon: Building2 },
];

interface Props {
  active: ViewId;
  onSelect: (v: ViewId) => void;
  reviewBadgeCount: number;
  onOpenSettings: () => void;
}

export default function Sidebar({ active, onSelect, reviewBadgeCount, onOpenSettings }: Props) {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">P</div>
        <div className="text-sm font-bold leading-tight text-slate-900">
          Payroll
          <div className="text-[11px] font-medium text-slate-400">검증 및 마감 지원</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-soft text-brand-dark" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.id === "review" && reviewBadgeCount > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {reviewBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
          설정
        </button>
      </div>
    </aside>
  );
}
