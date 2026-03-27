"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Dumbbell, Salad, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/workout-logger", label: "Logger", icon: Dumbbell },
  { href: "/workout-logs", label: "Logs", icon: ClipboardList },
  { href: "/diet", label: "Diet", icon: Salad },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 p-2 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition ${
                  active ? "bg-lime-500/20 text-lime-300" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
