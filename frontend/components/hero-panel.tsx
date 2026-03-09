import Link from "next/link";

type HeroPanelProps = {
  examples: string[];
};

export function HeroPanel({ examples }: HeroPanelProps) {
  return (
    <section className="grid gap-8 rounded-[2rem] border border-line bg-[linear-gradient(145deg,rgba(9,24,39,0.98),rgba(22,58,82,0.96))] p-8 text-slate-100 shadow-panel lg:grid-cols-[1.45fr_1fr] lg:p-10">
      <div>
        <p className="text-xs tracking-[0.3em] text-slate-300">
          SUPER OS · 决策与路径控制台
        </p>
        <h1 className="display-title mt-5 max-w-3xl text-4xl font-semibold leading-tight lg:text-5xl">
          把模糊判断，
          <br />
          变成可执行的路线图。
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Super OS 面向真实问题，不卖“像 AI 的感觉”。你提交的是一件具体的事，拿回的是可执行的路径、触发信号、风险缓冲和下一步动作。
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/forecast" className="button-primary">
            先看走向
          </Link>
          <Link href="/pathfinder" className="button-secondary">
            直接做路径规划
          </Link>
          <Link href="/login" className="button-secondary">
            进入控制台
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <HighlightCard title="异步推演" detail="长任务排队执行，过程可轮询可推送。" />
          <HighlightCard title="路径对比" detail="最快、最好、最稳三条路线同时给出。" />
          <HighlightCard title="购买闭环" detail="登录、套餐、订单、后台已经接通。" />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-medium tracking-[0.2em] text-slate-400">
          适合这样的问题
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

function HighlightCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold">{detail}</p>
    </div>
  );
}
