'use client'

import { useEffect, useState } from 'react'

// 创建一个调试组件，帮助诊断问题
export default function Debug() {
  const [log, setLog] = useState<string[]>([])
  
  useEffect(() => {
    // 记录客户端环境信息
    setLog([
      `Window: ${typeof window !== 'undefined' ? '可用' : '不可用'}`,
      `Search.json 状态: 检查中...`,
      `标签编码测试: ${encodeURIComponent('迷茫')}`,
      `用户代理: ${typeof navigator !== 'undefined' ? navigator.userAgent : '不可用'}`,
      `当前主题: ${typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') ? 'dark' : 'light' : '未知'}`
    ])
    
    // 测试搜索索引是否可用
    if (typeof window !== 'undefined') {
      fetch('/search.json')
        .then(res => {
          setLog(prev => [...prev, `搜索索引状态: ${res.status} ${res.statusText}`])
          return res.json()
        })
        .then(data => {
          setLog(prev => [...prev, `搜索索引项数: ${data?.length || 0}`])
        })
        .catch(err => {
          setLog(prev => [...prev, `搜索索引错误: ${err.message}`])
        })
    }
  }, [])
  
  // 仅在开发环境中显示
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed bottom-0 left-0 z-50 p-4 text-xs bg-black/80 text-white rounded-tr-lg max-w-xs max-h-40 overflow-auto">
      <h3 className="font-bold">调试信息:</h3>
      <ul className="mt-2 space-y-1">
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </div>
  )
} 