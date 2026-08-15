import { View, Text, Input } from "@tarojs/components";
import SolidButton from "@/components/SolidButton";
import { RECHARGE_MAX_FEN, RECHARGE_MIN_FEN } from "@/constants/recharge";
import { formatFenToYuanLabel } from "@/utils/recharge";
import "./index.scss";

export interface RechargeAmountFormProps {
  amountYuan: string;
  amountError: string;
  previewCredits: number;
  paying: boolean;
  canPay: boolean;
  onAmountChange: (value: string) => void;
  onPay: () => void;
}

/**
 * 积分充值金额输入与支付 CTA。
 */
function RechargeAmountForm({
  amountYuan,
  amountError,
  previewCredits,
  paying,
  canPay,
  onAmountChange,
  onPay,
}: RechargeAmountFormProps) {
  return (
    <View className="recharge-form">
      <Text className="recharge-form__title">充值积分</Text>
      <Text className="recharge-form__hint">
        实付金额按 1 积分 = ¥0.01 入账；单次 ¥
        {formatFenToYuanLabel(RECHARGE_MIN_FEN)}–¥
        {formatFenToYuanLabel(RECHARGE_MAX_FEN)}
      </Text>

      <View className="recharge-form__field">
        <Text className="recharge-form__label">充值金额（元）</Text>
        <Input
          className="recharge-form__input"
          type="digit"
          placeholder={`例如 ${formatFenToYuanLabel(RECHARGE_MIN_FEN)}`}
          value={amountYuan}
          onInput={(e) => onAmountChange(e.detail.value)}
        />
        {amountError ? (
          <Text className="recharge-form__error">{amountError}</Text>
        ) : null}
      </View>

      <View className="recharge-form__preview">
        <Text className="recharge-form__preview-label">到账积分</Text>
        <Text className="recharge-form__preview-value">
          {previewCredits > 0 ? previewCredits : "--"}
        </Text>
      </View>

      <SolidButton block loading={paying} disabled={!canPay} onClick={onPay}>
        微信支付充值
      </SolidButton>

      <Text className="recharge-form__notice">
        微信支付即将开放（待绑定个人商户）；积分不可提现、不可兑换现金。
      </Text>
    </View>
  );
}

export default RechargeAmountForm;
