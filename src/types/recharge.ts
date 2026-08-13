/** 云开发 recharge 下单返回的 payment 参数 */
export interface RechargePaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export interface RechargeCreateOrderResult {
  outTradeNo: string;
  credits: number;
  totalFee: number;
  payment: RechargePaymentParams;
}

export interface RechargeQueryOrderResult {
  status: string;
  credits: number;
  alreadyFulfilled?: boolean;
}

export interface RechargeCloudError {
  error: string;
  message: string;
}
