"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getSession, logoutSession } from "@/lib/api";
import type { CurrentUserRecord } from "@/types/account";

const publicLinks = [
  { href: "/", label: "首页" },
  { href: "/forecast", label: "走向预测" },
  { href: "/pathfinder", label: "最佳路径" },
  { href: "/templates", label: "模板库" },
  { href: "/history", label: "历史记录" }
];

const privateLinks = [
  { href: "/workspace", label: "工作台" },
  { href: "/team", label: "团队" },
  { href: "/account", label: "会员中心" },
  { href: "/settings", label: "设置" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((user) => {
        if (mounted) {
          setSessionUser(user);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function handleLogout() {
    await logoutSession();
    setSessionUser(null);
    router.push("/login");
    router.refresh();
  }

  const navLinks = useMemo(
    () => [
      ...publicLinks,
      ...(sessionUser ? privateLinks : []),
      ...(sessionUser?.can_access_admin
        ? [{ href: "/admin", label: "运营后台" }]
        : [])
    ],
    [sessionUser]
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-[rgba(247,243,236,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-white/40 bg-[linear-gradient(135deg,#13263b,#21486b)] text-sm font-semibold text-white shadow-panel">
              FP
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] tracking-[0.32em] text-muted">
                STRATEGY OS
              </p>
              <p className="truncate text-sm font-semibold text-ink">
                First Principles Strategy OS
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <span className="status-pill">加载会话</span>
            ) : sessionUser ? (
              <>
                <div className="hidden rounded-full border border-line bg-white/70 px-4 py-2 text-right shadow-panel sm:block">
                  <p className="text-sm font-semibold text-ink">
                    {sessionUser.name}
                  </p>
                  <p className="text-xs text-muted">
                    {sessionUser.plan.name}
                    {sessionUser.organization
                      ? ` / ${sessionUser.organization.name}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleLogout}
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link href="/templates" className="button-ghost hidden sm:inline-flex">
                  浏览模板
                </Link>
                <Link href="/login" className="button-primary">
                  登录 / 注册
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
                  active
                    ? "bg-[linear-gradient(135deg,#13263b,#21486b)] text-white shadow-panel"
                    : "border border-line bg-white/65 text-muted hover:border-brand/30 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
