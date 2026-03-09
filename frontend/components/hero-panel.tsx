import Link from "next/link";

type HeroPanelProps = {
  examples: string[];
};

export function HeroPanel({ examples }: HeroPanelProps) {
  return (
    <section className="grid gap-8 rounded-[2rem] border border-line bg-[linear-gradient(140deg,rgba(10,28,45,0.98),rgba(24,64,94,0.96))] p-8 text-slate-100 shadow-panel lg:grid-cols-[1.55fr_1fr] lg:p-10">
      <div>
        <p className="text-xs tracking-[0.3em] text-slate-300">
          正式产品版 · 决策推演与经营系统
        </p>
        <h1 className="display-title mt-5 max-w-3xl text-4xl font-semibold leading-tight lg:text-5xl">
          把模糊判断，变成可执行的推演、路径、团队协作和运营闭环。
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          它不是一个只会吐文案的分析页，而是把登录、组织、套餐、异步任务、工作台、后台和上线部署一起接起来的 Strategy OS。
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/login" className="button-primary">
            登录正式工作台
          </Link>
          <Link href="/workspace" className="button-secondary">
            打开工作台
          </Link>
          <Link href="/forecast" className="button-primary">
            开始走向预测
          </Link>
          <Link href="/pathfinder" className="button-secondary">
            生成最佳路径
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs tracking-[0.18em] text-slate-400">推演链路</p>
            <p className="mt-2 text-lg font-semibold">异步队列 + 轮询 + SSE</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs tracking-[0.18em] text-slate-400">商业化</p>
            <p className="mt-2 text-lg font-semibold">套餐、订单、VIP、企业版</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs tracking-[0.18em] text-slate-400">交付能力</p>
            <p className="mt-2 text-lg font-semibold">团队、后台、宝塔可部署</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-medium tracking-[0.2em] text-slate-400">
          示例问题
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
          {examples.map((example) => (
            <li
              key={example}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
            >
              {example}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
