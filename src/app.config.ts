export default defineAppConfig({
  pages: [
    "pages/wardrobe/index",
    "pages/wardrobe-detail/index",
    "pages/wardrobe-edit/index",
    "pages/ai-recognition/index",
    "pages/try-on/index",
    "pages/outfit/index",
    "pages/mine/index",
    "pages/mine-profile/index",
    "pages/mine-profile-field/index",
    "pages/mine-try-on-model/index",
    "pages/visual-diary/index",
    "pages/visual-diary-detail/index",
    "pages/recognition-history/index",
    "pages/about/index",
    "pages/credits-pricing/index",
    "pages/recharge/index",
    "pages/feedback/index",
  ],
  permission: {
    "scope.userLocation": {
      desc: "用于获取您所在位置的天气，推荐更合适的穿搭",
    },
  },
  requiredPrivateInfos: ["getLocation"],
  __usePrivacyCheck__: true,
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "凡衣橱",
    navigationBarTextStyle: "black",
  },
});
