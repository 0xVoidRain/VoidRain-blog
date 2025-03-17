'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  alpha: number
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === 'dark'
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 调整canvas大小以填满整个屏幕
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }
    
    window.addEventListener('resize', handleResize)
    handleResize()
    
    // 初始化粒子
    function initParticles() {
      const particles: Particle[] = []
      const particleCount = Math.floor(canvas.width * canvas.height / 10000)
      
      // 根据主题设置颜色
      const baseColor = isDarkMode ? 
        { r: 120, g: 200, b: 255 } :  // 暗色模式: 蓝色
        { r: 50, g: 100, b: 150 }     // 亮色模式: 深蓝色
      
      const bgColor = isDarkMode ?
        'rgba(10, 15, 30, 0.05)' :   // 暗色模式背景
        'rgba(240, 245, 255, 0.05)'  // 亮色模式背景
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: Math.random() * 1 - 0.5,
          speedY: Math.random() * 1 - 0.5,
          color: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${Math.random() * 0.5 + 0.2})`,
          alpha: Math.random() * 0.5 + 0.1
        })
      }
      
      particlesRef.current = particles
    }
    
    // 动画循环
    function animate() {
      // 根据主题设置背景
      const bgColor = isDarkMode ?
        'rgba(10, 15, 30, 0.05)' :   // 暗色模式背景
        'rgba(240, 245, 255, 0.05)'  // 亮色模式背景
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      particlesRef.current.forEach((particle, index) => {
        // 更新粒子位置
        particle.x += particle.speedX
        particle.y += particle.speedY
        
        // 边界检查
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
        
        // 绘制粒子
        ctx.beginPath()
        ctx.fillStyle = particle.color
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        
        // 绘制连接线
        connectParticles(particle, index)
      })
      
      requestAnimationFrame(animate)
    }
    
    // 连接临近的粒子
    function connectParticles(particle: Particle, index: number) {
      // 根据主题设置连接线颜色
      const lineBaseColor = isDarkMode ?
        { r: 100, g: 180, b: 255 } :  // 暗色模式
        { r: 40, g: 80, b: 120 }      // 亮色模式
      
      for (let i = index + 1; i < particlesRef.current.length; i++) {
        const otherParticle = particlesRef.current[i]
        const distance = Math.sqrt(
          Math.pow(particle.x - otherParticle.x, 2) +
          Math.pow(particle.y - otherParticle.y, 2)
        )
        
        if (distance < 100) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${lineBaseColor.r}, ${lineBaseColor.g}, ${lineBaseColor.b}, ${0.1 * (1 - distance / 100)})`
          ctx.lineWidth = 0.5
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(otherParticle.x, otherParticle.y)
          ctx.stroke()
        }
      }
    }
    
    // 检测性能，如果帧率低，可以减少粒子数量或禁用动画
    let frames = 0
    let lastTime = performance.now()
    
    const checkPerformance = () => {
      const now = performance.now()
      const elapsed = now - lastTime
      
      if (elapsed >= 1000) {
        const fps = frames / (elapsed / 1000)
        
        if (fps < 30) {
          // 帧率太低，禁用动画或减少复杂度
          setIsVisible(false)
        }
        
        frames = 0
        lastTime = now
      }
      
      frames++
      requestAnimationFrame(checkPerformance)
    }
    
    checkPerformance()
    
    // 开始动画
    animate()
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isDarkMode])
  
  return isVisible ? (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 opacity-60"
      style={{ pointerEvents: 'none' }}
    />
  ) : null
} 