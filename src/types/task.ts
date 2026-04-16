// src/types/task.ts
import { ref, provide, inject } from 'vue';
import { storage } from '../storage';

// ==================== 类型定义 ====================
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export type TaskStatusType = `${TaskStatus}`;

export interface ChildTask {
  id: string;
  parentId: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | Date | null;
  createdAt: string | Date;
  completedPomodoros: number;
  status: TaskStatusType;
  completedDate?: string | Date;
}

export interface ParentTask {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | Date | null;
  createdAt: string | Date;
  children: ChildTask[];
  status: TaskStatusType;
  readonly totalPomodoros: number;
  readonly derivedStatus: TaskStatusType;
  completedDate?: string | Date;
}

// 统计相关类型
export interface HourlyStats {
  hour: number;
  pomodoros: number;
}

export interface DailyStats {
  date: Date;
  pomodoros: number | null;
  duration: number | null;
  isFuture: boolean;
}

export interface TodayOverview {
  todayPomodoros: number;
  completedTasksToday: number;
}

// ==================== 全局唯一状态管理 ====================
const parentTasks = ref<ParentTask[]>([]);
const activeTaskId = ref<string | null>(null);
const expandedParentIds = ref<string[]>([]);

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
};

// 格式化日期
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN');
};

// 获取状态文本
export const getStatusText = (status: TaskStatusType): string => {
  switch (status) {
    case TaskStatus.NOT_STARTED: return '未开始';
    case TaskStatus.IN_PROGRESS: return '进行中';
    case TaskStatus.COMPLETED: return '已完成';
    default: return '未知';
  }
};

// 给任务添加计算属性（自动计算状态、番茄数）
const wrapTaskWithComputed = (task: any): ParentTask => {
  return {
    ...task,
    get totalPomodoros() {
      return this.children.reduce((sum: number, child: ChildTask) => sum + child.completedPomodoros, 0);
    },
    get derivedStatus() {
      if (this.children.some((c: ChildTask) => c.status === TaskStatus.IN_PROGRESS))
        return TaskStatus.IN_PROGRESS;
      if (this.children.every((c: ChildTask) => c.status === TaskStatus.COMPLETED))
        return TaskStatus.COMPLETED;
      return TaskStatus.NOT_STARTED;
    },
  };
};

// 初始化数据
const initTasks = () => {
  const stored = storage.loadData();
  parentTasks.value = stored.parentTasks.map(wrapTaskWithComputed);
};

// 查找任务（父/子）
const findTaskById = (taskId: string): ParentTask | ChildTask | null => {
  const parent = parentTasks.value.find(p => p.id === taskId);
  if (parent) return parent;

  for (const p of parentTasks.value) {
    const child = p.children.find(c => c.id === taskId);
    if (child) return child;
  }
  return null;
};

// ==================== 【外观模式：统计功能封装】 ====================
const getTodayOverview = (): TodayOverview => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toDateString();
  const data = storage.loadData();

  const todayPomodoros = data.pomodoroHistory.filter(r =>
    new Date(r.date).toDateString() === todayStr
  ).length;

  const allTasks = data.parentTasks.flatMap(p => [p, ...p.children]);
  const completedTasksToday = allTasks.filter(t =>
    t.status === TaskStatus.COMPLETED
  ).length;

  return { todayPomodoros, completedTasksToday };
};

const getHourlyStatsForDate = (date: Date): HourlyStats[] => {
  const targetStr = date.toDateString();
  const data = storage.loadData();
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, pomodoros: 0 }));

  data.pomodoroHistory.forEach(r => {
    const d = new Date(r.timestamp);
    if (d.toDateString() === targetStr) {
      hourly[d.getHours()].pomodoros++;
    }
  });

  return hourly;
};

const getWeeklyStats = (date: Date): DailyStats[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const data = storage.loadData();
  const week: DailyStats[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const isFuture = day > today;
    const dayStr = day.toDateString();

    let pomodoros = null;
    let duration = null;

    if (!isFuture) {
      pomodoros = data.pomodoroHistory.filter(r =>
        new Date(r.date).toDateString() === dayStr
      ).length;
      duration = pomodoros * 30;
    }

    week.push({ date: day, pomodoros, duration, isFuture });
  }

  return week;
};

// ==================== 外观模式核心：统一暴露最小接口 ====================
const createTaskService = () => {
  if (parentTasks.value.length === 0) initTasks();

  // 🔥 修复 this 指向问题：全部使用箭头函数，永久解决 this 丢失
  return {
    parentTasks,
    activeTaskId,
    expandedParentIds,

    generateId,
    formatDate,
    getStatusText,

    findTaskById,
    getAllTasks: (): (ParentTask | ChildTask)[] => {
      const all: (ParentTask | ChildTask)[] = [...parentTasks.value];
      parentTasks.value.forEach(p => all.push(...p.children));
      return all;
    },

    getActiveTask: () => {
      return activeTaskId.value ? findTaskById(activeTaskId.value) : null;
    },

    // 🔥 核心修复：箭头函数绑定 this
    setTaskActive: (taskId: string | null) => {
      const prev = activeTaskId.value ? findTaskById(activeTaskId.value) : null;
      
      // 🔧 修复：确保之前的任务状态被重置并保存
      if (prev && 'status' in prev && prev.status === TaskStatus.IN_PROGRESS) {
        prev.status = TaskStatus.NOT_STARTED;
      }
      
      // 🔧 新增：无论是否切换任务，都立即保存状态
      if (prev && 'status' in prev) {
        storage.saveTasks(parentTasks.value);
      }

      if (taskId) {
        const task = findTaskById(taskId);
        if (task && 'status' in task) {
          task.status = TaskStatus.IN_PROGRESS;
          activeTaskId.value = taskId;
          storage.saveTasks(parentTasks.value);
        }
      } else {
        activeTaskId.value = null;
        // 🔧 新增：停止时也要保存
        storage.saveTasks(parentTasks.value);
      }
    },

    updateTaskPomodoroCount: (taskId: string) => {
      const task = findTaskById(taskId);
      if (task && 'completedPomodoros' in task) {
        task.completedPomodoros += 1;
        storage.saveTasks(parentTasks.value);
        storage.savePomodoroRecord({
          taskId,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
        });
      }
    },

    markTaskCompleted: (taskId: string) => {
      const task = findTaskById(taskId);
      if (task && 'status' in task) {
        task.status = TaskStatus.COMPLETED;
        storage.saveTasks(parentTasks.value);
      }
    },

    saveTasks: () => {
      storage.saveTasks(parentTasks.value);
    },

    // 统计接口（Stats 专用）
    getTodayOverview,
    getHourlyStatsForDate,
    getWeeklyStats,

    clearAllData: () => {
    storage.clearAll();
    // 清空后重置内存任务列表
    parentTasks.value = [];
    activeTaskId.value = null;
    },
  };
};

export const taskService = createTaskService();

export const provideTaskService = () => {
  provide('taskService', taskService);
};

export const useTaskService = () => {
  const service = inject('taskService');
  if (!service) {
    throw new Error('请在根组件使用 provideTaskService()');
  }
  return service as ReturnType<typeof createTaskService>;
};