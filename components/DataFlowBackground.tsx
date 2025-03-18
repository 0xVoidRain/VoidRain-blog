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
  active: boolean
  energy: number
  lastPulse: number
  connections: number[]
  color: string
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number | null>(null)
  const flowLinesRef = useRef<FlowLine[]>([])
  const gridNodesRef = useRef<GridNode[]>([])
  const noiseFieldRef = useRef<number[][]>([])
  const timeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const energyLevelRef = useRef<number>(1)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const { theme } = useTheme()

  // 用户指定的颜色
  const userColors = [
    '#00F7FF', // 亮青色
    '#20FC8F', // 亮绿色
    '#FF00FF', // 品红色
    '#FF6B35'  // 珊瑚橙色
  ]

  // 根据主题获取颜色
  const getThemeColors = () => {
    const colors = userColors.map(color => {
      // 为暗色主题保持鲜艳，为亮色主题稍微降低透明度
      const opacity = theme === 'dark' ? 0.8 : 0.6
      return color.replace(/^#/, `rgba(`) + `, ${opacity})`
                 .replace(/([0-9a-fA-F]{2})/g, match => `${parseInt(match, 16)},`)
                 .replace(/,$/, '')
    })
    
    return {
      flowLines: colors,
      nodes: colors,
      connections: colors.map(c => c.replace(/,[0-9.]+\)$/, ',0.3)')),
      background: theme === 'dark' 
        ? 'rgba(10, 15, 30, 0.05)' 
        : 'rgba(240, 245, 255, 0.05)'
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

  // 鼠标交互
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
        let closestNode = null
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
              { x: closestNode.x, y: closestNode.y, age: o }
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
  }, [mousePosition, theme])

  // 初始化噪声场（用于生成流线）
  const initNoiseField = (width: number, height: number) => {
    const gridSize = 20
    const cols = Math.ceil(width / gridSize)
    const rows = Math.ceil(height / gridSize)
    const field: number[][] = []
    
    for (let y = 0; y < rows; y++) {
      field[y] = []
      for (let x = 0; x < cols; x++) {
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
      return { angle: Math.PI / 2, strength: 1 }
    }
    
    const baseAngle = noiseFieldRef.current[row][col]
    const time = timeRef.current * 0.0002
    const angle = baseAngle + Math.sin(time + x * 0.01) * 0.2 + Math.cos(time + y * 0.01) * 0.2
    let strength = 0.5 + Math.sin(time * 2) * 0.2
    
    // 鼠标影响流场
    if (mousePosition) {
      const dx = mousePosition.x - x
      const dy = mousePosition.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 200) {
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

  // 创建流线
  const createFlowLine = (x: number, y: number): FlowLine => {
    const colors = getThemeColors().flowLines
    return {
      points: [{ x, y, age: 0 }],
      width: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 1 + Math.random() * 2,
      maxPoints: 20 + Math.floor(Math.random() * 30),
      opacity: 0.3 + Math.random() * 0.4,
      energy: Math.random(),
      active: true
    }
  }

  // 初始化网格节点
  const initGridNodes = (width: number, height: number) => {
    const nodeColors = getThemeColors().nodes
    const gridSize = 100 // 增大间距，减少节点数量
    const jitter = 15    // 轻微随机偏移
    const nodes: GridNode[] = []
    
    // 创建网格节点
    for (let y = gridSize; y < height; y += gridSize) {
      for (let x = gridSize; x < width; x += gridSize) {
        nodes.push({
          x: x + (Math.random() * jitter * 2 - jitter),
          y: y + (Math.random() * jitter * 2 - jitter),
          baseX: x,
          baseY: y,
          size: 1.5 + Math.random() * 1.5,
          active: Math.random() > 0.7, // 30%的节点初始活跃
          energy: Math.random(),
          lastPulse: -1000 * Math.random(), // 随机初始延迟
          connections: [],
          color: nodeColors[Math.floor(Math.random() * nodeColors.length)]
        })
      }
    }
    
    // 为每个节点建立连接
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 连接距离适中的节点
        if (dist < gridSize * 1.8) {
          nodes[i].connections.push(j)
          nodes[j].connections.push(i)
        }
      }
    }
    
    return nodes
  }

  // 激活一个节点及其连接的节点
  const activateNode = (index: number, strength: number) => {
    if (index < 0 || index >= gridNodesRef.current.length) return
    
    const node = gridNodesRef.current[index]
    if (!node.active || timeRef.current - node.lastPulse > 1000) {
      node.active = true
      node.energy = Math.min(node.energy + strength, 1)
      node.lastPulse = timeRef.current
      
      // 延迟激活连接的节点
      for (const connIndex of node.connections) {
        setTimeout(() => {
          activateNode(connIndex, strength * 0.7)
        }, 100 + Math.random() * 200)
      }
    }
  }

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
      gridNodesRef.current = initGridNodes(dimensions.width, dimensions.height)
    }
    
    // 初始化流线
    if (flowLinesRef.current.length === 0) {
      for (let i = 0; i < 15; i++) {
        flowLinesRef.current.push(createFlowLine(
          Math.random() * dimensions.width,
          Math.random() * dimensions.height
        ))
      }
    }
    
    // 渲染循环
    const render = (timestamp: number) => {
      // 计算时间增量
      const deltaTime = timestamp - (timeRef.current || timestamp)
      timeRef.current = timestamp
      const energyLevel = energyLevelRef.current
      
      // 清除画布，使用半透明背景创建拖尾效果
      ctx.fillStyle = getThemeColors().background
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      
      // 更新和绘制流线
      flowLinesRef.current = flowLinesRef.current.filter(flowLine => {
        if (!flowLine.active) return false
        
        const lastPoint = flowLine.points[flowLine.points.length - 1]
        const flow = getFlow(lastPoint.x, lastPoint.y)
        
        // 根据流场方向添加新点
        const newX = lastPoint.x + Math.cos(flow.angle) * flow.strength * flowLine.speed * (deltaTime / 16) * energyLevel
        const newY = lastPoint.y + Math.sin(flow.angle) * flow.strength * flowLine.speed * (deltaTime / 16) * energyLevel
        
        // 添加新点
        flowLine.points.push({ 
          x: newX, 
          y: newY, 
          age: 0
        })
        
        // 增加所有点的年龄
        flowLine.points.forEach(p => p.age += deltaTime)
        
        // 超过最大点数，移除最老的点
        if (flowLine.points.length > flowLine.maxPoints) {
          flowLine.points.shift()
        }
        
        // 如果所有点都离开画布，重置流线
        const allOutside = flowLine.points.every(p => 
          p.x < 0 || p.x > dimensions.width || p.y < 0 || p.y > dimensions.height
        )
        
        if (allOutside) {
          // 在画布一侧随机重生
          const side = Math.floor(Math.random() * 4)
          let x, y
          
          switch(side) {
            case 0: // 顶部
              x = Math.random() * dimensions.width
              y = 0
              break
            case 1: // 右侧
              x = dimensions.width
              y = Math.random() * dimensions.height
              break
            case 2: // 底部
              x = Math.random() * dimensions.width
              y = dimensions.height
              break
            default: // 左侧
              x = 0
              y = Math.random() * dimensions.height
          }
          
          flowLine.points = [{ x, y, age: 0 }]
          return true
        }
        
        // 绘制流线
        if (flowLine.points.length > 1) {
          ctx.beginPath()
          
          // 提取RGB值
          const [r, g, b] = extractRGB(flowLine.color)
          
          // 使用平滑的曲线连接点
          for (let i = 0; i < flowLine.points.length - 1; i++) {
            const p1 = flowLine.points[i]
            const p2 = flowLine.points[i + 1]
            
            // 根据点的年龄计算不透明度
            const opacity = flowLine.opacity * 
              Math.min(1, (5000 - p1.age) / 5000) * 
              (0.7 + 0.3 * Math.sin(timestamp * 0.001 + flowLine.energy * 10))
            
            // 计算线宽（随能量变化）
            const width = flowLine.width * (0.9 + 0.2 * Math.sin(timestamp * 0.002 + i * 0.1))
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
            ctx.lineWidth = width
            
            if (i === 0) {
              ctx.moveTo(p1.x, p1.y)
            }
            
            // 使用二次贝塞尔曲线创建平滑效果
            if (i < flowLine.points.length - 2) {
              const xc = (p1.x + p2.x) / 2
              const yc = (p1.y + p2.y) / 2
              ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
            } else {
              ctx.lineTo(p2.x, p2.y)
            }
          }
          
          ctx.stroke()
          
          // 绘制流线头部发光效果
          const head = flowLine.points[flowLine.points.length - 1]
          const glowSize = flowLine.width * 4
          const glow = ctx.createRadialGradient(
            head.x, head.y, 0,
            head.x, head.y, glowSize
          )
          
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flowLine.opacity * 0.8})`)
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.beginPath()
          ctx.fillStyle = glow
          ctx.arc(head.x, head.y, glowSize, 0, Math.PI * 2)
          ctx.fill()
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
      
      // 更新和绘制网格节点
      gridNodesRef.current.forEach((node, index) => {
        // 节点随时间轻微波动
        node.x = node.baseX + Math.sin(timestamp * 0.001 + node.energy * 10) * 5
        node.y = node.baseY + Math.cos(timestamp * 0.001 + node.energy * 5) * 5
        
        // 鼠标靠近时节点激活
        if (mousePosition) {
          const dx = mousePosition.x - node.x
          const dy = mousePosition.y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 100) {
            node.active = true
            node.energy = Math.min(node.energy + 0.01, 1)
            
            // 鼠标非常近时可能触发脉冲
            if (dist < 50 && timeRef.current - node.lastPulse > 2000) {
              node.lastPulse = timeRef.current
              
              // 随机决定是否创建流线
              if (Math.random() > 0.7) {
                const colors = getThemeColors().flowLines
                flowLinesRef.current.push({
                  points: [{ x: node.x, y: node.y, age: 0 }],
                  width: 1.5 + Math.random(),
                  color: colors[Math.floor(Math.random() * colors.length)],
                  speed: 2 + Math.random() * 2,
                  maxPoints: 15 + Math.floor(Math.random() * 15),
                  opacity: 0.5 + Math.random() * 0.3,
                  energy: Math.random(),
                  active: true
                })
              }
            }
          }
        }
        
        // 随着时间的推移，节点能量衰减
        if (node.active) {
          if (timeRef.current - node.lastPulse > 5000) {
            node.energy = Math.max(node.energy - 0.001 * (deltaTime / 16), 0)
            if (node.energy < 0.1) {
              node.active = Math.random() > 0.95 // 有小概率保持活跃
            }
          }
        } else if (Math.random() > 0.998) {
          // 有小概率随机激活
          node.active = true
          node.energy = 0.5 + Math.random() * 0.5
          node.lastPulse = timeRef.current
          
          // 根据节点能量决定是否传递到连接的节点
          if (node.energy > 0.8) {
            setTimeout(() => {
              node.connections.forEach(connIndex => {
                if (Math.random() > 0.3) {
                  activateNode(connIndex, node.energy * 0.8)
                }
              })
            }, 100 + Math.random() * 200)
          }
        }
        
        // 提取节点颜色
        const [r, g, b] = extractRGB(node.color)
        
        // 绘制节点连接
        if (node.active) {
          const connectColor = getThemeColors().connections[0]
          const [cr, cg, cb] = extractRGB(connectColor)
          
          node.connections.forEach(connIndex => {
            const connNode = gridNodesRef.current[connIndex]
            if (!connNode || (!node.active && !connNode.active)) return
            
            // 计算连接不透明度
            const baseOpacity = Math.min(node.energy, connNode.energy) * 0.3
            let lineOpacity = baseOpacity
            
            // 如果节点最近有脉冲，显示动画脉冲
            if (timeRef.current - node.lastPulse < 1000) {
              const pulseDist = (timeRef.current - node.lastPulse) / 1000
              const dx = connNode.x - node.x
              const dy = connNode.y - node.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              const position = Math.max(0, Math.min(1, pulseDist * 3))
              
              // 脉冲沿线移动
              if (position <= 1) {
                const pulseX = node.x + dx * position
                const pulseY = node.y + dy * position
                
                // 绘制脉冲发光效果
                const pulseGlow = ctx.createRadialGradient(
                  pulseX, pulseY, 0,
                  pulseX, pulseY, 5
                )
                
                pulseGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`)
                pulseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
                
                ctx.beginPath()
                ctx.fillStyle = pulseGlow
                ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2)
                ctx.fill()
              }
              
              // 增加连接线的不透明度
              lineOpacity = Math.max(baseOpacity, 0.4 * (1 - pulseDist))
            }
            
            // 绘制连接线
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${lineOpacity})`
            ctx.lineWidth = 0.5
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(connNode.x, connNode.y)
            ctx.stroke()
          })
        }
        
        // 绘制节点
        if (node.active) {
          // 节点大小随能量和时间波动
          const nodeSize = node.size * (0.8 + node.energy * 0.4 + 0.1 * Math.sin(timestamp * 0.003 + node.energy * 10))
          
          // 节点发光效果
          const glowSize = nodeSize * 3
          const opacity = 0.2 + node.energy * 0.6 * (0.8 + 0.2 * Math.sin(timestamp * 0.002 + node.energy * 5))
          
          const glow = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, glowSize
          )
          
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.7})`)
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.beginPath()
          ctx.fillStyle = glow
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2)
          ctx.fill()
          
          // 节点核心
          ctx.beginPath()
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 1.2})`
          ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // 非活跃节点更小更暗
          ctx.beginPath()
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`
          ctx.arc(node.x, node.y, node.size * 0.6, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      
      // 随机激活节点，增加活跃度
      if (Math.random() > 0.98) {
        const randomIndex = Math.floor(Math.random() * gridNodesRef.current.length)
        activateNode(randomIndex, 0.8 + Math.random() * 0.2)
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
