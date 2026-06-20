import { useEffect } from 'react'
import { useDidShow, useDidHide } from '@tarojs/taro'
import { initCloud } from '@/services/cloud'
import { initPrivacyAuthorization } from '@/utils/mediaPickerError'
// 全局样式
import './app.scss'

function App(props) {
  useEffect(() => {
    initCloud()
    initPrivacyAuthorization()
  }, [])

  // 对应 onShow
  useDidShow(() => {})

  // 对应 onHide
  useDidHide(() => {})

  return props.children
}

export default App
