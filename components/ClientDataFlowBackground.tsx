'use client'

import dynamic from 'next/dynamic'

// 动态导入仅在客户端渲染的组件
const DataFlowBackground = dynamic(
  () => import('@/components/DataFlowBackground'),
  { ssr: false }
)

export default function ClientDataFlowBackground() {
  return <DataFlowBackground />
} 