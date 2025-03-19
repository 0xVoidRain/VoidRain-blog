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
  const linesRef = useRef<any[]>([])
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
  
  // 更新雨滴
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
  
  // 修改动画循环以包含雨滴更新和绘制
  const animate = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = Math.min(30, time - (timeRef.current || time))
    timeRef.current = time
    
    // 更新旋转角度
    rotationRef.current = (rotationRef.current + deltaTime * 0.05) % (Math.PI * 2)
    
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
  
  // 绘制扭曲网格
  const drawDistortedGrid = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const nodes = nodesRef.current
    const time = timeRef.current
    
    // 网格连接距离阈值
    const connectionThreshold = 150
    const mouseRadius = 200
    
    // 更新节点位置和状态
    nodes.forEach((node, index) => {
      // 螺旋波动效应
      const spiralFactor = 0.3
      const distortionFactor = 15
      
      // 基于当前旋转角度和节点相对位置计算螺旋扭曲
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      const distToCenter = Math.sqrt((node.baseX - centerX) ** 2 + (node.baseY - centerY) ** 2)
      const angleToCenter = Math.atan2(node.baseY - centerY, node.baseX - centerX)
      
      // 计算旋转和扭曲
      const rotatedAngle = angleToCenter + rotationRef.current * (1 - distToCenter / Math.max(dimensions.width, dimensions.height))
      const spiralDist = distToCenter * (1 + Math.sin(time * 0.0005 + index * 0.05) * spiralFactor)
      
      // 应用波浪扭曲
      const waveX = Math.sin(time * 0.001 + node.phase + node.baseY * 0.01) * distortionFactor
      const waveY = Math.cos(time * 0.001 + node.phase + node.baseX * 0.01) * distortionFactor
      
      // 更新节点位置
      node.x = centerX + Math.cos(rotatedAngle) * spiralDist + waveX
      node.y = centerY + Math.sin(rotatedAngle) * spiralDist + waveY
      
      // 检查鼠标交互
      if (mousePosition) {
        const dx = mousePosition.x - node.x
        const dy = mousePosition.y - node.y
        const distToMouse = Math.sqrt(dx * dx + dy * dy)
        
        if (distToMouse < mouseRadius) {
          const influenceFactor = 1 - distToMouse / mouseRadius
          node.energy = Math.min(1, node.energy + influenceFactor * deltaTime * 2)
          node.active = true
          
          // 随机触发光爆粒子
          if (Math.random() < influenceFactor * 0.02) {
            addRainDrop(node.x, node.y)
          }
        } else {
          node.active = false
          node.energy = Math.max(0, node.energy - deltaTime * 0.5)
        }
      } else {
        node.active = false
        node.energy = Math.max(0, node.energy - deltaTime * 0.5)
      }
      
      // 随机触发光爆
      if (Math.random() < 0.0002) {
        addRainDrop(node.x, node.y)
      }
    })
    
    // 绘制网格连接
    ctx.lineWidth = 0.5
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i]
      
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j]
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < connectionThreshold) {
          // 计算两个节点的平均能量和距离衰减
          const avgEnergy = (nodeA.energy + nodeB.energy) * 0.5
          const opacity = (1 - dist / connectionThreshold) * avgEnergy * 0.8
          
          if (opacity > 0.05) {
            // 根据距离和能量计算渐变比例
            const gradientRatio = (dist / connectionThreshold + time * 0.0001) % 1
            const color = getGradientColor(gradientRatio)
            
            ctx.strokeStyle = color
            ctx.globalAlpha = opacity
            ctx.beginPath()
            ctx.moveTo(nodeA.x, nodeA.y)
            
            // 添加扭曲曲线
            const controlX = (nodeA.x + nodeB.x) / 2 + Math.sin(time * 0.001 + i * 0.1) * 20
            const controlY = (nodeA.y + nodeB.y) / 2 + Math.cos(time * 0.001 + j * 0.1) * 20
            
            ctx.quadraticCurveTo(controlX, controlY, nodeB.x, nodeB.y)
            ctx.stroke()
          }
        }
      }
    }
    
    // 绘制节点
    nodes.forEach(node => {
      if (node.energy > 0.1) {
        const size = node.size * (1 + node.energy * 2)
        ctx.globalAlpha = node.energy * 0.8
        ctx.fillStyle = node.active ? colors.accent2 : colors.accent1
        
        // 绘制辉光效果
        ctx.shadowBlur = size * 3
        ctx.shadowColor = node.active ? colors.accent2 : colors.accent1
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.shadowBlur = 0
      }
    })
    
    ctx.globalAlpha = 1
  }
  
  // 绘制流线
  const drawFlowLines = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const lines = linesRef.current
    const nodes = nodesRef.current
    const time = timeRef.current
    
    lines.forEach(line => {
      // 更新线条颜色 - 缓慢变化
      line.colorRatio = (line.colorRatio + deltaTime * 0.1) % 1
      
      // 更新流线位置
      if (line.points.length > 0) {
        // 获取最后一个点
        const lastPoint = line.points[line.points.length - 1]
        
        // 增加点的年龄
        line.points.forEach(point => {
          point.age += deltaTime
        })
        
        // 移除年龄过大的点
        while (line.points.length > 0 && line.points[0].age > 10) {
          line.points.shift()
        }
        
        // 添加新的点
        if (line.points.length > 0) {
          // 计算方向向量 - 受周围节点影响
          let dirX = Math.cos(time * 0.0002 + line.colorRatio * Math.PI * 2) * line.speed
          let dirY = Math.sin(time * 0.0002 + line.colorRatio * Math.PI * 2) * line.speed
          
          // 寻找最近的节点
          let closestNode = null
          let closestDist = Infinity
          
          for (const node of nodes) {
            if (node.energy > 0.2) {
              const dx = node.x - lastPoint.x
              const dy = node.y - lastPoint.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              
              if (dist < closestDist && dist < 200) {
                closestDist = dist
                closestNode = node
              }
            }
          }
          
          // 受最近节点影响
          if (closestNode) {
            const influence = Math.min(1, 0.5 / (closestDist / 100))
            dirX = dirX * (1 - influence) + (closestNode.x - lastPoint.x) * influence * 0.1
            dirY = dirY * (1 - influence) + (closestNode.y - lastPoint.y) * influence * 0.1
          }
          
          // 添加新点
          const newX = lastPoint.x + dirX
          const newY = lastPoint.y + dirY
          
          // 检查是否越界
          if (newX < 0 || newX > dimensions.width || newY < 0 || newY > dimensions.height) {
            // 重新生成在可见区域内
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
            
            // 限制点的数量
            if (line.points.length > line.maxPoints) {
              line.points.shift()
            }
          }
        }
      }
      
      // 绘制线条
      if (line.points.length > 1) {
        // 使用渐变色
        const color = getGradientColor(line.colorRatio)
        
        ctx.beginPath()
        ctx.strokeStyle = color
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
        ctx.fillStyle = color
        ctx.shadowBlur = line.headSize * 2
        ctx.shadowColor = color
        ctx.arc(head.x, head.y, line.headSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    })
  }
  
  // 应用故障艺术效果
  const applyGlitchEffect = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // RGB通道错位
    const channelShift = Math.floor(Math.random() * 20) - 10
    
    // 应用于部分区域
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
