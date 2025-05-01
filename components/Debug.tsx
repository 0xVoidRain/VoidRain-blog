'use client'

import { useEffect, useState } from 'react'

// 创建一个调试组件，帮助诊断问题
export default function Debug() {
  const [log, setLog] = useState<string[]>([])
  const [searchData, setSearchData] = useState<any>(null)
  
  useEffect(() => {
    // 记录客户端环境信息
    setLog([
      `Window: ${typeof window !== 'undefined' ? '可用' : '不可用'}`,
      `Search.json 状态: 检查中...`,
      `BASE_PATH: ${process.env.BASE_PATH || '未设置'}`,
      `用户代理: ${typeof navigator !== 'undefined' ? navigator.userAgent : '不可用'}`,
      `当前主题: ${typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') ? 'dark' : 'light' : '未知'}`
    ])
    
    // 测试搜索索引是否可用
    if (typeof window !== 'undefined') {
      const basePath = process.env.BASE_PATH || '';
      const searchPath = `${basePath}/search.json`;
      
      setLog(prev => [...prev, `尝试加载: ${searchPath}`]);
      
      fetch(searchPath)
        .then(res => {
          setLog(prev => [...prev, `搜索索引状态: ${res.status} ${res.statusText}`]);
          if (!res.ok) {
            throw new Error(`状态码: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setSearchData(data);
          setLog(prev => [
            ...prev, 
            `搜索索引项数: ${data?.length || 0}`,
            `数据类型: ${Array.isArray(data) ? '数组' : typeof data}`
          ]);
          
          // 如果有数据，检查第一条
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            setLog(prev => [
              ...prev,
              `第一项: ${first.title || '无标题'} (${first.path || '无路径'})`
            ]);
          }
        })
        .catch(err => {
          setLog(prev => [...prev, `搜索索引错误: ${err.message}`]);
        });
    }
  }, []);
  
  // 仅在开发环境中显示
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-0 left-0 z-50 p-4 text-xs bg-black/80 text-white rounded-tr-lg max-w-xs max-h-40 overflow-auto">
      <h3 className="font-bold">调试信息:</h3>
      <ul className="mt-2 space-y-1">
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
      {searchData === null && (
        <div className="mt-2 text-red-400">搜索索引未加载</div>
      )}
    </div>
  );
} 