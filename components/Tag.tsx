import Link from 'next/link'
import { formatTagForUrl } from '@/utils/tag'

interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
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