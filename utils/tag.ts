/**
 * 标签处理工具函数
 * 
 * 这个文件包含处理博客标签的工具函数，特别是处理中文标签的 URL 友好版本
 */

/**
 * 获取标签的 URL 友好版本
 * 对于中文标签，直接返回原始标签文本，依赖 encodeURIComponent 进行 URL 编码
 * 对于英文标签，可以使用小写和连字符
 */
export function formatTagForUrl(tag: string): string {
  return tag;
}

/**
 * 从 URL 参数中获取原始标签文本
 * 对于 URL 中的标签，使用 decodeURIComponent 解码
 */
export function getTagFromUrl(urlTag: string): string {
  return decodeURIComponent(urlTag);
} 