'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'

const SearchProvider = ({ children }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState([])

  // 加载搜索索引
  useEffect(() => {
    const loadSearchIndex = async () => {
      try {
        const response = await fetch('/search.json')
        if (response.ok) {
          const data = await response.json()
          setSearchIndex(data)
        }
      } catch (error) {
        console.error('加载搜索索引失败:', error)
      }
    }

    loadSearchIndex()
  }, [])

  // 搜索处理函数
  const handleSearch = (query) => {
    if (!query.trim() || !searchIndex.length) {
      setSearchResults([])
      return
    }

    // 简单的搜索算法
    const results = searchIndex.filter(
      (item) =>
        item.title?.toLowerCase().includes(query.toLowerCase()) ||
        item.summary?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    )

    setSearchResults(results)
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
  window.toggleSearch = () => setIsOpen(!isOpen)

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
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文章..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            autoFocus
          />

          {searchResults.length > 0 && (
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

          {searchQuery && searchResults.length === 0 && (
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
