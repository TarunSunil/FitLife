"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/workout-logger", label: "Workout Logger" },
  { href: "/workout-logs", label: "Workout Logs" },
  { href: "/diet", label: "Diet Plan" },
  { href: "/settings", label: "Settings" },
];

export default function AppTopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-black/90 backdrop-blur md:block">
      <nav className="mx-auto max-w-[1500px] px-6 py-3">
        <ul className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-lime-500/20 text-lime-300"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
