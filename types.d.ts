declare module 'contentlayer2/source-files' {
  export const defineDocumentType: any;
  export const makeSource: any;
  export type ComputedFields = any;
}

declare module 'contentlayer/generated' {
  export type Blog = any;
  export type Authors = any;
  export const allBlogs: any[];
  export const allAuthors: any[];
}

declare module 'pliny/search/KBar' {
  export const KBarSearchProvider: any;
}

declare module 'pliny/utils/contentlayer' {
  export const allCoreContent: any;
  export const sortPosts: any;
  export const coreContent: any;
}

declare module 'pliny/mdx-plugins/index.js' {
  export const remarkExtractFrontmatter: any;
  export const remarkCodeTitles: any;
  export const remarkImgToJsx: any;
  export const extractTocHeadings: any;
}

declare module 'reading-time' {
  const readingTime: any;
  export default readingTime;
}

declare module 'next/navigation' {
  export const useRouter: any;
}

declare module 'github-slugger' {
  export const slug: any;
}

declare module 'hast-util-from-html-isomorphic' {
  export const fromHtmlIsomorphic: any;
}

declare module 'pliny/search/KBar' {
  export const KBarSearchProvider: any;
}

declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}

declare module 'remark-math' {
  const remarkMath: any;
  export default remarkMath;
}

declare module 'remark-github-blockquote-alert' {
  export const remarkAlert: any;
}

declare module 'rehype-slug' {
  const rehypeSlug: any;
  export default rehypeSlug;
}

declare module 'rehype-autolink-headings' {
  const rehypeAutolinkHeadings: any;
  export default rehypeAutolinkHeadings;
}

declare module 'rehype-katex' {
  const rehypeKatex: any;
  export default rehypeKatex;
}

declare module 'rehype-katex-notranslate' {
  const rehypeKatexNoTranslate: any;
  export default rehypeKatexNoTranslate;
}

declare module 'rehype-citation' {
  const rehypeCitation: any;
  export default rehypeCitation;
}

declare module 'rehype-prism-plus' {
  const rehypePrismPlus: any;
  export default rehypePrismPlus;
}

declare module 'rehype-preset-minify' {
  const rehypePresetMinify: any;
  export default rehypePresetMinify;
}

declare module 'prettier' {
  const prettier: any;
  export default prettier;
} 