'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DataFlowBackground() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>()
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  
  // 状态引用
  const timeRef = useRef(0)
  const gridRef = useRef<any>({
    points: [],
    rotation: 0,
    scale: 1,
    centerX: 0,
    centerY: 0
  })
  const raindropRef = useRef<any[]>([])
  const hoverElementsRef = useRef<any[]>([])
  const glitchTimeRef = useRef(0)
  const mousePositionRef = useRef<{x: number, y: number} | null>(null)
  
  // 颜色配置 - 酸性霓虹色调
  const colors = {
    primary: { r: 149, g: 0, b: 255 },       // 蓝紫色
    secondary: { r: 0, g: 255, b: 172 },     // 荧光绿
    accent: { r: 255, g: 0, b: 187 },        // 霓虹粉
    glitch1: { r: 255, g: 0, b: 0 },         // 红色通道
    glitch2: { r: 0, g: 255, b: 0 },         // 绿色通道
    glitch3: { r: 0, g: 0, b: 255 }          // 蓝色通道
  }
  
  // 创建扭曲网格
  const createGrid = (width: number, height: number) => {
    const grid = {
      points: [],
      rotation: 0,
      scale: 1,
      centerX: width / 2,
      centerY: height / 2
    }
    
    const size = Math.min(width, height) > 1200 ? 60 : 40
    const cols = Math.ceil(width / size) + 2
    const rows = Math.ceil(height / size) + 2
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid.points.push({
          x: x * size - size,
          y: y * size - size,
          baseX: x * size - size,
          baseY: y * size - size,
          distortion: Math.random() * 0.3 + 0.1,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          velocity: Math.random() * 0.02 + 0.01,
          glitchIntensity: 0,
          size: Math.random() * 2 + 1
        })
      }
    }
    
    return grid
  }
  
  // 创建雨滴粒子
  const createRaindrops = (count: number, width: number, height: number) => {
    const raindrops = []
    
    for (let i = 0; i < count; i++) {
      raindrops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3,
        hue: Math.random() * 60 + 180  // 蓝到绿色范围
      })
    }
    
    return raindrops
  }
  
  // 噪声函数 (简化的Perlin噪声模拟)
  const noise = (x: number, y: number) => {
    // 简化的噪声函数
    return Math.sin(x * 0.01) * Math.cos(y * 0.01) * 
           Math.sin((x + y) * 0.005) * 2
  }
  
  // 扭曲点位置
  const distortPoint = (point: any, time: number, centerX: number, centerY: number, rotation: number) => {
    // 基础螺旋旋转
    const angle = rotation + 
                Math.atan2(point.baseY - centerY, point.baseX - centerX)
    const distance = Math.sqrt(
      Math.pow(point.baseX - centerX, 2) + 
      Math.pow(point.baseY - centerY, 2)
    )
    
    const rotationFactor = 0.0001
    const spiralFactor = 0.1
    const baseTwist = rotation * rotationFactor
    
    // 螺旋扭曲效果
    const newX = centerX + 
              Math.cos(angle + distance * baseTwist) * 
              (distance + Math.sin(time * 0.001) * spiralFactor * distance)
    const newY = centerY + 
              Math.sin(angle + distance * baseTwist) * 
              (distance + Math.sin(time * 0.001) * spiralFactor * distance)
    
    // 添加波浪扭曲
    const nx = noise(point.noiseOffsetX + time * point.velocity, 0)
    const ny = noise(0, point.noiseOffsetY + time * point.velocity)
    
    const distortionAmount = point.distortion * 20
    
    return {
      x: newX + nx * distortionAmount,
      y: newY + ny * distortionAmount
    }
  }
  
  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, grid: any, time: number, width: number, height: number) => {
    const cols = Math.ceil(width / 40) + 2
    
    // 更新网格旋转
    grid.rotation += 0.0005
    
    // 计算扭曲后的点位置
    const distortedPoints = grid.points.map((point: any) => {
      const distorted = distortPoint(
        point, 
        time, 
        grid.centerX, 
        grid.centerY, 
        grid.rotation
      )
      
      // 添加鼠标交互
      if (mousePositionRef.current) {
        const dx = mousePositionRef.current.x - distorted.x
        const dy = mousePositionRef.current.y - distorted.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const maxDistance = 200
        
        if (distance < maxDistance) {
          const influence = 1 - distance / maxDistance
          point.glitchIntensity = influence * 0.5
          
          // 随机创建雨滴
          if (Math.random() < 0.01 * influence) {
            raindropRef.current.push({
              x: distorted.x,
              y: distorted.y,
              size: Math.random() * 4 + 1,
              speed: Math.random() * 3 + 2,
              opacity: Math.random() * 0.8 + 0.2,
              hue: Math.random() * 60 + 180
            })
          }
        } else {
          point.glitchIntensity *= 0.95
        }
      } else {
        point.glitchIntensity *= 0.95
      }
      
      return {
        ...distorted,
        glitchIntensity: point.glitchIntensity,
        size: point.size
      }
    })
    
    // 绘制网格线
    for (let y = 0; y < distortedPoints.length / cols; y++) {
      for (let x = 0; x < cols; x++) {
        const index = y * cols + x
        if (!distortedPoints[index]) continue
        
        // 水平线
        if (x < cols - 1) {
          const nextColIndex = y * cols + x + 1
          if (distortedPoints[nextColIndex]) {
            const currentPoint = distortedPoints[index]
            const nextPoint = distortedPoints[nextColIndex]
            
            // 创建渐变
            const gradient = ctx.createLinearGradient(
              currentPoint.x, currentPoint.y, 
              nextPoint.x, nextPoint.y
            )
            
            // 霓虹渐变效果
            const hue1 = (time * 0.01 + x * 10) % 360
            const hue2 = (time * 0.01 + (x+1) * 10) % 360
            
            gradient.addColorStop(0, `hsla(${hue1}, 100%, 70%, ${0.3 + currentPoint.glitchIntensity})`)
            gradient.addColorStop(1, `hsla(${hue2}, 100%, 70%, ${0.3 + nextPoint.glitchIntensity})`)
            
            ctx.beginPath()
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 4
            
            // 基础线条
            ctx.moveTo(currentPoint.x, currentPoint.y)
            ctx.lineTo(nextPoint.x, nextPoint.y)
            ctx.stroke()
            
            // 故障效果 - 通道分离
            if (Math.random() < 0.1 || glitchTimeRef.current > 0) {
              const glitchAmount = 2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 10
              
              // 红色通道
              ctx.beginPath()
              ctx.strokeStyle = `rgba(255, 0, 0, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x - glitchAmount, currentPoint.y)
              ctx.lineTo(nextPoint.x - glitchAmount, nextPoint.y)
              ctx.stroke()
              
              // 绿色通道
              ctx.beginPath()
              ctx.strokeStyle = `rgba(0, 255, 0, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x, currentPoint.y + glitchAmount / 2)
              ctx.lineTo(nextPoint.x, nextPoint.y + glitchAmount / 2)
              ctx.stroke()
              
              // 蓝色通道
              ctx.beginPath()
              ctx.strokeStyle = `rgba(0, 0, 255, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x + glitchAmount, currentPoint.y)
              ctx.lineTo(nextPoint.x + glitchAmount, nextPoint.y)
              ctx.stroke()
            }
          }
        }
        
        // 垂直线
        if (y < distortedPoints.length / cols - 1) {
          const nextRowIndex = (y + 1) * cols + x
          if (distortedPoints[nextRowIndex]) {
            const currentPoint = distortedPoints[index]
            const nextPoint = distortedPoints[nextRowIndex]
            
            // 创建渐变
            const gradient = ctx.createLinearGradient(
              currentPoint.x, currentPoint.y, 
              nextPoint.x, nextPoint.y
            )
            
            const hue1 = (time * 0.01 + y * 10) % 360
            const hue2 = (time * 0.01 + (y+1) * 10) % 360
            
            gradient.addColorStop(0, `hsla(${hue1}, 100%, 70%, ${0.3 + currentPoint.glitchIntensity})`)
            gradient.addColorStop(1, `hsla(${hue2}, 100%, 70%, ${0.3 + nextPoint.glitchIntensity})`)
            
            ctx.beginPath()
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 4
            
            ctx.moveTo(currentPoint.x, currentPoint.y)
            ctx.lineTo(nextPoint.x, nextPoint.y)
            ctx.stroke()
            
            // 故障效果 - 垂直线
            if (Math.random() < 0.1 || glitchTimeRef.current > 0) {
              const glitchAmount = 2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 10
              
              ctx.beginPath()
              ctx.strokeStyle = `rgba(255, 0, 0, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x - glitchAmount, currentPoint.y)
              ctx.lineTo(nextPoint.x - glitchAmount, nextPoint.y)
              ctx.stroke()
              
              ctx.beginPath()
              ctx.strokeStyle = `rgba(0, 255, 0, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x, currentPoint.y + glitchAmount / 2)
              ctx.lineTo(nextPoint.x, nextPoint.y + glitchAmount / 2)
              ctx.stroke()
              
              ctx.beginPath()
              ctx.strokeStyle = `rgba(0, 0, 255, ${0.2 + Math.max(currentPoint.glitchIntensity, nextPoint.glitchIntensity) * 0.3})`
              ctx.moveTo(currentPoint.x + glitchAmount, currentPoint.y)
              ctx.lineTo(nextPoint.x + glitchAmount, nextPoint.y)
              ctx.stroke()
            }
          }
        }
        
        // 绘制节点
        if (distortedPoints[index].glitchIntensity > 0.05) {
          const point = distortedPoints[index]
          ctx.beginPath()
          
          const glowSize = point.size + point.glitchIntensity * 10
          const gradient = ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, glowSize * 2
          )
          
          const hue = (time * 0.05 + (x + y) * 10) % 360
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.8 * point.glitchIntensity})`)
          gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`)
          
          ctx.fillStyle = gradient
          ctx.arc(point.x, point.y, glowSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    
    // 故障效果计时器
    if (Math.random() < 0.002 || glitchTimeRef.current > 0) {
      glitchTimeRef.current = Math.max(0, glitchTimeRef.current - 1)
      
      if (glitchTimeRef.current <= 0 && Math.random() < 0.1) {
        glitchTimeRef.current = Math.random() * 20
      }
      
      // 随机故障扰动
      if (Math.random() < 0.2) {
        ctx.save()
        ctx.globalAlpha = Math.random() * 0.1 + 0.1
        ctx.drawImage(
          ctx.canvas, 
          Math.random() * 10 - 5, Math.random() * 10 - 5,
          width + Math.random() * 10 - 5, height + Math.random() * 10 - 5
        )
        ctx.restore()
      }
    }
  }
  
  // 绘制雨滴
  const drawRaindrops = (ctx: CanvasRenderingContext2D, time: number, height: number) => {
    raindropRef.current.forEach((drop, index) => {
      // 更新位置
      drop.y += drop.speed
      drop.opacity -= 0.01
      
      // 绘制雨滴
      ctx.beginPath()
      
      const gradient = ctx.createRadialGradient(
        drop.x, drop.y, 0,
        drop.x, drop.y, drop.size * 2
      )
      
      gradient.addColorStop(0, `hsla(${drop.hue}, 100%, 70%, ${drop.opacity})`)
      gradient.addColorStop(1, `hsla(${drop.hue}, 100%, 70%, 0)`)
      
      ctx.fillStyle = gradient
      ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2)
      ctx.fill()
      
      // 绘制拖尾
      ctx.beginPath()
      const tailGradient = ctx.createLinearGradient(
        drop.x, drop.y, 
        drop.x, drop.y - drop.size * 5
      )
      
      tailGradient.addColorStop(0, `hsla(${drop.hue}, 100%, 70%, ${drop.opacity})`)
      tailGradient.addColorStop(1, `hsla(${drop.hue}, 100%, 70%, 0)`)
      
      ctx.strokeStyle = tailGradient
      ctx.lineWidth = drop.size / 2
      ctx.moveTo(drop.x, drop.y)
      ctx.lineTo(drop.x, drop.y - drop.size * 5)
      ctx.stroke()
      
      // 移除不可见的雨滴
      if (drop.y > height || drop.opacity <= 0) {
        raindropRef.current.splice(index, 1)
      }
    })
  }
  
  // 动画循环
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 设置背景
    ctx.fillStyle = theme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制网格
    drawGrid(ctx, gridRef.current, time, canvas.width, canvas.height)
    
    // 绘制雨滴
    drawRaindrops(ctx, time, canvas.height)
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }
  
  // 窗口大小变化处理
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // 鼠标移动处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
      
      // 随机触发故障效果
      if (Math.random() < 0.05) {
        glitchTimeRef.current = Math.random() * 10
      }
    }
    
    const handleMouseLeave = () => {
      mousePositionRef.current = null
    }
    
    // 监听页面中的链接和按钮，当鼠标悬浮时应用特效
    const handleHoverElements = () => {
      const elements = document.querySelectorAll('a, button')
      
      elements.forEach(el => {
        el.addEventListener('mouseenter', (e) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          const x = rect.left + rect.width / 2
          const y = rect.top + rect.height / 2
          
          // 触发故障效果
          glitchTimeRef.current = 20
          
          // 在元素周围添加更多雨滴
          for (let i = 0; i < 10; i++) {
            raindropRef.current.push({
              x: x + (Math.random() - 0.5) * rect.width,
              y: y + (Math.random() - 0.5) * rect.height,
              size: Math.random() * 4 + 2,
              speed: Math.random() * 3 + 1,
              opacity: Math.random() * 0.8 + 0.2,
              hue: Math.random() * 60 + 180
            })
          }
        })
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    
    // 等DOM加载完成后设置悬浮监听
    setTimeout(handleHoverElements, 1000)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])
  
  // 初始化和动画处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 创建网格
    gridRef.current = createGrid(dimensions.width, dimensions.height)
    
    // 创建雨滴
    raindropRef.current = createRaindrops(20, dimensions.width, dimensions.height)
    
    // 开始动画循环
    requestRef.current = requestAnimationFrame(animate)
    
    // 清理
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, theme])

  const [mounted, setMounted] = useState(false)
  
  // 确保组件仅在客户端渲染
  useEffect(() => {
    setMounted(true)
    
    // 以下是你的 canvas 初始化和动画代码
    if (canvasRef.current) {
      // ... 你的现有 canvas 代码 ...
    }
    
    return () => {
      // 清理代码
    }
  }, [theme])
  
  // 仅在客户端渲染
  if (!mounted) return null
  
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
