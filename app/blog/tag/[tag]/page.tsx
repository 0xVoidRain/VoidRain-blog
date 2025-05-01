import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { genPageMetadata } from 'app/seo'
import { formatTag } from 'utils/tag'

export function generateMetadata({ params }: { params: { tag: string[] } }) {
  const tagStr = decodeURIComponent(params.tag.join('/'))
  return genPageMetadata({
    title: `${tagStr.charAt(0).toUpperCase() + tagStr.slice(1)} 标签`,
    description: `关于 ${tagStr} 的所有文章`,
  })
}

export function generateStaticParams() {
  const tagCounts = {}
  allBlogs.forEach((post) => {
    if (post.tags && post.draft !== true) {
      post.tags.forEach((tag) => {
        const formattedTag = formatTag(tag)
        if (formattedTag in tagCounts) {
          tagCounts[formattedTag] += 1
        } else {
          tagCounts[formattedTag] = 1
        }
      })
    }
  })
  
  return Object.keys(tagCounts).map((tag) => ({
    tag: [tag],
  }))
}

export default function TagPage({ params }: { params: { tag: string[] } }) {
  const tagStr = decodeURIComponent(params.tag.join('/'))
  
  const posts = allCoreContent(
    sortPosts(
      allBlogs.filter((post) => {
        if (post.draft === true) return false
        return post.tags && post.tags.some((t) => formatTag(t) === formatTag(tagStr))
      })
    )
  )
  
  return <ListLayout posts={posts} title={`标签: ${tagStr}`} filterTag={tagStr} />
} 