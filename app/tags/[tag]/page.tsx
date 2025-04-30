import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { allBlogs } from 'contentlayer/generated'
import tagData from 'app/tag-data.json'
import { genPageMetadata } from 'app/seo'
import { Metadata } from 'next'
import { getTagFromUrl } from '../../../utils/tag'

const POSTS_PER_PAGE = 5

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const params = await props.params
  const tag = getTagFromUrl(params.tag)
  
  return genPageMetadata({
    title: tag,
    description: `${siteMetadata.title} ${tag} tagged content`,
    alternates: {
      canonical: './',
      types: {
        'application/rss+xml': `${siteMetadata.siteUrl}/tags/${params.tag}/feed.xml`,
      },
    },
  })
}

export const generateStaticParams = async () => {
  // 获取所有博客标签
  const tags = new Set<string>()
  allBlogs.forEach((post) => {
    if (post.tags) {
      post.tags.forEach((tag) => {
        tags.add(tag)
      })
    }
  })
  
  // 为每个标签生成路由参数
  return Array.from(tags).map((tag) => ({
    tag: encodeURIComponent(tag),
  }))
}

export default function TagPage({ params }: { params: { tag: string } }) {
  // 从 URL 参数中获取原始标签
  const tag = getTagFromUrl(params.tag)
  
  // 使用原始标签作为标题
  const title = tag
  
  // 过滤具有该标签的文章
  const filteredPosts = allCoreContent(
    sortPosts(allBlogs.filter((post) => post.tags && post.tags.includes(tag)))
  )
  
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const initialDisplayPosts = filteredPosts.slice(0, POSTS_PER_PAGE)
  const pagination = {
    currentPage: 1,
    totalPages: totalPages,
  }

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title={title}
    />
  )
} 