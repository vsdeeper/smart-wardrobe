import { View, Text } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { useRecharge } from "@/hooks/use-recharge";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import RechargeAmountForm from "./components/RechargeAmountForm";
import "./index.scss";

const PRICING_ROWS = [
  {
    name: "AI 识别生成",
    cost: "识图 10 + 展示图 50/张（成功共 60）",
    desc: "识图调用完成即收基础费 10（即使未检出衣物或被性别校验拦截；第三方调用报错不扣）；展示图按成功生成张数加收。",
  },
  {
    name: "生成本人试穿模特",
    cost: "基础 10 + 生成 50（成功共 60）",
    desc: "人物性别检测基础费 + 模特生成费；选用预设并启用不扣。",
  },
  {
    name: "AI 试穿",
    cost: "搭评 10 + 试穿图 50（成功共 60）",
    desc: "智能搭评 + 1 张试穿预览；自动推荐与手动搭配同价。",
  },
] as const;

/**
 * 积分说明页：充值入口 + 公示 AI 动作消耗规则（文案对齐 CREDITS.USER.md）。
 */
function CreditsPricingPage() {
  const {
    amountYuan,
    amountError,
    previewCredits,
    paying,
    canPay,
    refreshBalance,
    handleAmountChange,
    handlePay,
  } = useRecharge();

  useDidShow(() => {
    void refreshBalance();
  });

  return (
    <Main showTabbar={false} header={<AppNavbar showBack title="积分说明" />}>
      <Main.Scroll>
        <View className="credits-page">
          <RechargeAmountForm
            amountYuan={amountYuan}
            amountError={amountError}
            previewCredits={previewCredits}
            paying={paying}
            canPay={canPay}
            onAmountChange={handleAmountChange}
            onPay={handlePay}
          />

          <View className="credits-page__lead">
            凡衣橱只对 AI
            相关动作收取积分；浏览衣橱、编辑单品、视觉日记、天气等日常功能不扣积分。
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">积分与金额</Text>
            <View className="credits-page__p">
              <Text className="credits-page__em">1 积分 = ¥0.01（面值）</Text>
              充值实付金额按此换算入账。
            </View>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">怎么扣积分</Text>
            <View className="credits-page__table">
              {PRICING_ROWS.map((row) => (
                <View key={row.name} className="credits-page__row">
                  <View className="credits-page__row-head">
                    <Text className="credits-page__row-name">{row.name}</Text>
                    <Text className="credits-page__row-cost">{row.cost}</Text>
                  </View>
                  <Text className="credits-page__row-desc">{row.desc}</Text>
                </View>
              ))}
            </View>
            <Text className="credits-page__p">
              <Text className="credits-page__em">AI 识别生成合计</Text>
              {" = 识图基础费 + 单品展示图 × 实际成功张数。"}
            </Text>
            <Text className="credits-page__p">
              例如：识图成功并生成 1 张单品展示图时，共 60 积分（面值约
              ¥0.60）。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">
              AI 识别生成怎么理解
            </Text>
            <View className="credits-page__list">
              <Text className="credits-page__li">一次识别对应一张照片。</Text>
              <Text className="credits-page__li">
                一张照片可能识别出多件衣服；费用按实际成功生成的单品展示图张数结算。
              </Text>
              <Text className="credits-page__li">
                识图调用完成即收基础费
                10：即使未检出衣物、或衣物全部与资料性别不符被拦截；仅第三方调用报错不扣。
              </Text>
              <Text className="credits-page__li">
                单品展示图未成功生成的部分不扣。
              </Text>
            </View>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">AI 试穿怎么理解</Text>
            <Text className="credits-page__p">
              AI 试穿 = 智能搭评（基础费 10）+ 1 张试穿预览图（50），成功共 60
              积分。
            </Text>
            <Text className="credits-page__p">
              搭评调用完成即收基础费 10；试穿图未成功生成的部分不扣。
            </Text>
            <Text className="credits-page__p">
              若复用已生成的试穿图且未重新搭评，不扣积分。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">失败怎么算</Text>
            <View className="credits-page__list">
              <Text className="credits-page__li">
                第三方 AI 调用失败（网络 / 服务报错）：对应部分不扣。
              </Text>
              <Text className="credits-page__li">
                识别调用完成但未检出衣物 / 性别不符被拦截：收基础费 10。
              </Text>
              <Text className="credits-page__li">
                单品展示图部分失败：只按成功张数结算。
              </Text>
              <Text className="credits-page__li">
                AI 试穿：搭评完成即收基础费 10；试穿图失败不产生试穿图费。
              </Text>
            </View>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">免费范围</Text>
            <Text className="credits-page__p">
              衣橱浏览与编辑、视觉日记、天气查看，以及命中缓存、无需重新调用 AI
              的结果复用。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">体验积分与充值</Text>
            <Text className="credits-page__p">
              首次使用可获赠{" "}
              <Text className="credits-page__em">1000 体验积分</Text>
              （一次性），用于体验 AI 识别生成与 AI 试穿。
            </Text>
            <Text className="credits-page__p">
              微信支付充值即将开放（待绑定个人商户）；积分不可提现、不可兑换现金。
            </Text>
            <Text className="credits-page__p">
              若因第三方服务成本变化需要调整积分规则，我们会在小程序内公告后再生效。公告时间可能因实际情况延后，请以届时说明为准。
            </Text>
            <Text className="credits-page__p">
              异常扣费可联系客服核查补发。
            </Text>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default CreditsPricingPage;
