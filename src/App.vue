<!-- src/App.vue -->
<template>
  <div class="app-container">
    <!-- 背景组件 -->
    <Background />
    
    <!-- 自定义标题栏 -->
    <div class="title-bar" data-tauri-drag-region>
      <div class="title-bar-left">
        <span class="app-icon">📝</span>
        <span class="app-title">TodoList</span>
      </div>
      
      <div class="drag-area" data-tauri-drag-region></div>
      
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimize" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5" width="10" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button 
          class="control-btn maximize" 
          @click="toggleMaximize" 
          :title="isMaximized ? '还原' : '最大化'"
        >
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" fill="none" stroke-width="1.5"/>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3h6v6h-6z" stroke="currentColor" fill="none" stroke-width="1.5"/>
            <path d="M1 3v6h2M9 9v-2h2" stroke="currentColor" fill="none" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="control-btn close" @click="close" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 2l8 8M2 10l8-8" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </div>
    
    <header class="app-header">📝 TodoList 个人学习辅助工具</header>
    
    <main class="app-main">
      <TodoList />
      <Pomodoro />
      <Stats />
    </main>
    
    <footer class="app-footer">
      © 2026 SleepIn Jazz
      <button 
        class="guide-btn" 
        @click="openGuide"
        title="新手指引"
      >
        新手指引
      </button>
      <button 
        class="clear-data-btn" 
        @click="clearAllLocalData"
        title="清空所有本地任务、统计、设置数据（不可恢复）"
      >
        清空本地数据
      </button>
    </footer>
  </div>
  <Guide ref="guideRef" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import Background from './components/background.vue'
import Guide from './components/guide.vue'
import { taskService, provideTaskService } from './types/task'
import TodoList from './components/TodoList.vue'
import Pomodoro from './components/Pomodoro.vue'
import Stats from './components/Stats.vue'

// 全局提供服务
provideTaskService()

// 窗口控制
const appWindow = getCurrentWindow()
const isMaximized = ref(false)
const guideRef = ref<InstanceType<typeof Guide> | null>(null)

  // 🔥 新增：主动打开新手指引
const openGuide = () => {
  // 重置引导标记（确保可以正常显示）
  localStorage.removeItem('hasShownGuide')
  // 调用引导组件的开启方法
  guideRef.value?.openGuide()
}
onMounted(() => {
  appWindow.isMaximized().then(state => {
    isMaximized.value = state
  })
  
  appWindow.onResized(() => {
    appWindow.isMaximized().then(state => {
      isMaximized.value = state
    })
  })
})

const minimize = () => appWindow.minimize()
const toggleMaximize = () => {
  appWindow.toggleMaximize()
  isMaximized.value = !isMaximized.value
}
const close = () => appWindow.close()

// 清空本地数据（直接使用已创建的单例，彻底避免注入冲突）
const clearAllLocalData = async () => {
  const confirmResult = window.confirm(
    '⚠️ 确定要清空所有本地数据吗？\n所有任务、番茄钟记录、统计数据将被永久删除，无法恢复！'
  )
  
  if (confirmResult) {
    try {
      taskService.clearAllData()
      alert('✅ 所有本地数据已成功清空！')
      location.reload()
    } catch (err) {
      console.error('清空数据失败：', err)
      alert('❌ 清空数据失败')
    }
  }
}
</script>

<style>
/* 全局重置 + 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(30, 30, 30, 0.4);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 100, 0.6);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(130, 130, 130, 0.8);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* ==================== 自定义标题栏 ==================== */
.title-bar {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  background: rgba(25, 25, 30, 0.75);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
  flex-shrink: 0;
}

/* Tauri 拖拽区域 */
[data-tauri-drag-region] {
  -webkit-app-region: drag;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.app-icon {
  font-size: 16px;
}

.app-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.drag-area {
  flex: 1;
  height: 100%;
}

.window-controls {
  display: flex;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
}

.control-btn.close:hover {
  background: #e81123;
  color: #fff;
}

.control-btn svg {
  pointer-events: none;
}

/* ==================== 应用布局 ==================== */
.app-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  overflow: hidden;
  border-radius: 10px;
}

/* 头部标题 */
.app-header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px 16px 12px;
  font-size: 22px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
  flex-shrink: 0;
}

/* 主体内容 */
.app-main {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 16px 20px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 底部 */
.app-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 12px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.clear-data-btn {
  margin-left: 16px;
  padding: 4px 10px;
  font-size: 12px;
  background: rgba(232, 17, 35, 0.15);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(232, 17, 35, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-data-btn:hover {
  background: rgba(232, 17, 35, 0.3);
  border-color: rgba(232, 17, 35, 0.6);
  color: #fff;
}

.guide-btn {
  margin-left: 16px;
  padding: 4px 10px;
  font-size: 12px;
  background: rgba(128, 217, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(128, 217, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-btn:hover {
  background: rgba(128, 217, 255, 0.3);
  border-color: rgba(128, 217, 255, 0.6);
  color: #fff;
}

</style>