import { View, Text } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { useRecharge } from "@/hooks/use-recharge";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import RechargeAmountForm from "./components/RechargeAmountForm";
import "./index.scss";

/**
 * 积分充值页：展示当前积分余额 + 充值金额输入与微信支付 CTA。
 */
function RechargePage() {
  const {
    amountYuan,
    amountError,
    previewCredits,
    paying,
    canPay,
    availableCredits,
    refreshBalance,
    handleAmountChange,
    handlePay,
  } = useRecharge();

  useDidShow(() => {
    void refreshBalance();
  });

  return (
    <Main showTabbar={false} header={<AppNavbar showBack title="充值" />}>
      <Main.Scroll>
        <View className="recharge-page">
          <View className="recharge-page__balance">
            <Text className="recharge-page__balance-label">当前积分</Text>
            <Text className="recharge-page__balance-value">
              {availableCredits ?? "--"}
            </Text>
          </View>

          <RechargeAmountForm
            amountYuan={amountYuan}
            amountError={amountError}
            previewCredits={previewCredits}
            paying={paying}
            canPay={canPay}
            onAmountChange={handleAmountChange}
            onPay={handlePay}
          />
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default RechargePage;
