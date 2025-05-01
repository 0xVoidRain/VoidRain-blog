import Link from 'next/link'
import { formatTagForUrl } from '../utils/tag'

/**
 * 博客标签组件
 * @param {object} props - 组件属性
 * @param {string} props.text - 标签文本
 */
const Tag = ({ text }) => {
  const encodedTag = encodeURIComponent(formatTagForUrl(text))
  
  return (
    <Link
      href={`/tags/${encodedTag}`}
      className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 mr-3 text-sm font-medium uppercase"
    >
      {text}
    </Link>
  )
}

export default Tag