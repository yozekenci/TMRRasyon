"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Database,
  FlaskConical,
  ClipboardList,
  Leaf,
  Tag,
  GitCompare,
} from "lucide-react";

type NavItem = { href: string; label: string; Icon: React.ComponentType<{ className?: string }> };
type NavGroup = { items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/",       label: "Dashboard",        Icon: LayoutDashboard },
    ],
  },
  {
    items: [
      { href: "/animals",            label: "Hayvan Profilleri", Icon: Users     },
      { href: "/ingredients",        label: "Yem Veritabanı",    Icon: Database  },
      { href: "/ingredients/prices", label: "Fiyat Güncelle",    Icon: Tag       },
    ],
  },
  {
    items: [
      { href: "/rations/new",  label: "Rasyon Oluştur",   Icon: FlaskConical  },
      { href: "/rations",      label: "Kayıtlı Rasyonlar", Icon: ClipboardList },
      { href: "/rations/compare", label: "Karşılaştır",   Icon: GitCompare    },
    ],
  },
];

/** Returns true only when this nav item is the best match for the current path. */
function isActive(href: string, pathname: string, allHrefs: string[]): boolean {
  if (href === "/") return pathname === "/";
  if (!pathname.startsWith(href)) return false;
  // Check no longer href in the same list also matches — if so, that item is more specific
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      pathname.startsWith(other)
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));

  return (
    <aside className="w-60 bg-green-950 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[15px] text-white leading-tight tracking-tight">
              TMR Rasyon
            </h1>
            <p className="text-[11px] text-green-400 font-medium mt-0.5">NRC 2023</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {gi > 0 && (
              <div className="border-t border-white/5 mb-2" />
            )}
            {group.items.map(({ href, label, Icon }) => {
              const active = isActive(href, pathname, allHrefs);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-green-700 text-white shadow-sm"
                      : "text-green-200/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] flex-shrink-0 ${
                      active ? "text-white" : "text-green-400/80"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-green-500/70 leading-relaxed">
          NRC 2023 Besi Sığırı
          <span className="mx-1.5 opacity-50">·</span>
          PuLP CBC LP Optimizer
        </p>
      </div>
    </aside>
  );
}
