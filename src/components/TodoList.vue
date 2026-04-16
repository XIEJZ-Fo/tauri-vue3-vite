<!-- src\components\TodoList.vue -->
<template>
  <div class="todo-list-container">
    <!-- 新增：排序按钮区域 -->
    <div class="sort-buttons">
      <button 
        :class="{ active: sortType === 'priority' }"
        @click="changeSort('priority')"
      >
        重要性↓
      </button>
      <button 
        :class="{ active: sortType === 'dueDate' }"
        @click="changeSort('dueDate')"
      >
        截止日期↓
      </button>
      <button 
        :class="{ active: sortType === 'createdAt' }"
        @click="changeSort('createdAt')"
      >
        创建日期↓
      </button>
    </div>

    <!-- 父任务容器：移除原生拖拽事件 -->
    <div class="parent-tasks">
      <div 
        v-for="(parent, parentIndex) in parentTasks" 
        :key="parent.id" 
        class="parent-task-item"
        :data-index="parentIndex"
      >
        <div class="parent-task-header" @click="toggleParentTask(parent.id)">
          <!-- 父任务拖拽手柄：绑定自定义拖拽启动事件 -->
          <div class="drag-handle" @mousedown.stop="startDragParent($event, parentIndex)">
            <span class="drag-icon">⋮⋮</span>
          </div>

          <span class="expand-icon">{{ expandedParentIds.includes(parent.id) ? '▼' : '▶' }}</span>
          <h3 class="task-name" :class="`priority-${parent.priority}`">
            {{ parent.name }}
          </h3>

          <span class="task-pomodoros">番茄数：{{ parent.totalPomodoros }}</span>
          
          <span 
            v-if="parent.derivedStatus === 'in_progress'" 
            class="task-status in-progress"
          >
            进行中
          </span>

          <span class="task-due" v-if="parent.dueDate">
            截止：{{ formatDate(parent.dueDate) }}
          </span>

          <button @click.stop="editParentTask(parent)" class="detail-btn">
            详情
          </button>
          <button @click.stop="deleteParentTask(parent.id)" class="danger">删除</button>
        </div>

        <div 
          v-if="expandedParentIds.includes(parent.id)" 
          class="parent-task-details"
        >
          <p class="task-description">{{ parent.description }}</p>

          <!-- 子任务容器：移除原生拖拽事件 -->
          <div class="child-tasks">
            <div 
              v-for="(child, childIndex) in parent.children" 
              :key="child.id" 
              class="child-task-item"
              :class="{ active: child.status === 'in_progress' }"
              @dblclick="startPomodoroForTask(child.id)"
              :data-index="childIndex"
            >
              <!-- 子任务拖拽手柄：绑定自定义拖拽启动事件 -->
              <div class="drag-handle" @mousedown.stop="startDragChild($event, parent.id, childIndex)">
                <span class="drag-icon">⋮⋮</span>
              </div>

              <span class="task-name" :class="`priority-${child.priority}`">
                {{ child.name }}
              </span>

              <span class="task-pomodoros">已完成：{{ child.completedPomodoros }}</span>
              
              <span 
                v-if="child.status === 'in_progress'" 
                class="task-status in-progress"
              >
                进行中
              </span>

              <span class="task-due" v-if="child.dueDate">
                截止：{{ formatDate(child.dueDate) }}
              </span>

              <button 
                @click.stop="startPomodoroForTask(child.id)" 
                class="start-btn"
                :class="activeTaskId === child.id ? 'stop' : 'start'"
              >
                {{ activeTaskId === child.id ? '结束' : '开始' }}
              </button>

              <button @click.stop="editChildTask(child)" class="detail-btn">
                详情
              </button>
              <button @click.stop="deleteChildTask(parent.id, child.id)" class="danger">删除</button>
            </div>

            <button @click="showNewChildTaskModal(parent.id)" class="add-child-btn">
              待办条目+
            </button>
          </div>
        </div>
      </div>
    </div>

    <button @click="showNewParentTaskModal" class="add-parent-btn">
      待办事项+
    </button>

    <!-- 弹窗部分完全不变 -->
    <teleport to="body">
      <div v-if="activeModal === 'parentTask'" class="modal-overlay">
        <div class="modal-content">
          <h2>{{ isEditingParent ? '编辑代办事项' : '新增代办事项' }}</h2>
          <form @submit.prevent="saveParentTask">
            <label>
              任务名称：
              <input 
                v-model="formData.name" 
                type="text" 
                required 
                placeholder="输入任务名称"
              />
            </label>
            <label>
              描述：
              <textarea v-model="formData.description" placeholder="输入任务描述"></textarea>
            </label>
            <label>
              优先级：
              <select v-model="formData.priority">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label>
              截止日期：
              <input 
                v-model="formData.dueDate" 
                type="date" 
                placeholder="选择截止日期"
              />
            </label>
            <div class="modal-buttons">
              <button type="button" @click="closeModal">取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="activeModal === 'childTask'" class="modal-overlay">
        <div class="modal-content">
          <h2>{{ isEditingChild ? '编辑待办条目' : '新增待办条目' }}</h2>
          <form @submit.prevent="saveChildTask">
            <label>
              任务名称：
              <input 
                v-model="formData.name" 
                type="text" 
                required 
                placeholder="输入待办条目名称"
              />
            </label>
            <label>
              描述：
              <textarea v-model="formData.description" placeholder="输入待办条目描述"></textarea>
            </label>
            <label>
              优先级：
              <select v-model="formData.priority">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label>
              截止日期：
              <input 
                v-model="formData.dueDate" 
                type="date" 
                placeholder="选择截止日期"
              />
            </label>
            <div class="modal-buttons">
              <button type="button" @click="closeModal">取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useTaskService, ParentTask, ChildTask, TaskStatus } from '../types/task';

const {
  parentTasks,
  activeTaskId,
  expandedParentIds,
  generateId,
  formatDate,
  setTaskActive,
  saveTasks
} = useTaskService();

const activeModal = ref<string | null>(null);
const isEditingParent = ref(false);
const isEditingChild = ref(false);
const currentParentId = ref<string | null>(null);
const currentTaskId = ref<string | null>(null);

// 新增：排序类型响应式变量
const sortType = ref<'priority' | 'dueDate' | 'createdAt' | 'none'>('none');

const formData = reactive({
  name: '',
  description: '',
  priority: 'medium' as 'high' | 'medium' | 'low',
  dueDate: '',
});

// ==================== 新增：排序核心逻辑 ====================
/** 切换排序类型 */
const changeSort = (type: typeof sortType.value) => {
  sortType.value = type;
  executeSort();
  saveTasks(); // 排序后自动保存
};

/** 执行父任务排序 */
const executeSort = () => {
  // 优先级权重：高(3) > 中(2) > 低(1)
  const priorityWeight = { high: 3, medium: 2, low: 1 };

  parentTasks.value.sort((taskA, taskB) => {
    switch (sortType.value) {
      // 1. 重要性：高 → 低
      case 'priority':
        return priorityWeight[taskB.priority] - priorityWeight[taskA.priority];
      
      // 2. 截止日期：近 → 远（无截止日期的排最后）
      case 'dueDate':
        const timeA = taskA.dueDate ? new Date(taskA.dueDate).getTime() : Infinity;
        const timeB = taskB.dueDate ? new Date(taskB.dueDate).getTime() : Infinity;
        return timeA - timeB;
      
      // 3. 创建日期：新 → 旧
      case 'createdAt':
        return new Date(taskB.createdAt).getTime() - new Date(taskA.createdAt).getTime();
      
      // 默认不排序
      default:
        return 0;
    }
  });
};

// ==================== 🔴 自定义拖拽响应式变量 ====================
const isDragging = ref(false) // 是否正在拖拽
const dragType = ref<'parent' | 'child'>('parent') // 拖拽类型：父/子任务
const dragStartIndex = ref(-1) // 拖拽起始索引
const dragCurrentParentId = ref<string | null>(null) // 子任务所属父ID
let dragElement: HTMLElement | null = null // 拖拽的DOM元素
let dragPlaceholder: HTMLElement | null = null // 拖拽占位元素（防布局跳动）

// ==================== 待办事项操作（完全不变） ====================
const toggleParentTask = (parentId: string) => {
  const index = expandedParentIds.value.indexOf(parentId);
  index > -1 
    ? expandedParentIds.value.splice(index, 1) 
    : expandedParentIds.value.push(parentId);
};

const showNewParentTaskModal = () => {
  Object.assign(formData, { name: '', description: '', priority: 'medium', dueDate: '' });
  isEditingParent.value = false;
  activeModal.value = 'parentTask';
};

const editParentTask = (parent: ParentTask) => {
  Object.assign(formData, {
    name: parent.name,
    description: parent.description,
    priority: parent.priority,
    dueDate: parent.dueDate ? new Date(parent.dueDate).toISOString().split('T')[0] : '',
  });
  currentTaskId.value = parent.id;
  isEditingParent.value = true;
  activeModal.value = 'parentTask';
};

const saveParentTask = () => {
  if (isEditingParent.value && currentTaskId.value) {
    const index = parentTasks.value.findIndex(p => p.id === currentTaskId.value);
    if (index > -1) {
      parentTasks.value[index] = {
        ...parentTasks.value[index],
        ...formData,
        dueDate: formData.dueDate || null
      };
    }
  } else {
    const newParent: ParentTask = {
      id: generateId(),
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      createdAt: new Date(),
      children: [],
      status: TaskStatus.NOT_STARTED,
      get totalPomodoros() {
        return this.children.reduce((sum, child) => sum + child.completedPomodoros, 0);
      },
      get derivedStatus() {
        if (this.children.some(c => c.status === TaskStatus.IN_PROGRESS)) 
          return TaskStatus.IN_PROGRESS;
        return TaskStatus.NOT_STARTED;
      },
    };
    parentTasks.value.push(newParent);
  }
  
  // 新增/编辑后保持当前排序
  if (sortType.value !== 'none') executeSort();
  saveTasks();
  closeModal();
};

const deleteParentTask = (parentId: string) => {
  if (confirm('确定删除该待办事项及所有代办条目吗？')) {
    parentTasks.value = parentTasks.value.filter(p => p.id !== parentId);
    // 删除后保持当前排序
    if (sortType.value !== 'none') executeSort();
    saveTasks();
    
    if (activeTaskId.value === parentId) {
      setTaskActive(null);
    }
  }
};

// ==================== 待办条目操作（完全不变） ====================
const showNewChildTaskModal = (parentId: string) => {
  currentParentId.value = parentId;
  Object.assign(formData, { name: '', description: '', priority: 'medium', dueDate: '' });
  isEditingChild.value = false;
  activeModal.value = 'childTask';
};

const editChildTask = (child: ChildTask) => {
  const parent = parentTasks.value.find(p => p.children.some(c => c.id === child.id));
  if (parent) {
    currentParentId.value = parent.id;
    currentTaskId.value = child.id;
    Object.assign(formData, {
      name: child.name,
      description: child.description,
      priority: child.priority,
      dueDate: child.dueDate ? new Date(child.dueDate).toISOString().split('T')[0] : '',
    });
    isEditingChild.value = true;
    activeModal.value = 'childTask';
  }
};

const saveChildTask = () => {
  if (!currentParentId.value) return;
  const parent = parentTasks.value.find(p => p.id === currentParentId.value);
  if (!parent) return;

  if (isEditingChild.value && currentTaskId.value) {
    const index = parent.children.findIndex(c => c.id === currentTaskId.value);
    if (index > -1) {
      parent.children[index] = {
        ...parent.children[index],
        ...formData,
        dueDate: formData.dueDate || null
      };
    }
  } else {
    const newChild: ChildTask = {
      id: generateId(),
      parentId: currentParentId.value!,
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      createdAt: new Date(),
      completedPomodoros: 0,
      status: TaskStatus.NOT_STARTED,
    };
    parent.children.push(newChild);
  }

  saveTasks();
  closeModal();
};

const deleteChildTask = (parentId: string, childId: string) => {
  if (confirm('确定删除该待办条目吗？')) {
    const parent = parentTasks.value.find(p => p.id === parentId);
    if (parent) {
      parent.children = parent.children.filter(c => c.id !== childId);
      saveTasks();
      
      if (activeTaskId.value === childId) {
        setTaskActive(null);
      }
    }
  }
};

const startPomodoroForTask = (taskId: string) => {
  if (activeTaskId.value === taskId) {
    setTaskActive(null);
  } else {
    setTaskActive(taskId);
  }
};

const closeModal = () => {
  activeModal.value = null;
  isEditingParent.value = false;
  isEditingChild.value = false;
  currentParentId.value = null;
  currentTaskId.value = null;
  Object.assign(formData, { name: '', description: '', priority: 'medium', dueDate: '' });
};

// ==================== 🔴 自定义拖拽核心逻辑 ====================
/** 启动父任务拖拽 */
const startDragParent = (e: MouseEvent, index: number) => {
  e.preventDefault()
  isDragging.value = true
  dragType.value = 'parent'
  dragStartIndex.value = index
  // 拖拽后清空自动排序（手动拖拽优先级最高）
  sortType.value = 'none'
  // 获取拖拽元素
  dragElement = (e.target as HTMLElement).closest('.parent-task-item') as HTMLElement
  initDragElementStyle()
}

/** 启动子任务拖拽 */
const startDragChild = (e: MouseEvent, parentId: string, index: number) => {
  e.preventDefault()
  isDragging.value = true
  dragType.value = 'child'
  dragStartIndex.value = index
  dragCurrentParentId.value = parentId
  // 获取拖拽元素
  dragElement = (e.target as HTMLElement).closest('.child-task-item') as HTMLElement
  initDragElementStyle()
}

/** 初始化拖拽元素样式 & 创建占位符 */
const initDragElementStyle = () => {
  if (!dragElement) return
  // 创建占位元素（防止布局跳动）
  dragPlaceholder = dragElement.cloneNode(false) as HTMLElement
  dragPlaceholder.classList.add('drag-placeholder')
  dragElement.after(dragPlaceholder)
  // 添加拖拽中样式
  dragElement.classList.add('dragging')
  // 绑定全局鼠标事件
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('mouseleave', onDragEnd)
}

/** 拖拽移动中：计算位置、交换排序 */
const onDragMove = (e: MouseEvent) => {
  if (!isDragging.value || !dragElement) return
  // 禁止文本选中（拖拽时优化体验）
  e.preventDefault()
  // 获取鼠标下的目标元素
  const target = document.elementFromPoint(e.clientX, e.clientY)
  const dropTarget = target?.closest(
    dragType.value === 'parent' ? '.parent-task-item' : '.child-task-item'
  ) as HTMLElement | null

  if (!dropTarget || dropTarget === dragPlaceholder) return

  // 交换排序逻辑
  if (dragType.value === 'parent') {
    sortParentTasks(dropTarget)
  } else {
    sortChildTasks(dropTarget)
  }
}

/** 父任务排序 */
const sortParentTasks = (target: HTMLElement) => {
  const targetIndex = Number(target.dataset.index)
  const startIndex = dragStartIndex.value
  if (targetIndex === startIndex) return

  // 数组交换
  const item = parentTasks.value.splice(startIndex, 1)[0]
  parentTasks.value.splice(targetIndex, 0, item)
  dragStartIndex.value = targetIndex
}

/** 子任务排序 */
const sortChildTasks = (target: HTMLElement) => {
  const parentId = dragCurrentParentId.value
  if (!parentId) return
  const parent = parentTasks.value.find(p => p.id === parentId)
  if (!parent) return

  const targetIndex = Number(target.dataset.index)
  const startIndex = dragStartIndex.value
  if (targetIndex === startIndex) return

  // 数组交换
  const item = parent.children.splice(startIndex, 1)[0]
  parent.children.splice(targetIndex, 0, item)
  dragStartIndex.value = targetIndex
}

/** 结束拖拽：重置状态、保存排序 */
const onDragEnd = () => {
  if (!isDragging.value) return
  // 重置状态
  isDragging.value = false
  // 移除样式和占位符
  if (dragElement) dragElement.classList.remove('dragging')
  if (dragPlaceholder) dragPlaceholder.remove()
  // 清除全局事件
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mouseleave', onDragEnd)
  // 保存排序
  saveTasks()
  // 重置变量
  dragElement = null
  dragPlaceholder = null
  dragStartIndex.value = -1
  dragCurrentParentId.value = null
}
</script>

<style scoped>
/* 新增：排序按钮样式 */
.sort-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.sort-buttons button {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}
.sort-buttons button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}
.sort-buttons button.active {
  background: rgba(128, 217, 255, 0.2);
  border-color: rgba(128, 217, 255, 0.4);
  color: #80d9ff;
}

/* ==================== 🔴 自定义拖拽样式 ==================== */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  cursor: grab;
  user-select: none;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}
.drag-handle:active {
  cursor: grabbing;
  opacity: 1;
}
.drag-icon {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
}

/* 拖拽中元素样式 */
.parent-task-item.dragging,
.child-task-item.dragging {
  opacity: 0.4;
  background: rgba(128, 217, 255, 0.1) !important;
  transform: scale(0.98);
}

/* 拖拽占位符样式（防布局跳动） */
.drag-placeholder {
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(128, 217, 255, 0.1);
  border: 1px dashed rgba(128, 217, 255, 0.4);
  pointer-events: none;
}
.child-task-item.drag-placeholder {
  margin: 0;
  border-radius: 8px;
}

/* 禁止拖拽时选中文本 */
* {
  user-select: none;
}
input, textarea {
  user-select: auto;
}

/* 原有布局样式（完全不变） */
.todo-list-container {
  padding: 24px 16px;
  max-width: 1200px;
  margin: 0 auto;
  color: #ffffff;
}
.parent-task-item {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(6px);
  overflow: hidden;
  transition: all 0.3s ease;
}
.parent-task-item:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}
.parent-task-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex-wrap: wrap;
}
.expand-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}
.task-name {
  flex: 1;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
}
.priority-high { color: #ff6b6b; }
.priority-medium { color: #ffd93d; }
.priority-low { color: #6bffa2; }
.task-status.in-progress {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #80d9ff;
  border: 1px solid rgba(128, 217, 255, 0.4);
  white-space: nowrap;
}
.task-pomodoros, .task-due {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}
.parent-task-details {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.task-description {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 14px;
}
.child-tasks {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.child-task-item {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.25s ease;
  flex-wrap: wrap;
}
.child-task-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.child-task-item.active {
  background: rgba(128, 217, 255, 0.15);
  border-color: rgba(128, 217, 255, 0.4);
}
button {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #ffffff;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.15);
}
button:hover {
  background: rgba(255, 255, 255, 0.25);
}
.detail-btn {
  background: rgba(128, 217, 255, 0.25);
  color: #80d9ff;
}
button.danger {
  background: rgba(255, 107, 107, 0.25);
  color: #ff6b6b;
}
.add-parent-btn {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: rgba(107, 255, 162, 0.2);
  color: #6bffa2;
  border: 1px solid rgba(107, 255, 162, 0.3);
  font-size: 14px;
}
.add-child-btn {
  margin-top: 8px;
  padding: 8px;
  background: rgba(107, 255, 162, 0.15);
  color: #6bffa2;
}
.start-btn.start {
  background: rgba(107, 255, 162, 0.25);
  color: #6bffa2;
}
.start-btn.stop {
  background: rgba(255, 107, 107, 0.25);
  color: #ff6b6b;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: rgba(30, 30, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 28px;
  border-radius: 16px;
  min-width: 420px;
  color: #ffffff;
}
.modal-content form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.modal-content label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
}
.modal-content input,
.modal-content textarea {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 14px;
  color: #ffffff;
  outline: none;
  transition: border-color 0.2s;
}

/* 🔥 自定义透明下拉框样式（核心修改） */
.modal-content select {
  /* 基础样式 */
  padding: 10px 12px;
  padding-right: 32px; /* 给自定义箭头留空间 */
  /* 透明背景 */
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(4px);
  /* 边框 */
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  /* 文字 */
  font-size: 14px;
  color: #ffffff;
  /* 移除原生下拉箭头 */
  appearance: none;
  -webkit-appearance: none;
  /* 自定义箭头（SVG） */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(255,255,255,0.7)' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  /* 交互 */
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

/* 下拉框聚焦/悬停效果 */
.modal-content select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}
.modal-content select:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(128, 217, 255, 0.5);
}

/* 下拉选项样式（适配深色） */
.modal-content select option {
  background: rgba(30, 30, 36, 0.95);
  color: #ffffff;
  border: none;
}

.modal-content input:focus,
.modal-content textarea:focus {
  border-color: rgba(128, 217, 255, 0.5);
}
.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>