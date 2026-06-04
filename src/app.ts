import React, { useEffect } from 'react'
import { useDidShow, useDidHide } from '@tarojs/taro'
import { initCloud } from '@/services/cloud'
// 全局样式
import './app.scss'

function App(props) {
  useEffect(() => {
    initCloud()
  }, [])

  // 对应 onShow
  useDidShow(() => {})

  // 对应 onHide
  useDidHide(() => {})

  return props.children
}

export default App
