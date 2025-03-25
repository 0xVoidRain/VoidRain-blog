'use client'

import { KBarSearchProvider } from 'pliny/search/KBar'
import { useRouter } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'
import { Blog } from 'contentlayer/generated'

export const SearchProvider = ({ children }) => {
  const router = useRouter()
  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: 'search.json',
        defaultActions: [
          {
            id: 'homepage',
            name: '首页',
            keywords: '主页 home',
            shortcut: ['h', 'h'],
            section: '导航',
            perform: () => router.push('/'),
          },
          {
            id: 'blog',
            name: '博客',
            keywords: 'blog 文章',
            shortcut: ['b', 'l'],
            section: '导航',
            perform: () => router.push('/blog'),
          },
          {
            id: 'tags',
            name: '标签',
            keywords: 'tags 分类',
            shortcut: ['t', 'g'],
            section: '导航',
            perform: () => router.push('/tags'),
          },
          {
            id: 'about',
            name: '关于',
            keywords: 'about 关于',
            shortcut: ['a', 'b'],
            section: '导航',
            perform: () => router.push('/about'),
          },
        ],
        onSearchDocumentsLoad(json) {
          return json.map((post) => ({
            id: post.path,
            name: post.title,
            keywords: post.title + ' ' + (post.summary || '') + ' ' + (post.tags?.join(' ') || ''),
            section: '博客文章',
            subtitle: post.tags?.join(', '),
            perform: () => router.push('/' + post.path),
          }))
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}

export default SearchProvider 