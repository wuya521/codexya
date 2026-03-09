import Link from "next/link";

import { HeroPanel } from "@/components/hero-panel";
import { ModeCard } from "@/components/mode-card";
import { SectionCard } from "@/components/section-card";
import { getAnalyses, getTemplates } from "@/lib/api";
import {
  formatDateTime,
  getModeLabel,
  sanitizeAnalysisTitle
} from "@/lib/display";
import type { AnalysisRecord, TemplateRecord } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let analyses: AnalysisRecord[] = [];
  let templates: TemplateRecord[] = [];
  let error = "";

  try {
    [analyses, templates] = await Promise.all([getAnalyses(), getTemplates()]);
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : "首页数据加载失败。";
  }

  return (
    <div className="space-y-8">
      <HeroPanel
        examples={[
          "未来 6 个月进入日本市场，机会更大还是阻力更大？",
          "不扩编的前提下，收入提升 50% 的最佳路径是什么？",
          "我想在 12 个月内完成职业转型，最稳妥的路线怎么走？"
        ]}
      />

      {error ? (
        <div className="rounded-[1.5rem] border border-warning/25 bg-warning/10 px-5 py-4 text-sm text-warning">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <ModeCard
          href="/forecast"
          label="Mode 01"
          title="走向预测"
          description="判断一件事接下来会怎么发展，抓出关键变量、因果关系和情景分支。"
          bullets={["看趋势而不是只看观点", "追踪触发条件和观察信号", "适合市场、业务、职业判断"]}
        />
        <ModeCard
          href="/pathfinder"
          label="Mode 02"
          title="路径规划"
          description="把目标拆成最快、最好、最稳三条路线，并明确每条路的代价与推进节奏。"
          bullets={["给出可执行步骤", "同步列出权衡和缓冲方案", "适合增长、转型、项目推进"]}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.03fr_0.97fr]">
        <SectionCard
          title="最新结果"
          eyebrow="Latest"
          description="这里展示系统里真实存在的推演记录，不是静态样例。"
          aside={
            <Link href="/history" className="text-sm text-brand">
              查看全部
            </Link>
          }
        >
          <div className="space-y-4">
            {analyses.length ? (
              analyses.slice(0, 3).map((analysis) => (
                <Link
                  href={`/analysis/${analysis.id}`}
                  key={analysis.id}
                  className="block rounded-[1.3rem] border border-line bg-canvas px-5 py-4 transition hover:border-brand/35 hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.16em] text-muted">
                        {getModeLabel(analysis.mode)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-ink">
                        {sanitizeAnalysisTitle(analysis.title)}
                      </h3>
                    </div>
                    <div className="text-right text-sm text-muted">
                      <p>{Math.round(analysis.confidence * 100)}%</p>
                      <p className="mt-1">{formatDateTime(analysis.updated_at)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {analysis.summary}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas px-5 py-4 text-sm text-muted">
                还没有真实推演记录。登录后发起第一条任务，这里会自动更新。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="模板起步"
          eyebrow="Templates"
          description="把高频问题沉淀成模板，输入成本会明显下降。"
          aside={
            <Link href="/templates" className="text-sm text-brand">
              打开模板库
            </Link>
          }
        >
          <div className="space-y-4">
            {templates.length ? (
              templates.slice(0, 3).map((template) => (
                <div
                  key={template.id}
                  className="rounded-[1.25rem] border border-line bg-canvas px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.16em] text-muted">
                        {getModeLabel(template.mode)}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-ink">
                        {template.name}
                      </h3>
                    </div>
                    <Link
                      href={`${template.mode === "forecast" ? "/forecast" : "/pathfinder"}?template=${template.id}`}
                      className="text-sm text-brand"
                    >
                      直接套用
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {template.description}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas px-5 py-4 text-sm text-muted">
                模板接口暂时不可用，请先确认后端已启动。
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="怎么使用"
          eyebrow="Flow"
          description="用产品的方式，而不是用聊天的方式。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>1. 从模板或空白表单进入问题。</p>
            <p>2. 选择走向预测或路径规划。</p>
            <p>3. 任务异步执行，结果回到控制台。</p>
            <p>4. 在结果页继续重演、比较和执行。</p>
          </div>
        </SectionCard>

        <SectionCard
          title="适合场景"
          eyebrow="Use Cases"
          description="适用于复杂但可拆解的高价值问题。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>市场进入判断</p>
            <p>产品发布节奏</p>
            <p>增长路径规划</p>
            <p>职业与能力转型</p>
          </div>
        </SectionCard>

        <SectionCard
          title="已经接通"
          eyebrow="Ready"
          description="这不是单页演示，而是一套可运行的产品骨架。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>真实登录、异步队列和结果沉淀</p>
            <p>套餐购买、额度控制和后台管理</p>
            <p>适配宝塔、Nginx 和生产部署</p>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
