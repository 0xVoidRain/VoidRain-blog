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
  
  // 参考对象
  const timeRef = useRef(0)
  const mouseRef = useRef<{x: number, y: number} | null>(null)
  
  // 网格和粒子系统
  const gridRef = useRef<any>({
    nodes: [],
    connectors: [],
    size: 60,
    shapes: []
  })
  
  const particlesRef = useRef<any[]>([])
  
  // 颜色配置
  const colors = {
    gridColor: '#00F7FF', // 冷色调网格
    particleColor: '#FF6B35', // 暖色调粒子
    glowColor: '#FFFFFF', // 发光效果
    darkBg: 'rgba(10, 10, 20, 0.95)',
    lightBg: 'rgba(245, 248, 250, 0.95)'
  }
  
  // 初始化网格节点
  const initGrid = (width: number, height: number) => {
    const gridSize = Math.max(60, Math.min(width, height) / 15)
    const cols = Math.ceil(width / gridSize) + 1
    const rows = Math.ceil(height / gridSize) + 1
    
    const nodes = []
    const connectors = []
    const shapes = []
    
    // 创建节点
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        nodes.push({
          x: x * gridSize,
          y: y * gridSize,
          baseX: x * gridSize,
          baseY: y * gridSize,
          energy: Math.random() * 0.5,
          size: 2 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          speed: 0.003 + Math.random() * 0.002,
          active: false,
          particleEmitTime: 0
        })
      }
    }
    
    // 创建节点连接
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      for (let j = i + 1; j < nodes.length; j++) {
        const otherNode = nodes[j]
        const dx = otherNode.x - node.x
        const dy = otherNode.y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // 只连接最近的节点，形成网格
        if (distance < gridSize * 1.5) {
          connectors.push({
            from: i,
            to: j,
            active: Math.random() < 0.8,
            energy: Math.random() * 0.5
          })
        }
      }
    }
    
    // 创建几何形状（三角形、六边形）
    const createShape = (centerX, centerY, radius, sides) => {
      const points = []
      const relatedNodes = []
      
      // 查找形状附近的节点
      for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].x - centerX
        const dy = nodes[i].y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < radius * 1.5) {
          relatedNodes.push(i)
        }
      }
      
      // 如果附近没有足够的节点，放弃创建形状
      if (relatedNodes.length < sides) return null
      
      // 创建形状顶点
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides
        points.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        })
      }
      
      return {
        points,
        relatedNodes: relatedNodes.slice(0, sides + 2),
        energy: 0,
        targetEnergy: 0,
        completion: 0,
        sides,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.001,
        active: false,
        center: { x: centerX, y: centerY },
        radius,
        pulseTime: 0
      }
    }
    
    // 添加三角形和六边形
    const shapesCount = Math.min(5, Math.floor((width * height) / 300000))
    
    for (let i = 0; i < shapesCount; i++) {
      const centerX = Math.random() * width
      const centerY = Math.random() * height
      const sides = Math.random() < 0.5 ? 3 : 6
      const radius = sides === 3 ? 80 + Math.random() * 40 : 100 + Math.random() * 60
      
      const shape = createShape(centerX, centerY, radius, sides)
      if (shape) shapes.push(shape)
    }
    
    return {
      nodes,
      connectors,
      size: gridSize,
      shapes
    }
  }
  
  // 创建粒子
  const createParticle = (x, y, targetX, targetY, color) => {
    return {
      x,
      y,
      targetX,
      targetY,
      startX: x,
      startY: y,
      vx: 0,
      vy: 0,
      size: 1 + Math.random() * 2,
      color,
      alpha: 0.7 + Math.random() * 0.3,
      speed: 0.01 + Math.random() * 0.02,
      progress: 0,
      life: 1,
      energyTransfer: false
    }
  }
  
  // 创建光路粒子
  const createNodeParticle = (nodeIndex) => {
    const node = gridRef.current.nodes[nodeIndex]
    
    // 查找与节点相连的连接器
    const connections = gridRef.current.connectors.filter(
      c => c.from === nodeIndex || c.to === nodeIndex
    )
    
    if (connections.length === 0) return
    
    // 选择一个连接器作为粒子流动路径
    const connection = connections[Math.floor(Math.random() * connections.length)]
    const targetNodeIndex = connection.from === nodeIndex ? connection.to : connection.from
    const targetNode = gridRef.current.nodes[targetNodeIndex]
    
    // 检查是否需要传输能量到形状
    let energyTransfer = false
    let targetShape = null
    
    // 查找此节点是否属于某个形状
    for (const shape of gridRef.current.shapes) {
      if (shape.relatedNodes.includes(targetNodeIndex)) {
        energyTransfer = Math.random() < 0.3
        targetShape = shape
        break
      }
    }
    
    // 创建粒子
    const particle = createParticle(
      node.x, 
      node.y, 
      targetNode.x, 
      targetNode.y, 
      energyTransfer ? colors.particleColor : colors.gridColor
    )
    
    particle.energyTransfer = energyTransfer
    particle.targetShape = targetShape
    
    return particle
  }
  
  // 绘制网格和粒子
  const drawGrid = (ctx, width, height, time) => {
    const isDark = theme === 'dark'
    const grid = gridRef.current
    const globalAlpha = ctx.globalAlpha
    
    // 显示网格连接
    for (let i = 0; i < grid.connectors.length; i++) {
      const connection = grid.connectors[i]
      
      if (!connection.active) continue
      
      const fromNode = grid.nodes[connection.from]
      const toNode = grid.nodes[connection.to]
      
      // 计算连接线能量
      const energy = connection.energy + 
                    (fromNode.active ? 0.3 : 0) + 
                    (toNode.active ? 0.3 : 0)
      
      // 绘制连接线
      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)
      
      // 线条颜色和宽度
      ctx.strokeStyle = colors.gridColor
      ctx.lineWidth = 0.5 + energy
      ctx.globalAlpha = 0.2 + energy * 0.4
      ctx.stroke()
    }
    
    // 绘制网格节点
    for (let i = 0; i < grid.nodes.length; i++) {
      const node = grid.nodes[i]
      
      // 更新节点位置（微小的动态波动）
      node.x = node.baseX + Math.sin(time * node.speed + node.phase) * 5
      node.y = node.baseY + Math.cos(time * node.speed + node.phase * 0.7) * 5
      
      // 计算与鼠标的距离
      if (mouseRef.current) {
        const dx = mouseRef.current.x - node.x
        const dy = mouseRef.current.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 激活鼠标附近的节点
        if (dist < 150) {
          node.active = true
          node.energy = Math.max(node.energy, 1 - dist / 150)
          
          // 从激活的节点发射粒子
          if (time - node.particleEmitTime > 500 + Math.random() * 1000) {
            const particle = createNodeParticle(i)
            if (particle) {
              particlesRef.current.push(particle)
              node.particleEmitTime = time
            }
          }
        } else {
          node.active = false
          node.energy *= 0.98
        }
      } else {
        node.active = false
        node.energy *= 0.98
        
        // 即使没有鼠标互动，也随机发射一些粒子
        if (Math.random() < 0.001 && time - node.particleEmitTime > 2000) {
          const particle = createNodeParticle(i)
          if (particle) {
            particlesRef.current.push(particle)
            node.particleEmitTime = time
          }
        }
      }
      
      // 绘制节点
      const nodeSize = node.size * (1 + node.energy * 1.5)
      
      // 绘制外发光
      if (node.active || node.energy > 0.1) {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, nodeSize * 4
        )
        gradient.addColorStop(0, `rgba(0, 247, 255, ${node.energy * 0.5})`)
        gradient.addColorStop(1, 'rgba(0, 247, 255, 0)')
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeSize * 4, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }
      
      // 绘制实心节点
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2)
      ctx.fillStyle = colors.gridColor
      ctx.globalAlpha = 0.6 + node.energy * 0.4
      ctx.fill()
    }
    
    // 更新和绘制形状
    for (const shape of grid.shapes) {
      // 更新形状能量
      if (shape.active) {
        shape.energy += (shape.targetEnergy - shape.energy) * 0.05
        shape.completion += (1 - shape.completion) * 0.01
        shape.pulseTime += 0.05
      } else {
        shape.energy *= 0.98
        shape.completion *= 0.99
        shape.pulseTime *= 0.95
      }
      
      // 只绘制有能量的形状
      if (shape.energy > 0.01) {
        // 计算形状当前位置（微小的动态波动）
        const centerX = shape.center.x + Math.sin(time * shape.speed) * 10
        const centerY = shape.center.y + Math.cos(time * shape.speed * 1.3) * 10
        
        // 绘制形状轮廓
        ctx.beginPath()
        
        for (let i = 0; i < shape.sides; i++) {
          const angle = (Math.PI * 2 * i) / shape.sides + shape.phase + time * 0.0003
          const progress = Math.min(1, shape.completion * (i + 1) / shape.sides)
          const radius = shape.radius * progress
          
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        
        // 闭合路径
        ctx.closePath()
        
        // 轮廓样式
        ctx.strokeStyle = colors.particleColor
        ctx.lineWidth = 1 + shape.energy * 3
        ctx.globalAlpha = 0.2 + shape.energy * 0.8
        ctx.stroke()
        
        // 填充样式（半透明）
        const fillAlpha = shape.energy * 0.2 * Math.sin(shape.pulseTime) * 0.5 + 0.5
        ctx.fillStyle = `rgba(255, 107, 53, ${fillAlpha})`
        ctx.globalAlpha = 0.1 + shape.energy * 0.1
        ctx.fill()
        
        // 绘制发光效果
        if (shape.energy > 0.5) {
          ctx.save()
          ctx.beginPath()
          ctx.filter = `blur(${shape.energy * 10}px)`
          
          for (let i = 0; i < shape.sides; i++) {
            const angle = (Math.PI * 2 * i) / shape.sides + shape.phase + time * 0.0003
            const radius = shape.radius * Math.min(1, shape.completion * (i + 1) / shape.sides)
            
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          
          ctx.closePath()
          ctx.strokeStyle = colors.particleColor
          ctx.lineWidth = 5 * shape.energy
          ctx.globalAlpha = 0.4 * shape.energy
          ctx.stroke()
          ctx.restore()
        }
      }
    }
    
    // 重置绘图状态
    ctx.globalAlpha = globalAlpha
  }
  
  // 更新和绘制粒子
  const drawParticles = (ctx, time, deltaTime) => {
    const particles = particlesRef.current
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      // 更新粒子位置
      p.progress += p.speed * deltaTime * 0.1
      
      // 贝塞尔曲线运动
      const t = p.progress
      const u = 1 - t
      
      // 控制点，使粒子沿曲线运动
      const cpX = (p.startX + p.targetX) / 2 + (Math.random() - 0.5) * 50
      const cpY = (p.startY + p.targetY) / 2 + (Math.random() - 0.5) * 50
      
      // 贝塞尔曲线计算
      p.x = u * u * p.startX + 2 * u * t * cpX + t * t * p.targetX
      p.y = u * u * p.startY + 2 * u * t * cpY + t * t * p.targetY
      
      // 更新生命值
      p.life = Math.max(0, 1 - p.progress)
      
      // 检查是否完成旅程
      if (p.progress >= 1) {
        // 如果是能量传输粒子，为目标形状充能
        if (p.energyTransfer && p.targetShape) {
          p.targetShape.active = true
          p.targetShape.targetEnergy = Math.min(1, p.targetShape.targetEnergy + 0.1)
        }
        
        // 移除粒子
        particles.splice(i, 1)
        continue
      }
      
      // 绘制粒子
      const size = p.size * (1 + Math.sin(p.progress * Math.PI) * 0.5)
      
      // 绘制发光效果
      ctx.beginPath()
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, size * 4
      )
      
      const particleColor = p.color
      gradient.addColorStop(0, `${particleColor}`)
      gradient.addColorStop(1, `${particleColor.split(')')[0]}, 0)`)
      
      ctx.fillStyle = gradient
      ctx.globalAlpha = p.alpha * p.life * 0.3
      ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2)
      ctx.fill()
      
      // 绘制粒子核心
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha * p.life
      ctx.fill()
    }
  }
  
  // 动画循环
  const animate = (timestamp) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = timestamp - (timeRef.current || timestamp)
    timeRef.current = timestamp
    
    // 清空画布
    const isDark = theme === 'dark'
    ctx.fillStyle = isDark ? colors.darkBg : colors.lightBg
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制网格
    drawGrid(ctx, canvas.width, canvas.height, timestamp)
    
    // 绘制粒子
    drawParticles(ctx, timestamp, deltaTime)
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }
  
  // 监听窗口大小变化
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
  
  // 监听鼠标移动
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    
    const handleMouseLeave = () => {
      mouseRef.current = null
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])
  
  // 初始化和启动动画
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化网格
    gridRef.current = initGrid(dimensions.width, dimensions.height)
    
    // 初始化粒子数组
    particlesRef.current = []
    
    // 开始动画循环
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
