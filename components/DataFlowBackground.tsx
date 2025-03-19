'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DataFlowBackground() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>()
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  
  // 状态和引用
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  
  const timeRef = useRef(0)
  const gridRef = useRef<{
    nodes: any[],
    resolution: number,
    stiffness: number,
    damping: number,
    propagation: number,
    flowSpeed: number,
    flowScale: number,
    interactionRadius: number
  }>({
    nodes: [],
    resolution: 24,  // 网格分辨率（节点间距）
    stiffness: 0.3,  // 网格刚性（0-1）
    damping: 0.85,   // 阻尼因子
    propagation: 0.4, // 变形传播系数
    flowSpeed: 0.002, // 流动速度
    flowScale: 15,    // 流动幅度比例
    interactionRadius: 150 // 交互影响半径
  })
  
  // 鼠标状态
  const mouseRef = useRef<{
    position: {x: number, y: number} | null,
    isDown: boolean,
    dragging: {index: number, offsetX: number, offsetY: number} | null,
  }>({
    position: null,
    isDown: false,
    dragging: null
  })
  
  // 颜色配置
  const colors = {
    // 冷暖对比色系
    primary: 'rgba(0, 247, 255, 0.8)', // 主色-青色
    secondary: 'rgba(255, 107, 53, 0.7)', // 辅色-橙色
    tertiary: 'rgba(149, 0, 255, 0.6)', // 第三色-紫色
    darkBg: 'rgba(10, 15, 25, 0.97)',
    lightBg: 'rgba(245, 248, 250, 0.97)'
  }
  
  // 创建流体网格
  const createFluidGrid = (width: number, height: number, resolution: number) => {
    const nodes = []
    
    // 计算网格尺寸
    const cols = Math.ceil(width / resolution) + 1
    const rows = Math.ceil(height / resolution) + 1
    
    // 创建网格节点
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const posX = x * resolution
        const posY = y * resolution
        
        nodes.push({
          x: posX,                  // 当前x位置
          y: posY,                  // 当前y位置
          baseX: posX,              // 基础x位置
          baseY: posY,              // 基础y位置
          vx: 0,                    // x方向速度
          vy: 0,                    // y方向速度
          forceX: 0,                // x方向受力
          forceY: 0,                // y方向受力
          phase: Math.random() * Math.PI * 2,  // 随机相位
          speed: 0.5 + Math.random() * 0.5,    // 随机速度
          flowOffset: Math.random() * 100,     // 流体偏移
          mass: 1,                  // 质量
          isFixed: false,           // 是否固定
          isControlPoint: false,    // 是否为控制点
          col: x,                   // 列索引
          row: y,                   // 行索引
          connections: []           // 连接的节点索引
        })
      }
    }
    
    // 建立节点连接关系
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const { col, row } = node
      
      // 连接相邻的节点（上、右、下、左）
      const connections = []
      
      // 上方节点
      if (row > 0) {
        connections.push(i - cols)
      }
      
      // 右侧节点
      if (col < cols - 1) {
        connections.push(i + 1)
      }
      
      // 下方节点
      if (row < rows - 1) {
        connections.push(i + cols)
      }
      
      // 左侧节点
      if (col > 0) {
        connections.push(i - 1)
      }
      
      // 存储连接关系
      node.connections = connections
    }
    
    // 设置边界节点为固定点以保持整体稳定
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const { col, row } = node
      
      // 边界节点
      if (col === 0 || col === cols - 1 || row === 0 || row === rows - 1) {
        node.isFixed = true
      }
      
      // 随机设置一些控制点（用于复杂变形）
      if (Math.random() < 0.03 && !node.isFixed) {
        node.isControlPoint = true
      }
    }
    
    return nodes
  }
  
  // 使用径向基函数(RBF)计算节点影响
  const applyRadialInfluence = (nodeIndex: number, force: {x: number, y: number}, radius: number) => {
    const nodes = gridRef.current.nodes
    const sourceNode = nodes[nodeIndex]
    
    for (let i = 0; i < nodes.length; i++) {
      if (i === nodeIndex) continue
      
      const node = nodes[i]
      const dx = node.x - sourceNode.x
      const dy = node.y - sourceNode.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < radius) {
        // 计算径向影响力（基于距离的衰减）
        const influence = (1 - distance / radius) ** 2 * gridRef.current.propagation
        
        // 应用力
        node.forceX += force.x * influence
        node.forceY += force.y * influence
      }
    }
  }
  
  // 流体网格更新
  const updateFluidGrid = (deltaTime: number) => {
    const { nodes, stiffness, damping, flowSpeed, flowScale } = gridRef.current
    const timestamp = timeRef.current
    
    // 模拟物理运动
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      if (node.isFixed) continue // 跳过固定节点
      
      // 弹簧力（将节点拉回基础位置）
      node.forceX = (node.baseX - node.x) * stiffness
      node.forceY = (node.baseY - node.y) * stiffness
      
      // 流体运动力（使用简化的流体模拟）
      const flowX = Math.sin(timestamp * flowSpeed + node.flowOffset + node.x * 0.02) * flowScale
      const flowY = Math.cos(timestamp * flowSpeed + node.flowOffset + node.y * 0.01) * flowScale * 0.5
      
      node.forceX += flowX
      node.forceY += flowY
    }
    
    // 处理节点间的连接关系（像布料一样）
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      if (node.isFixed) continue
      
      // 连接节点间的相互影响
      for (const connIdx of node.connections) {
        const connectedNode = nodes[connIdx]
        const dx = connectedNode.x - node.x
        const dy = connectedNode.y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const baseDistance = Math.sqrt(
          (connectedNode.baseX - node.baseX) ** 2 +
          (connectedNode.baseY - node.baseY) ** 2
        )
        
        // 如果当前距离与基础距离不同，施加力使其恢复
        if (Math.abs(distance - baseDistance) > 0.1) {
          const forceMagnitude = (distance - baseDistance) * 0.1
          const forceX = (dx / distance) * forceMagnitude
          const forceY = (dy / distance) * forceMagnitude
          
          if (!connectedNode.isFixed) {
            connectedNode.forceX += forceX
            connectedNode.forceY += forceY
          }
          
          node.forceX -= forceX
          node.forceY -= forceY
        }
      }
    }
    
    // 鼠标交互影响
    if (mouseRef.current.position && mouseRef.current.isDown && !mouseRef.current.dragging) {
      const { x, y } = mouseRef.current.position
      const radius = gridRef.current.interactionRadius
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.isFixed) continue
        
        const dx = node.x - x
        const dy = node.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < radius) {
          const influence = (1 - distance / radius) ** 2 * 20
          const angle = Math.atan2(dy, dx)
          
          node.forceX += Math.cos(angle) * influence
          node.forceY += Math.sin(angle) * influence
        }
      }
    }
    
    // 拖拽节点处理
    if (mouseRef.current.dragging) {
      const { index, offsetX, offsetY } = mouseRef.current.dragging
      const mousePos = mouseRef.current.position
      
      if (mousePos) {
        const node = nodes[index]
        
        // 直接设置拖拽节点位置
        node.x = mousePos.x - offsetX
        node.y = mousePos.y - offsetY
        node.vx = 0
        node.vy = 0
        
        // 对周围节点施加影响
        applyRadialInfluence(
          index, 
          { x: 0, y: 0 }, // 拖拽时不需要额外力，位置已直接设置
          gridRef.current.interactionRadius * 1.5
        )
      }
    }
    
    // 更新节点位置
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      if (node.isFixed || (mouseRef.current.dragging && mouseRef.current.dragging.index === i)) {
        continue
      }
      
      // 应用物理引擎计算
      // 速度 = 速度 + 加速度（力/质量）
      node.vx += node.forceX / node.mass
      node.vy += node.forceY / node.mass
      
      // 应用阻尼（摩擦力）
      node.vx *= damping
      node.vy *= damping
      
      // 更新位置
      node.x += node.vx * deltaTime * 0.1
      node.y += node.vy * deltaTime * 0.1
      
      // 重置力
      node.forceX = 0
      node.forceY = 0
    }
  }
  
  // 绘制流体网格
  const drawFluidGrid = (ctx: CanvasRenderingContext2D) => {
    const { nodes } = gridRef.current
    const isDark = theme === 'dark'
    
    // 绘制连接线
    ctx.strokeStyle = isDark ? colors.primary : 'rgba(0, 100, 255, 0.4)'
    ctx.lineWidth = 1
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      for (const connIdx of node.connections) {
        // 只绘制"向右"和"向下"的连接，避免重复
        if (connIdx > i) {
          const connectedNode = nodes[connIdx]
          
          // 计算线条颜色（基于节点距离）
          const baseDistance = Math.sqrt(
            (connectedNode.baseX - node.baseX) ** 2 +
            (connectedNode.baseY - node.baseY) ** 2
          )
          const currentDistance = Math.sqrt(
            (connectedNode.x - node.x) ** 2 +
            (connectedNode.y - node.y) ** 2
          )
          
          // 颜色变化反映变形程度
          const distanceRatio = currentDistance / baseDistance
          let color
          
          if (distanceRatio > 1.1) {
            // 拉伸状态 - 使用第三色（紫色）
            const alpha = Math.min(0.8, (distanceRatio - 1.1) * 2)
            color = colors.tertiary.replace('0.6', alpha.toString())
          } else if (distanceRatio < 0.9) {
            // 压缩状态 - 使用辅色（橙色）
            const alpha = Math.min(0.8, (0.9 - distanceRatio) * 2)
            color = colors.secondary.replace('0.7', alpha.toString())
          } else {
            // 正常状态 - 使用主色（青色）
            color = colors.primary
          }
          
          ctx.strokeStyle = color
          
          // 绘制连接线
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(connectedNode.x, connectedNode.y)
          ctx.stroke()
        }
      }
    }
    
    // 绘制节点
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      // 控制点或拖拽点使用更明显的样式
      if (node.isControlPoint || (mouseRef.current.dragging && mouseRef.current.dragging.index === i)) {
        ctx.fillStyle = isDark ? colors.secondary : 'rgba(255, 107, 53, 0.9)'
        ctx.beginPath()
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2)
        ctx.fill()
      } else if (!node.isFixed) {
        // 普通节点
        ctx.fillStyle = isDark ? 'rgba(0, 247, 255, 0.5)' : 'rgba(0, 100, 255, 0.3)'
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  
  // 查找最近的节点
  const findClosestNode = (x: number, y: number) => {
    const nodes = gridRef.current.nodes
    let closestIdx = -1
    let closestDist = Infinity
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      if (node.isFixed) continue // 忽略固定节点
      
      const dx = node.x - x
      const dy = node.y - y
      const dist = dx * dx + dy * dy
      
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    }
    
    // 只有在足够近的情况下才返回节点
    return closestDist < 400 ? closestIdx : -1
  }
  
  // 动画循环
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    
    if (!canvas || !ctx) return
    
    // 计算时间增量
    const deltaTime = timestamp - (timeRef.current || timestamp)
    timeRef.current = timestamp
    
    // 清空画布
    const isDark = theme === 'dark'
    ctx.fillStyle = isDark ? colors.darkBg : colors.lightBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 更新流体网格
    updateFluidGrid(deltaTime)
    
    // 绘制流体网格
    drawFluidGrid(ctx)
    
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
  
  // 鼠标事件处理
  useEffect(() => {
    if (typeof window === 'undefined' || !canvasRef.current) return
    
    const canvas = canvasRef.current
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      mouseRef.current.position = { x, y }
    }
    
    const handleMouseDown = (e: MouseEvent) => {
      if (!mouseRef.current.position) return
      
      mouseRef.current.isDown = true
      
      // 查找最近的节点进行拖拽
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const nodeIndex = findClosestNode(x, y)
      
      if (nodeIndex >= 0) {
        const node = gridRef.current.nodes[nodeIndex]
        mouseRef.current.dragging = {
          index: nodeIndex,
          offsetX: x - node.x,
          offsetY: y - node.y
        }
      }
    }
    
    const handleMouseUp = () => {
      mouseRef.current.isDown = false
      mouseRef.current.dragging = null
    }
    
    const handleMouseLeave = () => {
      mouseRef.current.position = null
      mouseRef.current.isDown = false
      mouseRef.current.dragging = null
    }
    
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])
  
  // 初始化和动画启动
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 获取上下文
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    contextRef.current = ctx
    
    // 创建流体网格
    const gridResolution = Math.max(15, Math.min(24, dimensions.width / 60))
    gridRef.current.resolution = gridResolution
    gridRef.current.nodes = createFluidGrid(dimensions.width, dimensions.height, gridResolution)
    
    // 开始动画循环
    requestRef.current = requestAnimationFrame(animate)
    
    // 清理
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, theme])

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
        cursor: mouseRef.current?.dragging ? 'grabbing' : 'default'
      }}
    />
  )
}
