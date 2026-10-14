"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import LogoutButton from "./LogoutButton";


export default function Nav({
  orgName,
  links,
}: {
  orgName: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const initial = orgName?.trim()?.[0]?.toUpperCase() ?? "?";



  // Prevent the page from scrolling behind the mobile navigation.
  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
  if (!menuOpen) return;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  }

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, [menuOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        <Image
          src="/brand/logo-full.png"
          alt=""
          width={768}
          height={768}
          className="w-[min(72vw,48rem)] opacity-[0.055] blur-[7px]"
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-md">
      <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" />

      <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:min-h-24 sm:px-6">
        {/* Brand + desktop navigation */}
        <div className="flex min-w-0 items-center gap-5 sm:gap-8">
          <Link
            href="/"
            aria-label="CampusIndustry.Connect home"
            className="shrink-0 rounded-md px-1 py-2 text-lg font-bold tracking-tight text-slate-950 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-xl"
          >
            CampusIndustry<span className="text-orange-500">.Connect</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm sm:flex"
          >
            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account controls */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div
            className="flex min-w-0 items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-2 text-sm font-medium text-slate-700 sm:pr-3"
            title={orgName || "Account"}
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
            >
              {initial}
            </span>

            <span className="hidden max-w-48 truncate sm:inline">
              {orgName || "—"}
            </span>
          </div>

          <LogoutButton className="btn-secondary hidden sm:inline-flex" />

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:hidden"
          >
            {menuOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        id={menuId}
        className={`overflow-hidden border-t border-slate-200 bg-white transition-[max-height,opacity] duration-200 sm:hidden ${
          menuOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {menuOpen && (
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
              >
                {initial}
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Account
                </p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {orgName || "—"}
                </p>
              </div>
            </div>

            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <LogoutButton className="btn-secondary min-h-11 w-full justify-center" />
            </div>
          </div>
        )}
      </div>
      </header>
    </>
  );
}