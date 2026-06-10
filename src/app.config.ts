export default defineAppConfig({
  pages: [
    'pages/wardrobe/index',
    'pages/wardrobe-detail/index',
    'pages/wardrobe-edit/index',
    'pages/ai-recognition/index',
    'pages/try-on/index',
    'pages/outfit/index',
    'pages/profile/index',
  ],
  permission: {
    'scope.userLocation': {
      desc: '用于获取您所在位置的天气，推荐更合适的穿搭',
    },
  },
  requiredPrivateInfos: ['getLocation'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  }
})
