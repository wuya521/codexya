"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { SectionCard } from "@/components/section-card";
import {
  createOrganizationMember,
  getAccountOverview,
  getSession
} from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import type {
  AccountOverviewRecord,
  CurrentUserRecord,
  OrganizationRole
} from "@/types/account";

export default function TeamPage() {
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AccountOverviewRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "Demo12345!",
    role: "member" as OrganizationRole
  });

  async function load() {
    const [user, nextOverview] = await Promise.all([
      getSession(),
      getAccountOverview()
    ]);
    setSessionUser(user);
    setOverview(nextOverview);
  }

  useEffect(() => {
    let mounted = true;

    load()
      .catch((caughtError) => {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "团队加载失败。");
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
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setNotice("");
    setError("");

    try {
      const response = await createOrganizationMember(form);
      setNotice(response.message);
      setForm({
        name: "",
        email: "",
        company: "",
        password: "Demo12345!",
        role: "member"
      });
      await load();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "添加成员失败。");
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="团队"
        title="正在加载组织与成员"
        description="系统正在拉取真实组织、成员和权限信息。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="团队"
        title="组织与成员管理"
        description={error || "请先登录，再查看和管理你的组织成员。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  const canManageMembers =
    sessionUser.organization_role === "owner" || sessionUser.organization_role === "admin";

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">团队</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          {overview.organization?.name ?? "当前组织"} 成员管理
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          组织、成员、角色和审计日志是企业版交付的基础能力。
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <SectionCard
          title="现有成员"
          eyebrow="Members"
          description="成员信息、角色和加入时间都可以在这里集中查看。"
        >
          <div className="space-y-4">
            {overview.members.map((member) => (
              <div
                key={member.id}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{member.name}</p>
                    <p className="mt-1 text-sm text-muted">{member.email}</p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    <p>{member.organization_role}</p>
                    <p className="mt-1">{formatDateTime(member.joined_at)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {member.company || "未填写公司"} / 平台角色 {member.platform_role}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="添加成员"
          eyebrow="Invite"
          description="Owner 或 Admin 可直接为组织新增真实登录账户。"
        >
          {canManageMembers ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">姓名</span>
                <input
                  className="input-base"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">邮箱</span>
                <input
                  className="input-base"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">公司</span>
                <input
                  className="input-base"
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">初始密码</span>
                <input
                  className="input-base"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">组织角色</span>
                <select
                  className="input-base"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as OrganizationRole
                    }))
                  }
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              {notice ? <p className="text-sm text-success">{notice}</p> : null}
              {error ? <p className="text-sm text-warning">{error}</p> : null}
              <button type="submit" className="button-primary w-full justify-center" disabled={isPending}>
                {isPending ? "正在添加成员..." : "添加成员"}
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-muted">
              当前账号没有成员管理权限，只有 owner 或 admin 可以添加成员。
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
