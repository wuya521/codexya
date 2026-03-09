"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getDemoUsers, getSession, loginWithPassword, registerAccount } from "@/lib/api";
import { setSessionToken } from "@/lib/auth";
import type { DemoLoginRecord } from "@/types/account";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [demoUsers, setDemoUsers] = useState<DemoLoginRecord[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    organization_name: ""
  });

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((user) => {
        if (mounted && user) {
          router.replace("/workspace");
        }
      })
      .catch(() => {
        // ignore session preload failure
      });

    getDemoUsers()
      .then((users) => {
        if (mounted) {
          setDemoUsers(users);
        }
      })
      .catch(() => {
        if (mounted) {
          setDemoUsers([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError("");

    try {
      const session =
        mode === "login"
          ? await loginWithPassword({
              email: form.email,
              password: form.password
            })
          : await registerAccount(form);

      setSessionToken(session.access_token, session.expires_at);
      router.push("/workspace");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "登录失败。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] border border-line bg-[linear-gradient(135deg,rgba(9,27,51,0.98),rgba(14,39,67,0.92))] p-8 text-slate-100 shadow-panel">
        <p className="text-xs tracking-[0.3em] text-slate-300">正式入口</p>
        <h1 className="display-title mt-5 text-4xl font-semibold leading-tight">
          用真实账户进入你的工作台、团队和计费系统。
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          当前版本已经移除前端 mock 回退。登录后拿到的是真实会话令牌，后续访问的也是你真实的账户、组织、订单和推演数据。
        </p>

        {demoUsers.length ? (
          <div className="mt-8 grid gap-4">
            {demoUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setMode("login");
                  setForm((current) => ({
                    ...current,
                    email: user.email,
                    password: user.password_hint
                  }));
                }}
                className="rounded-[1.25rem] border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/10"
              >
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {user.plan_name} / 演示密码 {user.password_hint}
                </p>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-line bg-panel p-8 shadow-panel">
        <div className="flex gap-3">
          <button
            type="button"
            className={mode === "login" ? "button-primary" : "button-secondary"}
            onClick={() => setMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === "register" ? "button-primary" : "button-secondary"}
            onClick={() => setMode("register")}
          >
            注册
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">姓名</span>
                <input
                  className="input-base"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="你的姓名"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">组织名称</span>
                <input
                  className="input-base"
                  value={form.organization_name}
                  onChange={(event) =>
                    updateField("organization_name", event.target.value)
                  }
                  placeholder="例如：增长实验室"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">公司 / 团队</span>
                <input
                  className="input-base"
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                  placeholder="公司名称"
                />
              </label>
            </>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">邮箱</span>
            <input
              className="input-base"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="name@company.com"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">密码</span>
            <input
              className="input-base"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="至少 8 位"
              required
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button-primary w-full justify-center" disabled={isPending}>
            {isPending
              ? "正在处理..."
              : mode === "login"
                ? "登录进入工作台"
                : "注册并创建工作台"}
          </button>
        </form>
      </section>
    </div>
  );
}
