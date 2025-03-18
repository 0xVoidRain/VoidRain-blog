'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// 定义虚空雨滴类型
interface VoidDrop {
  x: number
  y: number
  speed: number
  size: number
  opacity: number
  color: string
  tail: number
  lifetime: number
  age: number
  flickerRate: number
  lastFlicker: number
}

// 定义虚空能量波纹类型
interface VoidRipple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
  color: string
  lineWidth: number
  speed: number
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const requestRef = useRef<number | null>(null)
  const voidDropsRef = useRef<VoidDrop[]>([])
  const voidRipplesRef = useRef<VoidRipple[]>([])
  const timeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const intensityRef = useRef<number>(1)
  const { theme } = useTheme()

  // 根据主题获取颜色
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        drops: [
          'rgba(103, 232, 249, 0.8)', // 青色
          'rgba(162, 155, 254, 0.8)', // 紫色
          'rgba(129, 230, 217, 0.8)', // 青绿
          'rgba(79, 209, 197, 0.8)',  // 浅绿蓝
          'rgba(108, 99, 255, 0.8)'   // 亮紫
        ],
        ripples: [
          'rgba(129, 140, 248, 0.8)', // 靛蓝
          'rgba(192, 132, 252, 0.8)', // 亮紫
          'rgba(56, 189, 248, 0.8)'   // 天蓝
        ],
        background: 'rgba(15, 23, 42, 0.03)' // 深蓝背景，非常透明
      }
    } else {
      return {
        drops: [
          'rgba(79, 70, 229, 0.7)',   // 靛蓝
          'rgba(139, 92, 246, 0.7)',  // 紫色
          'rgba(6, 182, 212, 0.7)',   // 青色
          'rgba(45, 212, 191, 0.7)',  // 绿松石
          'rgba(99, 102, 241, 0.7)'   // 靛蓝
        ],
        ripples: [
          'rgba(79, 70, 229, 0.6)',   // 靛蓝
          'rgba(124, 58, 237, 0.6)',  // 紫色
          'rgba(14, 165, 233, 0.6)'   // 天蓝
        ],
        background: 'rgba(241, 245, 249, 0.015)' // 浅色背景，非常透明
      }
    }
  }

  // 设置画布尺寸
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // 鼠标交互与事件处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 点击创建虚空波纹
    const handleClick = (e: MouseEvent) => {
      intensityRef.current = Math.min(intensityRef.current + 0.5, 3)
      
      // 创建虚空波纹
      createVoidRipple(e.clientX, e.clientY)
      
      setTimeout(() => {
        intensityRef.current = Math.max(intensityRef.current - 0.5, 1)
      }, 2000)
    }

    // 滚动影响雨滴强度
    let lastScrollY = window.scrollY
    let scrollTimeout: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      const scrollDelta = Math.abs(window.scrollY - lastScrollY)
      if (scrollDelta > 30) {
        intensityRef.current = Math.min(intensityRef.current + 0.3, 3)
        
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        
        scrollTimeout = setTimeout(() => {
          intensityRef.current = Math.max(intensityRef.current - 0.3, 1)
        }, 1000)
      }
      
      lastScrollY = window.scrollY
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [])

  // 创建虚空波纹
  const createVoidRipple = (x: number, y: number) => {
    const colors = getThemeColors().ripples
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    voidRipplesRef.current.push({
      x,
      y,
      radius: 0,
      maxRadius: 100 + Math.random() * 150,
      opacity: 0.8,
      color,
      lineWidth: 1 + Math.random() * 2,
      speed: 1 + Math.random() * 2
    })
  }

  // 主渲染循环
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化虚空雨滴
    const initVoidDrops = () => {
      const initialCount = Math.floor((dimensions.width * dimensions.height) / 18000)
      const drops: VoidDrop[] = []
      
      for (let i = 0; i < initialCount; i++) {
        drops.push(createVoidDrop())
      }
      
      voidDropsRef.current = drops
    }
    
    // 创建新的虚空雨滴
    const createVoidDrop = (): VoidDrop => {
      const colors = getThemeColors().drops
      const color = colors[Math.floor(Math.random() * colors.length)]
      
      return {
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height - dimensions.height, // 开始在屏幕上方
        speed: 1 + Math.random() * 3,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.7,
        color,
        tail: 20 + Math.random() * 40, // 较长的尾迹
        lifetime: 10000 + Math.random() * 15000, // 较长的生命周期
        age: 0,
        flickerRate: Math.random() * 0.1, // 闪烁速率
        lastFlicker: 0
      }
    }
    
    // 初始化虚空雨滴
    if (voidDropsRef.current.length === 0) {
      initVoidDrops()
    }
    
    // 渲染循环
    const render = (timestamp: number) => {
      if (!canvasRef.current) return
      
      // 计算帧间隔时间
      const deltaTime = lastFrameTimeRef.current ? timestamp - lastFrameTimeRef.current : 16.7
      lastFrameTimeRef.current = timestamp
      timeRef.current += deltaTime
      
      // 清空画布，添加轻微的背景色以配合主题
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = getThemeColors().background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 更新和渲染波纹
      voidRipplesRef.current = voidRipplesRef.current.filter(ripple => {
        ripple.radius += ripple.speed * (deltaTime / 16)
        ripple.opacity -= 0.003 * (deltaTime / 16)
        
        if (ripple.opacity <= 0 || ripple.radius >= ripple.maxRadius) {
          return false
        }
        
        const [r, g, b] = extractRGB(ripple.color)
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ripple.opacity})`
        ctx.lineWidth = ripple.lineWidth
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        ctx.stroke()
        
        return true
      })
      
      // 动态调整雨滴数量基于强度
      const targetDropCount = Math.floor((dimensions.width * dimensions.height) / 18000) * intensityRef.current
      
      // 如果雨滴不足，添加更多
      while (voidDropsRef.current.length < targetDropCount) {
        const newDrop = createVoidDrop()
        newDrop.y = -10 - Math.random() * 50 // 确保从顶部开始
        voidDropsRef.current.push(newDrop)
      }
      
      // 更新和渲染雨滴
      voidDropsRef.current = voidDropsRef.current.filter(drop => {
        drop.age += deltaTime
        
        // 移除超过生命周期的雨滴
        if (drop.age > drop.lifetime) {
          return false
        }
        
        // 计算闪烁效果
        let flickerOpacity = 1
        if (timeRef.current - drop.lastFlicker > 500) {
          if (Math.random() < drop.flickerRate) {
            flickerOpacity = 0.3 + Math.random() * 0.7
            drop.lastFlicker = timeRef.current
          }
        }
        
        // 计算当前透明度基于生命周期和闪烁
        let currentOpacity = drop.opacity * flickerOpacity
        // 淡入淡出效果
        if (drop.age < 800) {
          // 淡入
          currentOpacity = drop.opacity * (drop.age / 800) * flickerOpacity
        } else if (drop.age > drop.lifetime - 1200) {
          // 淡出
          currentOpacity = drop.opacity * ((drop.lifetime - drop.age) / 1200) * flickerOpacity
        }
        
        // 更新位置
        let moveSpeed = drop.speed
        
        // 鼠标交互：光标周围雨滴速度变化
        if (mousePosition) {
          const dx = mousePosition.x - drop.x
          const dy = mousePosition.y - drop.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 200) {
            // 雨滴会被鼠标略微吸引同时加速或减速
            const attractFactor = 0.05 * (1 - distance / 200)
            
            // 根据距离中心的距离决定吸引或排斥
            // 临界点约为100像素
            if (distance < 80) {
              // 靠近中心的雨滴被排斥并减速
              drop.x -= dx * attractFactor * 1.5
              moveSpeed *= 0.8
            } else {
              // 远离中心的雨滴被吸引并加速
              drop.x += dx * attractFactor
              moveSpeed *= 1.5
            }
            
            // 在鼠标周围雨滴稍微变亮
            currentOpacity *= 1.3
          }
        }
        
        drop.y += moveSpeed * (deltaTime / 16) // 基于60FPS的位置更新
        
        // 超出屏幕底部的雨滴回到顶部
        if (drop.y > dimensions.height) {
          drop.y = -5 - Math.random() * 20 // 略微随机化重生位置
          drop.x = Math.random() * dimensions.width // 重新随机化X位置
          drop.age = 0 // 重置生命周期
          return true
        }
        
        // 提取RGB值
        const [r, g, b] = extractRGB(drop.color)
        
        // 绘制雨滴尾迹（径向渐变效果）
        const gradient = ctx.createLinearGradient(
          drop.x, drop.y - drop.tail,
          drop.x, drop.y
        )
        
        // 调整尾部颜色和透明度
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.3})`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${currentOpacity})`)
        
        ctx.beginPath()
        ctx.strokeStyle = gradient
        ctx.lineWidth = drop.size
        ctx.moveTo(drop.x, drop.y - drop.tail)
        ctx.lineTo(drop.x, drop.y)
        ctx.stroke()
        
        // 绘制雨滴头部（发光效果）
        ctx.beginPath()
        ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity * 1.5})`
        ctx.fill()
        
        // 发光效果
        const glowSize = drop.size * 4
        const glow = ctx.createRadialGradient(
          drop.x, drop.y, 0,
          drop.x, drop.y, glowSize
        )
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.8})`)
        glow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.2})`)
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.beginPath()
        ctx.arc(drop.x, drop.y, glowSize, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
        
        return true
      })
      
      requestRef.current = requestAnimationFrame(render)
    }
    
    // 提取RGB值从rgba字符串
    function extractRGB(rgba: string): number[] {
      const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      }
      return [0, 0, 0]
    }
    
    // 启动渲染循环
    requestRef.current = requestAnimationFrame(render)
    
    // 清理
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, mousePosition, theme]) // 添加theme作为依赖，以便主题变化时重新渲染

  if (typeof window === 'undefined') return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
}
