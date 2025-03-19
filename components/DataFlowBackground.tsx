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
  shape: string
}

// 定义纸飞机粒子
interface PaperPlane {
  x: number
  y: number
  size: number
  speed: number
  angle: number
  rotation: number
  rotationSpeed: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

// 定义爆发粒子
interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  size: number
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
  const planesRef = useRef<PaperPlane[]>([])
  const burstParticlesRef = useRef<BurstParticle[]>([])
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
      planes: isDark 
        ? ['#00F7FF', '#FF00FF', '#20FC8F'] 
        : ['#00c8cc', '#cc00cc', '#20cc72']
    }
  }

  // 初始化网格节点 - 减少数量并添加不同形状
  const initGridNodes = (width: number, height: number): GridNode[] => {
    const nodes: GridNode[] = []
    const colors = getThemeColors().gridNodes
    // 减少网格密度，用更大的间距
    const spacing = Math.min(width, height) / 12
    const shapes = ['diamond', 'square', 'triangle', 'cross']
    
    // 创建更少的节点，但位置更有战略性
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        // 随机跳过一些节点位置，进一步减少数量
        if (Math.random() < 0.6) continue
        
        const baseSize = 2 + Math.random() * 3
        nodes.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size: baseSize,
          baseSize,
          energy: Math.random(),
          connections: [],
          phase: Math.random() * Math.PI * 2,
          speed: 0.01 + Math.random() * 0.02,
          active: false,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseTime: 0,
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        })
      }
    }
    
    // 建立节点之间的连接
    nodes.forEach((node, i) => {
      // 寻找离当前节点最近的节点
      const closest: number[] = []
      nodes.forEach((otherNode, j) => {
        if (i !== j) {
          const dist = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + 
            Math.pow(node.y - otherNode.y, 2)
          )
          if (dist < spacing * 1.5) {
            closest.push(j)
          }
        }
      })
      // 只保留最近的2-3个连接
      node.connections = closest.slice(0, 2 + Math.floor(Math.random() * 2))
    })
    
    return nodes
  }

  // 初始化流线
  const initFlowLines = (width: number, height: number): FlowLine[] => {
    const lines: FlowLine[] = []
    const colors = getThemeColors().flowLines
    
    for (let i = 0; i < 15; i++) {
      lines.push({
        points: [{
          x: Math.random() * width,
          y: Math.random() * height,
          age: 0
        }],
        width: 1 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 60 + Math.random() * 40,
        maxPoints: 50 + Math.floor(Math.random() * 30),
        opacity: 0.4 + Math.random() * 0.3,
        energy: 0.5 + Math.random() * 0.5,
        active: true
      })
    }
    
    return lines
  }

  // 初始化纸飞机粒子
  const initPaperPlanes = (width: number, height: number): PaperPlane[] => {
    const planes: PaperPlane[] = []
    const colors = getThemeColors().planes
    
    for (let i = 0; i < 20; i++) {
      planes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 5 + Math.random() * 8,
        speed: 0.5 + Math.random() * 1.5,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.4 + Math.random() * 0.6,
        life: 0,
        maxLife: 500 + Math.random() * 500
      })
    }
    
    return planes
  }

  // 创建爆发粒子效果
  const createBurstParticles = (x: number, y: number) => {
    const particles: BurstParticle[] = []
    const colors = ['#00F7FF', '#FF00FF', '#20FC8F', '#FF6B35']
    const count = 10 + Math.floor(Math.random() * 10) // 10-20个粒子
    
    for (let i = 0; i < count; i++) {
      // 随机方向和速度
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // 初始上升趋势
        gravity: 0.1 + Math.random() * 0.1, // 重力影响，形成抛物线
        size: 1 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.8 + Math.random() * 0.2,
        life: 0,
        maxLife: 60 // 约0.8秒 (假设60fps)
      })
    }
    
    burstParticlesRef.current = [...burstParticlesRef.current, ...particles]
  }

  // 更新纸飞机粒子
  const updatePaperPlanes = (width: number, height: number, delta: number) => {
    const planes = planesRef.current
    
    planes.forEach((plane, i) => {
      // 更新位置
      plane.x += Math.cos(plane.angle) * plane.speed * delta
      plane.y += Math.sin(plane.angle) * plane.speed * delta
      
      // 更新旋转
      plane.rotation += plane.rotationSpeed * delta
      
      // 更新生命周期
      plane.life += delta
      
      // 缓慢改变方向
      if (Math.random() < 0.01) {
        plane.angle += (Math.random() - 0.5) * 0.2
      }
      
      // 如果接近鼠标位置，轻微转向
      if (mousePosition) {
        const dx = mousePosition.x - plane.x
        const dy = mousePosition.y - plane.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 200) {
          const targetAngle = Math.atan2(dy, dx)
          const angleDiff = targetAngle - plane.angle
          // 确保取最短角度
          const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
          plane.angle += normalizedDiff * 0.02
        }
      }
      
      // 重置超出边界的飞机
      if (plane.x < -20 || plane.x > width + 20 || 
          plane.y < -20 || plane.y > height + 20 || 
          plane.life > plane.maxLife) {
        
        // 从边缘重生
        const side = Math.floor(Math.random() * 4)
        if (side === 0) { // 顶部
          plane.x = Math.random() * width
          plane.y = -20
          plane.angle = Math.PI/2 + (Math.random() - 0.5) * 0.5
        } else if (side === 1) { // 右侧
          plane.x = width + 20
          plane.y = Math.random() * height
          plane.angle = Math.PI + (Math.random() - 0.5) * 0.5
        } else if (side === 2) { // 底部
          plane.x = Math.random() * width
          plane.y = height + 20
          plane.angle = -Math.PI/2 + (Math.random() - 0.5) * 0.5
        } else { // 左侧
          plane.x = -20
          plane.y = Math.random() * height
          plane.angle = 0 + (Math.random() - 0.5) * 0.5
        }
        
        plane.life = 0
        plane.opacity = 0.4 + Math.random() * 0.6
      }
    })
  }

  // 更新爆发粒子
  const updateBurstParticles = (delta: number) => {
    const particles = burstParticlesRef.current
    
    // 更新每个粒子的状态
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      // 应用速度和重力
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += p.gravity * delta // 增加重力，形成抛物线
      
      // 更新生命周期
      p.life += delta
      
      // 生命周期结束时降低透明度
      if (p.life > p.maxLife * 0.7) {
        p.opacity = p.opacity * 0.9
      }
      
      // 移除已经完成生命周期的粒子
      if (p.life >= p.maxLife) {
        particles.splice(i, 1)
      }
    }
  }

  // 更新流线
  const updateFlowLines = (width: number, height: number, delta: number) => {
    const lines = flowLinesRef.current
    const nodes = gridNodesRef.current
    
    lines.forEach(line => {
      if (!line.active || line.points.length === 0) return
      
      // 获取流线头部
      const head = line.points[line.points.length - 1]
      
      // 计算流场方向
      let flowX = 0
      let flowY = 0
      
      // 受网格节点影响
      nodes.forEach(node => {
        const dx = node.x - head.x
        const dy = node.y - head.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = 1 / (1 + dist * 0.01)
        
        // 旋转场效果
        const angle = Math.atan2(dy, dx) + node.phase
        flowX += Math.cos(angle) * influence * node.energy
        flowY += Math.sin(angle) * influence * node.energy
      })
      
      // 受鼠标位置影响
      if (mousePosition) {
        const dx = mousePosition.x - head.x
        const dy = mousePosition.y - head.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 300) {
          const influence = 1 - (dist / 300)
          flowX += dx / dist * influence * 2
          flowY += dy / dist * influence * 2
        }
      }
      
      // 标准化方向向量
      const flowMag = Math.sqrt(flowX * flowX + flowY * flowY) || 1
      flowX /= flowMag
      flowY /= flowMag
      
      // 添加新点
      line.points.push({
        x: head.x + flowX * line.speed * delta * 0.05,
        y: head.y + flowY * line.speed * delta * 0.05,
        age: 0
      })
      
      // 增加所有点的年龄
      line.points.forEach(p => p.age += delta)
      
      // 移除过老的点
      if (line.points.length > line.maxPoints) {
        line.points.shift()
      }
      
      // 如果流线头部超出边界，从边缘重新开始
      const newHead = line.points[line.points.length - 1]
      if (newHead.x < 0 || newHead.x > width || newHead.y < 0 || newHead.y > height) {
        // 清空点
        line.points = []
        
        // 从随机边缘开始
        const side = Math.floor(Math.random() * 4)
        if (side === 0) { // 顶部
          line.points.push({
            x: Math.random() * width,
            y: 0,
            age: 0
          })
        } else if (side === 1) { // 右侧
          line.points.push({
            x: width,
            y: Math.random() * height,
            age: 0
          })
        } else if (side === 2) { // 底部
          line.points.push({
            x: Math.random() * width,
            y: height,
            age: 0
          })
        } else { // 左侧
          line.points.push({
            x: 0,
            y: Math.random() * height,
            age: 0
          })
        }
      }
    })
  }

  // 更新网格节点
  const updateGridNodes = (width: number, height: number, delta: number) => {
    const nodes = gridNodesRef.current
    
    nodes.forEach(node => {
      // 更新相位
      node.phase += node.speed * delta
      
      // 波浪运动效果
      const time = timeRef.current
      node.x = node.baseX + Math.sin(time * 0.001 + node.phase) * 10
      node.y = node.baseY + Math.cos(time * 0.002 + node.phase * 1.3) * 10
      
      // 更新能量水平
      if (node.active) {
        node.energy = Math.min(node.energy + 0.02 * delta, 1.5)
        node.size = node.baseSize * (1 + node.energy * 0.5)
      } else {
        node.energy = Math.max(node.energy - 0.005 * delta, 0.2)
        node.size = node.baseSize * (1 + node.energy * 0.3)
      }
      
      // 更新脉冲时间
      if (node.pulseTime > 0) {
        node.pulseTime -= delta
        // 脉冲能量传递给相邻节点
        if (node.pulseTime <= 0 && node.energy > 1) {
          node.connections.forEach(connIdx => {
            const connNode = nodes[connIdx]
            if (connNode && Math.random() < 0.5) {
              connNode.pulseTime = 30 + Math.random() * 20
              connNode.energy = Math.min(connNode.energy + 0.3, 1.5)
            }
          })
        }
      }
      
      // 检查鼠标接近
      if (mousePosition) {
        const dx = mousePosition.x - node.x
        const dy = mousePosition.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 如果鼠标接近，激活节点
        node.active = dist < 150
      } else {
        node.active = false
      }
    })
  }

  // 绘制纸飞机
  const drawPaperPlane = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    size: number, 
    rotation: number, 
    color: string, 
    opacity: number
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    
    // 设置样式
    ctx.globalAlpha = opacity
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    
    // 绘制纸飞机形状
    ctx.beginPath()
    // 机身
    ctx.moveTo(size, 0)
    ctx.lineTo(-size, size/2)
    ctx.lineTo(-size/2, 0)
    ctx.lineTo(-size, -size/2)
    ctx.closePath()
    
    // 填充与描边
    ctx.fill()
    ctx.stroke()
    
    // 添加一些细节线条
    ctx.beginPath()
    ctx.moveTo(-size/2, 0)
    ctx.lineTo(size/2, 0)
    ctx.stroke()
    
    ctx.restore()
  }

  // 绘制不同形状的网格节点
  const drawGridNode = (
    ctx: CanvasRenderingContext2D, 
    node: GridNode
  ) => {
    const { x, y, size, color, energy, shape } = node
    
    ctx.save()
    ctx.translate(x, y)
    
    // 基本样式
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    
    // 根据形状绘制
    switch (shape) {
      case 'diamond':
        ctx.beginPath()
        ctx.moveTo(0, -size)
        ctx.lineTo(size, 0)
        ctx.lineTo(0, size)
        ctx.lineTo(-size, 0)
        ctx.closePath()
        break
        
      case 'square':
        ctx.beginPath()
        ctx.rect(-size/2, -size/2, size, size)
        break
        
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(0, -size)
        ctx.lineTo(size, size)
        ctx.lineTo(-size, size)
        ctx.closePath()
        break
        
      case 'cross':
        ctx.beginPath()
        ctx.moveTo(-size, 0)
        ctx.lineTo(size, 0)
        ctx.moveTo(0, -size)
        ctx.lineTo(0, size)
        ctx.lineWidth = size/3
        break
    }
    
    // 活跃节点使用填充，否则只描边
    if (energy > 1) {
      ctx.globalAlpha = Math.min((energy - 1) * 2, 0.7)
      ctx.fill()
      // 添加发光效果
      ctx.shadowColor = color
      ctx.shadowBlur = size * 3
      ctx.globalAlpha = Math.min((energy - 1) * 1.5, 0.5)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    
    // 绘制基本轮廓
    ctx.globalAlpha = 0.7
    ctx.stroke()
    
    ctx.restore()
  }

  // 绘制爆发粒子
  const drawBurstParticle = (
    ctx: CanvasRenderingContext2D,
    particle: BurstParticle
  ) => {
    ctx.save()
    
    ctx.globalAlpha = particle.opacity
    ctx.fillStyle = particle.color
    
    // 为粒子添加发光效果
    ctx.shadowColor = particle.color
    ctx.shadowBlur = particle.size * 2
    
    // 绘制粒子
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }

  // 动画循环
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const delta = timestamp - (timeRef.current || timestamp)
    timeRef.current = timestamp
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 设置背景
    ctx.fillStyle = getThemeColors().background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 更新状态
    updateGridNodes(canvas.width, canvas.height, delta)
    updateFlowLines(canvas.width, canvas.height, delta)
    updatePaperPlanes(canvas.width, canvas.height, delta)
    updateBurstParticles(delta)
    
    // 绘制网格连接
    ctx.strokeStyle = getThemeColors().gridConnection
    ctx.lineWidth = 1
    ctx.beginPath()
    
    gridNodesRef.current.forEach(node => {
      node.connections.forEach(connIdx => {
        const connNode = gridNodesRef.current[connIdx]
        if (connNode) {
          // 只绘制节点能量较高的连接
          if (node.energy > 0.5 || connNode.energy > 0.5) {
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(connNode.x, connNode.y)
          }
        }
      })
    })
    
    ctx.stroke()
    
    // 绘制流线
    flowLinesRef.current.forEach(line => {
      if (line.points.length < 2) return
      
      // 创建渐变
      const gradient = ctx.createLinearGradient(
        line.points[0].x, 
        line.points[0].y, 
        line.points[line.points.length - 1].x, 
        line.points[line.points.length - 1].y
      )
      
      gradient.addColorStop(0, `${line.color}00`)
      gradient.addColorStop(0.4, `${line.color}${Math.floor(line.opacity * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, line.color)
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = line.width
      ctx.beginPath()
      ctx.moveTo(line.points[0].x, line.points[0].y)
      
      // 使用贝塞尔曲线使流线平滑
      for (let i = 1; i < line.points.length; i++) {
        const curr = line.points[i]
        const prev = line.points[i - 1]
        
        if (i === 1) {
          ctx.lineTo(curr.x, curr.y)
        } else {
          const prev2 = line.points[i - 2]
          const cpX1 = prev.x + (curr.x - prev2.x) * 0.2
          const cpY1 = prev.y + (curr.y - prev2.y) * 0.2
          const cpX2 = prev.x + (curr.x - prev.x) * 0.5
          const cpY2 = prev.y + (curr.y - prev.y) * 0.5
          
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, curr.x, curr.y)
        }
      }
      
      ctx.stroke()
      
      // 添加流线头部辉光
      const head = line.points[line.points.length - 1]
      ctx.beginPath()
      ctx.arc(head.x, head.y, line.width * 2, 0, Math.PI * 2)
      ctx.fillStyle = line.color
      ctx.globalAlpha = line.opacity * 1.5
      ctx.fill()
      ctx.globalAlpha = 1
    })
    
    // 绘制网格节点
    gridNodesRef.current.forEach(node => {
      drawGridNode(ctx, node)
    })
    
    // 绘制纸飞机粒子
    planesRef.current.forEach(plane => {
      drawPaperPlane(
        ctx,
        plane.x,
        plane.y,
        plane.size,
        plane.rotation,
        plane.color,
        plane.opacity
      )
    })
    
    // 绘制爆发粒子
    burstParticlesRef.current.forEach(particle => {
      drawBurstParticle(ctx, particle)
    })
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }

  // 鼠标事件处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      })
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    // 点击事件处理 - 创建爆发粒子效果
    const handleClick = (e: MouseEvent) => {
      createBurstParticles(e.clientX, e.clientY)
      
      // 找到距离点击位置最近的节点
      if (gridNodesRef.current.length > 0) {
        let closestNode: GridNode | null = null
        let closestDist = Infinity
        
        gridNodesRef.current.forEach(node => {
          const dx = e.clientX - node.x
          const dy = e.clientY - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < closestDist) {
            closestDist = dist
            closestNode = node
          }
        })
        
        if (closestNode) {
          // 激活最近的节点
          closestNode.pulseTime = 50
          closestNode.energy = 1.5
          closestNode.active = true
        }
      }
      
      // 增加整体能量
      energyLevelRef.current = Math.min(energyLevelRef.current + 0.3, 2)
      setTimeout(() => {
        energyLevelRef.current = Math.max(energyLevelRef.current - 0.3, 1)
      }, 2000)
    }
    
    // 额外添加：监听整个文档中的链接和按钮点击，创建爆发效果
    const handleElementClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 检查是否点击了链接或按钮
      if (target.tagName === 'A' || 
          target.tagName === 'BUTTON' || 
          target.closest('a') || 
          target.closest('button')) {
        createBurstParticles(e.clientX, e.clientY)
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('click', handleClick)
    document.addEventListener('click', handleElementClick)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('click', handleClick)
      document.removeEventListener('click', handleElementClick)
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
    
    // 初始化纸飞机粒子
    planesRef.current = initPaperPlanes(dimensions.width, dimensions.height)
    
    // 初始化爆发粒子数组
    burstParticlesRef.current = []
    
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
