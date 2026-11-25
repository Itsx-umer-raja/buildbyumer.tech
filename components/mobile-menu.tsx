"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/tools", label: "All tools" },
  { href: "/resume", label: "Resume Builder" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

/** Hamburger menu for small screens — the desktop nav is hidden below md. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2 text-slate-700 shadow-sm hover:border-slate-900"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full border-b border-slate-200 bg-[#faf9f6] px-4 py-2 shadow-lg"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-teal-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
