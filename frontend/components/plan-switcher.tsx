"use client";

import { useState, useTransition } from "react";

import { switchPlan } from "@/lib/api";
import { useToastStore } from "@/store/toast-store";
import type { BillingCycle, SwitchPlanResponse } from "@/types/account";

type PlanSwitcherProps = {
  planId: string;
  currentPlanId: string;
  onSwitched?: (response: SwitchPlanResponse) => void;
};

export function PlanSwitcher({
  planId,
  currentPlanId,
  onSwitched
}: PlanSwitcherProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pushToast = useToastStore((state) => state.push);

  const isCurrentPlan = planId === currentPlanId;

  async function handleSwitch() {
    if (isCurrentPlan || isPending) {
      return;
    }

    setNotice(null);
    setError(null);

    try {
      const response = await switchPlan(planId, billingCycle);
      setNotice(response.message);
      pushToast({
        tone: "success",
        title: "套餐已更新",
        description: response.message
      });
      if (onSwitched) {
        startTransition(() => {
          onSwitched(response);
        });
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "套餐切换失败";
      setError(message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={billingCycle === "monthly" ? "button-primary justify-center" : "button-secondary justify-center"}
          onClick={() => setBillingCycle("monthly")}
          disabled={isPending}
        >
          月付
        </button>
        <button
          type="button"
          className={billingCycle === "yearly" ? "button-primary justify-center" : "button-secondary justify-center"}
          onClick={() => setBillingCycle("yearly")}
          disabled={isPending}
        >
          年付
        </button>
      </div>

      <button
        type="button"
        onClick={handleSwitch}
        disabled={isCurrentPlan || isPending}
        className={
          isCurrentPlan
            ? "button-secondary w-full justify-center"
            : "button-primary w-full justify-center"
        }
      >
        {isCurrentPlan
          ? "当前已启用"
          : isPending
            ? "处理中..."
            : `${billingCycle === "monthly" ? "按月购买" : "按年购买"}`}
      </button>
      {notice ? <p className="text-xs text-success">{notice}</p> : null}
      {error ? <p className="text-xs text-warning">{error}</p> : null}
    </div>
  );
}
