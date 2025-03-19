'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DataFlowBackground() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>()
  const isDraggingRef = useRef(false)
  const dragNodeRef = useRef<number | null>(null)
  
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  
  // 网格系统
  const gridRef = useRef<{
    nodes: any[];
    springs: any[];
    restDistance: number;
    stiffness: number;
    damping: number;
  }>({
    nodes: [],
    springs: [],
    restDistance: 0,
    stiffness: 0.03,
    damping: 0.8
  })
  
  // 波纹数组
  const ripplesRef = useRef<any[]>([])
  
  // 颜色设置
  const colors = {
    gridColor: theme === 'dark' ? 'rgba(0, 247, 255, 0.8)' : 'rgba(0, 120, 255, 0.5)',
    rippleColor: theme === 'dark' ? 'rgba(255, 107, 53, 0.6)' : 'rgba(255, 107, 53, 0.4)', 
    nodeColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(100, 100, 255, 0.6)',
    darkBg: 'rgba(10, 10, 25, 0.95)',
    lightBg: 'rgba(245, 245, 255, 0.95)'
  }
  
  // 初始化网格
  const initGrid = (width: number, height: number) => {
    const gridSpacing = Math.max(30, Math.min(width, height) / 25)
    const cols = Math.floor(width / gridSpacing) + 2
    const rows = Math.floor(height / gridSpacing) + 2
    
    const nodes = []
    const springs = []
    
    // 创建网格节点
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        nodes.push({
          x: x * gridSpacing,
          y: y * gridSpacing,
          oldX: x * gridSpacing,
          oldY: y * gridSpacing,
          originalX: x * gridSpacing,
          originalY: y * gridSpacing,
          vx: 0,
          vy: 0,
          mass: 1 + Math.random() * 0.5,  // 不同质量使网格变形更自然
          pinned: false,  // 边缘节点固定
          pressure: 0,     // 存储压力值
          neighbors: []    // 存储相邻节点索引
        })
      }
    }
    
    // 固定边缘节点
    for (let i = 0; i < nodes.length; i++) {
      const x = i % cols
      const y = Math.floor(i / cols)
      
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        nodes[i].pinned = true
      }
    }
    
    // 创建弹簧连接
    for (let i = 0; i < nodes.length; i++) {
      const x = i % cols
      const y = Math.floor(i / cols)
      
      // 水平弹簧
      if (x < cols - 1) {
        springs.push({
          nodeA: i,
          nodeB: i + 1,
          length: gridSpacing,
          stiffness: 0.2 + Math.random() * 0.1
        })
      }
      
      // 垂直弹簧
      if (y < rows - 1) {
        springs.push({
          nodeA: i,
          nodeB: i + cols,
          length: gridSpacing,
          stiffness: 0.2 + Math.random() * 0.1
        })
      }
      
      // 对角线弹簧 (增加稳定性)
      if (x < cols - 1 && y < rows - 1) {
        springs.push({
          nodeA: i,
          nodeB: i + cols + 1,
          length: gridSpacing * Math.sqrt(2),
          stiffness: 0.08 + Math.random() * 0.05
        })
      }
      
      if (x > 0 && y < rows - 1) {
        springs.push({
          nodeA: i,
          nodeB: i + cols - 1,
          length: gridSpacing * Math.sqrt(2),
          stiffness: 0.08 + Math.random() * 0.05
        })
      }
      
      // 存储邻居节点
      nodes[i].neighbors = springs
        .filter(s => s.nodeA === i || s.nodeB === i)
        .map(s => s.nodeA === i ? s.nodeB : s.nodeA)
    }
    
    return {
      nodes,
      springs,
      restDistance: gridSpacing,
      stiffness: 0.03,
      damping: 0.8
    }
  }
  
  // 创建波纹
  const createRipple = (x: number, y: number, force: number = 1) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 0,
      maxRadius: 200 + Math.random() * 150,
      speed: 3 + Math.random() * 2,
      life: 1,
      force: force
    })
  }
  
  // 更新网格物理
  const updateGridPhysics = (deltaTime: number) => {
    const grid = gridRef.current
    const damping = Math.min(0.9, grid.damping)
    
    // 应用外部力 (流体波动)
    const time = Date.now() * 0.001
    const windForce = Math.sin(time * 0.3) * 0.2
    
    // 更新节点位置
    for (let i = 0; i < grid.nodes.length; i++) {
      const node = grid.nodes[i]
      
      if (node.pinned) continue
      
      // 保存旧位置用于计算速度
      const oldX = node.x
      const oldY = node.y
      
      // 应用流体力和节点间相互作用
      // 使用Verlet积分更新位置
      const vx = (node.x - node.oldX) * damping
      const vy = (node.y - node.oldY) * damping + 0.1 // 轻微重力
      
      // 更新旧位置
      node.oldX = node.x
      node.oldY = node.y
      
      // 流体波动效果 
      const noiseX = Math.sin(time * 0.5 + node.originalX * 0.01) * 0.3
      const noiseY = Math.cos(time * 0.4 + node.originalY * 0.01) * 0.3
      
      // 应用波纹力
      let rippleForce = {x: 0, y: 0}
      
      for (const ripple of ripplesRef.current) {
        const dx = node.x - ripple.x
        const dy = node.y - ripple.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 如果节点在波纹半径±10的范围内，应用力
        const ringWidth = 20
        if (Math.abs(dist - ripple.radius) < ringWidth) {
          const force = ripple.force * (1 - Math.abs(dist - ripple.radius) / ringWidth) * ripple.life
          const angle = Math.atan2(dy, dx)
          rippleForce.x += Math.cos(angle) * force
          rippleForce.y += Math.sin(angle) * force
        }
      }
      
      // 更新位置
      node.x += vx + noiseX + rippleForce.x + windForce
      node.y += vy + noiseY + rippleForce.y
      
      // 计算新速度
      node.vx = node.x - oldX
      node.vy = node.y - oldY
    }
    
    // 应用弹簧约束
    for (let i = 0; i < grid.springs.length; i++) {
      const spring = grid.springs[i]
      const nodeA = grid.nodes[spring.nodeA]
      const nodeB = grid.nodes[spring.nodeB]
      
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // 计算弹簧力
      const springForce = (distance - spring.length) * spring.stiffness
      
      const fx = (dx / distance) * springForce
      const fy = (dy / distance) * springForce
      
      // 应用力
      if (!nodeA.pinned) {
        nodeA.x += fx
        nodeA.y += fy
      }
      
      if (!nodeB.pinned) {
        nodeB.x -= fx
        nodeB.y -= fy
      }
    }
    
    // 更新波纹
    for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
      const ripple = ripplesRef.current[i]
      
      ripple.radius += ripple.speed
      ripple.life -= 0.008
      
      if (ripple.life <= 0 || ripple.radius > ripple.maxRadius) {
        ripplesRef.current.splice(i, 1)
      }
    }
  }
  
  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const grid = gridRef.current
    const isDark = theme === 'dark'
    
    // 设置线条样式
    ctx.lineWidth = 1
    ctx.strokeStyle = colors.gridColor
    
    // 绘制弹簧连接
    ctx.beginPath()
    for (let i = 0; i < grid.springs.length; i++) {
      const spring = grid.springs[i]
      const nodeA = grid.nodes[spring.nodeA]
      const nodeB = grid.nodes[spring.nodeB]
      
      // 计算线条透明度 (根据拉伸程度)
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const strain = Math.abs(distance - spring.length) / spring.length
      const alpha = Math.max(0.1, Math.min(0.8, 1 - strain * 3))
      
      // 设置线条样式
      ctx.beginPath()
      ctx.strokeStyle = isDark 
        ? `rgba(0, 247, 255, ${alpha})`
        : `rgba(0, 120, 255, ${alpha})`
      
      ctx.moveTo(nodeA.x, nodeA.y)
      ctx.lineTo(nodeB.x, nodeB.y)
      ctx.stroke()
    }
    
    // 绘制节点
    for (let i = 0; i < grid.nodes.length; i++) {
      const node = grid.nodes[i]
      
      ctx.beginPath()
      const size = node.pinned ? 3 : 2
      ctx.fillStyle = colors.nodeColor
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  // 绘制波纹
  const drawRipples = (ctx: CanvasRenderingContext2D) => {
    for (const ripple of ripplesRef.current) {
      ctx.beginPath()
      
      // 创建径向渐变
      const gradient = ctx.createRadialGradient(
        ripple.x, ripple.y, ripple.radius - 10,
        ripple.x, ripple.y, ripple.radius
      )
      
      gradient.addColorStop(0, `rgba(255, 107, 53, 0)`)
      gradient.addColorStop(0.5, colors.rippleColor.replace(')', `, ${ripple.life * 0.5})`))
      gradient.addColorStop(1, `rgba(255, 107, 53, 0)`)
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  
  // 动画循环
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = Math.min(30, timestamp - (timestamp || 0))
    
    // 清空画布
    ctx.fillStyle = theme === 'dark' ? colors.darkBg : colors.lightBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 更新物理
    updateGridPhysics(deltaTime)
    
    // 绘制网格
    drawGrid(ctx, canvas.width, canvas.height)
    
    // 绘制波纹
    drawRipples(ctx)
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
  }
  
  // 寻找最近的节点
  const findClosestNode = (x: number, y: number) => {
    const grid = gridRef.current
    let closestNode = null
    let closestDistance = Infinity
    
    for (let i = 0; i < grid.nodes.length; i++) {
      const node = grid.nodes[i]
      const dx = node.x - x
      const dy = node.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestNode = i
      }
    }
    
    return { index: closestNode, distance: closestDistance }
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
  
  // 监听鼠标交互
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 鼠标按下处理
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // 寻找最近的节点
      const { index, distance } = findClosestNode(x, y)
      
      if (distance < 30) {
        // 开始拖拽
        isDraggingRef.current = true
        dragNodeRef.current = index
        // 不固定拖拽节点
        gridRef.current.nodes[index].pinned = false
      } else {
        // 产生波纹
        createRipple(x, y, 10)
      }
    }
    
    // 鼠标移动处理
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && dragNodeRef.current !== null) {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        // 更新拖拽节点位置
        const node = gridRef.current.nodes[dragNodeRef.current]
        
        // 强制设置位置
        node.x = x
        node.y = y
        node.oldX = x
        node.oldY = y
      }
    }
    
    // 鼠标释放处理
    const handleMouseUp = () => {
      if (isDraggingRef.current && dragNodeRef.current !== null) {
        const node = gridRef.current.nodes[dragNodeRef.current]
        
        // 添加波纹效果
        createRipple(node.x, node.y, 5)
        
        // 停止拖拽
        isDraggingRef.current = false
        dragNodeRef.current = null
      }
    }
    
    // 添加事件监听
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    // 清理事件监听
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
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
    
    // 初始化波纹数组
    ripplesRef.current = []
    
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
