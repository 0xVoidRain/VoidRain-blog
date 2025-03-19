'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

interface GridNode {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  energy: number
  active: boolean
  speed: number
  phase: number
}

// 修改为雨滴接口
interface RainDrop {
  x: number
  y: number
  length: number      // 雨滴长度
  width: number       // 雨滴宽度
  speed: number       // 下落速度
  angle: number       // 下落角度
  opacity: number
  life: number
  maxLife: number
  color: string
}

interface FlowLine {
  points: { x: number; y: number; age: number }[]
  width: number
  colorRatio: number
  speed: number
  opacity: number
  maxPoints: number
  headSize: number
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
  
  // 动画状态引用 - 将burstsRef改为rainDropsRef
  const nodesRef = useRef<GridNode[]>([])
  const linesRef = useRef<FlowLine[]>([])
  const rainDropsRef = useRef<RainDrop[]>([])
  const timeRef = useRef(0)
  const rotationRef = useRef(0)
  const glitchTimeRef = useRef(0)
  const glitchActiveRef = useRef(false)
  
  // 颜色配置 - 酸性霓虹色
  const colors = {
    primary: '#4D1EC8',    // 深蓝紫
    secondary: '#9000FF',  // 紫色
    accent1: '#00F8FF',    // 青蓝
    accent2: '#00FF94'     // 荧光绿
  }
  
  // 获取渐变色
  const getGradientColor = (ratio: number) => {
    // 在4种颜色之间平滑过渡
    const colorValues = Object.values(colors)
    const idx = Math.floor(ratio * (colorValues.length - 1))
    const nextIdx = Math.min(colorValues.length - 1, idx + 1)
    const localRatio = (ratio * (colorValues.length - 1)) - idx
    
    const color1 = colorValues[idx]
    const color2 = colorValues[nextIdx]
    
    // 解析颜色
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)
    
    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)
    
    // 计算过渡颜色
    const r = Math.round(r1 + (r2 - r1) * localRatio)
    const g = Math.round(g1 + (g2 - g1) * localRatio)
    const b = Math.round(b1 + (b2 - b1) * localRatio)
    
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // 初始化扭曲网格
  const initGrid = (width: number, height: number) => {
    const nodes: GridNode[] = []
    const gridSize = Math.max(width, height) > 1000 ? 80 : 60
    
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
    const count = Math.min(Math.floor(width * height / 40000), 20)
    
    for (let i = 0; i < count; i++) {
      const line = {
        points: [],
        width: Math.random() * 1.5 + 0.5,
        colorRatio: Math.random(),  // 渐变色比例
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.3 + 0.4,
        maxPoints: Math.floor(Math.random() * 40) + 40,
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
  
  // 新增：添加雨滴
  const addRainDrop = (x: number, y: number) => {
    const colorRatio = Math.random()
    const color = getGradientColor(colorRatio)
    const maxLife = Math.random() * 100 + 100
    
    rainDropsRef.current.push({
      x,
      y,
      length: Math.random() * 15 + 10,  // 雨滴长度
      width: Math.random() * 3 + 1,     // 雨滴宽度
      speed: Math.random() * 3 + 1,     // 下落速度
      angle: Math.PI / 2 + (Math.random() - 0.5) * 0.3, // 基本垂直，略有偏移
      opacity: Math.random() * 0.5 + 0.5,
      life: 0,
      maxLife,
      color
    })
    
    // 随机生成新雨滴
    if (Math.random() < 0.3 && rainDropsRef.current.length < 100) {
      const offsetX = (Math.random() - 0.5) * 150
      const offsetY = (Math.random() - 0.5) * 150
      setTimeout(() => {
        addRainDrop(x + offsetX, y + offsetY)
      }, Math.random() * 300)
    }
  }
  
  // 添加缺失的函数: 更新网格节点
  const updateNodes = (deltaTime: number) => {
    const nodes = nodesRef.current
    const time = timeRef.current
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    
    nodes.forEach(node => {
      // 更新相位
      node.phase += node.speed * deltaTime
      
      // 计算到中心的距离和方向
      const dx = node.baseX - centerX
      const dy = node.baseY - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
      const distRatio = dist / maxDist
      
      // 扭曲因子 - 螺旋状
      const spiralFactor = (1 - distRatio) * 30
      const angle = Math.atan2(dy, dx) + rotationRef.current * (1 - distRatio)
      
      // 计算扭曲后的位置
      const offsetX = Math.sin(node.phase + time / 1000) * 10 * (1 - distRatio)
      const offsetY = Math.cos(node.phase + time / 1000) * 10 * (1 - distRatio)
      
      node.x = node.baseX + Math.cos(angle) * spiralFactor + offsetX
      node.y = node.baseY + Math.sin(angle) * spiralFactor + offsetY
      
      // 如果有鼠标位置，计算鼠标影响
      if (mousePosition) {
        const mdx = mousePosition.x - node.x
        const mdy = mousePosition.y - node.y
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)
        const influenceRadius = 200
        
        if (mouseDist < influenceRadius) {
          const influenceFactor = (1 - mouseDist / influenceRadius) * 0.5
          node.energy = Math.min(1, node.energy + influenceFactor * 0.1)
          node.active = true
          
          // 随机触发光爆粒子
          if (Math.random() < influenceFactor * 0.02) {
            addRainDrop(node.x, node.y)
          }
        } else {
          node.energy = Math.max(0.1, node.energy - 0.01 * deltaTime)
          node.active = false
        }
      } else {
        node.energy = Math.max(0.1, node.energy - 0.01 * deltaTime)
        node.active = false
      }
      
      // 随机触发光爆
      if (Math.random() < 0.0002) {
        addRainDrop(node.x, node.y)
      }
    })
  }
  
  // 添加缺失的函数: 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const nodes = nodesRef.current
    const isDark = theme === 'dark'
    
    // 设置基本样式
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 绘制线条
    for (let i = 0; i < nodes.length; i++) {
      const node1 = nodes[i]
      
      for (let j = i + 1; j < nodes.length; j++) {
        const node2 = nodes[j]
        
        // 只连接相邻的节点
        const dx = Math.abs(node1.baseX - node2.baseX)
        const dy = Math.abs(node1.baseY - node2.baseY)
        
        if (dx <= 100 && dy <= 100) {
          // 计算能量平均值和距离
          const energy = (node1.energy + node2.energy) / 2
          const distance = Math.sqrt(
            (node1.x - node2.x) * (node1.x - node2.x) +
            (node1.y - node2.y) * (node1.y - node2.y)
          )
          
          // 只绘制能量高或距离近的连接
          if (energy > 0.2 || distance < 80) {
            const opacity = Math.min(0.4, energy * (1 - distance / 150))
            
            if (opacity > 0.02) {
              const color = getGradientColor(energy)
              ctx.strokeStyle = color
              ctx.globalAlpha = opacity
              ctx.lineWidth = 0.5 + energy
              
              // 绘制扭曲线条
              ctx.beginPath()
              ctx.moveTo(node1.x, node1.y)
              
              // 使用贝塞尔曲线增加扭曲感
              const midX = (node1.x + node2.x) / 2
              const midY = (node1.y + node2.y) / 2
              const offset = Math.sin(timeRef.current / 1000 + (node1.phase + node2.phase) / 2) * 10 * energy
              
              ctx.quadraticCurveTo(
                midX + offset,
                midY + offset,
                node2.x,
                node2.y
              )
              
              ctx.stroke()
            }
          }
        }
      }
    }
    
    // 绘制节点
    nodes.forEach(node => {
      const size = node.size * (1 + node.energy)
      
      if (node.active) {
        ctx.globalAlpha = node.energy * 0.8
        ctx.fillStyle = getGradientColor(node.energy)
        ctx.shadowBlur = size * 3
        ctx.shadowColor = getGradientColor(node.energy)
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.shadowBlur = 0
      } else if (node.energy > 0.2) {
        ctx.globalAlpha = node.energy * 0.5
        ctx.fillStyle = getGradientColor(node.energy)
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    
    ctx.globalAlpha = 1
  }
  
  // 添加缺失的函数: 更新流线
  const updateFlowLines = (deltaTime: number) => {
    const lines = linesRef.current
    const nodes = nodesRef.current
    
    lines.forEach(line => {
      const points = line.points
      const lastPoint = points[points.length - 1]
      
      // 更新所有点的年龄
      for (let i = 0; i < points.length; i++) {
        points[i].age += deltaTime
      }
      
      // 如果最后一个点过老，添加新点
      if (points.length < line.maxPoints && lastPoint.age > 1) {
        // 计算下一个点的方向
        let dirX = 0
        let dirY = 0
        
        // 如果有足够的点，使用最后几个点确定方向
        if (points.length >= 3) {
          const p1 = points[points.length - 3]
          const p2 = points[points.length - 2]
          const p3 = points[points.length - 1]
          
          // 使用后两个点的方向
          dirX = (p3.x - p2.x) + (p2.x - p1.x) * 0.5
          dirY = (p3.y - p2.y) + (p2.y - p1.y) * 0.5
          
          // 标准化方向向量
          const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
          dirX = dirX / len * line.speed * deltaTime * 15
          dirY = dirY / len * line.speed * deltaTime * 15
        } else {
          // 如果点不够，使用随机方向
          const angle = Math.random() * Math.PI * 2
          dirX = Math.cos(angle) * line.speed * deltaTime * 15
          dirY = Math.sin(angle) * line.speed * deltaTime * 15
        }
        
        // 寻找最近的网格节点并受其影响
        let closestNode = null
        let closestDist = Infinity
        
        for (const node of nodes) {
          if (node.energy > 0.3) {
            const dx = node.x - lastPoint.x
            const dy = node.y - lastPoint.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist < closestDist && dist < 200) {
              closestDist = dist
              closestNode = node
            }
          }
        }
        
        // 如果有近的节点，调整方向
        if (closestNode) {
          const influence = Math.min(1, 0.5 / (closestDist / 100))
          dirX = dirX * (1 - influence) + (closestNode.x - lastPoint.x) * influence * 0.1
          dirY = dirY * (1 - influence) + (closestNode.y - lastPoint.y) * influence * 0.1
        }
        
        // 添加新点
        points.push({
          x: lastPoint.x + dirX,
          y: lastPoint.y + dirY,
          age: 0
        })
        
        // 如果线超出边界，重置到新位置
        const point = points[points.length - 1]
        if (
          point.x < -50 || point.x > dimensions.width + 50 ||
          point.y < -50 || point.y > dimensions.height + 50
        ) {
          // 清空点
          points.length = 0
          
          // 随机新起点
          const startX = Math.random() * dimensions.width
          const startY = Math.random() * dimensions.height
          
          // 初始化新点
          for (let j = 0; j < 3; j++) {
            points.push({
              x: startX,
              y: startY,
              age: j * 2
            })
          }
        }
      }
      
      // 如果点太多，删除最老的
      if (points.length > line.maxPoints) {
        points.shift()
      }
    })
  }
  
  // 绘制流线
  const drawFlowLines = (ctx: CanvasRenderingContext2D) => {
    const lines = linesRef.current
    
    lines.forEach(line => {
      const points = line.points
      
      if (points.length < 2) return
      
      // 获取流线颜色
      const color = getGradientColor(line.colorRatio)
      
      // 绘制流线
      ctx.strokeStyle = color
      ctx.lineWidth = line.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = line.opacity
      
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      
      ctx.stroke()
      
      // 绘制头部
      const head = points[points.length - 1]
      ctx.globalAlpha = line.opacity * 1.5
      ctx.fillStyle = color
      ctx.shadowBlur = line.headSize * 3
      ctx.shadowColor = color
      
      ctx.beginPath()
      ctx.arc(head.x, head.y, line.headSize, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.shadowBlur = 0
    })
    
    ctx.globalAlpha = 1
  }
  
  // 添加缺失的函数: 更新雨滴
  const updateRainDrops = (deltaTime: number) => {
    rainDropsRef.current.forEach((drop, i) => {
      // 更新生命周期
      drop.life += deltaTime
      
      // 根据角度更新位置
      drop.y += Math.cos(drop.angle) * drop.speed * deltaTime
      drop.x += Math.sin(drop.angle) * drop.speed * deltaTime
      
      // 临近生命周期结束时降低透明度
      if (drop.life > drop.maxLife * 0.7) {
        drop.opacity = Math.max(0, drop.opacity - 0.01 * deltaTime)
      }
    })
    
    // 移除死亡的雨滴
    rainDropsRef.current = rainDropsRef.current.filter(drop => drop.life < drop.maxLife)
    
    // 随机添加新雨滴
    if (Math.random() < 0.05 && rainDropsRef.current.length < 50) {
      const x = Math.random() * dimensions.width
      const y = Math.random() * dimensions.height * 0.3 // 主要在上方生成
      addRainDrop(x, y)
    }
  }
  
  // 绘制雨滴
  const drawRainDrops = (ctx: CanvasRenderingContext2D) => {
    rainDropsRef.current.forEach(drop => {
      const lifeRatio = drop.life / drop.maxLife
      
      // 保存当前状态
      ctx.save()
      
      // 移动到雨滴位置
      ctx.translate(drop.x, drop.y)
      ctx.rotate(drop.angle) // 旋转到下落角度
      
      // 设置绘制样式
      ctx.globalAlpha = drop.opacity * (1 - lifeRatio)
      
      // 创建雨滴渐变
      const gradient = ctx.createLinearGradient(0, -drop.length/2, 0, drop.length/2)
      gradient.addColorStop(0, `${drop.color}00`) // 透明顶部
      gradient.addColorStop(0.2, drop.color)      // 实色中部
      gradient.addColorStop(1, `${drop.color}80`) // 半透明尾部
      
      ctx.fillStyle = gradient
      ctx.shadowColor = drop.color
      ctx.shadowBlur = 5
      
      // 绘制雨滴形状 - 使用贝塞尔曲线创建水滴形状
      ctx.beginPath()
      
      // 顶部圆弧
      ctx.arc(0, -drop.length/2, drop.width/2, 0, Math.PI, true)
      
      // 右侧曲线
      ctx.bezierCurveTo(
        drop.width/2, -drop.length/4,
        drop.width/2, drop.length/3,
        0, drop.length/2
      )
      
      // 左侧曲线
      ctx.bezierCurveTo(
        -drop.width/2, drop.length/3,
        -drop.width/2, -drop.length/4,
        0, -drop.length/2
      )
      
      ctx.fill()
      ctx.restore()
    })
  }
  
  // 应用故障艺术效果
  const applyGlitchEffect = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // RGB通道错位
    const channelShift = Math.floor(Math.random() * 8) - 4
    const glitchY = Math.floor(Math.random() * height)
    const glitchHeight = Math.floor(Math.random() * 100) + 50
    
    for (let y = glitchY; y < glitchY + glitchHeight && y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        
        // 检查像素边界
        if (x + channelShift < width && x + channelShift >= 0) {
          const targetIndex = (y * width + (x + channelShift)) * 4
          
          // 交换红色通道
          const temp = data[i]
          data[i] = data[targetIndex]
          data[targetIndex] = temp
        }
      }
    }
    
    // 像素撕裂
    const tearCount = Math.floor(Math.random() * 5) + 3
    for (let t = 0; t < tearCount; t++) {
      const tearY = Math.floor(Math.random() * height)
      const tearHeight = Math.floor(Math.random() * 10) + 5
      const tearShift = Math.floor(Math.random() * 30) - 15
      
      for (let y = tearY; y < tearY + tearHeight && y < height; y++) {
        for (let x = 0; x < width; x++) {
          const targetX = x + tearShift
          
          if (targetX >= 0 && targetX < width) {
            const sourceIndex = (y * width + x) * 4
            const targetIndex = (y * width + targetX) * 4
            
            // 复制像素
            data[targetIndex] = data[sourceIndex]
            data[targetIndex + 1] = data[sourceIndex + 1]
            data[targetIndex + 2] = data[sourceIndex + 2]
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }
  
  // 动画循环
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = Math.min(30, time - (timeRef.current || time))
    timeRef.current = time
    
    // 更新旋转角度
    rotationRef.current = (rotationRef.current + deltaTime * 0.0001) % (Math.PI * 2)
    
    // 故障效果计时
    glitchTimeRef.current += deltaTime
    
    // 每隔一段时间触发故障效果
    if (glitchTimeRef.current > 3000 && Math.random() < 0.01) {
      glitchActiveRef.current = true
      setTimeout(() => {
        glitchActiveRef.current = false
      }, 200)
      glitchTimeRef.current = 0
    }
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 更新和绘制网格节点
    updateNodes(deltaTime)
    drawGrid(ctx)
    
    // 更新和绘制流线
    updateFlowLines(deltaTime)
    drawFlowLines(ctx)
    
    // 更新和绘制雨滴
    updateRainDrops(deltaTime)
    drawRainDrops(ctx)
    
    // 应用故障效果
    if (glitchActiveRef.current) {
      applyGlitchEffect(ctx, canvas.width, canvas.height)
    }
    
    // 继续动画循环
    requestRef.current = requestAnimationFrame(animate)
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
  
  // 鼠标处理 - 修改为添加雨滴
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      
      // 移动鼠标时偶尔添加雨滴
      if (Math.random() < 0.1) {
        addRainDrop(e.clientX, e.clientY)
      }
    }
    
    const handleMouseLeave = () => {
      setMousePosition(null)
    }
    
    const handleClick = (e: MouseEvent) => {
      // 点击时创建多个雨滴
      for (let i = 0; i < 8; i++) {
        const offsetX = (Math.random() - 0.5) * 60
        const offsetY = (Math.random() - 0.5) * 60
        addRainDrop(e.clientX + offsetX, e.clientY + offsetY)
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
  
  // 初始化和动画处理 - 更新为雨滴初始化
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化网格、流线和雨滴
    nodesRef.current = initGrid(dimensions.width, dimensions.height)
    linesRef.current = initFlowLines(dimensions.width, dimensions.height)
    rainDropsRef.current = []
    
    // 初始化一些雨滴
    for (let i = 0; i < 20; i++) {
      addRainDrop(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height * 0.7
      )
    }
    
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
