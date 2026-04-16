<!-- src\components\Pomodoro.vue -->
<template>
  <div class="pomodoro-container">
    <div class="pomodoro-display">
      <div class="phase-indicator">
        {{ getPhaseText(currentPhase) }}
      </div>
      <div class="task-name">
        {{ taskName || "未选择任务" }}
      </div>
      <div class="timer-display">
        {{ formatTime(timeLeft) }}
      </div>
    </div>

    <div class="pomodoro-controls">
      <!-- 只保留：暂停/继续 -->
      <button 
        @click="togglePause" 
        :disabled="currentPhase === PomodoroPhase.IDLE || !activeTaskId"
        class="control-btn pause-btn"
      >
        {{ isPaused ? "继续" : "暂停" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { storage } from '../storage';
import { useTaskService } from '../types/task';

// 内部状态
const PomodoroPhase = {
  IDLE: 'idle',
  WORKING: 'work',
  BREAK: 'break'
} as const;
type PomodoroPhaseType = typeof PomodoroPhase[keyof typeof PomodoroPhase];

// 从外观模式统一获取任务服务
const {
  getActiveTask,
  setTaskActive,
  updateTaskPomodoroCount
} = useTaskService();

// 配置
const storedData = storage.loadData();
const currentPhase = ref<PomodoroPhaseType>(PomodoroPhase.IDLE);
const timeLeft = ref<number>(storedData.settings.workDuration);
const timerId = ref<number | null>(null);
const isPaused = ref(false);
const activeTaskId = ref<string | null>(null);
const taskName = ref("未选择任务");

const workDuration = ref(storedData.settings.workDuration);
const breakDuration = ref(storedData.settings.breakDuration);

// 更新任务名称
const updateActiveTaskName = () => {
  const task = getActiveTask();
  taskName.value = task?.name || "未选择任务";
};

// 时间格式化
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getPhaseText = (phase: PomodoroPhaseType) => {
  switch (phase) {
    case PomodoroPhase.IDLE: return "未开始";
    case PomodoroPhase.WORKING: return "工作中";
    case PomodoroPhase.BREAK: return "休息中";
    default: return "未知";
  }
};

// 统一切换阶段
const switchToPhase = (phase: PomodoroPhaseType) => {
  currentPhase.value = phase;
  isPaused.value = false;
  timeLeft.value = phase === PomodoroPhase.WORKING ? workDuration.value : breakDuration.value;
};

// 启动计时器（统一逻辑）
const startTimer = () => {
  if (timerId.value) clearInterval(timerId.value);

  timerId.value = window.setInterval(() => {
    if (isPaused.value) return;
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      clearInterval(timerId.value!);
      timerId.value = null;
      onTimerComplete();
    }
  }, 1000);
};

// 暂停/继续
const togglePause = () => {
  if (currentPhase.value === PomodoroPhase.IDLE) return;
  isPaused.value = !isPaused.value;
};

// 完全停止
const stopTimer = () => {
  if (timerId.value) {
    clearInterval(timerId.value);
    timerId.value = null;
  }
  currentPhase.value = PomodoroPhase.IDLE;
  timeLeft.value = workDuration.value;
  isPaused.value = false;
  setTaskActive(null);
  updateActiveTaskName();
};

// 计时结束 → 自动循环
const onTimerComplete = () => {
  if (currentPhase.value === PomodoroPhase.WORKING) {
    // 工作结束 → 记录番茄钟 → 进入休息
    if (activeTaskId.value) {
      updateTaskPomodoroCount(activeTaskId.value);
    }
    switchToPhase(PomodoroPhase.BREAK);
    startTimer();
  } else {
    // 休息结束 → 自动进入下一轮工作
    switchToPhase(PomodoroPhase.WORKING);
    startTimer();
  }
};

// 监听任务变化：选中任务自动开始
watch(
  () => getActiveTask(),
  (newTask) => {
    const newId = newTask?.id ?? null;
    activeTaskId.value = newId;

    if (newId) {
      updateActiveTaskName();
      // 选中任务 → 自动开始工作
      if (currentPhase.value === PomodoroPhase.IDLE) {
        switchToPhase(PomodoroPhase.WORKING);
        startTimer();
      }
    } else {
      stopTimer();
    }
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  updateActiveTaskName();
});

onUnmounted(() => {
  if (timerId.value) clearInterval(timerId.value);
});
</script>

<style scoped>
/* 番茄钟容器：磨砂玻璃统一风格 */
.pomodoro-container {
  padding: 28px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(6px);
  max-width: 420px;
  margin: 24px auto;
  text-align: center;
  transition: all 0.3s ease;
}
.pomodoro-container:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

/* 展示区域 */
.pomodoro-display {
  margin-bottom: 24px;
  color: #ffffff;
}

/* 阶段文字 */
.phase-indicator {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
  font-weight: 500;
}

/* 任务名称 */
.task-name {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.95);
}

/* 计时器数字 */
.timer-display {
  font-size: 48px;
  font-weight: 700;
  color: #80d9ff;
  letter-spacing: 2px;
}

/* 按钮区域 */
.pomodoro-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 按钮统一样式 */
.control-btn {
  padding: 10px 22px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.25s ease;
}

/* 暂停/继续按钮 */
.pause-btn {
  background: rgba(128, 217, 255, 0.2);
  color: #80d9ff;
  border: 1px solid rgba(128, 217, 255, 0.3);
}
.pause-btn:hover {
  background: rgba(128, 217, 255, 0.35);
}

/* 禁用状态 */
button:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}
</style>