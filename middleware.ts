import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { slug } from 'github-slugger'

// 这个中间件会检查 /tags/ 路径，如果发现中文标签，会重定向到正确的 slugified URL
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 只处理 /tags/ 路径下的请求
  if (pathname.startsWith('/tags/')) {
    const parts = pathname.split('/tags/')
    if (parts.length > 1) {
      const tagPart = parts[1].split('/')[0] // 获取标签部分，排除后面可能的子路由

      try {
        // 尝试解码 URL
        const decodedTag = decodeURIComponent(tagPart)
        
        // 如果 decoded 后和 slug 后不一样，说明是中文或特殊字符标签
        // 需要重定向到 slugified 版本
        const slugifiedTag = slug(decodedTag)
        
        if (slugifiedTag !== tagPart) {
          // 构建新的 URL，保留路径后面的部分
          const newPath = pathname.replace(`/tags/${tagPart}`, `/tags/${slugifiedTag}`)
          return NextResponse.redirect(new URL(newPath, request.url))
        }
      } catch (e) {
        // 解码错误，继续处理
        console.error("URL 解码错误:", e)
      }
    }
  }

  return NextResponse.next()
}

// 仅对特定路径应用中间件
export const config = {
  matcher: '/tags/:path*',
} 