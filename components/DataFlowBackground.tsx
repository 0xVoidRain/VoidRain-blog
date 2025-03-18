'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// 定义粒子类型
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  lifetime: number
  age: number
}

// 定义流线粒子
interface FlowParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  lifetime: number
  age: number
  energy: number
}

// 定义流线
interface FlowLine {
  points: { x: number; y: number; age: number }[]
  width: number
  color: string
  speed: number
  maxPoints: number
  opacity: number
  energy: number
  active: boolean
}

// 定义能量网格节点
interface GridNode {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  active: boolean
  energy: number
  lastPulse: number
  connections: number[]
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const flowLinesRef = useRef<FlowLine[]>([])
  const gridNodesRef = useRef<GridNode[]>([])
  const noiseFieldRef = useRef<number[][]>([])
  const timeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const energyLevelRef = useRef<number>(1)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const { theme } = useTheme()

  // 根据主题获取颜色
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        primary: ['rgba(0, 255, 157, 0.8)', 'rgba(32, 218, 244, 0.8)'],
        secondary: ['rgba(138, 43, 226, 0.8)', 'rgba(255, 0, 255, 0.8)'],
        accent: ['rgba(0, 183, 255, 0.7)', 'rgba(162, 0, 255, 0.7)'],
        grid: 'rgba(80, 200, 240, 0.15)',
        background: 'rgba(10, 15, 30, 0.03)'
      }
    } else {
      return {
        primary: ['rgba(0, 128, 128, 0.6)', 'rgba(0, 168, 255, 0.6)'],
        secondary: ['rgba(106, 90, 205, 0.6)', 'rgba(138, 43, 226, 0.6)'],
        accent: ['rgba(30, 144, 255, 0.5)', 'rgba(123, 104, 238, 0.5)'],
        grid: 'rgba(30, 104, 152, 0.1)',
        background: 'rgba(240, 245, 255, 0.02)'
      }
    }
  }

  // 初始化噪声场（用于生成流体效果）
  const initNoiseField = (width: number, height: number) => {
    const gridSize = 20 // 网格大小
    const cols = Math.ceil(width / gridSize)
    const rows = Math.ceil(height / gridSize)
    const field: number[][] = []
    
    for (let y = 0; y < rows; y++) {
      field[y] = []
      for (let x = 0; x < cols; x++) {
        // 生成一个初始流动方向 (0-2π)
        field[y][x] = Math.random() * Math.PI * 2
      }
    }
    
    noiseFieldRef.current = field
  }

  // 获取位置的流向
  const getFlow = (x: number, y: number) => {
    const gridSize = 20
    const cols = noiseFieldRef.current[0]?.length || 0
    const rows = noiseFieldRef.current?.length || 0
    
    if (!cols || !rows) return { angle: 0, strength: 0 }
    
    const col = Math.floor(x / gridSize)
    const row = Math.floor(y / gridSize)
    
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return { angle: Math.PI / 2, strength: 1 } // 默认向下流动
    }
    
    const baseAngle = noiseFieldRef.current[row][col]
    
    // 添加时间维度使流场随时间变化
    const time = timeRef.current * 0.0002
    const angle = baseAngle + Math.sin(time + x * 0.01) * 0.2 + Math.cos(time + y * 0.01) * 0.2
    
    // 计算流强度 (中心区域流向更强)
    let strength = 0.5 + Math.sin(time * 2) * 0.2
    
    // 鼠标影响流场
    if (mousePosition) {
      const dx = mousePosition.x - x
      const dy = mousePosition.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 200) {
        // 鼠标附近的流场会被扭曲，指向鼠标
        const mouseAngle = Math.atan2(dy, dx)
        const influence = (1 - dist / 200) * 0.8
        return {
          angle: angle * (1 - influence) + mouseAngle * influence,
          strength: strength + influence * 0.5
        }
      }
    }
    
    return { angle, strength }
  }

  // 初始化网格节点
  const initGridNodes = (width: number, height: number) => {
    const gridSize = 80 // 网格间距
    const nodes: GridNode[] = []
    
    // 创建网格节点
    for (let y = gridSize; y < height; y += gridSize) {
      for (let x = gridSize; x < width; x += gridSize) {
        nodes.push({
          x: x + (Math.random() * 20 - 10), // 轻微随机偏移
          y: y + (Math.random() * 20 - 10),
          baseX: x,
          baseY: y,
          size: 1 + Math.random() * 1.5,
          active: Math.random() > 0.5,
          energy: Math.random(),
          lastPulse: 0,
          connections: []
        })
      }
    }
    
    // 为每个节点建立连接
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 如果节点距离适中，建立连接
        if (dist < gridSize * 1.5) {
          nodes[i].connections.push(j)
          nodes[j].connections.push(i)
        }
      }
    }
    
    gridNodesRef.current = nodes
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

  // 鼠标交互
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // 主要动画和渲染
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化噪声场
    if (noiseFieldRef.current.length === 0) {
      initNoiseField(dimensions.width, dimensions.height)
    }
    
    // 初始化网格节点
    if (gridNodesRef.current.length === 0) {
      initGridNodes(dimensions.width, dimensions.height)
    }
    
    // 创建粒子
    const createParticle = (x?: number, y?: number): Particle => {
      const colors = theme === 'dark' 
        ? ['rgba(0, 255, 157, 0.8)', 'rgba(32, 218, 244, 0.8)', 'rgba(138, 43, 226, 0.8)']
        : ['rgba(0, 128, 128, 0.6)', 'rgba(30, 144, 255, 0.6)', 'rgba(106, 90, 205, 0.6)']
      
      return {
        x: x ?? Math.random() * dimensions.width,
        y: y ?? Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.3 + Math.random() * 0.5,
        lifetime: 5000 + Math.random() * 5000,
        age: 0
      }
    }
    
    // 初始化粒子
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        particlesRef.current.push(createParticle())
      }
    }
    
    // 渲染循环
    const render = (timestamp: number) => {
      // 计算时间增量
      const deltaTime = timestamp - (timeRef.current || timestamp)
      timeRef.current = timestamp
      
      // 清除画布，使用半透明背景以创建拖尾效果
      ctx.fillStyle = theme === 'dark' 
        ? 'rgba(10, 15, 30, 0.1)' 
        : 'rgba(240, 245, 255, 0.1)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      
      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.age += deltaTime
        
        if (particle.age > particle.lifetime) {
          return false
        }
        
        // 添加一些随机波动
        particle.vx += (Math.random() - 0.5) * 0.05
        particle.vy += (Math.random() - 0.5) * 0.05
        
        // 鼠标影响
        if (mousePosition) {
          const dx = mousePosition.x - particle.x
          const dy = mousePosition.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150) {
            const influence = (1 - dist / 150) * 0.2
            particle.vx += dx * influence
            particle.vy += dy * influence
          }
        }
        
        // 限制最大速度
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        if (speed > 3) {
          particle.vx = (particle.vx / speed) * 3
          particle.vy = (particle.vy / speed) * 3
        }
        
        // 更新位置
        particle.x += particle.vx
        particle.y += particle.vy
        
        // 如果离开画布，重置位置
        if (particle.x < 0 || particle.x > dimensions.width || 
            particle.y < 0 || particle.y > dimensions.height) {
          particle.x = Math.random() * dimensions.width
          particle.y = Math.random() * dimensions.height
          particle.age = 0
          return true
        }
        
        // 计算不透明度（淡入淡出）
        let currentOpacity = particle.opacity
        if (particle.age < 500) {
          currentOpacity *= particle.age / 500
        } else if (particle.age > particle.lifetime - 500) {
          currentOpacity *= (particle.lifetime - particle.age) / 500
        }
        
        // 提取RGB值
        const [r, g, b] = extractRGB(particle.color)
        
        // 绘制发光效果
        const glowSize = particle.size * 3
        const glow = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, glowSize
        )
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.6})`)
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.beginPath()
        ctx.fillStyle = glow
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
        
        // 绘制粒子核心
        ctx.beginPath()
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity})`
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        
        // 连接近距离的粒子
        particlesRef.current.forEach(other => {
          if (other === particle) return
          
          const dx = other.x - particle.x
          const dy = other.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 100) {
            const opacity = (1 - dist / 100) * 0.2 * currentOpacity
            
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
            ctx.lineWidth = (1 - dist / 100) * 0.5
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        })
        
        return true
      })
      
      // 确保始终有足够的粒子
      while (particlesRef.current.length < 100) {
        particlesRef.current.push(createParticle())
      }
      
      // 继续动画循环
      requestRef.current = requestAnimationFrame(render)
    }
    
    // 提取RGB值
    function extractRGB(rgba: string): number[] {
      const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      }
      return [0, 0, 0]
    }
    
    // 开始渲染循环
    requestRef.current = requestAnimationFrame(render)
    
    // 清理函数
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, mousePosition, theme])

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
