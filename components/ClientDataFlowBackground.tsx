'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// 创建一个简单的加载状态
const LoadingPlaceholder = () => <div className="fixed inset-0 -z-10" />

// 动态导入仅在客户端渲染的组件
const DataFlowBackgroundComponent = dynamic(
  () => import('@/components/DataFlowBackground').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }
)

export default function ClientDataFlowBackground() {
  // 确保只在客户端渲染
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
    
    // 强制重新渲染一次，以确保动画组件正确初始化
    const timer = setTimeout(() => {
      setIsMounted(false)
      setTimeout(() => setIsMounted(true), 50)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (!isMounted) {
    return <LoadingPlaceholder />
  }
  
  return <DataFlowBackgroundComponent />
}
