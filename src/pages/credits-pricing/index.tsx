import { View, Text } from "@tarojs/components";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import "./index.scss";

const PRICING_ROWS = [
  {
    name: "识图基础费",
    cost: "10 / 次",
    desc: "每次识别成功检出单品后收取（与单品展示图张数无关）",
  },
  {
    name: "单品展示图",
    cost: "50 / 张",
    desc: "按本次成功生成的单品展示图张数加收",
  },
  {
    name: "AI 试穿",
    cost: "70 / 次",
    desc: "含智能搭评 + 1 张试穿预览；自动推荐与手动搭配同价",
  },
] as const;

/**
 * 积分说明页：公示 AI 动作消耗规则（文案对齐 CREDITS.USER.md）。
 */
function CreditsPricingPage() {
  return (
    <Main showTabbar={false} header={<AppNavbar showBack title="积分说明" />}>
      <Main.Scroll>
        <View className="credits-page">
          <Text className="credits-page__lead">
            凡衣橱只对 AI 相关动作收取积分；浏览衣橱、编辑单品、视觉日记、天气等日常功能不扣积分。
          </Text>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">积分与金额</Text>
            <Text className="credits-page__p">
              <Text className="credits-page__em">1 积分 = ¥0.01</Text>
              （面值）。
            </Text>
            <Text className="credits-page__p">
              充值到账积分按档位公示；各动作消耗以本说明为准。
            </Text>
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
              <Text className="credits-page__em">识别入库合计</Text>
              {" = 识图基础费 + 单品展示图 × 实际成功张数。"}
            </Text>
            <Text className="credits-page__p">
              例如：识图成功并生成 1 张单品展示图时，共 60 积分（面值约 ¥0.60）。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">识别怎么理解</Text>
            <View className="credits-page__list">
              <Text className="credits-page__li">一次识别对应一张照片。</Text>
              <Text className="credits-page__li">
                一张照片可能识别出多件衣服；费用按实际成功生成的单品展示图张数结算。
              </Text>
              <Text className="credits-page__li">
                单品展示图未成功生成的部分不扣；若识图已成功，仍收取基础费 10 积分。
              </Text>
            </View>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">AI 试穿怎么理解</Text>
            <Text className="credits-page__p">
              智能搭评与虚拟试穿属于同一次「AI 试穿」，合在一起扣 70
              积分，不拆开单独计费。
            </Text>
            <Text className="credits-page__p">
              若复用已生成的试穿图（无需重新出图），不扣积分。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">失败怎么算</Text>
            <View className="credits-page__list">
              <Text className="credits-page__li">
                识图失败、未检出单品：整次不扣。
              </Text>
              <Text className="credits-page__li">
                单品展示图部分失败：只按成功张数结算。
              </Text>
              <Text className="credits-page__li">
                AI 试穿：搭评或试穿图任一失败，整次不扣；重试成功后再扣。
              </Text>
            </View>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">免费范围</Text>
            <Text className="credits-page__p">
              衣橱浏览与编辑、视觉日记、天气查看，以及命中缓存、无需重新调用
              AI 的结果复用。
            </Text>
          </View>

          <View className="credits-page__section">
            <Text className="credits-page__section-title">充值与权益</Text>
            <Text className="credits-page__p">
              积分通过微信支付充值获得，不可提现、不可兑换现金。
            </Text>
            <Text className="credits-page__p">
              若因第三方服务成本变化需要调整积分规则，我们会在小程序内公告后再生效。公告时间可能因实际情况延后，请以届时说明为准；已购买积分不可兑人民币、不可提现。
            </Text>
            <Text className="credits-page__p">异常扣费可联系客服核查补发。</Text>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default CreditsPricingPage;
