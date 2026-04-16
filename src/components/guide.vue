<!-- src\components\guide.vue -->
<template>
  <!-- 全局遮罩 -->
  <div v-if="showGuide" class="guide-overlay" @click.self="closeGuide">
    <!-- 引导步骤卡片 -->
    <div class="guide-card" :class="`guide-step-${currentStep}`">
      <!-- 步骤指示器：新增第4个步骤点 -->
      <div class="guide-steps">
        <div class="step-dot" :class="{ active: currentStep >= 2 }">1</div>
        <div class="step-line" :class="{ active: currentStep >= 3 }"></div>
        <div class="step-dot" :class="{ active: currentStep >= 3 }">2</div>
        <div class="step-line" :class="{ active: currentStep >= 4 }"></div>
        <div class="step-dot" :class="{ active: currentStep >= 4 }">3</div>
        <div class="step-line" :class="{ active: currentStep >= 5 }"></div>
        <div class="step-dot" :class="{ active: currentStep >= 5 }">4</div>
      </div>

      <!-- 步骤1：欢迎 -->
      <div v-if="currentStep === 1" class="guide-content">
        <h2>🎉 欢迎使用 TodoList 番茄钟工具</h2>
        <p>只需4步，带你快速掌握核心使用流程</p>
        <button class="guide-next-btn" @click="nextStep">开始体验</button>
      </div>

      <!-- 步骤2：创建待办事项 -->
      <div v-if="currentStep === 2" class="guide-content">
        <h2>📝 第一步：创建待办事项</h2>
        <p>点击下方按钮，创建你的第一个任务分类</p>
        <div class="guide-highlight">
          <button class="mock-btn" disabled>待办事项+</button>
        </div>
        <p class="guide-tip">点击后填写任务名称、描述、优先级等信息</p>
        <div class="guide-buttons">
          <button class="guide-back-btn" @click="prevStep">上一步</button>
          <button class="guide-next-btn" @click="nextStep">下一步</button>
        </div>
      </div>

      <!-- 步骤3：创建待办条目 -->
      <div v-if="currentStep === 3" class="guide-content">
        <h2>📋 第二步：创建待办条目</h2>
        <p>展开待办事项，点击添加具体的执行条目</p>
        <div class="guide-highlight">
          <button class="mock-btn" disabled>待办条目+</button>
        </div>
        <p class="guide-tip">条目是最小执行单位，用于开始番茄钟</p>
        <div class="guide-buttons">
          <button class="guide-back-btn" @click="prevStep">上一步</button>
          <button class="guide-next-btn" @click="nextStep">下一步</button>
        </div>
      </div>

      <!-- 步骤4：使用番茄钟 -->
      <div v-if="currentStep === 4" class="guide-content">
        <h2>⏰ 第三步：开始番茄钟</h2>
        <p>
          <strong>双击待办条目或点击开始按钮</strong>
          即可开始/结束番茄钟
        </p>
        <div class="guide-highlight">
          <div class="mock-task">双击条目开始 ⏱️</div>
        </div>
        <p class="guide-tip">也可以点击条目右侧的【开始/结束】按钮</p>
        <div class="guide-buttons">
          <button class="guide-back-btn" @click="prevStep">上一步</button>
          <button class="guide-next-btn" @click="nextStep">下一步</button>
        </div>
      </div>

      <!-- 🔥 步骤5：拖拽排序（新增步骤） -->
      <div v-if="currentStep === 5" class="guide-content">
        <h2>🖐️ 第四步：拖拽调整任务顺序</h2>
        <p>按住任务左侧的拖拽图标，即可上下拖动改变任务位置</p>
        <div class="guide-highlight">
          <div class="mock-drag-task">
            <span class="drag-icon">⋮⋮</span>
            拖动我调整顺序
          </div>
        </div>
        <p class="guide-tip">支持父任务、子任务自由拖拽排序，手动排序优先级最高</p>
        <div class="guide-buttons">
          <button class="guide-back-btn" @click="prevStep">上一步</button>
          <button class="guide-next-btn" @click="finishGuide">完成引导</button>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <button class="guide-close" @click="closeGuide" title="关闭引导">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 控制引导显示
const showGuide = ref(false)
// 当前步骤 1-5（修改为5步）
const currentStep = ref(1)

// 首次打开显示引导
onMounted(() => {
  const hasGuide = localStorage.getItem('hasShownGuide')
  if (!hasGuide) {
    showGuide.value = true
  }
})

// 下一步（修改上限为5）
const nextStep = () => {
  if (currentStep.value < 5) {
    currentStep.value++
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 完成引导
const finishGuide = () => {
  showGuide.value = false
  localStorage.setItem('hasShownGuide', 'true')
}

// 关闭引导
const closeGuide = () => {
  showGuide.value = false
  localStorage.setItem('hasShownGuide', 'true')
}

// 🔥 新增：暴露方法，允许外部主动开启引导
const openGuide = () => {
  currentStep.value = 1 // 重置到第一步
  showGuide.value = true
}
// 导出方法
defineExpose({
  openGuide
})

</script>

<style scoped>
/* 遮罩层 */
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

/* 引导卡片 */
.guide-card {
  background: rgba(28, 28, 36, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  padding: 32px 24px;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 步骤指示器 */
.guide-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: #80d9ff;
  color: #121212;
}

.step-line {
  width: 30px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.step-line.active {
  background: #80d9ff;
}

/* 内容区域 */
.guide-content {
  text-align: center;
  color: #fff;
}

.guide-content h2 {
  font-size: 22px;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.95);
}

.guide-content p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 20px;
  line-height: 1.5;
}

/* 高亮区域 */
.guide-highlight {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.mock-btn {
  padding: 10px 20px;
  background: rgba(107, 255, 162, 0.2);
  color: #6bffa2;
  border: 1px solid rgba(107, 255, 162, 0.3);
  border-radius: 8px;
  font-size: 14px;
  cursor: default;
}

.mock-task {
  padding: 12px 24px;
  background: rgba(128, 217, 255, 0.15);
  color: #80d9ff;
  border: 1px solid rgba(128, 217, 255, 0.4);
  border-radius: 8px;
  font-size: 15px;
  animation: pulse 1.5s infinite;
}

/* 🔥 新增：拖拽模拟样式 */
.mock-drag-task {
  padding: 12px 24px;
  background: rgba(128, 217, 255, 0.15);
  color: #80d9ff;
  border: 1px solid rgba(128, 217, 255, 0.4);
  border-radius: 8px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: pulse 1.5s infinite;
}
.mock-drag-task .drag-icon {
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* 提示文字 */
.guide-tip {
  font-size: 13px !important;
  color: rgba(255, 255, 255, 0.55) !important;
  font-style: italic;
}

/* 按钮组 */
.guide-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.guide-next-btn,
.guide-back-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.guide-next-btn {
  background: #80d9ff;
  color: #121212;
}

.guide-next-btn:hover {
  background: #6bc9ee;
}

.guide-back-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.guide-back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* 关闭按钮 */
.guide-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.guide-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>