interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: '垂直管道雾培鱼菜共生',
    description: `改造自越南博主的水培鱼菜共生系统.`,
    imgSrc: '/static/images/pipe.png',
    href: '/blog/荒田的试验：2022 年的垂直雾培鱼菜共生梦.mdx',
  },
  {
    title: '建设中',
    description: `建设中.`,
    imgSrc: '/static/images/',
    href: '/blog/',
  },
]

export default projectsData
