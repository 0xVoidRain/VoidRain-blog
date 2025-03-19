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
  
  // 动画状态引用
  const nodesRef = useRef<any[]>([])
  const linesRef = useRef<any[]>([])
  const timeRef = useRef(0)
  
  // 颜色配置
  const colors = {
    primary: '#00F7FF',   // 青色
    secondary: '#20FC8F', // 绿色
    accent1: '#FF00FF',   // 品红
    accent2: '#FF6B35'    // 橙色
  }
  
  // 初始化网格
  const initGrid = (width: number, height: number) => {
    const nodes = []
    const gridSize = Math.max(width, height) > 1000 ? 100 : 80
    
    // 计算行列数
    const cols = Math.floor(width / gridSize) + 2
    const rows = Math.floor(height / gridSize) + 2
    
    // 创建网格节点
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = j * gridSize
        const y = i * gridSize
        
        nodes.push({
          x, y,
          baseX: x,
          baseY: y,
          size: Math.random() * 2 + 1,
          energy: Math.random() * 0.5,
          active: false,
          speed: Math.random() * 0.02 + 0.01,
          phase: Math.random() * Math.PI * 2
        })
      }
    }
    
    return nodes
  }
  
  // 初始化流线
  const initFlowLines = (width: number, height: number) => {
    const lines = []
    const count = Math.min(Math.floor(width * height / 30000), 30)
    
    for (let i = 0; i < count; i++) {
      const line = {
        points: [],
        width: Math.random() * 1.5 + 0.5,
        color: Object.values(colors)[Math.floor(Math.random() * 4)],
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.3 + 0.3,
        maxPoints: Math.floor(Math.random() * 30) + 30,
        headSize: Math.random() * 3 + 2
      }
      
      // 随机起点
      const startX = Math.random() * width
      const startY = Math.random() * height
      
      // 初始化点
      for (let j = 0; j < 3; j++) {
        line.points.push({
          x: startX,
          y: startY,
          age: j * 2
        })
      }
      
      lines.push(line)
    }
    
    return lines
  }
  
  // 动画循环
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 更新时间
    const deltaTime = (time - timeRef.current) / 1000
    timeRef.current = time
    
    // 设置全局透明度
    const globalAlpha = theme === 'dark' ? 1 : 0.7
    ctx.globalAlpha = globalAlpha
    
    // 绘制网格
    drawGrid(ctx, deltaTime)
    
    // 绘制流线
    drawFlowLines(ctx, deltaTime)
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }
  
  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const nodes = nodesRef.current
    
    // 更新节点
    nodes.forEach((node, index) => {
      // 更新位置 - 添加波动
      node.phase += node.speed * deltaTime * 10
      node.x = node.baseX + Math.sin(node.phase) * 10
      node.y = node.baseY + Math.cos(node.phase * 0.7) * 10
      
      // 鼠标交互
      if (mousePosition) {
        const dx = node.x - mousePosition.x
        const dy = node.y - mousePosition.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 150) {
          node.active = true
          node.energy = Math.max(node.energy, 1 - dist / 150)
        } else {
          node.active = false
          node.energy = Math.max(0.1, node.energy - deltaTime * 0.5)
        }
      } else {
        node.active = false
        node.energy = Math.max(0.1, node.energy - deltaTime * 0.5)
      }
      
      // 绘制节点
      const size = node.size * (1 + node.energy)
      
      // 只绘制能量较高或特定位置的节点
      if (node.energy > 0.3 || index % 5 === 0) {
        ctx.beginPath()
        
        // 根据主题设置颜色
        if (theme === 'dark') {
          ctx.fillStyle = node.active ? colors.primary : `rgba(0, 247, 255, ${node.energy * 0.8})`
          ctx.shadowBlur = node.energy * 15
          ctx.shadowColor = colors.primary
        } else {
          ctx.fillStyle = node.active ? colors.primary : `rgba(0, 200, 220, ${node.energy * 0.6})`
          ctx.shadowBlur = node.energy * 8
          ctx.shadowColor = colors.primary
        }
        
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    })
    
    // 绘制连线
    ctx.lineWidth = 0.5
    ctx.strokeStyle = theme === 'dark' ? 'rgba(0, 247, 255, 0.15)' : 'rgba(0, 200, 220, 0.1)'
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i]
      
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j]
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 只连接较近的节点
        if (dist < 150) {
          const opacity = (1 - dist / 150) * 0.5 * Math.max(nodeA.energy, nodeB.energy)
          
          if (opacity > 0.05) {
            ctx.beginPath()
            ctx.globalAlpha = opacity * (theme === 'dark' ? 1 : 0.7)
            ctx.moveTo(nodeA.x, nodeA.y)
            ctx.lineTo(nodeB.x, nodeB.y)
            ctx.stroke()
            ctx.globalAlpha = theme === 'dark' ? 1 : 0.7
          }
        }
      }
    }
  }
  
  // 绘制流线
  const drawFlowLines = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const lines = linesRef.current
    const nodes = nodesRef.current
    
    lines.forEach(line => {
      // 更新点的年龄
      line.points.forEach(point => {
        point.age += deltaTime * line.speed
      })
      
      // 移除过老的点
      while (line.points.length > 0 && line.points[0].age > 20) {
        line.points.shift()
      }
      
      // 根据现有点的位置计算下一个点
      if (line.points.length > 0) {
        const lastPoint = line.points[line.points.length - 1]
        const age = lastPoint.age
        
        // 只有当年龄足够时才添加新点
        if (age > 0.1) {
          // 查找接近的节点来影响方向
          let dirX = Math.cos(age * 0.3) * line.speed * 10
          let dirY = Math.sin(age * 0.3) * line.speed * 10
          
          // 寻找最近的节点
          let closestNode = null
          let closestDist = Infinity
          
          nodes.forEach(node => {
            const dx = node.x - lastPoint.x
            const dy = node.y - lastPoint.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist < closestDist && dist < 200) {
              closestDist = dist
              closestNode = node
            }
          })
          
          // 当有最近节点时，流线方向受到吸引
          if (closestNode) {
            const influence = Math.min(1, 0.5 / (closestDist / 100))
            dirX = dirX * (1 - influence) + (closestNode.x - lastPoint.x) * influence * 0.1
            dirY = dirY * (1 - influence) + (closestNode.y - lastPoint.y) * influence * 0.1
          }
          
          // 添加新点
          const newX = lastPoint.x + dirX
          const newY = lastPoint.y + dirY
          
          // 检查是否超出边界
          if (newX < 0 || newX > dimensions.width || 
              newY < 0 || newY > dimensions.height) {
            // 重置到新位置
            line.points = [{
              x: Math.random() * dimensions.width,
              y: Math.random() * dimensions.height,
              age: 0
            }]
          } else {
            // 添加新点
            line.points.push({
              x: newX,
              y: newY,
              age: 0
            })
          }
          
          // 限制点的数量
          if (line.points.length > line.maxPoints) {
            line.points.shift()
          }
        }
      }
      
      // 绘制线条
      if (line.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = line.color
        ctx.lineWidth = line.width
        ctx.globalAlpha = line.opacity * (theme === 'dark' ? 1 : 0.6)
        
        // 绘制平滑曲线
        ctx.moveTo(line.points[0].x, line.points[0].y)
        
        for (let i = 0; i < line.points.length - 1; i++) {
          const xc = (line.points[i].x + line.points[i + 1].x) / 2
          const yc = (line.points[i].y + line.points[i + 1].y) / 2
          ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc)
        }
        
        ctx.stroke()
        ctx.globalAlpha = theme === 'dark' ? 1 : 0.7
        
        // 绘制头部
        const head = line.points[line.points.length - 1]
        ctx.beginPath()
        ctx.fillStyle = line.color
        ctx.shadowBlur = line.headSize * 2
        ctx.shadowColor = line.color
        ctx.arc(head.x, head.y, line.headSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    })
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
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    
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
    
    // 初始化网格和流线
    nodesRef.current = initGrid(dimensions.width, dimensions.height)
    linesRef.current = initFlowLines(dimensions.width, dimensions.height)
    
    // 开始动画循环
    requestRef.current = requestAnimationFrame(animate)
    
    // 清理
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
