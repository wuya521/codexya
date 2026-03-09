"use client";

import { useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { SectionCard } from "@/components/section-card";
import { getSystemRuntime } from "@/lib/api";
import type { SystemRuntimeRecord } from "@/types/account";

export default function SettingsPage() {
  const [runtime, setRuntime] = useState<SystemRuntimeRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSystemRuntime()
      .then((nextRuntime) => {
        if (mounted) {
          setRuntime(nextRuntime);
        }
      })
      .catch((caughtError) => {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "设置加载失败。");
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

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="设置"
        title="正在加载运行时配置"
        description="系统正在拉取当前模型、数据库和上线配置摘要。"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">设置</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          模型、运行时与上线准备度
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          这里显示的是当前真实运行配置，包括模型提供方、数据库模式和异步任务能力。
        </p>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-warning/25 bg-warning/10 px-5 py-4 text-sm text-warning">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="当前运行时" eyebrow="Runtime">
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>服务名称：{runtime?.app_name ?? "未获取"}</p>
            <p>版本：{runtime?.app_version ?? "未获取"}</p>
            <p>模型提供方：{runtime?.llm_provider ?? "未获取"}</p>
            <p>默认模型：{runtime?.active_model ?? "未获取"}</p>
            <p>数据库：{runtime?.database_mode ?? "未获取"}</p>
            <p>失败回退：{runtime?.fallback_to_mock ? "已开启" : "已关闭"}</p>
            <p>演示免登录：{runtime?.demo_auth_enabled ? "已开启" : "已关闭"}</p>
          </div>
        </SectionCard>

        <SectionCard title="当前产品能力" eyebrow="Capabilities">
          <div className="grid gap-3 sm:grid-cols-2">
            {(runtime?.capabilities ?? []).map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm text-ink"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="推演与队列原理"
          eyebrow="Inference"
          description="性能不再靠假快，而是靠异步任务和状态同步把真实链路做好。"
        >
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li>提交表单后，系统先创建异步任务，再由后台 worker 领取执行。</li>
            <li>执行前先校验套餐额度、并发上限和模型档位权限。</li>
            <li>模型输出固定结构化 JSON，再映射成结果页和版本比较页。</li>
            <li>前端同时使用轮询和 SSE 来更新任务状态。</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="上线前建议"
          eyebrow="Launch Checklist"
          description="这部分是拿宝塔正式部署前必须检查的现实项。"
        >
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li>生产环境切到 PostgreSQL，不建议继续使用 SQLite。</li>
            <li>上线前关闭演示免登录，并替换所有测试密钥。</li>
            <li>接入正式支付、邮件通知和异常监控。</li>
            <li>通过宝塔配置 HTTPS、反向代理和进程守护。</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
