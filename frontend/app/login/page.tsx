"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDemoUsers,
  getSession,
  loginWithPassword,
  registerAccount
} from "@/lib/api";
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

  const founderUser = useMemo(() => demoUsers[0] ?? null, [demoUsers]);

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
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="rounded-[2rem] border border-line bg-[linear-gradient(135deg,rgba(10,28,45,0.98),rgba(17,45,66,0.94))] p-8 text-slate-100 shadow-panel">
        <p className="text-xs tracking-[0.3em] text-slate-300">WELCOME RITUAL</p>
        <h1 className="display-title mt-5 text-4xl font-semibold leading-tight">
          欢迎回到 Super OS。
          <br />
          把注意力放回最重要的那件事。
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          登录后你会进入自己的控制台，继续发起推演、追踪任务、查看结果并选择合适的套餐。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <RitualCard title="先定问题" detail="把边界写清楚，模型才不会空转。" />
          <RitualCard title="再看路径" detail="比较最快、最好、最稳三条方案。" />
          <RitualCard title="最后执行" detail="任务异步排队，结果持续沉淀。" />
        </div>

        {founderUser ? (
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{founderUser.name}</p>
                <p className="mt-1 text-sm text-slate-300">{founderUser.email}</p>
                <p className="mt-2 text-xs text-slate-400">
                  演示密码：{founderUser.password_hint}
                </p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setMode("login");
                  setForm((current) => ({
                    ...current,
                    email: founderUser.email,
                    password: founderUser.password_hint
                  }));
                }}
              >
                代入创始者账号
              </button>
            </div>
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
                <span className="text-sm font-medium text-ink">你的称呼</span>
                <input
                  className="input-base"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="例如：林燃"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink">公司或项目</span>
                <input
                  className="input-base"
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                  placeholder="例如：独立工作室"
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

          <button
            type="submit"
            className="button-primary w-full justify-center"
            disabled={isPending}
          >
            {isPending
              ? "正在处理..."
              : mode === "login"
                ? "进入控制台"
                : "创建我的 Super OS 空间"}
          </button>
        </form>
      </section>
    </div>
  );
}

function RitualCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
