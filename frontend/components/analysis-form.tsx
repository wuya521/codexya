"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionDialog } from "@/components/action-dialog";
import { SectionCard } from "@/components/section-card";
import { TagEditor } from "@/components/tag-editor";
import { ApiError, createAnalysisJob, getTemplates } from "@/lib/api";
import { getModeLabel, getOptimizationLabel } from "@/lib/display";
import { useDraftAnalysisStore } from "@/store/draft-analysis-store";
import { useToastStore } from "@/store/toast-store";
import type {
  AnalysisMode,
  AnalysisRequest,
  ModelProfile,
  OptimizationTarget,
  TemplateRecord
} from "@/types/analysis";

type AnalysisFormProps = {
  mode: AnalysisMode;
};

const optimizationOptions: OptimizationTarget[] = [
  "fastest",
  "best",
  "safest"
];

const modelProfiles: Array<{
  value: ModelProfile;
  title: string;
  description: string;
  eta: string;
}> = [
  {
    value: "fast",
    title: "极速",
    description: "优先拿到方向感，适合先做一轮快速校准。",
    eta: "通常最快返回"
  },
  {
    value: "balanced",
    title: "平衡",
    description: "默认档位，兼顾速度、细节和结果稳定性。",
    eta: "日常最推荐"
  },
  {
    value: "deep",
    title: "深度推理",
    description: "适合高价值、高不确定问题，耗时会明显更长。",
    eta: "关键问题再开启"
  }
];

const queueSteps = [
  "1/4 写入异步队列，锁定本次任务",
  "2/4 校验套餐额度、并发上限和模型权限",
  "3/4 调用真实模型生成结构化结果",
  "4/4 跳转到任务页并持续回传进度"
];

export function AnalysisForm({ mode }: AnalysisFormProps) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const draft = useDraftAnalysisStore((state) => state.drafts[mode]);
  const updateDraft = useDraftAnalysisStore((state) => state.updateDraft);
  const resetDraft = useDraftAnalysisStore((state) => state.resetDraft);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [appliedTemplateId, setAppliedTemplateId] = useState("");
  const [blockingDialog, setBlockingDialog] = useState<{
    title: string;
    description: string;
    details: string[];
  } | null>(null);

  const setField = <K extends keyof AnalysisRequest>(
    field: K,
    value: AnalysisRequest[K]
  ) => {
    updateDraft(mode, { [field]: value } as Partial<AnalysisRequest>);
  };

  const submitLabel = mode === "forecast" ? "发起推演" : "生成最佳路径";

  function applyTemplate(nextTemplate: TemplateRecord) {
    resetDraft(mode);
    updateDraft(mode, {
      title: nextTemplate.name,
      prompt: nextTemplate.starter_prompt,
      user_hypothesis:
        mode === "forecast"
          ? "先建立一个可被验证的判断，再用事实修正。"
          : "先把目标做成，再比较最快、最好和最稳三条路径。",
      target_outcome:
        mode === "forecast"
          ? "得到一版可执行的走势判断、情景分支和观察信号。"
          : "得到一版可执行的行动路径、权衡成本和阶段动作。",
      optimization_target: mode === "forecast" ? "best" : "safest",
      risk_preference: "平衡"
    });
    setTemplate(nextTemplate);
    setAppliedTemplateId(nextTemplate.id);
  }

  useEffect(() => {
    let mounted = true;

    if (!templateId || templateId === appliedTemplateId) {
      return () => {
        mounted = false;
      };
    }

    getTemplates()
      .then((templates) => {
        if (!mounted) {
          return;
        }
        const matched = templates.find(
          (item) => item.id === templateId && item.mode === mode
        );
        if (!matched) {
          setError("未找到适用于当前模式的模板。");
          return;
        }
        applyTemplate(matched);
        setError("");
      })
      .catch((caughtError) => {
        if (!mounted) {
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "模板加载失败。"
        );
      });

    return () => {
      mounted = false;
    };
  }, [appliedTemplateId, mode, resetDraft, searchParams, templateId, updateDraft]);

  const handleSubmit = async () => {
    let timer: number | undefined;
    setError("");
    setIsPending(true);
    setCurrentStep(0);

    timer = window.setInterval(() => {
      setCurrentStep((previous) =>
        previous >= queueSteps.length - 1 ? previous : previous + 1
      );
    }, 900);

    try {
      const job = await createAnalysisJob(draft);
      pushToast({
        tone: "success",
        title: "任务已进入队列",
        description: "正在跳转到实时进度页。"
      });
      startTransition(() => {
        router.push(`/jobs/${job.id}`);
      });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.code === "quota_exhausted") {
          setBlockingDialog({
            title: "当前额度已经用完",
            description: "本次推演不会继续提交。你可以直接购买更高套餐，或者先用兑换码补充额度。",
            details: [
              "主额度用完后，系统才会继续使用兑换得到的额外额度。",
              "购买套餐适合长期高频使用，兑换码适合活动发放或临时补充。"
            ]
          });
          return;
        }
        if (submitError.code === "model_profile_locked") {
          setBlockingDialog({
            title: "当前套餐还不支持这个模型档位",
            description: "你选择的模型档位超出了当前套餐权限。升级套餐后可以继续提交。",
            details: [
              "建议先切回“平衡”档位做首轮判断。",
              "如果你需要深度推理，建议升级到支持高级模型的套餐。"
            ]
          });
          return;
        }
        if (submitError.code === "concurrency_limit") {
          setBlockingDialog({
            title: "当前排队任务已经达到上限",
            description: "先等待已有任务完成，或者升级到更高并发的套餐。",
            details: [
              "队列采用真实异步任务，达到并发上限时会阻止继续堆积任务。",
              "升级套餐后会解锁更高并发上限。"
            ]
          });
          return;
        }
      }

      setError(submitError instanceof Error ? submitError.message : "创建推演任务失败。");
    } finally {
      if (timer) {
        window.clearInterval(timer);
      }
      setIsPending(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
      <ActionDialog
        open={blockingDialog !== null}
        eyebrow="额度与权限"
        title={blockingDialog?.title ?? ""}
        description={blockingDialog?.description ?? ""}
        onClose={() => setBlockingDialog(null)}
        actions={
          <>
            <Link href="/account" className="button-primary">
              去购买套餐
            </Link>
            <Link href="/account#redeem-center" className="button-secondary">
              去兑换码中心
            </Link>
          </>
        }
      >
        <div className="space-y-3">
          {blockingDialog?.details.map((item) => (
            <div
              key={item}
              className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3 text-sm leading-6 text-muted"
            >
              {item}
            </div>
          ))}
        </div>
      </ActionDialog>
      <div className="space-y-6">
        {template ? (
          <div className="rounded-[1.5rem] border border-brand/20 bg-brand/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">已套用模板</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  {template.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink/85">
                  {template.description}
                </p>
                <p className="mt-3 text-sm text-muted">
                  适用场景：{template.scenario}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => applyTemplate(template)}
                >
                  重新套用
                </button>
                <Link href="/templates" className="button-secondary">
                  查看全部模板
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <SectionCard
          title={mode === "forecast" ? "问题定义" : "目标定义"}
          eyebrow="输入"
          description={`把问题写清楚，比直接要答案更重要。${getModeLabel(mode)}最依赖“问题边界”和“成功标准”。`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">标题</span>
              <input
                className="input-base"
                value={draft.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="给这次推演一个短标题"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">时间范围</span>
              <input
                className="input-base"
                value={draft.time_horizon}
                onChange={(event) =>
                  setField("time_horizon", event.target.value)
                }
                placeholder="例如：未来 6 个月"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium text-ink">
              {mode === "forecast" ? "要分析的事件或问题" : "要达成的目标"}
            </span>
            <textarea
              className="textarea-base"
              value={draft.prompt}
              onChange={(event) => setField("prompt", event.target.value)}
              placeholder={
                mode === "forecast"
                  ? "这件事接下来大概率会怎样发展，为什么？"
                  : "你希望在什么时间、什么约束下，把什么目标做成？"
              }
            />
          </label>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium text-ink">当前判断或假设</span>
            <textarea
              className="textarea-base"
              value={draft.user_hypothesis}
              onChange={(event) =>
                setField("user_hypothesis", event.target.value)
              }
              placeholder="你现在最倾向的判断是什么？"
            />
          </label>
        </SectionCard>

        <SectionCard
          title="现状与变量"
          eyebrow="事实底座"
          description="事实、约束和未知项分得越清楚，模型输出越稳。"
        >
          <div className="space-y-6">
            <TagEditor
              label="事实"
              placeholder="添加一条已验证事实"
              items={draft.facts}
              onChange={(items) => setField("facts", items)}
            />
            <TagEditor
              label="约束"
              placeholder="添加一条硬约束"
              items={draft.constraints}
              onChange={(items) => setField("constraints", items)}
            />
            <TagEditor
              label="未知项"
              placeholder="添加一条关键不确定因素"
              items={draft.unknowns}
              onChange={(items) => setField("unknowns", items)}
            />
            <TagEditor
              label="关键相关方"
              placeholder="添加一个关键相关方"
              items={draft.stakeholders}
              onChange={(items) => setField("stakeholders", items)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="执行补充信息"
          eyebrow="路径调优"
          description="这里决定结果会不会真正可执行，而不是只停在概念层。"
        >
          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">目标结果</span>
              <textarea
                className="textarea-base"
                value={draft.target_outcome}
                onChange={(event) =>
                  setField("target_outcome", event.target.value)
                }
                placeholder="明确你希望得到的结果和成功标准"
              />
            </label>
            <TagEditor
              label="可用资源"
              placeholder="添加一项可用资源"
              items={draft.resources}
              onChange={(items) => setField("resources", items)}
            />
            <TagEditor
              label="已尝试动作"
              placeholder="添加一条已经试过的动作"
              items={draft.tried_actions}
              onChange={(items) => setField("tried_actions", items)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">优化目标</span>
                <select
                  className="input-base"
                  value={draft.optimization_target}
                  onChange={(event) =>
                    setField(
                      "optimization_target",
                      event.target.value as OptimizationTarget
                    )
                  }
                >
                  {optimizationOptions.map((option) => (
                    <option key={option} value={option}>
                      {getOptimizationLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">风险偏好</span>
                <input
                  className="input-base"
                  value={draft.risk_preference}
                  onChange={(event) =>
                    setField("risk_preference", event.target.value)
                  }
                  placeholder="例如：保守、平衡、激进"
                />
              </label>
            </div>
          </div>
        </SectionCard>
      </div>

      <aside className="space-y-6">
        <SectionCard
          title="运行推演"
          eyebrow="控制台"
          description="提交后会进入异步任务页，不会再卡在当前表单里等待模型返回。"
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">模型档位</p>
              <div className="space-y-3">
                {modelProfiles.map((profile) => {
                  const selected = draft.model_profile === profile.value;
                  return (
                    <button
                      key={profile.value}
                      type="button"
                      className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                        selected
                          ? "border-brand/30 bg-brand/10"
                          : "border-line bg-canvas"
                      }`}
                      onClick={() => setField("model_profile", profile.value)}
                      disabled={isPending}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-ink">
                          {profile.title}
                        </p>
                        <span className="text-xs tracking-[0.16em] text-muted">
                          {profile.eta}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {profile.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="button-primary w-full justify-center"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "正在创建异步任务..." : submitLabel}
            </button>

            <button
              type="button"
              className="button-secondary w-full justify-center"
              onClick={() => resetDraft(mode)}
              disabled={isPending}
            >
              重置草稿
            </button>

            <div className="rounded-[1rem] border border-line bg-panel/70 p-4">
              <p className="text-xs tracking-[0.16em] text-muted">
                {isPending
                  ? "系统正在创建任务并准备跳转到实时进度页。"
                  : "建议先用“平衡”做首轮判断，再对高价值问题切到“深度推理”。"}
              </p>
              <div className="mt-3 space-y-2">
                {queueSteps.map((step, index) => {
                  const isActive = isPending && index === currentStep;
                  const isComplete = isPending && index < currentStep;

                  return (
                    <div
                      key={step}
                      className={`rounded-full px-3 py-2 text-xs transition ${
                        isActive
                          ? "border border-brand/30 bg-brand/10 text-brand"
                          : isComplete
                            ? "border border-line bg-canvas text-ink/80"
                            : "border border-line/60 bg-canvas/50 text-muted"
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
                <p>{error}</p>
                {error.includes("登录") ? (
                  <Link href="/login" className="mt-2 inline-block underline">
                    去登录
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="输入建议"
          eyebrow="高质量输入"
          description="下面这四条决定结果是否足够像真实顾问，而不是空泛总结。"
        >
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li>尽量输入可观察事实，而不是主观印象。</li>
            <li>把硬约束和暂时阻碍区分开。</li>
            <li>列出真正能改变结果的关键相关方。</li>
            <li>明确什么才算成功，而不是只写方向。</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="问题示例"
          eyebrow="参考写法"
          description="示例只用来帮助你写清楚，不建议原样照抄。"
        >
          <ul className="space-y-3 text-sm leading-6 text-ink/85">
            <li>未来两个季度，我们的新品类扩张更可能成功还是受阻？</li>
            <li>不显著扩招的前提下，收入增长 50% 的最佳路径是什么？</li>
            <li>我如何在一年内从当前岗位切换到 AI 产品岗位？</li>
          </ul>
        </SectionCard>
      </aside>
    </div>
  );
}
