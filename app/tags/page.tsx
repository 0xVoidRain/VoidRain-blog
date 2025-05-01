import Link from '@/components/Link'
import Tag from '@/components/Tag'
import { slug } from 'github-slugger'
import tagData from 'app/tag-data.json'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '标签' })

export default function TagsPage() {
  const sortedTags = Object.keys(tagData).sort((a, b) => {
    return tagData[b] - tagData[a]
  })

  return (
    <div className="flex flex-col items-start justify-start divide-y divide-gray-200 dark:divide-gray-700 md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6 md:divide-y-0">
      <div className="space-x-2 pb-8 pt-6 md:space-y-5">
        <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:border-r-2 md:px-6 md:text-6xl md:leading-14">
          标签
        </h1>
      </div>
      <div className="flex flex-wrap max-w-lg">
        {sortedTags.length === 0 && '暂无标签。'}
        {sortedTags.map((tag) => {
          return (
            <div key={tag} className="mb-2 mr-5 mt-2">
              <Tag text={tag} />
              <span className="text-sm font-semibold uppercase text-gray-600 dark:text-gray-300">
                {` (${tagData[tag]})`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
} 