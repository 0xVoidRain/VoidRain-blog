import { usePathname } from 'next/router'

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname() || ''
  const segments = pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const basePath = pathname
    .replace(/^\//, '') // Remove leading slash
    // 其余代码不变...
} 