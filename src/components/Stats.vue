<!-- src\components\Stats.vue -->
<template>
  <div class="stats-container">
    <div class="today-stats-card">
      <h3>今日概览</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">今日完成番茄钟</span>
          <span class="stat-value">{{ todayStats.todayPomodoros }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日完成任务数</span>
          <span class="stat-value">{{ todayStats.completedTasksToday }}</span>
        </div>
      </div>
    </div>

    <div class="detailed-stats">
      <div class="stats-controls">
        <div class="view-switcher">
          <button @click="switchView('day')" :class="{ active: currentView === 'day' }">日视图</button>
          <button @click="switchView('week')" :class="{ active: currentView === 'week' }">周视图</button>
        </div>

        <div class="date-nav">
          <button @click="prevPeriod" :disabled="isFirstPeriod" class="nav-btn">
            {{ currentView === 'day' ? '前一天' : '前一周' }}
          </button>
          <span class="current-period">{{ currentPeriodLabel }}</span>
          <button @click="nextPeriod" :disabled="isFuturePeriod" class="nav-btn">
            {{ currentView === 'day' ? '后一天' : '后一周' }}
          </button>
        </div>
      </div>

      <div v-if="currentView === 'day'" class="day-view">
        <h4>{{ currentDateLabel }}</h4>
        <div class="day-chart">
          <div v-for="hour in 24" :key="hour" class="hour-column" :class="{ future: isHourFuture(hour) }">
            <div class="hour-label">{{ hour }}:00</div>
            <div class="pomodoro-column"
              :style="{
                height: `${getDynamicBarHeight(getHourPomodoroCount(hour), dayMaxValue)}px`,
                backgroundColor: getHourPomodoroColor(hour)
              }"
            >
              <span v-if="getHourPomodoroCount(hour)" class="column-value">
                {{ getHourPomodoroCount(hour) }}
              </span>
              <span v-else class="column-placeholder">
                {{ isHourFuture(hour) ? '未到' : '0' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'week'" class="week-view">
        <h4>{{ currentWeekLabel }}</h4>
        <div class="week-chart">
          <div v-for="(day, index) in weekData" :key="index" class="day-column" :class="{ future: day.isFuture }">
            <div class="day-label">{{ formatShortDate(day.date) }}</div>
            <div class="pomodoro-column"
              :style="{
                height: `${getDynamicBarHeight(day.pomodoros ?? 0, weekMaxValue)}px`,
                backgroundColor: day.isFuture ? 'rgba(255,255,255,0.1)' : '#80d9ff'
              }"
            >
              <span v-if="day.pomodoros" class="column-value">
                {{ day.pomodoros }} 个<br>{{ day.duration }} 分钟
              </span>
              <span v-else class="column-placeholder">
                {{ day.isFuture ? '未到' : '无数据' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive, onUnmounted } from 'vue';
import { useTaskService } from '../types/task';

const { getTodayOverview, getHourlyStatsForDate, getWeeklyStats } = useTaskService();

type ViewType = 'day' | 'week';

const currentView = ref<ViewType>('day');
const currentDate = ref<Date>(new Date());
const today = ref<Date>(new Date());

const statsCache = reactive({
  todayStats: getTodayOverview(),
  dayHourData: getHourlyStatsForDate(new Date()),
  weekData: getWeeklyStats(new Date()),
});

const CHART_CONFIG = {
  maxHeight: window.innerHeight * 0.45,
  minHeight: 10,
};

const dayMaxValue = computed(() => {
  const values = statsCache.dayHourData.map(h => h.pomodoros);
  const max = Math.max(...values, 1);
  return max;
});

const weekMaxValue = computed(() => {
  const values = statsCache.weekData.map(d => d.pomodoros ?? 0);
  const max = Math.max(...values, 1);
  return max;
});

const getDynamicBarHeight = (value: number, maxValue: number) => {
  if (value <= 0) return 0;
  const ratio = value / maxValue;
  return Math.max(CHART_CONFIG.minHeight, CHART_CONFIG.maxHeight * ratio);
};

const handleStorageChange = () => updateAllStats();

onMounted(() => {
  today.value = new Date();
  today.value.setHours(0, 0, 0, 0);
  updateAllStats();
  window.addEventListener('storage', handleStorageChange);
  setInterval(updateAllStats, 5000);
});

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
});

watch([currentView, currentDate], updateAllStats, { deep: true });

function updateAllStats() {
  statsCache.todayStats = getTodayOverview();
  currentView.value === 'day'
    ? statsCache.dayHourData = getHourlyStatsForDate(currentDate.value)
    : statsCache.weekData = getWeeklyStats(currentDate.value);
}

const formatShortDate = (date: Date) => {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${w[date.getDay()]}(${date.getMonth() + 1}/${date.getDate()})`;
};

const getHourPomodoroCount = (hour: number) => {
  return statsCache.dayHourData.find(x => x.hour === hour)?.pomodoros || 0;
};

const getHourPomodoroColor = (hour: number) => {
  const c = getHourPomodoroCount(hour);
  if (c === 0) return 'rgba(255,255,255,0.1)';
  if (c <= 2) return '#80d9ff';
  if (c <= 4) return '#54c1ff';
  return '#1976d2';
};

const isHourFuture = (hour: number) => {
  const now = new Date();
  const currentDay = new Date(currentDate.value);
  currentDay.setHours(0, 0, 0, 0);
  const todayStart = new Date(today.value);
  if (+currentDay !== +todayStart) return false;
  return hour > now.getHours();
};

const switchView = (v: ViewType) => currentView.value = v;
const prevPeriod = () => {
  const d = new Date(currentDate.value);
  currentView.value === 'day' ? d.setDate(d.getDate() - 1) : d.setDate(d.getDate() - 7);
  currentDate.value = d;
};
const nextPeriod = () => {
  const d = new Date(currentDate.value);
  currentView.value === 'day' ? d.setDate(d.getDate() + 1) : d.setDate(d.getDate() + 7);
  currentDate.value = d;
};

const todayStats = computed(() => statsCache.todayStats);
const weekData = computed(() => statsCache.weekData);

const currentDateLabel = computed(() =>
  currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
);

const currentWeekLabel = computed(() => {
  const s = new Date(currentDate.value);
  s.setDate(s.getDate() - s.getDay());
  const e = new Date(s); e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString('zh-CN')} - ${e.toLocaleDateString('zh-CN')}`;
});

const currentPeriodLabel = computed(() =>
  currentView.value === 'day' ? currentDateLabel.value : currentWeekLabel.value
);

const isFirstPeriod = computed(() => {
  const min = new Date(today.value);
  min.setDate(today.value.getDate() - 30);
  return currentDate.value <= min;
});

const isFuturePeriod = computed(() => {
  const c = new Date(currentDate.value); c.setHours(0, 0, 0, 0);
  if (currentView.value === 'day') return c > today.value;
  const e = new Date(c); e.setDate(c.getDate() - c.getDay() + 6);
  return e > today.value;
});
</script>

<style scoped>
.stats-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #fff;
}

.today-stats-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}
.today-stats-card h3 { margin: 0 0 16px 0; font-size: 18px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.stat-label { display: block; font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
.stat-value { display: block; font-size: 24px; font-weight: bold; color: #80d9ff; }

.stats-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.view-switcher button {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-radius: 6px;
  margin-right: 8px;
}
.view-switcher button.active {
  background: rgba(128, 217, 255, 0.2);
  color: #80d9ff;
  border-color: rgba(128, 217, 255, 0.4);
}

.date-nav { display: flex; align-items: center; gap: 12px; }
.nav-btn { padding: 6px 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff; border-radius: 6px; }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.current-period { font-size: 14px; color: rgba(255,255,255,0.85); }

.day-view, .week-view {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  border-radius: 16px;
  padding: 24px;
}
.day-view h4, .week-view h4 { margin-top: 0; color: rgba(255,255,255,0.9); }

.day-chart, .week-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 20px;
  gap: 8px;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  overflow-x: auto;
  width: 100%;
}

.hour-column, .day-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}
.hour-label, .day-label {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 8px;
  text-align: center;
}

.pomodoro-column {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}
.column-value { color: #fff; font-size: 10px; text-align: center; padding: 2px; }
.column-placeholder { color: rgba(255,255,255,0.5); font-size: 10px; }

.hour-column.future .pomodoro-column,
.day-column.future .pomodoro-column {
  background: rgba(255,255,255,0.05) !important;
}

@media (max-width: 768px) {
  .stats-controls { flex-direction: column; align-items: flex-start; }
  .day-chart, .week-chart { padding-bottom: 60px; }
}
</style>