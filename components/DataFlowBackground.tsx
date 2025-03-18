'use client'

import React, { useEffect, useRef, useState } from 'react'

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
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const requestRef = useRef<number | null>(null)
  const voidDropsRef = useRef<VoidDrop[]>([])
  const timeRef = useRef<number>(0)
  const intensityRef = useRef<number>(1)

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

  // 鼠标交互
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 点击增加雨滴强度
    const handleClick = () => {
      intensityRef.current = Math.min(intensityRef.current + 0.5, 3)
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
    }
  }, [])

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
      const initialCount = Math.floor((dimensions.width * dimensions.height) / 15000)
      const drops: VoidDrop[] = []
      
      for (let i = 0; i < initialCount; i++) {
        drops.push(createVoidDrop())
      }
      
      voidDropsRef.current = drops
    }
    
    // 创建新的虚空雨滴
    const createVoidDrop = (): VoidDrop => {
      // 基础颜色：深蓝、紫色、青色
      const colors = [
        'rgba(34, 87, 122, 0.8)',  // 深海蓝
        'rgba(87, 24, 158, 0.8)',  // 迷幻紫
        'rgba(0, 183, 196, 0.8)',  // 科技青
        'rgba(15, 52, 96, 0.8)'    // 暗夜蓝
      ]
      
      return {
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height - dimensions.height, // 从屏幕顶部之上开始
        speed: 1 + Math.random() * 3,
        size: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        tail: 10 + Math.random() * 40, // 尾迹长度
        lifetime: 5000 + Math.random() * 10000, // 生命周期5-15秒
        age: 0
      }
    }
    
    // 初始化
    initVoidDrops()
    
    // 渲染循环
    const render = (timestamp: number) => {
      if (!ctx) return
      
      // 计算时间差
      const deltaTime = timestamp - timeRef.current
      timeRef.current = timestamp
      
      // 清除画布，使用半透明黑色以创建残影效果
      ctx.fillStyle = 'rgba(8, 10, 20, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 根据强度决定每帧新增雨滴数量
      const newDropsPerFrame = 0.1 * intensityRef.current
      
      // 累积小数部分，当超过1时创建新雨滴
      voidDropsRef.current.newDropsFraction = (voidDropsRef.current.newDropsFraction || 0) + newDropsPerFrame
      while (voidDropsRef.current.newDropsFraction >= 1) {
        voidDropsRef.current.push(createVoidDrop())
        voidDropsRef.current.newDropsFraction -= 1
      }
      
      // 创建虚空中的暗光效果
      if (mousePosition) {
        const gradient = ctx.createRadialGradient(
          mousePosition.x, mousePosition.y, 0,
          mousePosition.x, mousePosition.y, 300
        )
        gradient.addColorStop(0, 'rgba(35, 10, 60, 0.3)')
        gradient.addColorStop(0.5, 'rgba(35, 10, 60, 0.1)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(mousePosition.x, mousePosition.y, 300, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // 更新和渲染所有雨滴
      voidDropsRef.current = voidDropsRef.current.filter(drop => {
        // 更新雨滴年龄
        drop.age += deltaTime
        
        // 移除超过生命周期的雨滴
        if (drop.age > drop.lifetime) {
          return false
        }
        
        // 计算当前透明度基于生命周期
        let currentOpacity = drop.opacity
        // 淡入淡出效果
        if (drop.age < 500) {
          // 淡入
          currentOpacity = drop.opacity * (drop.age / 500)
        } else if (drop.age > drop.lifetime - 800) {
          // 淡出
          currentOpacity = drop.opacity * ((drop.lifetime - drop.age) / 800)
        }
        
        // 更新位置
        let moveSpeed = drop.speed
        
        // 鼠标交互：光标周围雨滴速度变化
        if (mousePosition) {
          const dx = mousePosition.x - drop.x
          const dy = mousePosition.y - drop.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 200) {
            // 雨滴会被鼠标略微吸引同时加速
            const attractFactor = 0.03 * (1 - distance / 200)
            drop.x += dx * attractFactor
            moveSpeed += 2 * (1 - distance / 200)
          }
        }
        
        drop.y += moveSpeed * (deltaTime / 16) // 基于60FPS的位置更新
        
        // 超出屏幕底部的雨滴回到顶部
        if (drop.y > dimensions.height) {
          drop.y = -5 - Math.random() * 20 // 略微随机化重生位置
          drop.x = Math.random() * dimensions.width // 重新随机化X位置
          return true
        }
        
        // 绘制雨滴
        const [r, g, b] = extractRGB(drop.color)
        
        // 绘制雨滴尾迹（径向渐变效果）
        const gradient = ctx.createLinearGradient(
          drop.x, drop.y - drop.tail,
          drop.x, drop.y
        )
        
        // 计算尾部颜色（淡出）
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
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
        const glowSize = drop.size * 3
        const glow = ctx.createRadialGradient(
          drop.x, drop.y, 0,
          drop.x, drop.y, glowSize
        )
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.8})`)
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
  }, [dimensions, mousePosition])

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
