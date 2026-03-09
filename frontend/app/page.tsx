import Link from "next/link";

import { HeroPanel } from "@/components/hero-panel";
import { ModeCard } from "@/components/mode-card";
import { SectionCard } from "@/components/section-card";
import { getAnalyses, getTemplates } from "@/lib/api";
import { formatDateTime, getModeLabel } from "@/lib/display";
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
          "未来 6 个月进入日本市场，是机会更大还是阻力更大？",
          "不大幅扩编的前提下，收入提升 50% 的最佳路径是什么？",
          "我想在 12 个月内转向 AI 产品岗位，最稳的路线怎么走？"
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
          description="判断一件事更可能如何发展，找出关键变量、因果关系和情景分支。"
          bullets={["识别主导变量", "绘制因果图谱", "观察情景信号"]}
        />
        <ModeCard
          href="/pathfinder"
          label="Mode 02"
          title="最佳路径"
          description="把目标拆成最快、最好、最稳三种路线，并明确代价、收益和回退方案。"
          bullets={["比较不同路线", "安排动作顺序", "设计风险回退"]}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="最近结果"
          eyebrow="Latest"
          description="不是静态案例，而是当前系统中真实存在的推演记录。"
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
                        {analysis.title}
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
          title="模板起点"
          eyebrow="Templates"
          description="把重复出现的问题做成模板，输入成本会显著下降。"
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
                      套用
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {template.description}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas px-5 py-4 text-sm text-muted">
                模板接口暂时不可用，通常意味着后端尚未启动。
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="真实使用路径"
          eyebrow="Workflow"
          description="从发起任务到团队协作再到后台运营，链路已经连起来。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>1. 登录进入个人或组织工作台。</p>
            <p>2. 从模板或空白表单发起推演。</p>
            <p>3. 在任务页实时查看队列和执行进度。</p>
            <p>4. 在结果页重演、比较、跟进动作。</p>
          </div>
        </SectionCard>

        <SectionCard
          title="适合的业务场景"
          eyebrow="Use Cases"
          description="适用范围不是“所有问题”，而是复杂但可拆的高价值决策。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>市场进入判断</p>
            <p>产品发布节奏</p>
            <p>收入增长路径规划</p>
            <p>岗位转型与能力迁移</p>
          </div>
        </SectionCard>

        <SectionCard
          title="上线就绪能力"
          eyebrow="Launch"
          description="已经具备真实产品该有的基础设施和运营闭环。"
        >
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>真实登录、组织、订阅、订单和后台</p>
            <p>异步队列、轮询和 SSE 进度反馈</p>
            <p>支持宝塔、Nginx、HTTPS 和生产部署</p>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
