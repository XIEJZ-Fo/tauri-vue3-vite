<!-- src\components\background.vue -->
<template>
  <div class="background-container">
    <!-- 三色混色动态渐变背景 -->
    <div 
      class="gradient-layer current" 
      :style="{ backgroundImage: currentGradient }"
    ></div>
    <div 
      class="gradient-layer next" 
      :style="{ backgroundImage: nextGradient, opacity: showNextGradient ? 1 : 0 }"
    ></div>

    <!-- 破碎镜面Canvas -->
    <canvas 
      ref="mirrorCanvas" 
      class="mirror-canvas"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// ========== 核心变量 ==========
let gradientTimer: number | null = null
let isTransitioning = false
const currentGradient = ref('')
const nextGradient = ref('')
const showNextGradient = ref(false)

const mirrorCanvas = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let animationFrameId: number | null = null
let isCanvasReady = ref(false)

// 破碎镜面速度配置
const mirrorSpeedConfig = {
  baseSpeed: 1.2,          
  moveAmplification: 1.2,  
  bounceDamping: 0.95,     
  speedTweakAmplitude: 0.05,
  maxSpeedLimit: 0.6,      
  fpsLimit: 16 
}

interface Point {
  x: number
  y: number
  vx: number
  vy: number
  isOuter: boolean
}

const currentPoints = ref<Point[]>([])

// ========== 固定三色：黑 + 浅灰 + 深灰 ==========
const MIX_COLORS = ['#000000', '#636262', '#313030']

// 生成三色混合渐变
const generateMixGradient = () => {
  const [c1, c2, c3] = MIX_COLORS
  const angle = Math.floor(Math.random() * 360)
  const p1 = Math.floor(Math.random() * 20)
  const p2 = Math.floor(Math.random() * 40) + 30
  const p3 = Math.floor(Math.random() * 20) + 80
  return `linear-gradient(${angle}deg, ${c1} ${p1}%, ${c2} ${p2}%, ${c3} ${p3}%)`
}

// 渐变切换
const switchGradient = () => {
  if (isTransitioning) return
  isTransitioning = true
  nextGradient.value = generateMixGradient()
  showNextGradient.value = true
  setTimeout(() => {
    currentGradient.value = nextGradient.value
    showNextGradient.value = false
    isTransitioning = false
  }, 1500)
}

// 初始化渐变
const initGradient = () => {
  currentGradient.value = generateMixGradient()
  gradientTimer = setInterval(switchGradient, 6500)
}

// ========== 点集生成 ==========
const generateRandomPoints = (width: number, height: number, innerCount: number): Point[] => {
  const points: Point[] = []
  const edgePointCount = 15
  for (let i = 1; i < edgePointCount; i++) {
    points.push({ x: (width / edgePointCount) * i, y: 0, vx: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, vy: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, isOuter: true })
    points.push({ x: width, y: (height / edgePointCount) * i, vx: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, vy: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, isOuter: true })
    points.push({ x: (width / edgePointCount) * i, y: height, vx: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, vy: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, isOuter: true })
    points.push({ x: 0, y: (height / edgePointCount) * i, vx: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, vy: (Math.random() - 0.5) * mirrorSpeedConfig.baseSpeed, isOuter: true })
  }
  for (let i = 0; i < innerCount; i++) {
    points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      isOuter: false
    })
  }
  return points
}

const generatePoints = async (width: number, height: number): Promise<Point[]> => {
  return generateRandomPoints(width, height, 60)
}

// ========== 三角网格计算 ==========
const distance = (p1: Point, p2: Point) => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

const calculateDelaunayTriangles = (points: Point[]): Point[][] => {
  const triangles: Point[][] = []
  const pointCount = points.length
  const usedPairs = new Set<string>()
  
  for (let i = 0; i < pointCount; i++) {
    const p1 = points[i]
    let closest1: Point | null = null, closest2: Point | null = null
    let minDist1 = Infinity, minDist2 = Infinity
    
    for (let j = 0; j < pointCount; j++) {
      if (i === j) continue
      const p2 = points[j]
      const dist = distance(p1, p2)
      
      if (dist < minDist1) {
        minDist2 = minDist1
        closest2 = closest1
        minDist1 = dist
        closest1 = p2
      } else if (dist < minDist2) {
        minDist2 = dist
        closest2 = p2
      }
    }
    
    if (closest1 && closest2) {
      const getPointKey = (p: Point) => `${p.x}-${p.y}`
      const triangleKey = [getPointKey(p1), getPointKey(closest1), getPointKey(closest2)].sort().join('-')
      if (!usedPairs.has(triangleKey)) {
        usedPairs.add(triangleKey)
        triangles.push([p1, closest1, closest2])
      }
    }
  }
  return triangles
}

// ========== 点动画 ==========
const updatePoints = (width: number, height: number) => {
  if (!currentPoints.value.length || !isCanvasReady.value) return
  currentPoints.value.forEach(point => {
    if (point.isOuter) {
      point.x += point.vx * mirrorSpeedConfig.moveAmplification
      point.y += point.vy * mirrorSpeedConfig.moveAmplification
      
      if (point.x <= 0 || point.x >= width) {
        point.vx *= -mirrorSpeedConfig.bounceDamping
        point.x = Math.max(0, Math.min(width, point.x))
      }
      if (point.y <= 0 || point.y >= height) {
        point.vy *= -mirrorSpeedConfig.bounceDamping
        point.y = Math.max(0, Math.min(height, point.y))
      }
      
      if (Math.random() < 0.005) {
        point.vx += (Math.random() - 0.5) * mirrorSpeedConfig.speedTweakAmplitude
        point.vy += (Math.random() - 0.5) * mirrorSpeedConfig.speedTweakAmplitude
        point.vx = Math.max(-mirrorSpeedConfig.maxSpeedLimit, Math.min(mirrorSpeedConfig.maxSpeedLimit, point.vx))
        point.vy = Math.max(-mirrorSpeedConfig.maxSpeedLimit, Math.min(mirrorSpeedConfig.maxSpeedLimit, point.vy))
      }
    }
  })
}

// ========== 绘制破碎镜面 ==========
const drawBrokenMirror = () => {
  if (!mirrorCanvas.value || !isCanvasReady.value) return
  
  const canvas = mirrorCanvas.value
  const dpr = window.devicePixelRatio || 1 
  const width = window.innerWidth
  const height = window.innerHeight
  
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)
  
  if (!currentPoints.value.length) return
  const triangles = calculateDelaunayTriangles(currentPoints.value)
  
  // 白色半透明破碎效果
  const fillColor = 'rgba(255, 255, 255, 0.05)'
  const strokeColor = 'rgba(255, 255, 255, 0.2)'
  
  triangles.forEach(tri => {
    const [p1, p2, p3] = tri
    const strokeWidth = 0.8 
    
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()
    
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.stroke()
  })
}

// ========== 主循环动画 ==========
let lastFrameTime = 0
const animate = (timestamp: number) => {
  if (timestamp - lastFrameTime < mirrorSpeedConfig.fpsLimit) {
    animationFrameId = requestAnimationFrame(animate)
    return
  }
  lastFrameTime = timestamp
  
  if (!isCanvasReady.value) {
    animationFrameId = requestAnimationFrame(animate)
    return
  }
  
  const width = window.innerWidth
  const height = window.innerHeight
  updatePoints(width, height)
  drawBrokenMirror()
  
  animationFrameId = requestAnimationFrame(animate)
}

// ========== 窗口自适应 ==========
const handleResize = async () => {
  if (!isCanvasReady.value) return
  clearTimeout((window as any).resizeTimer)
  ;(window as any).resizeTimer = setTimeout(async () => {
    const width = window.innerWidth
    const height = window.innerHeight
    currentPoints.value = await generatePoints(width, height)
    nextTick(() => drawBrokenMirror())
  }, 100)
}

// ========== 生命周期 ==========
onMounted(async () => {
  // 初始化三色渐变
  initGradient()

  await nextTick()
  if (mirrorCanvas.value) {
    isCanvasReady.value = true
    const width = window.innerWidth
    const height = window.innerHeight
    currentPoints.value = await generatePoints(width, height)
    drawBrokenMirror()
    animationFrameId = requestAnimationFrame(animate)
  }
  
  window.addEventListener('resize', handleResize)
  resizeObserver = new ResizeObserver(() => handleResize())
  if (mirrorCanvas.value) {
    resizeObserver.observe(mirrorCanvas.value)
  }
})

onUnmounted(() => {
  if (gradientTimer) clearInterval(gradientTimer)
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) resizeObserver.disconnect()
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  isCanvasReady.value = false
  currentPoints.value = []
})
</script>

<style scoped>
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}

.gradient-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-size: 200% 200%;
  background-position: center;
  animation: gradientMove 8s ease infinite alternate;
  transition: opacity 1.5s ease-in-out !important;
}

@keyframes gradientMove {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

.gradient-layer.current {
  opacity: 1;
}

.gradient-layer.next {
  opacity: 0;
}

.mirror-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
  opacity: 0.85;
}
</style>