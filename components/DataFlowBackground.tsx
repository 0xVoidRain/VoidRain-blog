'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DataFlowBackground() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>()
  const scrollYRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const glitchIntensityRef = useRef(0)
  
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  
  // 网格参数
  const gridRef = useRef({
    cells: [],
    size: 40,
    noiseScale: 0.04,
    glitchAreas: [],
    snowAreas: []
  })
  
  // 时间与噪音控制
  const timeRef = useRef(0)
  const noiseOffsetRef = useRef({
    x: Math.random() * 1000,
    y: Math.random() * 1000
  })
  
  // 颜色配置
  const colors = {
    primaryDark: '#00f0ff',      // 青色
    secondaryDark: '#ff00ff',    // 品红
    primaryLight: '#0080ff',     // 蓝色
    secondaryLight: '#ff2070',   // 暗粉
    glitchRed: '#ff2b4a',
    glitchGreen: '#00ff9f',
    glitchBlue: '#0080ff'
  }
  
  // 创建网格
  const createGrid = (width: number, height: number) => {
    const gridSize = Math.max(25, Math.min(40, width / 30))
    const cols = Math.ceil(width / gridSize) + 1
    const rows = Math.ceil(height / gridSize) + 1
    
    const cells = []
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        cells.push({
          x: x * gridSize,
          y: y * gridSize,
          baseX: x * gridSize,
          baseY: y * gridSize,
          broken: Math.random() < 0.1,                   // 10% 的单元格有断裂效果
          offset: Math.random() * 5,                     // 随机位移量
          offsetDirection: Math.random() * Math.PI * 2,  // 随机方向
          phase: Math.random() * Math.PI * 2,            // 随机相位
          speed: 0.2 + Math.random() * 0.3,              // 随机速度
          glitchStrength: 0,                             // 故障强度
          pixelSize: 1 + Math.random() * 3               // 像素块大小
        })
      }
    }
    
    // 创建故障区域
    const glitchAreas = []
    const snowAreas = []
    
    // 添加3-5个故障区域
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      glitchAreas.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 50 + Math.random() * 150,
        intensity: 0.5 + Math.random() * 0.5,
        speed: 0.001 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2
      })
    }
    
    // 添加2-4个雪花噪点区域
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      snowAreas.push({
        x: Math.random() * width,
        y: Math.random() * height,
        width: 100 + Math.random() * 200,
        height: 100 + Math.random() * 200,
        intensity: 0.3 + Math.random() * 0.7,
        speed: 0.01 + Math.random() * 0.02
      })
    }
    
    return {
      cells,
      size: gridSize,
      noiseScale: 0.04,
      glitchAreas,
      snowAreas
    }
  }
  
  // 简化的噪声函数
  const noise = (x: number, y: number) => {
    return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 
           Math.sin((x + y) * 0.05) +
           Math.cos(x * 0.06) * Math.sin(y * 0.12)
  }
  
  // 应用故障效果
  const applyGlitchEffect = (cell: any, time: number, scrollIntensity: number) => {
    // 基础位移
    const noiseValue = noise(
      cell.x * gridRef.current.noiseScale + timeRef.current * cell.speed,
      cell.y * gridRef.current.noiseScale + timeRef.current * cell.speed
    )
    
    const baseDisplacement = 2 + noiseValue * 3  // 基础位移量
    
    // 计算在故障区域中的影响
    let glitchMultiplier = 0
    gridRef.current.glitchAreas.forEach(area => {
      const dx = cell.x - area.x
      const dy = cell.y - area.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < area.radius) {
        const influence = 1 - distance / area.radius
        // 随时间变化的故障强度
        const timeInfluence = Math.sin(time * area.speed + area.phase) * 0.5 + 0.5
        glitchMultiplier += influence * area.intensity * timeInfluence
      }
    })
    
    // 加入滚动带来的额外故障因子
    glitchMultiplier += scrollIntensity * 2
    
    // 限制最大影响
    glitchMultiplier = Math.min(1, glitchMultiplier)
    
    // 最终位移计算
    const glitchDisplacement = baseDisplacement * glitchMultiplier * 5
    
    // 随机的断裂方向
    const glitchAngle = noise(
      cell.x * 0.01 + time * 0.1, 
      cell.y * 0.01 + time * 0.1
    ) * Math.PI * 2
    
    // 应用到单元格
    cell.glitchStrength = glitchMultiplier
    
    return {
      x: cell.x + Math.cos(glitchAngle) * glitchDisplacement * (cell.broken ? 3 : 1),
      y: cell.y + Math.sin(glitchAngle) * glitchDisplacement * (cell.broken ? 3 : 1)
    }
  }
  
  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, time: number, width: number, height: number, scrollIntensity: number) => {
    const isDark = theme === 'dark'
    const grid = gridRef.current
    const cells = grid.cells
    
    // 绘制网格线
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      
      // 应用故障效果
      const glitched = applyGlitchEffect(cell, time, scrollIntensity)
      
      // 绘制水平线
      if (i % 2 === 0 && cell.y < height && cell.x < width) {
        const nextCellX = cells[i + 1]
        if (nextCellX && nextCellX.y === cell.y) {
          const nextGlitched = applyGlitchEffect(nextCellX, time, scrollIntensity)
          
          // 绘制正常线
          ctx.beginPath()
          ctx.moveTo(glitched.x, glitched.y)
          
          // 如果是断裂的，画成像素块
          if (cell.broken || nextCellX.broken || cell.glitchStrength > 0.7 || Math.random() < scrollIntensity * 0.3) {
            // 像素化线条
            const lineLength = nextGlitched.x - glitched.x
            const pixelSize = cell.pixelSize * (1 + cell.glitchStrength * 3)
            const pixelCount = Math.floor(lineLength / pixelSize)
            
            for (let p = 0; p < pixelCount; p++) {
              // 只画一部分像素，制造断裂效果
              if (Math.random() > 0.3) {
                const pixelX = glitched.x + p * pixelSize
                const pixelY = glitched.y + (Math.random() - 0.5) * cell.glitchStrength * 10
                
                // 控制一些像素块的颜色偏移，形成RGB分离效果
                if (cell.glitchStrength > 0.5 && Math.random() < 0.3) {
                  const offsetX = (Math.random() - 0.5) * cell.glitchStrength * 10
                  const offsetY = (Math.random() - 0.5) * cell.glitchStrength * 6
                  
                  ctx.fillStyle = Math.random() < 0.33 
                    ? colors.glitchRed
                    : Math.random() < 0.5 
                      ? colors.glitchGreen 
                      : colors.glitchBlue
                  
                  ctx.fillRect(
                    pixelX + offsetX, 
                    pixelY + offsetY, 
                    pixelSize * (0.8 + Math.random() * 0.4), 
                    pixelSize * (0.8 + Math.random() * 0.4)
                  )
                } else {
                  // 普通像素
                  ctx.fillStyle = getGradientColor(cell.glitchStrength, isDark)
                  ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize)
                }
              }
            }
          } else {
            // 正常线条，带有渐变效果
            const gradient = ctx.createLinearGradient(glitched.x, glitched.y, nextGlitched.x, nextGlitched.y)
            gradient.addColorStop(0, getGradientColor(0, isDark))
            gradient.addColorStop(1, getGradientColor(nextCellX.glitchStrength, isDark))
            
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1 + cell.glitchStrength * 2
            ctx.lineTo(nextGlitched.x, nextGlitched.y)
            ctx.stroke()
          }
        }
      }
      
      // 绘制垂直线
      if (cell.x < width && cell.y < height) {
        const cellBelow = cells.find(c => 
          c.baseX === cell.baseX && 
          c.baseY === cell.baseY + grid.size
        )
        
        if (cellBelow) {
          const belowGlitched = applyGlitchEffect(cellBelow, time, scrollIntensity)
          
          // 绘制正常线
          ctx.beginPath()
          ctx.moveTo(glitched.x, glitched.y)
          
          // 如果是断裂的，画成像素块
          if (cell.broken || cellBelow.broken || cell.glitchStrength > 0.7 || Math.random() < scrollIntensity * 0.3) {
            // 像素化线条
            const lineLength = belowGlitched.y - glitched.y
            const pixelSize = cell.pixelSize * (1 + cell.glitchStrength * 3)
            const pixelCount = Math.floor(lineLength / pixelSize)
            
            for (let p = 0; p < pixelCount; p++) {
              // 只画一部分像素，制造断裂效果
              if (Math.random() > 0.3) {
                const pixelY = glitched.y + p * pixelSize
                const pixelX = glitched.x + (Math.random() - 0.5) * cell.glitchStrength * 10
                
                // RGB分离效果
                if (cell.glitchStrength > 0.5 && Math.random() < 0.3) {
                  const offsetX = (Math.random() - 0.5) * cell.glitchStrength * 10
                  const offsetY = (Math.random() - 0.5) * cell.glitchStrength * 6
                  
                  ctx.fillStyle = Math.random() < 0.33 
                    ? colors.glitchRed
                    : Math.random() < 0.5 
                      ? colors.glitchGreen 
                      : colors.glitchBlue
                  
                  ctx.fillRect(
                    pixelX + offsetX, 
                    pixelY + offsetY, 
                    pixelSize * (0.8 + Math.random() * 0.4), 
                    pixelSize * (0.8 + Math.random() * 0.4)
                  )
                } else {
                  // 普通像素
                  ctx.fillStyle = getGradientColor(cell.glitchStrength, isDark)
                  ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize)
                }
              }
            }
          } else {
            // 正常线条，带有渐变效果
            const gradient = ctx.createLinearGradient(glitched.x, glitched.y, belowGlitched.x, belowGlitched.y)
            gradient.addColorStop(0, getGradientColor(0, isDark))
            gradient.addColorStop(1, getGradientColor(cellBelow.glitchStrength, isDark))
            
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1 + cell.glitchStrength * 2
            ctx.lineTo(belowGlitched.x, belowGlitched.y)
            ctx.stroke()
          }
        }
      }
    }
  }
  
  // 获取渐变色
  const getGradientColor = (glitchStrength: number, isDark: boolean) => {
    const primary = isDark ? colors.primaryDark : colors.primaryLight
    const secondary = isDark ? colors.secondaryDark : colors.secondaryLight
    
    if (glitchStrength > 0.7) {
      // 强故障时使用更明亮的颜色
      return Math.random() < 0.5 ? colors.glitchGreen : colors.glitchBlue
    }
    
    // 混合颜色
    const mix = Math.sin(timeRef.current * 0.001) * 0.5 + 0.5
    return glitchStrength < 0.2 
      ? primary 
      : lerpColor(primary, secondary, mix * glitchStrength)
  }
  
  // 颜色插值
  const lerpColor = (color1: string, color2: string, amount: number) => {
    const r1 = parseInt(color1.substring(1, 3), 16)
    const g1 = parseInt(color1.substring(3, 5), 16)
    const b1 = parseInt(color1.substring(5, 7), 16)
    
    const r2 = parseInt(color2.substring(1, 3), 16)
    const g2 = parseInt(color2.substring(3, 5), 16)
    const b2 = parseInt(color2.substring(5, 7), 16)
    
    const r = Math.floor(r1 + (r2 - r1) * amount)
    const g = Math.floor(g1 + (g2 - g1) * amount)
    const b = Math.floor(b1 + (b2 - b1) * amount)
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  
  // 绘制雪花噪点
  const drawSnow = (ctx: CanvasRenderingContext2D, time: number, scrollIntensity: number) => {
    const areas = gridRef.current.snowAreas
    
    areas.forEach(area => {
      // 更新位置
      area.x += Math.sin(time * 0.001) * 0.5
      area.y += Math.cos(time * 0.001) * 0.5
      
      // 计算实际强度（考虑滚动影响）
      const actualIntensity = Math.min(1, area.intensity + scrollIntensity * 0.5)
      
      // 绘制雪花噪点
      ctx.save()
      
      // 模拟CSS clip-path效果
      ctx.beginPath()
      ctx.rect(area.x, area.y, area.width, area.height)
      ctx.clip()
      
      // 随机雪花噪点
      const pixelSize = 2 + scrollIntensity * 4
      const pixelsX = Math.ceil(area.width / pixelSize)
      const pixelsY = Math.ceil(area.height / pixelSize)
      
      for (let y = 0; y < pixelsY; y++) {
        for (let x = 0; x < pixelsX; x++) {
          // 根据噪声和时间决定是否绘制
          if (Math.random() < actualIntensity * 0.3) {
            const pixelX = area.x + x * pixelSize
            const pixelY = area.y + y * pixelSize
            
            // 随机颜色
            const brightness = 0.6 + Math.random() * 0.4
            ctx.fillStyle = Math.random() < 0.1 
              ? (Math.random() < 0.5 ? colors.glitchRed : colors.glitchBlue)
              : `rgba(255, 255, 255, ${brightness * actualIntensity})`
            
            ctx.fillRect(
              pixelX + (Math.random() - 0.5) * 4 * scrollIntensity, 
              pixelY + (Math.random() - 0.5) * 4 * scrollIntensity, 
              pixelSize * Math.random(), 
              pixelSize * Math.random()
            )
          }
        }
      }
      
      // 绘制闪烁线
      if (scrollIntensity > 0.2 || Math.random() < 0.05) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.beginPath()
        const lineY = area.y + Math.random() * area.height
        ctx.moveTo(area.x, lineY)
        ctx.lineTo(area.x + area.width, lineY)
        ctx.lineWidth = 1 + Math.random() * 2
        ctx.stroke()
      }
      
      ctx.restore()
    })
  }
  
  // 绘制全局故障效果
  const drawGlobalGlitch = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
    if (intensity <= 0) return
    
    // 绘制水平撕裂线
    const lineCount = Math.floor(intensity * 5)
    
    for (let i = 0; i < lineCount; i++) {
      const y = Math.random() * height
      const sliceHeight = 5 + Math.random() * 20
      const offsetX = (Math.random() - 0.5) * 20 * intensity
      
      // 复制并偏移图像区域
      ctx.drawImage(
        ctx.canvas,
        0, y, width, sliceHeight,
        offsetX, y, width, sliceHeight
      )
      
      // 随机添加RGB通道错位
      if (Math.random() < 0.3) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`
        ctx.fillRect(offsetX + 5, y, width, sliceHeight)
        
        ctx.fillStyle = `rgba(0, 255, 0, ${0.1 * intensity})`
        ctx.fillRect(offsetX - 5, y, width, sliceHeight)
        
        ctx.fillStyle = `rgba(0, 0, 255, ${0.1 * intensity})`
        ctx.fillRect(offsetX, y, width, sliceHeight)
      }
    }
    
    // 随机添加垂直扫描线
    if (Math.random() < intensity * 0.7) {
      const scanX = Math.random() * width
      const scanWidth = 1 + Math.random() * 3
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(scanX, 0, scanWidth, height)
    }
  }
  
  // 动画循环
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 计算时间增量
    const deltaTime = timestamp - (timeRef.current || timestamp)
    timeRef.current = timestamp
    
    // 更新滚动故障强度
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    const scrollDelta = Math.abs(scrollY - lastScrollYRef.current)
    lastScrollYRef.current = scrollY
    
    // 滚动超过阈值时增加故障
    if (scrollDelta > 10) {
      glitchIntensityRef.current = Math.min(1, glitchIntensityRef.current + scrollDelta * 0.01)
    } else {
      // 缓慢恢复
      glitchIntensityRef.current *= 0.95
    }
    
    // 清空画布
    const isDark = theme === 'dark'
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制网格
    drawGrid(ctx, timestamp, canvas.width, canvas.height, glitchIntensityRef.current)
    
    // 绘制雪花噪点区域
    drawSnow(ctx, timestamp, glitchIntensityRef.current)
    
    // 在严重故障时应用全局效果
    if (glitchIntensityRef.current > 0.2) {
      drawGlobalGlitch(ctx, canvas.width, canvas.height, glitchIntensityRef.current)
    }
    
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
  
  // 监听滚动
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleScroll = () => {
      scrollYRef.current = window.scrollY
      
      // 随机触发严重故障
      if (Math.abs(scrollYRef.current - lastScrollYRef.current) > 50) {
        glitchIntensityRef.current = 1
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // 初始化并启动动画
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 设置画布尺寸
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    // 初始化网格
    gridRef.current = createGrid(dimensions.width, dimensions.height)
    
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
