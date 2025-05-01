import Link from '@/components/Link'
import { formatTag } from 'utils/tag'

interface Props {
  text: string
  className?: string
}

const Tag = ({ text, className }: Props) => {
  // 使用slug格式化标签并编码以确保URL安全
  const formattedTag = formatTag(text)
  
  return (
    <Link
      href={`/blog/tag/${formattedTag}`}
      title={text}
      className={`mr-3 text-sm font-medium uppercase text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 ${className}`}
    >
      {text}
    </Link>
  )
}

export default Tag
