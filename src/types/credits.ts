/** 积分账户摘要（credits 云函数 balance） */
export interface CreditBalance {
  balance: number;
  frozen: number;
  available: number;
  initialGranted?: boolean;
}

export interface CreditCloudError {
  error: string;
  message: string;
}
