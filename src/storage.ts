// src/storage.ts
export const TaskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// 修正：移除 derivedStatus 可选标记，改为必选（通过计算保证有值）
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
  totalPomodoros: number; // 移除可选标记
  derivedStatus: TaskStatusType; // 移除可选标记
}

// 其余代码保持不变...
interface PomodoroRecord {
  taskId: string;
  date: string; // 格式：YYYY-MM-DD
  timestamp: number; // 时间戳
}

interface UserSettings {
  workDuration: number; // 工作时长（秒）
  breakDuration: number; // 休息时长（秒）
}

interface StoredData {
  parentTasks: ParentTask[];
  settings: UserSettings;
  pomodoroHistory: PomodoroRecord[];
}

const DEFAULT_DATA: StoredData = {
  parentTasks: [],
  settings: {
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
  },
  pomodoroHistory: [],
};

const STORAGE_KEY = 'todoList_data';
const TEMP_STORAGE_KEY = 'todoList_data_temp';

const deepClone = <T>(data: T): T => JSON.parse(JSON.stringify(data));

export const storage = {
  loadData(): StoredData {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) return deepClone(DEFAULT_DATA);

      const parsedData = JSON.parse(rawData) as StoredData;
      return this._validateAndRecoverData(parsedData);
    } catch (error) {
      console.error('加载数据失败，使用默认值:', error);
      const tempData = localStorage.getItem(TEMP_STORAGE_KEY);
      if (tempData) {
        try {
          const parsedTemp = JSON.parse(tempData) as StoredData;
          this.saveData(parsedTemp);
          localStorage.removeItem(TEMP_STORAGE_KEY);
          return this._validateAndRecoverData(parsedTemp);
        } catch (e) {
          console.error('临时数据恢复失败:', e);
        }
      }
      return deepClone(DEFAULT_DATA);
    }
  },

  saveData(data: StoredData): void {
    try {
      const clonedData = deepClone(data);
      localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(clonedData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clonedData));
      localStorage.removeItem(TEMP_STORAGE_KEY);
    } catch (error) {
      console.error('保存数据失败:', error);
      throw new Error('数据保存失败，请检查本地存储是否可用');
    }
  },

  saveTasks(tasks: ParentTask[]): void {
    const allData = this.loadData();
    allData.parentTasks = tasks;
    this.saveData(allData);
  },

  savePomodoroRecord(record: PomodoroRecord): void {
    const allData = this.loadData();
    allData.pomodoroHistory.push(record);
    this.saveData(allData);
  },

  _validateAndRecoverData(data: StoredData): StoredData {
    const recovered = deepClone(DEFAULT_DATA);

    if (Array.isArray(data.parentTasks)) {
      recovered.parentTasks = data.parentTasks.map(task => {
        // 确保status有默认值
        if (!Object.values(TaskStatus).includes(task.status)) {
          task.status = TaskStatus.NOT_STARTED;
        }
        // 确保derivedStatus有值
        if (!task.derivedStatus || !Object.values(TaskStatus).includes(task.derivedStatus)) {
          task.derivedStatus = TaskStatus.NOT_STARTED;
        }
        // 确保totalPomodoros是数字
        task.totalPomodoros = typeof task.totalPomodoros === 'number' ? task.totalPomodoros : 0;
        
        if (Array.isArray(task.children)) {
          task.children = task.children.map((child: ChildTask) => {
            if (!Object.values(TaskStatus).includes(child.status)) {
              child.status = TaskStatus.NOT_STARTED;
            }
            return child;
          });
        } else {
          task.children = [];
        }
        return task;
      });
    }

    if (data.settings && typeof data.settings === 'object') {
      recovered.settings = {
        workDuration: typeof data.settings.workDuration === 'number' 
          ? data.settings.workDuration 
          : DEFAULT_DATA.settings.workDuration,
        breakDuration: typeof data.settings.breakDuration === 'number' 
          ? data.settings.breakDuration 
          : DEFAULT_DATA.settings.breakDuration,
      };
    }

    if (Array.isArray(data.pomodoroHistory)) {
      recovered.pomodoroHistory = data.pomodoroHistory.filter(record => 
        record.taskId && record.date && record.timestamp
      );
    }

    return recovered;
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TEMP_STORAGE_KEY);
  },
};

export const clearAllData = () => storage.clearAll();
