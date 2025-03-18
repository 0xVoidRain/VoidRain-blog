'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const particlesRef = useRef<FlowParticle[]>([])
  const flowLinesRef = useRef<FlowLine[]>([])
  const gridNodesRef = useRef<GridNode[]>([])
  const noiseFieldRef = useRef<number[][]>([])
  const timeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const energyLevelRef = useRef<number>(1)
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

  // 生成粒子
  const createParticle = (x?: number, y?: number): FlowParticle => {
    const colors = getThemeColors()
    const colorSets = [colors.primary, colors.secondary, colors.accent]
    const colorSet = colorSets[Math.floor(Math.random() * colorSets.length)]
    
    return {
      x: x !== undefined ? x : Math.random() * dimensions.width,
      y: y !== undefined ? y : Math.random() * dimensions.height,
      vx: 0,
      vy: 0,
      size: 1 + Math.random() * 2,
      color: colorSet[Math.floor(Math.random() * colorSet.length)],
      opacity: 0.2 + Math.random() * 0.5,
      lifetime: 5000 + Math.random() * 10000,
      age: 0,
      energy: Math.random()
    }
  }

  // 创建流线
  const createFlowLine = (x: number, y: number): FlowLine => {
    const colors = getThemeColors()
    const colorSets = [colors.primary, colors.secondary, colors.accent]
    const colorSet = colorSets[Math.floor(Math.random() * colorSets.length)]
    
    return {
      points: [{ x, y, age: 0 }],
      width: 0.5 + Math.random() * 1.5,
      color: colorSet[Math.floor(Math.random() * colorSet.length)],
      speed: 0.5 + Math.random() * 2,
      maxPoints: 50 + Math.floor(Math.random() * 100),
      opacity: 0.2 + Math.random() * 0.6,
      energy: Math.random(),
      active: true
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
      
      // 鼠标移动时在附近生成一些新流线
      if (Math.random() > 0.7) {
        const newLine = createFlowLine(
          e.clientX + (Math.random() * 100 - 50),
          e.clientY + (Math.random() * 100 - 50)
        )
        flowLinesRef.current.push(newLine)
      }
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 点击产生涟漪效果
    const handleClick = (e: MouseEvent) => {
      energyLevelRef.current = Math.min(energyLevelRef.current + 0.5, 3)
      
      // 点击时创建一圈新粒子
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2
        const distance = 30 + Math.random() * 50
        particlesRef.current.push(createParticle(
          e.clientX + Math.cos(angle) * distance,
          e.clientY + Math.sin(angle) * distance
        ))
      }
      
      // 创建多条从点击点扩散的流线
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const newLine = createFlowLine(
          e.clientX + Math.cos(angle) * 20,
          e.clientY + Math.sin(angle) * 20
        )
        newLine.opacity *= 1.5 // 更明显的流线
        flowLinesRef.current.push(newLine)
      }
      
      // 激活周围的网格节点
      gridNodesRef.current.forEach(node => {
        const dx = node.x - e.clientX
        const dy = node.y - e.clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 200) {
          node.active = true
          node.energy = 1
          node.lastPulse = timeRef.current
        }
      })
      
      setTimeout(() => {
        energyLevelRef.current = Math.max(energyLevelRef.current - 0.5, 1)
      }, 2000)
    }

    // 滚动影响
    let lastScrollY = window.scrollY
    let scrollTimeout: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      const scrollDelta = Math.abs(window.scrollY - lastScrollY)
      if (scrollDelta > 30) {
        energyLevelRef.current = Math.min(energyLevelRef.current + 0.3, 3)
        
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        
        scrollTimeout = setTimeout(() => {
          energyLevelRef.current = Math.max(energyLevelRef.current - 0.3, 1)
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
  }, [dimensions])

  // 主渲染循环
  useEffect(() => {
    if (!canvasRef.current || !dimensions.width || !dimensions.height) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置画布大小
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
    
    // 生成初始粒子
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        particlesRef.current.push(createParticle())
      }
    }
    
    // 生成初始流线
    if (flowLinesRef.current.length === 0) {
      for (let i = 0; i < 15; i++) {
        flowLinesRef.current.push(createFlowLine(
          Math.random() * dimensions.width,
          Math.random() * dimensions.height
        ))
      }
    }
    
    // 渲染函数
    const render = (timestamp: number) => {
      // 计算时间增量
      const deltaTime = lastFrameTimeRef.current ? timestamp - lastFrameTimeRef.current : 16
      lastFrameTimeRef.current = timestamp
      timeRef.current = timestamp
      
      const energyLevel = energyLevelRef.current
      const colors = getThemeColors()
      
      // 清空画布，添加微弱背景
      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 绘制网格和连接线
      ctx.lineWidth = 0.5
      ctx.strokeStyle = colors.grid
      
      gridNodesRef.current.forEach((node, i) => {
        // 节点移动 (轻微波动)
        const time = timestamp * 0.001
        node.x = node.baseX + Math.sin(time * 0.2 + i * 0.1) * 8
        node.y = node.baseY + Math.cos(time * 0.3 + i * 0.1) * 8
        
        // 节点活跃状态随时间变化
        if (Math.random() < 0.001 * energyLevel) {
          node.active = !node.active
        }
        
        // 激活周围节点
        if (node.active && timestamp - node.lastPulse > 2000 + Math.random() * 5000) {
          node.lastPulse = timestamp
          node.connections.forEach(j => {
            const connectedNode = gridNodesRef.current[j]
            if (Math.random() < 0.7) {
              connectedNode.active = true
              connectedNode.energy = 0.7 + Math.random() * 0.3
              connectedNode.lastPulse = timestamp - 1000 * Math.random()
            }
          })
        }
        
        // 随着时间流逝，能量减少
        if (timestamp - node.lastPulse < 2000) {
          node.energy = Math.max(node.energy - 0.01, 0)
        }
        
        // 绘制连接线
        if (node.active) {
          node.connections.forEach(j => {
            const connectedNode = gridNodesRef.current[j]
            if (connectedNode.active) {
              const energyFactor = (node.energy + connectedNode.energy) / 2
              
              // 根据能量级别设置线段样式
              const gradient = ctx.createLinearGradient(
                node.x, node.y, connectedNode.x, connectedNode.y
              )
              
              const color1 = theme === 'dark' 
                ? `rgba(0, 255, 157, ${0.2 * energyFactor})` 
                : `rgba(0, 128, 128, ${0.15 * energyFactor})`
              
              const color2 = theme === 'dark' 
                ? `rgba(32, 218, 244, ${0.2 * energyFactor})` 
                : `rgba(0, 168, 255, ${0.15 * energyFactor})`
              
              gradient.addColorStop(0, color1)
              gradient.addColorStop(1, color2)
              
              ctx.beginPath()
              ctx.strokeStyle = gradient
              ctx.lineWidth = 0.5 + energyFactor * 1.5
              ctx.moveTo(node.x, node.y)
              ctx.lineTo(connectedNode.x, connectedNode.y)
              ctx.stroke()
              
              // 有时在线上添加流动粒子
              if (Math.random() < 0.001 * energyLevel) {
                const t = Math.random()
                const x = node.x * (1 - t) + connectedNode.x * t
                const y = node.y * (1 - t) + connectedNode.y * t
                particlesRef.current.push(createParticle(x, y))
              }
            }
          })
        }
        
        // 绘制节点
        if (node.active) {
          const energyFactor = node.energy
          const nodeSize = node.size * (1 + energyFactor)
          
          // 绘制光晕
          const glow = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, nodeSize * 5
          )
          
          const glowColor = theme === 'dark' 
            ? `rgba(0, 255, 200, ${0.15 * energyFactor})` 
            : `rgba(0, 168, 255, ${0.1 * energyFactor})`
          
          glow.addColorStop(0, glowColor)
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.beginPath()
          ctx.fillStyle = glow
          ctx.arc(node.x, node.y, nodeSize * 5, 0, Math.PI * 2)
          ctx.fill()
          
          // 绘制节点中心
          const nodeColor = theme === 'dark' 
            ? `rgba(0, 255, 200, ${0.5 + 0.5 * energyFactor})` 
            : `rgba(0, 168, 255, ${0.4 + 0.4 * energyFactor})`
          
          ctx.beginPath()
          ctx.fillStyle = nodeColor
          ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      
      // 更新和绘制流线
      flowLinesRef.current = flowLinesRef.current.filter(line => {
        if (!line.active) return false
        
        // 向流线添加新点
        if (line.points.length > 0 && line.points.length < line.maxPoints) {
          const lastPoint = line.points[line.points.length - 1]
          
          // 获取该位置的流动信息
          const flow = getFlow(lastPoint.x, lastPoint.y)
          
          // 根据流向和强度计算新位置
          const speed = line.speed * flow.strength * energyLevel
          const newX = lastPoint.x + Math.cos(flow.angle) * speed * (deltaTime / 16)
          const newY = lastPoint.y + Math.sin(flow.angle) * speed * (deltaTime / 16)
          
          // 如果点没有移出画布，则添加它
          if (newX >= 0 && newX < dimensions.width && newY >= 0 && newY < dimensions.height) {
            line.points.push({ x: newX, y: newY, age: 0 })
          } else {
            line.active = false
          }
        }
        
        // 更新所有点的年龄
        line.points.forEach(point => {
          point.age += deltaTime
        })
        
        // 当第一个点足够老时，移除它
        if (line.points.length > 1 && line.points[0].age > 1000) {
          line.points.shift()
        }
        
        // 如果所有点都被移除，销毁流线
        if (line.points.length === 0) {
          return false
        }
        
        // 绘制流线
        if (line.points.length > 1) {
          ctx.beginPath()
          
          // 创建沿线渐变
          const gradient = ctx.createLinearGradient(
            line.points[0].x, line.points[0].y,
            line.points[line.points.length - 1].x, line.points[line.points.length - 1].y
          )
          
          const [r, g, b] = extractRGB(line.color)
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
          gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${line.opacity})`)
          gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${line.opacity})`)
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
          
          ctx.strokeStyle = gradient
          ctx.lineWidth = line.width
          
          // 绘制平滑的曲线
          ctx.moveTo(line.points[0].x, line.points[0].y)
          
          for (let i = 0; i < line.points.length - 1; i++) {
            const xc = (line.points[i].x + line.points[i+1].x) / 2
            const yc = (line.points[i].y + line.points[i+1].y) / 2
            ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc)
          }
          
          const last = line.points.length - 1
          if (last > 0) {
            ctx.quadraticCurveTo(
              line.points[last - 1].x, line.points[last - 1].y,
              line.points[last].x, line.points[last].y
            )
          }
          
          ctx.stroke()
          
          // 有时在流线端点添加粒子
          if (Math.random() < 0.03 * energyLevel && line.points.length > 0) {
            const lastPoint = line.points[line.points.length - 1]
            particlesRef.current.push(createParticle(lastPoint.x, lastPoint.y))
          }
        }
        
        return true
      })
      
      // 确保始终有足够的流线
      const targetLineCount = 15 + Math.floor(energyLevel * 10)
      while (flowLinesRef.current.length < targetLineCount) {
        flowLinesRef.current.push(createFlowLine(
          Math.random() * dimensions.width,
          Math.random() * dimensions.height
        ))
      }
      
      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.age += deltaTime
        
        if (particle.age > particle.lifetime) {
          return false
        }
        
        // 根据流场更新粒子速度
        const flow = getFlow(particle.x, particle.y)
        
        particle.vx = particle.vx * 0.95 + Math.cos(flow.angle) * flow.strength * 0.5
        particle.vy = particle.vy * 0.95 + Math.sin(flow.angle) * flow.strength * 0.5
        
        // 鼠标影响粒子
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
        
        // 更新位置
        particle.x += particle.vx * (deltaTime / 16) * energyLevel
        particle.y += particle.vy * (deltaTime / 16) * energyLevel
        
        // 如果离开画布，重生在画布顶部
        if (particle.x < 0 || particle.x > dimensions.width || 
            particle.y < 0 || particle.y > dimensions.height) {
          particle.x = Math.random() * dimensions.width
          particle.y = Math.random() * 10
          particle.age = 0
          return true
        }
        
        // 计算当前不透明度（淡入淡出）
        let currentOpacity = particle.opacity
        if (particle.age < 500) {
          // 淡入
          currentOpacity *= particle.age / 500
        } else if (particle.age > particle.lifetime - 800) {
          // 淡出
          currentOpacity *= (particle.lifetime - particle.age) / 800
        }
        
        // 提取RGB值
        const [r, g, b] = extractRGB(particle.color)
        
        // 绘制粒子
        const size = particle.size * (0.8 + 0.4 * Math.sin(timestamp * 0.005 + particle.energy * 10))
        
        // 绘制发光效果
        const glowSize = size * 3
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
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity * 1.2})`
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fill()
        
        return true
      })
      
      // 确保始终有足够的粒子
      const targetParticleCount = 80 + Math.floor(energyLevel * 20)
      while (particlesRef.current.length < targetParticleCount) {
        particlesRef.current.push(createParticle())
      }
      
      // 继续动画循环
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
