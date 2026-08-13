import Taro from "@tarojs/taro";
import {
  RECHARGE_ERROR_PAY_NOT_CONFIGURED,
  RECHARGE_PAY_NOT_READY_TOAST,
} from "@/constants/recharge";
import type {
  RechargeCloudError,
  RechargeCreateOrderResult,
  RechargeQueryOrderResult,
} from "@/types/recharge";
import { isWeapp } from "@/utils/platform";

function isCreateOrderResult(
  data: RechargeCreateOrderResult | RechargeCloudError,
): data is RechargeCreateOrderResult {
  return Boolean((data as RechargeCreateOrderResult).payment);
}

function isQueryOrderResult(
  data: RechargeQueryOrderResult | RechargeCloudError,
): data is RechargeQueryOrderResult {
  return typeof (data as RechargeQueryOrderResult).status === "string";
}

/**
 * 创建充值订单并返回调起支付参数。
 */
export async function createRechargeOrder(
  amountFen: number,
): Promise<RechargeCreateOrderResult> {
  const { result } = await Taro.cloud.callFunction({
    name: "recharge",
    data: { action: "createOrder", amountFen },
  });

  const data = result as RechargeCreateOrderResult | RechargeCloudError;
  if (!isCreateOrderResult(data)) {
    if (data.error === RECHARGE_ERROR_PAY_NOT_CONFIGURED) {
      throw new Error(RECHARGE_PAY_NOT_READY_TOAST);
    }
    throw new Error(data.message || data.error || "创建充值订单失败");
  }
  return data;
}

/**
 * 查单补单（支付成功后调用）。
 */
export async function queryRechargeOrder(
  outTradeNo: string,
): Promise<RechargeQueryOrderResult> {
  const { result } = await Taro.cloud.callFunction({
    name: "recharge",
    data: { action: "queryOrder", outTradeNo },
  });

  const data = result as RechargeQueryOrderResult | RechargeCloudError;
  if (!isQueryOrderResult(data)) {
    throw new Error(data.message || data.error || "查询充值订单失败");
  }
  return data;
}

/**
 * 调起微信支付；用户取消时不抛错。
 */
export async function requestWechatPayment(
  payment: RechargeCreateOrderResult["payment"],
): Promise<void> {
  if (!isWeapp()) {
    throw new Error("请在微信小程序内充值");
  }

  try {
    await Taro.requestPayment({
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.package,
      signType: payment.signType as "MD5" | "RSA",
      paySign: payment.paySign,
    });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "errMsg" in err
        ? String((err as { errMsg?: string }).errMsg)
        : "";
    if (msg.includes("cancel")) {
      return;
    }
    throw err;
  }
}

/**
 * 完整充值流程：下单 → 调起支付 → 补单。
 */
export async function runRechargeFlow(amountFen: number): Promise<{
  credits: number;
  paid: boolean;
}> {
  const order = await createRechargeOrder(amountFen);
  await requestWechatPayment(order.payment);

  const query = await queryRechargeOrder(order.outTradeNo);
  if (query.status !== "paid") {
    return { credits: order.credits, paid: false };
  }

  return { credits: query.credits, paid: true };
}
