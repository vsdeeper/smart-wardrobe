import { useCallback, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import {
  RECHARGE_MAX_FEN,
  RECHARGE_MIN_FEN,
  RECHARGE_PAY_NOT_READY_TOAST,
} from "@/constants/recharge";
import { fetchCreditBalance } from "@/services/credits";
import { runRechargeFlow } from "@/services/recharge";
import { parseYuanToFen } from "@/utils/recharge";
import { toUserMessage } from "@/utils/error-message";

/**
 * 积分充值：金额输入、下单支付、刷新余额。
 */
export function useRecharge() {
  const [amountYuan, setAmountYuan] = useState("");
  const [paying, setPaying] = useState(false);
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);

  const amountFen = useMemo(() => parseYuanToFen(amountYuan), [amountYuan]);

  const previewCredits = amountFen ?? 0;

  const amountError = useMemo(() => {
    if (!amountYuan.trim()) return "";
    if (amountFen == null) return "请输入有效金额（最多两位小数）";
    if (amountFen < RECHARGE_MIN_FEN) {
      return `最低充值 ¥${RECHARGE_MIN_FEN / 100}`;
    }
    if (amountFen > RECHARGE_MAX_FEN) {
      return `最高充值 ¥${RECHARGE_MAX_FEN / 100}`;
    }
    return "";
  }, [amountFen, amountYuan]);

  const canPay = amountFen != null && !amountError && !paying;

  const refreshBalance = useCallback(async () => {
    try {
      const summary = await fetchCreditBalance();
      setAvailableCredits(summary.available);
    } catch {
      setAvailableCredits(null);
    }
  }, []);

  const handleAmountChange = useCallback((value: string) => {
    setAmountYuan(value);
  }, []);

  const handlePay = useCallback(async () => {
    if (!canPay || amountFen == null) return;

    setPaying(true);
    try {
      const { paid, credits } = await runRechargeFlow(amountFen);
      if (!paid) {
        Taro.showToast({ title: "支付未完成", icon: "none" });
        return;
      }
      await refreshBalance();
      Taro.showToast({
        title: `充值成功 +${credits} 积分`,
        icon: "success",
      });
      setAmountYuan("");
    } catch (err) {
      const message = toUserMessage(err, "充值失败，请稍后重试");
      Taro.showToast({
        title: message.includes("即将开放")
          ? RECHARGE_PAY_NOT_READY_TOAST
          : message,
        icon: "none",
        duration: 3000,
      });
    } finally {
      setPaying(false);
    }
  }, [amountFen, canPay, refreshBalance]);

  return {
    amountYuan,
    amountError,
    previewCredits,
    paying,
    canPay,
    availableCredits,
    refreshBalance,
    handleAmountChange,
    handlePay,
  };
}
