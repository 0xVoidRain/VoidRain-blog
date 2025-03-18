'use client'

import React, { useEffect, useRef, useState } from 'react'

interface DataStream {
  points: { x: number; y: number }[]
  width: number
  speed: number
  color: string
  offset: number
  direction: number
  layer: number
}

export default function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [scrollSpeed, setScrollSpeed] = useState(0)
  const lastScrollY = useRef(0)
  const requestRef = useRef<number | null>(null)
  const dataStreamsRef = useRef<DataStream[]>([])

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

  // 监听滚动速度
  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastScrollPosition = window.scrollY
    let lastScrollTime = performance.now()
    
    const handleScroll = () => {
      const currentTime = performance.now()
      const timeDelta = currentTime - lastScrollTime
      if (timeDelta > 0) {
        const scrollDelta = Math.abs(window.scrollY - lastScrollPosition)
        const newScrollSpeed = Math.min(scrollDelta / timeDelta * 10, 5)
        setScrollSpeed(newScrollSpeed)
        
        lastScrollPosition = window.scrollY
        lastScrollTime = currentTime
        
        // 缓慢减少滚动速度
        setTimeout(() => setScrollSpeed((prev) => prev * 0.9), 100)
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 鼠标位置跟踪
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

  // 初始化数据流
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    
    // 创建不同层次的数据流
    const createDataStreams = () => {
      const streams: DataStream[] = []
      
      // 创建三层不同速度的数据流
      const layerConfig = [
        { count: 8, speed: 0.8, color: '#00FF9D' }, // 荧光绿
        { count: 10, speed: 1, color: '#7B2FFF' },  // 紫色
        { count: 6, speed: 1.2, color: '#2A0F47' }  // 深空紫
      ]
      
      layerConfig.forEach((config, layerIndex) => {
        for (let i = 0; i < config.count; i++) {
          const width = Math.random() * 1.5 + 0.5
          const direction = Math.random() > 0.5 ? 1 : -1
          
          // 创建折线流
          const points = []
          let x = Math.random() * dimensions.width
          let y = Math.random() * dimensions.height
          
          // 每条流生成5-8个点的折线
          const segmentCount = Math.floor(Math.random() * 4) + 5
          
          for (let j = 0; j < segmentCount; j++) {
            points.push({ 
              x, 
              y 
            })
            
            // 锐角转折
            const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25
            const distance = Math.random() * 100 + 50
            
            x += Math.cos(angle) * distance
            y += Math.sin(angle) * distance
          }
          
          streams.push({
            points,
            width,
            speed: config.speed,
            color: config.color,
            offset: Math.random() * 100,
            direction,
            layer: layerIndex
          })
        }
      })
      
      return streams
    }
    
    dataStreamsRef.current = createDataStreams()
  }, [dimensions])

  // 渲染动画
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    
    let progress = 0
    let turbulence = 0
    
    const render = () => {
      progress += 0.01
      
      // 随时间增加湍流度
      turbulence = Math.min(turbulence + scrollSpeed * 0.01, 5)
      // 缓慢减少湍流度
      turbulence *= 0.99
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // 在鼠标位置添加光晕效果
      if (mousePosition) {
        const gradient = ctx.createRadialGradient(
          mousePosition.x, mousePosition.y, 0,
          mousePosition.x, mousePosition.y, 150
        )
        gradient.addColorStop(0, 'rgba(0, 255, 157, 0.2)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(mousePosition.x, mousePosition.y, 150, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // 渲染所有数据流
      dataStreamsRef.current.forEach(stream => {
        const { points, width, speed, color, offset, layer } = stream
        
        ctx.beginPath()
        ctx.lineWidth = width
        
        // 创建渐变描边
        if (layer === 0) {
          ctx.strokeStyle = '#00FF9D' // 荧光绿
          ctx.shadowColor = '#00FF9D'
          ctx.shadowBlur = 5
        } else if (layer === 1) {
          ctx.strokeStyle = '#7B2FFF' // 紫色
          ctx.shadowColor = '#7B2FFF'
          ctx.shadowBlur = 3
        } else {
          ctx.strokeStyle = '#2A0F47' // 深空紫
          ctx.shadowColor = '#2A0F47'
          ctx.shadowBlur = 2
        }
        
        // 应用复杂的流体动画效果
        for (let i = 0; i < points.length - 1; i++) {
          const startPoint = points[i]
          const endPoint = points[i + 1]
          
          // 计算湍流偏移
          const flowTime = progress * speed + offset
          const turbulenceAmount = turbulence + (layer === 0 ? 1.5 : layer === 1 ? 1 : 0.5)
          
          // 计算鼠标交互影响
          let mouseInfluence = { x: 0, y: 0 }
          
          if (mousePosition) {
            const distX = mousePosition.x - startPoint.x
            const distY = mousePosition.y - startPoint.y
            const dist = Math.sqrt(distX * distX + distY * distY)
            
            if (dist < 200) {
              const power = (1 - dist / 200) * 15
              mouseInfluence = {
                x: (distX / dist) * power,
                y: (distY / dist) * power
              }
            }
          }
          
          // 施加波动效果
          const waveX1 = Math.sin(flowTime + i * 0.3) * turbulenceAmount + mouseInfluence.x
          const waveY1 = Math.cos(flowTime + i * 0.2) * turbulenceAmount + mouseInfluence.y
          
          const waveX2 = Math.sin(flowTime + (i+1) * 0.3) * turbulenceAmount + mouseInfluence.x
          const waveY2 = Math.cos(flowTime + (i+1) * 0.2) * turbulenceAmount + mouseInfluence.y
          
          // 应用贝塞尔曲线创建流畅的流动效果
          const midX = (startPoint.x + endPoint.x) / 2
          const midY = (startPoint.y + endPoint.y) / 2
          
          if (i === 0) {
            ctx.moveTo(startPoint.x + waveX1, startPoint.y + waveY1)
          }
          
          // 锐角转折（在湍流增加时更加明显）
          if (turbulence > 2) {
            // 锐角折线
            ctx.lineTo(midX + waveX1 * 1.5, midY + waveY1 * 1.5)
            ctx.lineTo(endPoint.x + waveX2, endPoint.y + waveY2)
          } else {
            // 平滑曲线
            ctx.quadraticCurveTo(
              midX + waveX1 * 1.5, 
              midY + waveY1 * 1.5,
              endPoint.x + waveX2, 
              endPoint.y + waveY2
            )
          }
        }
        
        ctx.stroke()
        
        // 添加流动粒子
        if (layer === 0 || layer === 1) {
          const particleCount = Math.floor(points.length / 2) + 1
          for (let i = 0; i < particleCount; i++) {
            const pointIndex = Math.floor(i * (points.length - 1) / (particleCount - 1))
            const point = points[pointIndex]
            
            // 粒子位置加入波动和鼠标影响
            const flowTime = progress * speed * 1.5 + offset
            const waveX = Math.sin(flowTime + pointIndex * 0.3) * turbulence
            const waveY = Math.cos(flowTime + pointIndex * 0.2) * turbulence
            
            let mouseInfluence = { x: 0, y: 0 }
            if (mousePosition) {
              const distX = mousePosition.x - point.x
              const distY = mousePosition.y - point.y
              const dist = Math.sqrt(distX * distX + distY * distY)
              
              if (dist < 200) {
                const power = (1 - dist / 200) * 20
                mouseInfluence = {
                  x: (distX / dist) * power,
                  y: (distY / dist) * power
                }
              }
            }
            
            const particleX = point.x + waveX + mouseInfluence.x
            const particleY = point.y + waveY + mouseInfluence.y
            
            // 绘制粒子
            ctx.fillStyle = layer === 0 ? '#00FF9D' : '#7B2FFF'
            ctx.beginPath()
            ctx.arc(particleX, particleY, width * 1.5, 0, Math.PI * 2)
            ctx.fill()
            
            // 粒子光晕
            const glow = ctx.createRadialGradient(
              particleX, particleY, 0,
              particleX, particleY, width * 4
            )
            glow.addColorStop(0, layer === 0 ? 'rgba(0, 255, 157, 0.6)' : 'rgba(123, 47, 255, 0.6)')
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            
            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(particleX, particleY, width * 4, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
      
      requestRef.current = requestAnimationFrame(render)
    }
    
    render()
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [dimensions, mousePosition, scrollSpeed])

  if (typeof window === 'undefined') return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: -1,
        opacity: 0.6,
        filter: `blur(${Math.min(scrollSpeed * 0.5, 1)}px)`,
      }}
    />
  )
}
