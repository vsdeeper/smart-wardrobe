import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import "./index.scss";

/**
 * 读取当前小程序版本号；开发/体验版无正式 version 时回退为「开发中」。
 */
function getAppVersionLabel(): string {
  try {
    const version = Taro.getAccountInfoSync()?.miniProgram?.version;
    if (version && version.trim()) return version.trim();
  } catch {
    // 部分环境无 accountInfo，忽略
  }
  return "开发中";
}

/**
 * 关于凡衣橱：产品简介、相关说明与联系方式（文案对齐 ABOUT.md）。
 */
function AboutPage() {
  const versionLabel = getAppVersionLabel();

  const handleOpenCredits = () => {
    Taro.navigateTo({ url: "/pages/credits-pricing/index" });
  };

  const handleOpenFeedback = () => {
    Taro.navigateTo({ url: "/pages/feedback/index" });
  };

  const handleCopyEmail = () => {
    Taro.setClipboardData({
      data: "vsdeeper@qq.com",
      success: () => {
        Taro.showToast({ title: "邮箱已复制", icon: "none" });
      },
    });
  };

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="关于凡衣橱" />}
    >
      <Main.Scroll>
        <View className="about-page">
          <View className="about-page__intro">
            <Text className="about-page__p">
              衣橱开了又关，心里总在问：今天穿什么？明天呢？
            </Text>
            <Text className="about-page__p">
              凡衣橱想陪你把这件事想清楚一点、也轻松一点。把衣服拍进衣橱，慢慢看清自己有什么、缺什么；看看今天和明天的天气与空气，听听一句贴近你的穿搭建议；想试试某身搭配，就先在屏幕里预览；穿出去了，再记进日记——日子往前走，风格也一点点长出来。
            </Text>
            <Text className="about-page__p">
              AI 在这里像一位懂衣橱的朋友：安静、具体、说人话。真正的主角始终是你的衣服，和你想成为的样子。
            </Text>
            <Text className="about-page__p">
              自然，策展，从容——凡衣橱希望这样陪你想清楚今天，也备好明天。
            </Text>
          </View>

          <View className="about-page__section">
            <Text className="about-page__section-title">相关说明</Text>
            <View className="about-page__list">
              <Text className="about-page__item">
                <Text className="about-page__item-label">积分与定价</Text>
                {" — "}
                <Text className="about-page__link" onClick={handleOpenCredits}>
                  说明
                </Text>
                ：识别、试穿等 AI 动作按次/按张消耗积分；浏览衣橱、日记、天气免费；调价以小程序内公告为准
              </Text>
              <Text className="about-page__item">
                <Text className="about-page__item-label">关于 AI</Text>
                {" — "}
                推荐与试穿图供参考，帮你想清楚今天和明天，不替代你的判断
              </Text>
              <Text className="about-page__item">
                <Text className="about-page__item-label">关于图片</Text>
                {" — "}
                用于识别、展示与试穿；相册等权限按微信《用户隐私保护指引》在需要时授权
              </Text>
              <Text className="about-page__item">
                <Text className="about-page__item-label">版本</Text>
                {" — "}
                {versionLabel}；识别、推荐与试穿会按反馈持续打磨
              </Text>
            </View>
          </View>

          <View className="about-page__section">
            <Text className="about-page__section-title">反馈与联系</Text>
            <View className="about-page__contact">
              <Text className="about-page__item">
                使用中有疑问或想法，请优先通过小程序内
                <Text className="about-page__link" onClick={handleOpenFeedback}>
                  反馈
                </Text>
                告诉我们，我们会按消息逐条查看。
              </Text>
              <Text className="about-page__item">
                若不便使用站内入口，可发邮件至：
                <Text className="about-page__email" onClick={handleCopyEmail}>
                  vsdeeper@qq.com
                </Text>
              </Text>
              <Text className="about-page__item">
                请注明「凡衣橱」与大致场景（如识别 / 推荐 / 试穿），便于我们对照排查。
              </Text>
              <Text className="about-page__item">
                本邮箱仅处理产品相关事项；广告、推销与无关私信将不予回复。
              </Text>
            </View>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default AboutPage;
