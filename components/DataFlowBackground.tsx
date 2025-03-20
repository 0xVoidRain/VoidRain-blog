'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

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
  baseSize: number
  energy: number
  connections: number[]
  phase: number
  speed: number
  active: boolean
  color: string
  pulseTime: number
}

// 定义光粒子
interface LightParticle {
  x: number
  y: number
  size: number
  speed: number
  angle: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

// 主组件
export default function DataFlowBackground() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridNodesRef = useRef<GridNode[]>([])
  const flowLinesRef = useRef<FlowLine[]>([])
  const particlesRef = useRef<LightParticle[]>([])
  const energyLevelRef = useRef(1)
  const timeRef = useRef(0)
  const requestRef = useRef<number>()
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  // 获取当前主题颜色
  const getThemeColors = () => {
    const isDark = theme === 'dark'
    return {
      background: isDark ? '#090b10' : '#f8fafc',
      gridLines: isDark 
        ? ['rgba(0, 247, 255, 0.08)', 'rgba(32, 252, 143, 0.06)'] 
        : ['rgba(0, 247, 255, 0.04)', 'rgba(32, 252, 143, 0.03)'],
      gridNodes: isDark 
        ? ['#00F7FF', '#20FC8F'] 
        : ['#00c8cc', '#20cc72'],
      gridConnection: isDark 
        ? 'rgba(0, 247, 255, 0.15)' 
        : 'rgba(0, 247, 255, 0.08)',
      flowLines: isDark 
        ? ['#00F7FF', '#20FC8F', '#FF00FF', '#FF6B35'] 
        : ['#00c8cc', '#20cc72', '#cc00cc', '#cc5429'],
      particles: isDark 
        ? ['#00F7FF', '#FF00FF'] 
        : ['#00d8e6', '#e600e6']
    }
  }

  // 初始化网格节点
  const initGridNodes = (width: number, height: number) => {
    const nodes: GridNode[] = []
    const colors = getThemeColors().gridNodes
    
    // 计算网格尺寸
    const gridSpacing = 100
    const columns = Math.ceil(width / gridSpacing) + 2
    const rows = Math.ceil(height / gridSpacing) + 2
    
    // 创建网格节点
    for (let y = -1; y < rows; y++) {
      for (let x = -1; x < columns; x++) {
        const baseX = x * gridSpacing
        const baseY = y * gridSpacing
        
        nodes.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          size: 2 + Math.random() * 3,
          baseSize: 2 + Math.random() * 3,
          energy: 0.2 + Math.random() * 0.3,
          connections: [],
          phase: Math.random() * Math.PI * 2,
          speed: 0.005 + Math.random() * 0.005,
          active: Math.random() < 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseTime: 0
        })
      }
    }
    
    // 建立节点连接
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i !== j) {
          const dx = nodes[i].baseX - nodes[j].baseX
          const dy = nodes[i].baseY - nodes[j].baseY
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          // 如果节点距离在合适范围内，建立连接
          if (dist < gridSpacing * 1.5) {
            nodes[i].connections.push(j)
          }
        }
      }
    }
    
    return nodes
  }

  // 初始化流线
  const initFlowLines = (width: number, height: number) => {
    const lines: FlowLine[] = []
    const colors = getThemeColors().flowLines
    const lineCount = Math.max(5, Math.floor((width * height) / 100000))
    
    for (let i = 0; i < lineCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      
      lines.push({
        points: [{ x, y, age: 0 }],
        width: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 1 + Math.random() * 3,
        maxPoints: 15 + Math.floor(Math.random() * 15),
        opacity: 0.4 + Math.random() * 0.4,
        energy: 0.5 + Math.random() * 0.5,
        active: true
      })
    }
    
    return lines
  }

  // 初始化光粒子
  const initParticles = (width: number, height: number) => {
    const particles: LightParticle[] = []
    const colors = getThemeColors().particles
    const particleCount = Math.max(10, Math.floor((width * height) / 50000))
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(width, height, colors))
    }
    
    return particles
  }

  // 创建单个光粒子
  const createParticle = (width: number, height: number, colors: string[]) => {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 3,
      speed: 0.3 + Math.random() * 1.5,
      angle: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.3 + Math.random() * 0.5,
      life: 0,
      maxLife: 100 + Math.random() * 200
    }
  }

  // 激活网格节点
  const activateNode = (index: number, energy: number) => {
    if (index >= 0 && index < gridNodesRef.current.length) {
      const node = gridNodesRef.current[index]
      node.active = true
      node.energy = Math.min(node.energy + energy, 1)
      node.pulseTime = 0
      
      // 向相邻节点传递能量
      setTimeout(() => {
        for (const connIndex of node.connections) {
          if (Math.random() < 0.3) {
            activateNode(connIndex, energy * 0.6)
          }
        }
      }, 100 + Math.random() * 200)
    }
  }

  // 计算网格扭曲
  const getGridDistortion = (x: number, y: number, time: number) => {
    const scale = 0.003
    const timeScale = 0.0005
    
    // 使用多个正弦波叠加创建更自然的扭曲效果
    const distortion1 = Math.sin(x * scale + time * timeScale) * Math.cos(y * scale + time * timeScale * 1.5) * 30
    const distortion2 = Math.sin(x * scale * 1.5 + time * timeScale * 0.8) * Math.cos(y * scale * 0.8 - time * timeScale) * 20
    
    return {
      x: distortion1 + distortion2 * 0.5,
      y: distortion2 + distortion1 * 0.5
    }
  }

  // 计算流场向量
  const getFlowVector = (x: number, y: number, time: number) => {
    const scale = 0.005
    const timeScale = 0.0003
    
    // 使用多个噪声函数组合创建复杂的流场
    const angle1 = Math.sin(x * scale + time * timeScale) * Math.cos(y * scale * 1.2 + time * timeScale * 0.8) * Math.PI
    const angle2 = Math.cos(x * scale * 0.8 - time * timeScale * 0.5) * Math.sin(y * scale * 1.5 + time * timeScale * 1.2) * Math.PI
    
    const angle = (angle1 + angle2) * 0.5
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    }
  }

  // 绘制辉光效果
  const drawGlow = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, intensity: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4)
    gradient.addColorStop(0, color.replace(')', `, ${intensity})`).replace('rgb', 'rgba'))
    gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'))
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, size * 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // 主动画循环
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 获取当前主题颜色
    const colors = getThemeColors()
    
    // 时间增量
    const deltaTime = time - (timeRef.current || time)
    timeRef.current = time
    const normalizedDeltaTime = Math.min(deltaTime / 16, 2)
    
    // 当前能量水平
    const energyLevel = energyLevelRef.current
    
    // 绘制背景网格
    ctx.lineWidth = 1
    ctx.strokeStyle = colors.gridLines[0]
    ctx.beginPath()
    
    // 计算网格视口偏移
    const scrollOffset = window.scrollY
    const viewOffset = scrollOffset * 0.1
    
    // 水平网格线
    for (let y = -100; y < canvas.height + 100; y += 50) {
      const offset = (y + viewOffset) % 100
      const yPos = y - offset
      
      ctx.moveTo(0, yPos)
      
      // 添加波动效果
      for (let x = 0; x < canvas.width; x += 5) {
        const distortion = getGridDistortion(x, yPos, time)
        ctx.lineTo(x, yPos + distortion.y * 0.3)
      }
    }
    ctx.stroke()
    
    // 垂直网格线
    ctx.beginPath()
    ctx.strokeStyle = colors.gridLines[1]
    for (let x = -100; x < canvas.width + 100; x += 50) {
      const offset = x % 100
      const xPos = x - offset
      
      ctx.moveTo(xPos, 0)
      
      // 添加波动效果
      for (let y = 0; y < canvas.height; y += 5) {
        const distortion = getGridDistortion(xPos, y, time)
        ctx.lineTo(xPos + distortion.x * 0.3, y)
      }
    }
    ctx.stroke()
    
    // 更新和绘制网格节点
    for (let i = 0; i < gridNodesRef.current.length; i++) {
      const node = gridNodesRef.current[i]
      
      // 计算扭曲
      const distortion = getGridDistortion(node.baseX, node.baseY, time)
      node.x = node.baseX + distortion.x
      node.y = node.baseY + distortion.y
      
      // 更新节点状态
      if (node.active) {
        node.pulseTime += normalizedDeltaTime
        
        if (node.pulseTime > 200) {
          node.active = Math.random() < 0.3
          node.energy = Math.max(node.energy * 0.9, 0.2)
        }
      }
      
      // 随时间呼吸效果
      const pulse = Math.sin(time * 0.001 + node.phase) * 0.5 + 0.5
      const nodeSize = node.baseSize * (1 + pulse * 0.5 * node.energy * energyLevel)
      node.size = nodeSize
      
      // 鼠标附近节点激活
      if (mousePosition) {
        const dx = node.x - mousePosition.x
        const dy = node.y - mousePosition.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 100) {
          node.active = true
          node.energy = Math.min(node.energy + (1 - dist / 100) * 0.01 * normalizedDeltaTime, 1)
        }
      }
      
      // 绘制节点
      const intensity = 0.1 + node.energy * 0.6 * energyLevel
      
      // 绘制辉光
      if (node.energy > 0.3) {
        drawGlow(ctx, node.x, node.y, nodeSize, node.color, intensity * 0.3)
      }
      
      // 绘制节点核心
      ctx.fillStyle = node.color
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 绘制节点连接
    ctx.lineWidth = 1
    ctx.strokeStyle = colors.gridConnection
    ctx.beginPath()
    
    const visibleNodes = gridNodesRef.current.filter(node => 
      node.x >= -50 && node.x <= canvas.width + 50 && 
      node.y >= -50 && node.y <= canvas.height + 50
    )
    
    for (const node of visibleNodes) {
      for (const connIndex of node.connections) {
        const connNode = gridNodesRef.current[connIndex]
        
        if (connNode) {
          // 只绘制在视口内的连接
          if (connNode.x >= -50 && connNode.x <= canvas.width + 50 && 
              connNode.y >= -50 && connNode.y <= canvas.height + 50) {
            
            // 能量脉冲效果
            if (node.active && connNode.active) {
              const energyFactor = (node.energy + connNode.energy) * 0.5
              if (energyFactor > 0.4) {
                ctx.strokeStyle = node.color.replace(')', `, ${energyFactor * 0.3})`).replace('rgb', 'rgba')
                ctx.lineWidth = 1 + energyFactor
                
                ctx.beginPath()
                ctx.moveTo(node.x, node.y)
                ctx.lineTo(connNode.x, connNode.y)
                ctx.stroke()
                
                // 恢复默认样式
                ctx.strokeStyle = colors.gridConnection
                ctx.lineWidth = 1
                continue
              }
            }
            
            // 普通连接线
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(connNode.x, connNode.y)
          }
        }
      }
    }
    ctx.stroke()
    
    // 更新和绘制流线
    for (let i = 0; i < flowLinesRef.current.length; i++) {
      const line = flowLinesRef.current[i]
      
      // 更新点的年龄
      for (let j = 0; j < line.points.length; j++) {
        line.points[j].age += normalizedDeltaTime * line.speed
      }
      
      // 移除过老的点
      line.points = line.points.filter(point => point.age < 100)
      
      // 添加新点
      if (line.points.length > 0 && line.points.length < line.maxPoints && line.active) {
        const lastPoint = line.points[line.points.length - 1]
        const flow = getFlowVector(lastPoint.x, lastPoint.y, time)
        
        // 流线头部方向有小概率变化
        if (Math.random() < 0.1) {
          flow.x += (Math.random() - 0.5) * 0.5
          flow.y += (Math.random() - 0.5) * 0.5
        }
        
        // 鼠标靠近时流线受到吸引
        if (mousePosition) {
          const dx = mousePosition.x - lastPoint.x
          const dy = mousePosition.y - lastPoint.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 200) {
            const factor = 0.2 * (1 - dist / 200)
            flow.x += (dx / dist) * factor
            flow.y += (dy / dist) * factor
          }
        }
        
        // 正则化向量
        const length = Math.sqrt(flow.x * flow.x + flow.y * flow.y)
        flow.x /= length
        flow.y /= length
        
        // 添加新点
        const newX = lastPoint.x + flow.x * line.speed * 3
        const newY = lastPoint.y + flow.y * line.speed * 3
        
        // 如果点出界，则在边缘创建新流线
        if (newX < -50 || newX > canvas.width + 50 || newY < -50 || newY > canvas.height + 50) {
          line.active = false
          
          // 在视口边缘创建新流线
          if (Math.random() < 0.8) {
            // 重置流线
            const side = Math.floor(Math.random() * 4)
            let x = 0, y = 0
            
            switch (side) {
              case 0: // 上
                x = Math.random() * canvas.width
                y = -10
                break
              case 1: // 右
                x = canvas.width + 10
                y = Math.random() * canvas.height
                break
              case 2: // 下
                x = Math.random() * canvas.width
                y = canvas.height + 10
                break
              case 3: // 左
                x = -10
                y = Math.random() * canvas.height
                break
            }
            
            line.points = [{ x, y, age: 0 }]
            line.active = true
          }
        } else {
          line.points.push({ x: newX, y: newY, age: 0 })
        }
      }
      
      // 流线消失后重生
      if (line.points.length === 0) {
        // 在随机位置创建新流线
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        
        line.points = [{ x, y, age: 0 }]
        line.active = true
        line.color = colors.flowLines[Math.floor(Math.random() * colors.flowLines.length)]
      }
      
      // 绘制流线
      if (line.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = line.color.replace(')', `, ${line.opacity})`).replace('rgb', 'rgba')
        ctx.lineWidth = line.width * line.energy * energyLevel
        
        // 绘制路径
        ctx.moveTo(line.points[0].x, line.points[0].y)
        
        for (let j = 1; j < line.points.length; j++) {
          const p0 = line.points[j - 1]
          const p1 = line.points[j]
          
          // 使用二次贝塞尔曲线平滑流线
          if (j < line.points.length - 1) {
            const p2 = line.points[j + 1]
            const xc = (p1.x + p2.x) / 2
            const yc = (p1.y + p2.y) / 2
            ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
          } else {
            ctx.lineTo(p1.x, p1.y)
          }
        }
        
        ctx.stroke()
        
        // 流线头部发光效果
        if (line.points.length > 0) {
          const head = line.points[line.points.length - 1]
          drawGlow(ctx, head.x, head.y, line.width * 1.5, line.color, line.opacity * 0.7)
        }
      }
    }
    
    // 更新和绘制光粒子
    for (let i = 0; i < particlesRef.current.length; i++) {
      const particle = particlesRef.current[i]
      
      // 更新粒子位置
      particle.x += Math.cos(particle.angle) * particle.speed * normalizedDeltaTime
      particle.y += Math.sin(particle.angle) * particle.speed * normalizedDeltaTime
      
      // 更新粒子生命
      particle.life += normalizedDeltaTime
      
      // 光粒子出界或生命结束后重置
      if (particle.x < -50 || particle.x > canvas.width + 50 || 
          particle.y < -50 || particle.y > canvas.height + 50 ||
          particle.life > particle.maxLife) {
        
        // 80%概率从边缘重新进入
        if (Math.random() < 0.8) {
          const side = Math.floor(Math.random() * 4)
          
          switch (side) {
            case 0: // 上
              particle.x = Math.random() * canvas.width
              particle.y = -10
              particle.angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25 // 向下运动
              break
            case 1: // 右
              particle.x = canvas.width + 10
              particle.y = Math.random() * canvas.height
              particle.angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.75 // 向左运动
              break
            case 2: // 下
              particle.x = Math.random() * canvas.width
              particle.y = canvas.height + 10
              particle.angle = Math.random() * Math.PI * 0.5 + Math.PI * 1.25 // 向上运动
              break
            case 3: // 左
              particle.x = -10
              particle.y = Math.random() * canvas.height
              particle.angle = Math.random() * Math.PI * 0.5 + Math.PI * 1.75 // 向右运动
              break
          }
        } else {
          // 随机位置
          particle.x = Math.random() * canvas.width
          particle.y = Math.random() * canvas.height
          particle.angle = Math.random() * Math.PI * 2
        }
        
        particle.life = 0
        particle.opacity = 0.3 + Math.random() * 0.5
        particle.size = 1 + Math.random() * 3
        particle.maxLife = 100 + Math.random() * 200
        particle.color = colors.particles[Math.floor(Math.random() * colors.particles.length)]
      }
      
      // 轻微改变粒子角度
      if (Math.random() < 0.05) {
        particle.angle += (Math.random() - 0.5) * 0.3
      }
      
      // 鼠标附近粒子受到吸引
      if (mousePosition) {
        const dx = mousePosition.x - particle.x
        const dy = mousePosition.y - particle.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 150) {
          const targetAngle = Math.atan2(dy, dx)
          const angleDiff = targetAngle - particle.angle
          
          // 规范化角度差到 -PI 到 PI 之间
          const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
          
          // 逐渐调整角度
          particle.angle += normalizedDiff * 0.03 * normalizedDeltaTime
        }
      }
      
      // 计算粒子不透明度（根据生命周期淡入淡出）
      const lifecycleFactor = 1 - Math.abs(particle.life / particle.maxLife * 2 - 1)
      const displayOpacity = particle.opacity * lifecycleFactor
      
      // 绘制粒子
      drawGlow(ctx, particle.x, particle.y, particle.size, particle.color, displayOpacity * 0.5)
      
      // 绘制粒子核心
      ctx.fillStyle = particle.color.replace(')', `, ${displayOpacity})`).replace('rgb', 'rgba')
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }

  // 点击事件处理程序
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 点击激活网格节点
    const handleClick = () => {
      if (mousePosition && gridNodesRef.current.length > 0) {
        // 找到最近的节点
        let closestNode: GridNode | null = null
        let closestDist = Infinity
        
        for (const node of gridNodesRef.current) {
          const dx = node.x - mousePosition.x
          const dy = node.y - mousePosition.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < closestDist) {
            closestDist = dist
            closestNode = node
          }
        }
        
        // 激活最近的节点及其附近节点
        if (closestNode && closestDist < 100) {
          const index = gridNodesRef.current.indexOf(closestNode)
          activateNode(index, 1.0)
          
          // 创建从鼠标到节点的流线
          const colors = getThemeColors().flowLines
          flowLinesRef.current.push({
            points: [
              { x: mousePosition.x, y: mousePosition.y, age: 0 },
              { x: closestNode.x, y: closestNode.y, age: 0 }
            ],
            width: 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2 + Math.random() * 3,
            maxPoints: 10,
            opacity: 0.7,
            energy: 1,
            active: true
          })
        }
      }
      
      // 增加整体能量
      energyLevelRef.current = Math.min(energyLevelRef.current + 0.3, 2)
      setTimeout(() => {
        energyLevelRef.current = Math.max(energyLevelRef.current - 0.3, 1)
      }, 2000)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('click', handleClick)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('click', handleClick)
    }
  }, [])

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

  // 初始化和动画处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化网格节点
    gridNodesRef.current = initGridNodes(dimensions.width, dimensions.height)
    
    // 初始化流线
    flowLinesRef.current = initFlowLines(dimensions.width, dimensions.height)
    
    // 初始化光粒子
    particlesRef.current = initParticles(dimensions.width, dimensions.height)
    
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
