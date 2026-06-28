/**
 * 副本 V2 — 全局拓扑小地图（动态边界框自动缩放版）
 *
 * 显示整个副本的房间布局概览
 * 玩家位置高亮，已探索房间可见，未探索房间显示为暗点
 *
 * ==================== 动态缩放原理 ====================
 * 1. 计算所有存在房间节点的活跃边界框（minX, maxX, minY, maxY）
 * 2. 使用 CSS Grid 动态设置行列数，只渲染边界框内的区域
 * 3. 单元格使用 aspect-ratio 保持正方形比例
 * 4. 通过 grid-template-columns/rows: repeat(n, 1fr) 自动填充容器
 * 5. 小地图自动缩放以占据容器的 85-95%
 */
<script setup lang="ts">
import { computed } from 'vue'
import type { DungeonRuntimeState } from '../../types/dungeon-v2'
import { getRoom } from '../../data/dungeons/biohazard/rooms'
import { MAP_GRID_CONFIG } from '../../config/dungeon-v2'

const props = defineProps<{
  state: DungeonRuntimeState
}>()

const emit = defineEmits<{
  navigate: [roomId: string]
}>()

interface MiniCell {
  coord: string
  hasRoom: boolean
  explored: boolean
  isCurrent: boolean
  col: number
  row: number
}

// ==================== 活跃边界框计算 ====================

/** 计算存在房间的边界框 */
const activeBoundingBox = computed(() => {
  let minCol = MAP_GRID_CONFIG.COL_LABELS.length - 1
  let maxCol = 0
  let minRow = MAP_GRID_CONFIG.ROWS - 1
  let maxRow = 0
  let hasRooms = false

  for (let row = 0; row < MAP_GRID_CONFIG.ROWS; row++) {
    for (let col = 0; col < MAP_GRID_CONFIG.COL_LABELS.length; col++) {
      const colLabel = MAP_GRID_CONFIG.COL_LABELS[col]
      const coord = `${colLabel}${row + 1}`
      const room = getRoom(coord)
      
      if (room) {
        hasRooms = true
        minCol = Math.min(minCol, col)
        maxCol = Math.max(maxCol, col)
        minRow = Math.min(minRow, row)
        maxRow = Math.max(maxRow, row)
      }
    }
  }

  // 如果没有房间，返回默认范围
  if (!hasRooms) {
    return { minCol: 0, maxCol: 10, minRow: 0, maxRow: 6 }
  }

  return { minCol, maxCol, minRow, maxRow }
})

/** 活跃网格尺寸 */
const activeGridSize = computed(() => {
  const { minCol, maxCol, minRow, maxRow } = activeBoundingBox.value
  return {
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
    minCol,
    minRow,
  }
})

/** 计算最佳缩放比例，使网格占据容器的 85-95% */
const gridScaleStyle = computed(() => {
  const { width, height } = activeGridSize.value
  
  // 计算宽高比
  const aspectRatio = width / height
  
  return {
    '--grid-cols': width,
    '--grid-rows': height,
    '--aspect-ratio': aspectRatio,
  }
})

// ==================== 网格数据构建 ====================

const gridData = computed<MiniCell[][]>(() => {
  const rows: MiniCell[][] = []
  const { minCol, maxCol, minRow, maxRow } = activeBoundingBox.value
  
  for (let row = minRow; row <= maxRow; row++) {
    const cells: MiniCell[] = []
    for (let col = minCol; col <= maxCol; col++) {
      const colLabel = MAP_GRID_CONFIG.COL_LABELS[col]
      const coord = `${colLabel}${row + 1}`
      const room = getRoom(coord)
      const explored = props.state.player.explored_rooms.includes(coord)
      const isCurrent = props.state.player.position === coord
      
      cells.push({
        coord,
        hasRoom: !!room,
        explored,
        isCurrent,
        col,
        row,
      })
    }
    rows.push(cells)
  }
  return rows
})

function onCellClick(cell: MiniCell): void {
  if (cell.hasRoom && cell.explored && !cell.isCurrent) {
    emit('navigate', cell.coord)
  }
}

function cellClass(cell: MiniCell): string {
  if (!cell.hasRoom) return 'mini-void'
  if (cell.isCurrent) return 'mini-current'
  if (cell.explored) return 'mini-explored'
  return 'mini-hidden'
}
</script>

<template>
  <div class="dungeon-mini-map" :style="gridScaleStyle">
    <div class="mini-grid-wrapper">
      <div class="mini-grid">
        <div 
          v-for="(row, rowIdx) in gridData" 
          :key="rowIdx" 
          class="mini-row"
        >
          <div
            v-for="cell in row"
            :key="cell.coord"
            :class="['mini-cell', cellClass(cell)]"
            :title="cell.coord"
            @click="onCellClick(cell)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dungeon-mini-map {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #040408;
  border: 1px solid #1a1a2e;
  border-radius: 4px;
  padding: 6px;
  overflow: hidden;
  
  /* CSS 变量：由 gridScaleStyle 动态设置 */
  --grid-cols: 11;
  --grid-rows: 7;
}

.mini-grid-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: 2px;
  
  /* 动态计算尺寸：保持正方形比例，同时填充容器 */
  width: min(
    calc(100% - 4px),
    calc((100% - 4px) * var(--aspect-ratio, 1.57))
  );
  height: min(
    calc(100% - 4px),
    calc((100% - 4px) / var(--aspect-ratio, 1.57))
  );
  
  /* 确保最小尺寸 */
  min-width: 0;
  min-height: 0;
}

.mini-row {
  display: contents;
}

.mini-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  transition: all 0.15s;
  cursor: default;
  min-width: 0;
  min-height: 0;
}

.mini-void {
  background: transparent;
}

.mini-hidden {
  background: #0a0a14;
  border: 1px solid #12121e;
}

.mini-explored {
  background: #1a2a3e;
  border: 1px solid #2a4a5e;
  cursor: pointer;
}

.mini-explored:hover {
  background: #00c8ff;
  box-shadow: 0 0 4px rgba(0, 200, 255, 0.5);
}

.mini-current {
  background: #ff3366;
  border: 1px solid #ff6688;
  box-shadow: 0 0 6px rgba(255, 51, 102, 0.6);
  animation: mini-pulse 1.5s infinite;
}

@keyframes mini-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 51, 102, 0.4); }
  50% { box-shadow: 0 0 10px rgba(255, 51, 102, 0.8); }
}
</style>
