'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Dialog } from '@headlessui/react'

const SearchProvider = ({ children }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState([])
  const [isLoading, setIsLoading] = useState(true)  // 新增加载状态
  const [loadError, setLoadError] = useState('')    // 新增错误状态
  const inputRef = useRef(null)

  // 加载搜索索引
  useEffect(() => {
    const loadSearchIndex = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/search.json')
        if (response.ok) {
          const data = await response.json()
          setSearchIndex(data)
          setLoadError('')
        } else {
          console.error('搜索索引加载失败:', response.status, response.statusText)
          setLoadError(`加载失败: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error('加载搜索索引失败:', error)
        setLoadError(`加载失败: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadSearchIndex()
  }, [])

  // 搜索处理函数
  const handleSearch = (query) => {
    if (!query.trim() || !searchIndex || !searchIndex.length) {
      setSearchResults([])
      return
    }

    try {
      // 添加类型检查，确保搜索结果有效
      const results = searchIndex.filter(
        (item) => {
          if (!item) return false;
          
          const titleMatch = item.title && typeof item.title === 'string' 
            ? item.title.toLowerCase().includes(query.toLowerCase()) 
            : false;
          
          const summaryMatch = item.summary && typeof item.summary === 'string'
            ? item.summary.toLowerCase().includes(query.toLowerCase())
            : false;
          
          const tagsMatch = item.tags && Array.isArray(item.tags)
            ? item.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(query.toLowerCase()))
            : false;
          
          return titleMatch || summaryMatch || tagsMatch;
        }
      )

      setSearchResults(results)
    } catch (error) {
      console.error('搜索处理错误:', error)
      setSearchResults([])
    }
  }

  // 当搜索查询改变时执行搜索
  useEffect(() => {
    handleSearch(searchQuery)
  }, [searchQuery, searchIndex])

  // 当用户按下Ctrl+K或Command+K时打开搜索
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 公开的API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toggleSearch = () => setIsOpen(!isOpen)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        // 清理函数
        window.toggleSearch = undefined
      }
    }
  }, [isOpen]);

  // 在组件加载后设置焦点
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {children}

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-50 overflow-y-auto p-4 pt-[20vh]"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />

        <div className="relative mx-auto max-w-xl rounded-xl bg-white p-4 shadow-2xl dark:bg-gray-900">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文章..."
            className="focus:border-primary-500 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          {isLoading && (
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
              加载中...
            </div>
          )}

          {loadError && (
            <div className="mt-4 text-center text-red-500">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && searchResults.length > 0 && (
            <div className="mt-4 max-h-[60vh] overflow-auto">
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.path}
                    className="cursor-pointer rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      router.push('/' + result.path)
                      setIsOpen(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push('/' + result.path)
                        setIsOpen(false)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {result.title}
                    </div>
                    {result.tags && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {result.tags.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !loadError && searchQuery && searchResults.length === 0 && (
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
              没有找到相关结果
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            按 ESC 关闭，回车键确认
          </div>
        </div>
      </Dialog>
    </>
  )
}

export default SearchProvider
