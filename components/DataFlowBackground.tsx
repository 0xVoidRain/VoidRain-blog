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
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  
  // 引用参数
  const noiseOffsetRef = useRef(0)
  const gridRef = useRef<any[]>([])
  const dropletsRef = useRef<any[]>([])
  const hoverElementRef = useRef<{ x: number, y: number, radius: number, active: boolean }>({
    x: 0, y: 0, radius: 0, active: false
  })
  const timeRef = useRef(0)
  
  // 配置参数
  const config = {
    gridSize: 40,
    distortionAmount: 15,
    rotationSpeed: 0.04,
    colorCycle: 3000, // 颜色循环周期(ms)
    glitchInterval: 2000, // 故障效果间隔(ms)
    glitchDuration: 200, // 故障效果持续时间(ms)
    dropletSpawnRate: 0.03, // 每帧生成水滴的概率
    dropletLifespan: { min: 30, max: 90 }, // 水滴生命周期范围(帧)
    primaryColor: '#6600ff', // 蓝紫色
    secondaryColor: '#00ff99', // 荧光绿
    accentColor: '#ff00ff', // 品红色
    darkMode: {
      opacity: 0.7,
      brightness: 1.2
    },
    lightMode: {
      opacity: 0.4,
      brightness: 0.8
    }
  }
  
  // 辅助函数: 柏林噪声
  const noise = (x: number, y: number, z: number) => {
    // 简化版柏林噪声
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    
    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)
    
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    
    const A = (X + Y) % 255
    const AA = (A + Z) % 255
    const AB = (A + 1 + Z) % 255
    const B = (X + Y + 1) % 255
    const BA = (B + Z) % 255
    const BB = (B + 1 + Z) % 255
    
    return lerp(w, lerp(v, lerp(u, grad(X, Y, Z), grad(X+1, Y, Z)),
                             lerp(u, grad(X, Y+1, Z), grad(X+1, Y+1, Z))),
                    lerp(v, lerp(u, grad(X, Y, Z+1), grad(X+1, Y, Z+1)),
                             lerp(u, grad(X, Y+1, Z+1), grad(X+1, Y+1, Z+1))))
  }
  
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  
  const lerp = (t: number, a: number, b: number) => a + t * (b - a)
  
  const grad = (x: number, y: number, z: number) => {
    const h = (x + y * 57 + z * 131) % 8
    const u = h < 4 ? x : y
    const v = h < 4 ? y : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }
  
  // 颜色处理函数
  const getGradientColor = (time: number) => {
    const t = (time % config.colorCycle) / config.colorCycle
    
    // 创建2个颜色之间的渐变
    const r1 = parseInt(config.primaryColor.substring(1, 3), 16)
    const g1 = parseInt(config.primaryColor.substring(3, 5), 16)
    const b1 = parseInt(config.primaryColor.substring(5, 7), 16)
    
    const r2 = parseInt(config.secondaryColor.substring(1, 3), 16)
    const g2 = parseInt(config.secondaryColor.substring(3, 5), 16)
    const b2 = parseInt(config.secondaryColor.substring(5, 7), 16)
    
    const r = Math.floor(r1 + t * (r2 - r1))
    const g = Math.floor(g1 + t * (g2 - g1))
    const b = Math.floor(b1 + t * (b2 - b1))
    
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // 故障艺术效果
  const applyGlitchEffect = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const data = imageData.data
    
    // RGB通道错位
    const channelOffset = Math.floor(Math.random() * 10) + 5
    
    for (let y = 0; y < ctx.canvas.height; y++) {
      if (Math.random() > 0.85) continue // 只对部分行应用效果
      
      for (let x = 0; x < ctx.canvas.width; x++) {
        const index = (y * ctx.canvas.width + x) * 4
        
        // 红色通道向右偏移
        if (x + channelOffset < ctx.canvas.width) {
          const redOffset = ((y * ctx.canvas.width) + (x + channelOffset)) * 4
          data[index] = data[redOffset]
        }
        
        // 蓝色通道向左偏移
        if (x - channelOffset >= 0) {
          const blueOffset = ((y * ctx.canvas.width) + (x - channelOffset)) * 4 + 2
          data[index + 2] = data[blueOffset]
        }
      }
    }
    
    // 像素撕裂效果
    for (let i = 0; i < 10; i++) {
      const y = Math.floor(Math.random() * ctx.canvas.height)
      const height = Math.floor(Math.random() * 20) + 5
      const offset = Math.floor(Math.random() * 20) - 10
      
      for (let h = 0; h < height; h++) {
        if (y + h >= ctx.canvas.height) continue
        
        for (let x = 0; x < ctx.canvas.width; x++) {
          const destIndex = ((y + h) * ctx.canvas.width + x) * 4
          
          let srcX = x + offset
          if (srcX < 0) srcX = 0
          if (srcX >= ctx.canvas.width) srcX = ctx.canvas.width - 1
          
          const srcIndex = ((y + h) * ctx.canvas.width + srcX) * 4
          
          data[destIndex] = data[srcIndex]       // R
          data[destIndex + 1] = data[srcIndex + 1] // G
          data[destIndex + 2] = data[srcIndex + 2] // B
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }
  
  // 初始化网格
  const initGrid = (width: number, height: number) => {
    const grid = []
    
    // 计算行列数
    const cols = Math.ceil(width / config.gridSize) + 4
    const rows = Math.ceil(height / config.gridSize) + 4
    
    // 中心点
    const centerX = width / 2
    const centerY = height / 2
    
    // 创建网格点
    for (let i = -2; i < rows - 2; i++) {
      for (let j = -2; j < cols - 2; j++) {
        const baseX = j * config.gridSize
        const baseY = i * config.gridSize
        
        // 到中心的距离
        const distToCenterX = baseX - centerX
        const distToCenterY = baseY - centerY
        
        grid.push({
          baseX, baseY,
          x: baseX, y: baseY,
          distToCenterX, distToCenterY,
          life: 0,
          highlight: Math.random() < 0.1, // 10%的点高亮
          size: Math.random() < 0.2 ? 2 : 1 // 20%的点更大
        })
      }
    }
    
    return grid
  }
  
  // 绘制扭曲网格
  const drawGrid = (ctx: CanvasRenderingContext2D, time: number, deltaTime: number) => {
    const { width, height } = ctx.canvas
    
    // 设置主要参数
    const currentTime = time / 1000
    const isGlitchMoment = Math.floor(time / config.glitchInterval) !== 
                            Math.floor((time - deltaTime) / config.glitchInterval)
    const glitchActive = isGlitchMoment || 
                         (time % config.glitchInterval < config.glitchDuration)
    
    // 更新噪声偏移
    noiseOffsetRef.current += deltaTime * 0.05
    
    // 计算旋转角度
    const rotation = currentTime * config.rotationSpeed
    
    // 更新网格点位置
    const grid = gridRef.current
    const centerX = width / 2
    const centerY = height / 2
    
    grid.forEach(point => {
      // 旋转坐标
      const rotatedX = 
        point.distToCenterX * Math.cos(rotation) - point.distToCenterY * Math.sin(rotation)
      const rotatedY = 
        point.distToCenterX * Math.sin(rotation) + point.distToCenterY * Math.cos(rotation)
      
      // 基础坐标（中心点 + 旋转后的偏移）
      let x = centerX + rotatedX
      let y = centerY + rotatedY
      
      // 扭曲效果
      const noiseX = noise(
        x * 0.005 + noiseOffsetRef.current, 
        y * 0.005, 
        noiseOffsetRef.current
      ) * config.distortionAmount * 2
      
      const noiseY = noise(
        x * 0.005, 
        y * 0.005 + noiseOffsetRef.current, 
        noiseOffsetRef.current + 100
      ) * config.distortionAmount * 2
      
      // 应用扭曲
      point.x = x + noiseX
      point.y = y + noiseY
      
      // 悬浮放大效果
      if (hoverElementRef.current.active) {
        const dx = point.x - hoverElementRef.current.x
        const dy = point.y - hoverElementRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < hoverElementRef.current.radius) {
          const scale = 1 + (hoverElementRef.current.radius - dist) / hoverElementRef.current.radius
          point.x = hoverElementRef.current.x + dx * scale
          point.y = hoverElementRef.current.y + dy * scale
        }
      }
    })
    
    // 绘制网格线
    const baseColor = getGradientColor(time)
    
    // 获取模式调整
    const modeAdjust = theme === 'dark' ? config.darkMode : config.lightMode
    
    // 设置线条样式
    ctx.lineWidth = 1
    ctx.strokeStyle = baseColor
    ctx.globalAlpha = modeAdjust.opacity
    
    // 创建渐变图层
    const rows = Math.ceil(height / config.gridSize) + 4
    const cols = Math.ceil(width / config.gridSize) + 4
    
    // 水平线
    for (let i = 0; i < rows; i++) {
      ctx.beginPath()
      
      for (let j = 0; j < cols - 1; j++) {
        const index = i * cols + j
        if (index >= grid.length || index + 1 >= grid.length) continue
        
        const point = grid[index]
        const nextPoint = grid[index + 1]
        
        if (j === 0) {
          ctx.moveTo(point.x, point.y)
        }
        
        // 使用曲线连接，使网格更有流线感
        const cpX = (point.x + nextPoint.x) / 2
        const cpY = point.y + noise(point.x * 0.01, point.y * 0.01, noiseOffsetRef.current) * 5
        
        ctx.quadraticCurveTo(cpX, cpY, nextPoint.x, nextPoint.y)
      }
      
      ctx.stroke()
    }
    
    // 垂直线
    for (let j = 0; j < cols; j++) {
      ctx.beginPath()
      
      for (let i = 0; i < rows - 1; i++) {
        const index = i * cols + j
        const nextIndex = (i + 1) * cols + j
        
        if (index >= grid.length || nextIndex >= grid.length) continue
        
        const point = grid[index]
        const nextPoint = grid[nextIndex]
        
        if (i === 0) {
          ctx.moveTo(point.x, point.y)
        }
        
        const cpX = point.x + noise(point.x * 0.01, point.y * 0.01, noiseOffsetRef.current + 50) * 5
        const cpY = (point.y + nextPoint.y) / 2
        
        ctx.quadraticCurveTo(cpX, cpY, nextPoint.x, nextPoint.y)
      }
      
      ctx.stroke()
    }
    
    // 绘制节点
    grid.forEach(point => {
      // 随机触发雨滴粒子
      if (Math.random() < config.dropletSpawnRate) {
        dropletsRef.current.push({
          x: point.x,
          y: point.y,
          radius: Math.random() * 2 + 1,
          life: 0,
          maxLife: Math.random() * 
                  (config.dropletLifespan.max - config.dropletLifespan.min) + 
                   config.dropletLifespan.min
        })
      }
      
      // 绘制高亮节点
      if (point.highlight || point.size > 1) {
        ctx.beginPath()
        ctx.fillStyle = config.accentColor
        ctx.globalAlpha = (Math.sin(currentTime * 2 + 
                           point.baseX * 0.01 + point.baseY * 0.01) * 0.5 + 0.5) * 
                           modeAdjust.opacity * 1.5
        
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    
    // 绘制雨滴效果
    ctx.shadowBlur = 10
    ctx.shadowColor = config.accentColor
    
    dropletsRef.current.forEach((drop, index) => {
      drop.life++
      
      // 计算不透明度
      const fadeIn = Math.min(1, drop.life / 10)
      const fadeOut = Math.max(0, 1 - (drop.life / drop.maxLife))
      const opacity = fadeIn * fadeOut * modeAdjust.opacity * 1.5
      
      if (drop.life >= drop.maxLife) {
        dropletsRef.current.splice(index, 1)
        return
      }
      
      ctx.beginPath()
      ctx.fillStyle = config.accentColor
      ctx.globalAlpha = opacity
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2)
      ctx.fill()
    })
    
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    
    // 应用故障效果
    if (glitchActive) {
      applyGlitchEffect(ctx)
    }
  }
  
  // 动画循环
  const animate = (time: number) => {
    requestRef.current = requestAnimationFrame(animate)
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = time - timeRef.current
    timeRef.current = time
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制扭曲网格
    drawGrid(ctx, time, deltaTime)
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
  
  // 鼠标处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 悬停监听
    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      if (target.tagName.toLowerCase() === 'a' || 
          target.tagName.toLowerCase() === 'button' ||
          target.closest('a') || 
          target.closest('button')) {
        
        const rect = target.getBoundingClientRect()
        hoverElementRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          radius: Math.max(rect.width, rect.height) * 1.5,
          active: true
        }
      } else {
        hoverElementRef.current.active = false
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('mouseover', handleElementHover)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('mouseover', handleElementHover)
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
    
    // 初始化网格
    gridRef.current = initGrid(dimensions.width, dimensions.height)
    dropletsRef.current = []
    
    // 开始动画循环
    timeRef.current = performance.now()
    requestRef.current = requestAnimationFrame(animate)
    
    // 清理
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, theme])

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
