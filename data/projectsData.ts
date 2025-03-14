interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: '建设中',
    description: `建设中.`,
    imgSrc: '/static/images/',
    href: '',
  },
  {
    title: '建设中',
    description: `建设中.`,
    imgSrc: '/static/images/',
    href: '/blog/',
  },
]

export default projectsData
