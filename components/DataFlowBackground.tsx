'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// 定义雨滴粒子
interface RainDrop {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  life: number
  maxLife: number
}

// 定义网格节点
interface GridNode {
  x: number
  y: number
  baseX: number
  baseY: number
  distortion: number
  phase: number
  frequency: number
  glitchTime: number
  lastGlitch: number
}

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
  const nodesRef = useRef<GridNode[]>([])
  const raindropsRef = useRef<RainDrop[]>([])
  const timeRef = useRef(0)
  const rotationRef = useRef(0)
  const glitchIntensityRef = useRef(0)
  
  // 颜色配置 - 酸性风格
  const colors = {
    primary: '#4B0082',    // 靛蓝色
    secondary: '#00FFFF',  // 青色
    accent1: '#FF00FF',    // 品红
    accent2: '#39FF14',    // 荧光绿
  }
  
  // 初始化网格
  const initGrid = (width: number, height: number) => {
    const nodes: GridNode[] = []
    const gridSize = Math.max(width, height) > 1000 ? 70 : 60
    
    // 计算行列数，确保覆盖整个屏幕并有余量
    const cols = Math.floor(width / gridSize) + 4
    const rows = Math.floor(height / gridSize) + 4
    
    // 创建扭曲网格节点
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = j * gridSize - gridSize
        const y = i * gridSize - gridSize
        
        nodes.push({
          x, y,
          baseX: x,
          baseY: y,
          distortion: Math.random() * 15 + 5,  // 扭曲强度
          phase: Math.random() * Math.PI * 2,  // 初始相位
          frequency: Math.random() * 0.02 + 0.01, // 波浪频率
          glitchTime: Math.random() * 5 + 3,   // 故障效果时间间隔
          lastGlitch: 0                        // 上次故障时间
        })
      }
    }
    
    return nodes
  }
  
  // 初始化雨滴
  const initRaindrops = (count: number) => {
    const drops: RainDrop[] = []
    
    for (let i = 0; i < count; i++) {
      drops.push(createRaindrop(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height
      ))
    }
    
    return drops
  }
  
  // 创建新雨滴
  const createRaindrop = (x: number, y: number): RainDrop => {
    return {
      x,
      y,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 80 + 40,
      opacity: Math.random() * 0.7 + 0.3,
      life: 0,
      maxLife: Math.random() * 1 + 0.5  // 0.5-1.5秒寿命
    }
  }
  
  // 动画循环
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = Math.min((time - timeRef.current) / 1000, 0.1) // 限制最大增量
    timeRef.current = time
    
    // 旋转角度随时间变化
    rotationRef.current += deltaTime * 0.05
    
    // 随机故障强度变化
    if (Math.random() < 0.01) {
      glitchIntensityRef.current = Math.random() * 0.15
    } else {
      glitchIntensityRef.current *= 0.95
    }
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 设置全局透明度
    const globalAlpha = theme === 'dark' ? 1 : 0.8
    ctx.globalAlpha = globalAlpha
    
    // 保存当前画布状态
    ctx.save()
    
    // 应用旋转变换 - 以画布中心为轴心
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rotationRef.current)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    
    // 绘制扭曲网格
    drawDistortedGrid(ctx, deltaTime)
    
    // 恢复画布状态
    ctx.restore()
    
    // 更新并绘制雨滴
    updateAndDrawRaindrops(ctx, deltaTime)
    
    // 应用整体故障效果
    if (glitchIntensityRef.current > 0.05) {
      applyGlitchEffect(ctx)
    }
    
    // 循环动画
    requestRef.current = requestAnimationFrame(animate)
  }
  
  // 绘制扭曲网格
  const drawDistortedGrid = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const nodes = nodesRef.current
    const mousePos = mousePosition
    const time = timeRef.current / 1000
    
    // 更新节点位置和状态
    nodes.forEach(node => {
      // 计算扭曲
      node.phase += node.frequency * deltaTime * 2
      
      // 检查是否应该触发故障效果
      node.lastGlitch += deltaTime
      if (node.lastGlitch > node.glitchTime) {
        node.lastGlitch = 0
        // 10%概率在这个节点触发雨滴
        if (Math.random() < 0.1) {
          raindropsRef.current.push(createRaindrop(node.x, node.y))
        }
      }
    })
    
    // 绘制垂直线
    for (let col = 0; col < Math.sqrt(nodes.length); col++) {
      for (let row = 0; row < Math.sqrt(nodes.length) - 1; row++) {
        const index1 = row * Math.sqrt(nodes.length) + col
        const index2 = (row + 1) * Math.sqrt(nodes.length) + col
        
        if (index1 < nodes.length && index2 < nodes.length) {
          const node1 = nodes[index1]
          const node2 = nodes[index2]
          
          // 计算扭曲位置
          const x1 = node1.baseX + Math.sin(node1.phase + time) * node1.distortion
          const y1 = node1.baseY + Math.cos(node1.phase + time * 0.7) * node1.distortion
          const x2 = node2.baseX + Math.sin(node2.phase + time) * node2.distortion
          const y2 = node2.baseY + Math.cos(node2.phase + time * 0.7) * node2.distortion
          
          // 更新节点实际位置
          node1.x = x1
          node1.y = y1
          node2.x = x2
          node2.y = y2
          
          // 设置线条渐变
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
          gradient.addColorStop(0, colors.primary)
          gradient.addColorStop(1, colors.secondary)
          
          ctx.beginPath()
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1
          ctx.globalAlpha = theme === 'dark' ? 0.5 : 0.3
          
          // 应用RGB分离效果
          if (Math.random() < 0.3 * glitchIntensityRef.current) {
            // 红色通道偏移
            ctx.strokeStyle = '#FF0000'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1 + 2, y1)
            ctx.lineTo(x2 + 2, y2)
            ctx.stroke()
            
            // 绿色通道偏移
            ctx.strokeStyle = '#00FF00'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            
            // 蓝色通道偏移
            ctx.strokeStyle = '#0000FF'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1 - 2, y1)
            ctx.lineTo(x2 - 2, y2)
            ctx.stroke()
          } else {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        }
      }
    }
    
    // 绘制水平线
    for (let row = 0; row < Math.sqrt(nodes.length); row++) {
      for (let col = 0; col < Math.sqrt(nodes.length) - 1; col++) {
        const index1 = row * Math.sqrt(nodes.length) + col
        const index2 = row * Math.sqrt(nodes.length) + col + 1
        
        if (index1 < nodes.length && index2 < nodes.length) {
          const node1 = nodes[index1]
          const node2 = nodes[index2]
          
          // 计算扭曲位置
          const x1 = node1.x
          const y1 = node1.y
          const x2 = node2.x
          const y2 = node2.y
          
          // 设置线条渐变
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
          gradient.addColorStop(0, colors.accent1)
          gradient.addColorStop(1, colors.accent2)
          
          ctx.beginPath()
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1
          ctx.globalAlpha = theme === 'dark' ? 0.5 : 0.3
          
          // 应用RGB分离效果
          if (Math.random() < 0.3 * glitchIntensityRef.current) {
            // 红色通道偏移
            ctx.strokeStyle = '#FF0000'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1, y1 + 2)
            ctx.lineTo(x2, y2 + 2)
            ctx.stroke()
            
            // 绿色通道偏移
            ctx.strokeStyle = '#00FF00'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            
            // 蓝色通道偏移
            ctx.strokeStyle = '#0000FF'
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(x1, y1 - 2)
            ctx.lineTo(x2, y2 - 2)
            ctx.stroke()
          } else {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        }
      }
    }
    
    // 绘制节点
    nodes.forEach(node => {
      // 只绘制部分节点，减少视觉杂乱
      if (Math.random() < 0.3) {
        ctx.beginPath()
        ctx.fillStyle = theme === 'dark' ? colors.secondary : colors.primary
        ctx.globalAlpha = theme === 'dark' ? 0.7 : 0.5
        
        // 为节点添加发光效果
        ctx.shadowBlur = 5
        ctx.shadowColor = colors.secondary
        
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
        
        // 重置阴影
        ctx.shadowBlur = 0
      }
    })
  }
  
  // 更新并绘制雨滴粒子
  const updateAndDrawRaindrops = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const drops = raindropsRef.current
    
    // 更新雨滴状态
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]
      
      // 更新生命周期
      drop.life += deltaTime
      
      // 如果超过生命周期，移除
      if (drop.life >= drop.maxLife) {
        drops.splice(i, 1)
        continue
      }
      
      // 更新位置
      drop.y += drop.speed * deltaTime
      
      // 如果超出屏幕，移除
      if (drop.y > dimensions.height + 20) {
        drops.splice(i, 1)
        continue
      }
      
      // 计算生命周期百分比
      const lifePercent = drop.life / drop.maxLife
      
      // 在生命周期开始和结束时渐隐
      const alpha = drop.opacity * 
        (lifePercent < 0.2 ? lifePercent * 5 : 
         lifePercent > 0.8 ? (1 - lifePercent) * 5 : 1)
      
      // 绘制雨滴
      ctx.beginPath()
      ctx.fillStyle = colors.secondary
      ctx.globalAlpha = alpha
      
      // 雨滴形状 - 上小下大的水滴形
      ctx.beginPath()
      ctx.moveTo(drop.x, drop.y - drop.size * 2)
      ctx.bezierCurveTo(
        drop.x - drop.size, drop.y - drop.size,
        drop.x - drop.size, drop.y + drop.size,
        drop.x, drop.y + drop.size
      )
      ctx.bezierCurveTo(
        drop.x + drop.size, drop.y + drop.size,
        drop.x + drop.size, drop.y - drop.size,
        drop.x, drop.y - drop.size * 2
      )
      
      // 添加发光效果
      ctx.shadowBlur = drop.size * 3
      ctx.shadowColor = colors.secondary
      
      ctx.fill()
      
      // 重置阴影
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }
    
    // 每帧随机添加新雨滴
    if (Math.random() < 0.1) {
      drops.push(createRaindrop(
        Math.random() * dimensions.width,
        -10 // 在屏幕顶部上方
      ))
    }
  }
  
  // 应用全局故障效果
  const applyGlitchEffect = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 获取画布数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // 随机选择几行应用像素偏移
    const linesCount = Math.floor(canvas.height * 0.15 * glitchIntensityRef.current)
    
    for (let i = 0; i < linesCount; i++) {
      // 随机选择一行
      const y = Math.floor(Math.random() * canvas.height)
      
      // 随机偏移量
      const offset = Math.floor(Math.random() * 30 - 15)
      
      // 应用横向偏移
      const rowOffset = y * canvas.width * 4
      
      if (offset > 0) {
        // 向右偏移
        for (let x = canvas.width - 1; x >= offset; x--) {
          const destIndex = rowOffset + x * 4
          const srcIndex = rowOffset + (x - offset) * 4
          
          data[destIndex] = data[srcIndex]         // R
          data[destIndex + 1] = data[srcIndex + 1] // G
          data[destIndex + 2] = data[srcIndex + 2] // B
          data[destIndex + 3] = data[srcIndex + 3] // A
        }
      } else if (offset < 0) {
        // 向左偏移
        for (let x = 0; x < canvas.width + offset; x++) {
          const destIndex = rowOffset + x * 4
          const srcIndex = rowOffset + (x - offset) * 4
          
          data[destIndex] = data[srcIndex]         // R
          data[destIndex + 1] = data[srcIndex + 1] // G
          data[destIndex + 2] = data[srcIndex + 2] // B
          data[destIndex + 3] = data[srcIndex + 3] // A
        }
      }
    }
    
    // 应用修改
    ctx.putImageData(imageData, 0, 0)
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
    
    // 点击效果 - 触发故障和雨滴
    const handleClick = (e: MouseEvent) => {
      // 增加故障强度
      glitchIntensityRef.current = Math.min(glitchIntensityRef.current + 0.3, 0.5)
      
      // 在点击位置添加多个雨滴
      for (let i = 0; i < 8; i++) {
        raindropsRef.current.push(createRaindrop(
          e.clientX + (Math.random() * 40 - 20),
          e.clientY + (Math.random() * 40 - 20)
        ))
      }
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
  
  // 初始化和动画处理
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化网格
    nodesRef.current = initGrid(dimensions.width, dimensions.height)
    
    // 初始化雨滴
    raindropsRef.current = initRaindrops(20)
    
    // 开始动画循环
    requestRef.current = requestAnimationFrame(animate)
    
    // 清理
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions])

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
