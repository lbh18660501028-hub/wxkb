/**
 * 副本 V2 — 地图格子组件（动态边界框自动缩放版）
 *
 * 显示以玩家当前位置为中心的局部格子区域
 * radius=1 时为 3×3 雷达网格，radius=2 时为 5×5 视野
 * 玩家点击相邻房间格子进行移动
 *
 * ==================== 动态缩放原理 ====================
 * 1. 计算可见范围的活跃边界框（minX, maxX, minY, maxY）
 * 2. 使用 CSS Grid 动态设置行列数
 * 3. 单元格使用 aspect-ratio 保持正方形比例
 * 4. 通过 grid-template-columns/rows: repeat(n, 1fr) 自动填充容器
 */
<script setup lang="ts">
import { computed } from 'vue'
import type { DungeonRuntimeState, RoomConfig } from '../../types/dungeon-v2'
import { getRoom } from '../../data/dungeons/biohazard/rooms'
import { MAP_GRID_CONFIG } from '../../config/dungeon-v2'
import { hasItem } from '../../systems/dungeon/inventory'

const props = defineProps<{
  state: DungeonRuntimeState
  adjacentRoomIds: string[]
  /** 视野半径：1=3×3, 2=5×5 */
  radius?: number
}>()

const emit = defineEmits<{
  move: [roomId: string]
}>()

const VISIBLE_RADIUS = computed(() => props.radius ?? 2)

// ==================== 坐标解析 ====================

const currentCoord = computed(() => {
  const pos = props.state.player.position
  const colLabel = pos[0]
  const rowNumber = parseInt(pos.slice(1))
  const colIdx = MAP_GRID_CONFIG.COL_LABELS.indexOf(colLabel)
  const rowIdx = rowNumber - 1
  return { colIdx, rowIdx }
})

// ==================== 可见范围计算 ====================

const visibleColRange = computed(() => {
  const r = VISIBLE_RADIUS.value
  const center = currentCoord.value.colIdx
  let min = center - r
  let max = center + r
  const totalCols = MAP_GRID_CONFIG.COL_LABELS.length
  if (min < 0) { max -= min; min = 0 }
  if (max > totalCols - 1) { min -= (max - totalCols + 1); max = totalCols - 1 }
  return { min, max }
})

const visibleRowRange = computed(() => {
  const r = VISIBLE_RADIUS.value
  const center = currentCoord.value.rowIdx
  let min = center - r
  let max = center + r
  if (min < 0) { max -= min; min = 0 }
  if (max > MAP_GRID_CONFIG.ROWS - 1) { min -= (max - MAP_GRID_CONFIG.ROWS + 1); max = MAP_GRID_CONFIG.ROWS - 1 }
  return { min, max }
})

// ==================== 动态边界框计算 ====================

/** 活跃网格尺寸 */
const activeGridSize = computed(() => {
  const colRange = visibleColRange.value
  const rowRange = visibleRowRange.value
  const width = colRange.max - colRange.min + 1
  const height = rowRange.max - rowRange.min + 1
  return { width, height }
})

/** 计算最佳缩放比例，使网格占据容器的 85-95% */
const gridScaleStyle = computed(() => {
  const { width, height } = activeGridSize.value
  
  // 计算宽高比
  const aspectRatio = width / height
  
  // 根据网格形状决定缩放策略
  // 目标是让网格占据容器的 90% 左右
  const targetOccupancy = 0.9
  
  return {
    '--grid-cols': width,
    '--grid-rows': height,
    '--aspect-ratio': aspectRatio,
    '--target-scale': targetOccupancy,
  }
})

// ==================== 网格数据构建 ====================

interface GridCell {
  coord: string
  room: RoomConfig | null
  explored: boolean
  isCurrent: boolean
  isAdjacent: boolean
  col: number
  row: number
}

const gridData = computed<GridCell[][]>(() => {
  const rows: GridCell[][] = []
  for (let rowIdx = visibleRowRange.value.min; rowIdx <= visibleRowRange.value.max; rowIdx++) {
    const cells: GridCell[] = []
    for (let colIdx = visibleColRange.value.min; colIdx <= visibleColRange.value.max; colIdx++) {
      const colLabel = MAP_GRID_CONFIG.COL_LABELS[colIdx]
      const coord = `${colLabel}${rowIdx + 1}`
      const room = getRoom(coord) ?? null
      const explored = props.state.player.explored_rooms.includes(coord)
      const isCurrent = props.state.player.position === coord
      const isAdjacent = props.adjacentRoomIds.includes(coord)

      cells.push({ coord, room, explored, isCurrent, isAdjacent, col: colIdx, row: rowIdx })
    }
    rows.push(cells)
  }
  return rows
})

// ==================== 房间锁定判定 ====================

/**
 * 检查房间是否被锁定（requires 条件未满足）
 * 逻辑与 engine.ts 的 moveRoom / getAdjacentRooms 一致，额外补充 global_flag_false
 */
function isRoomLocked(room: RoomConfig): boolean {
  for (const req of room.requires) {
    if (req.item && !hasItem(props.state.player, req.item)) return true
    if (req.global_flag) {
      const key = req.global_flag as keyof typeof props.state.global
      if (!props.state.global[key]) return true
    }
    if (req.global_flag_false) {
      const key = req.global_flag_false as keyof typeof props.state.global
      if (props.state.global[key]) return true
    }
    if (req.flag && !props.state.player.flags[req.flag]) return true
  }
  return false
}

// ==================== 连线计算 ====================

interface ConnectionLine {
  x1: number
  y1: number
  x2: number
  y2: number
  isCurrentLink: boolean
}

/**
 * 计算当前房间可通行路径的连线
 * 使用 viewBox 0-100 坐标空间
 *
 * ==================== 连线绘制条件 ====================
 * 仅从当前所在房间出发，检查其 exits 配置的每个方向：
 * 1. 当前房间在该方向有 exit 指向某个目标坐标
 * 2. 目标房间存在于可见网格中
 * 3. 目标房间未锁定（requires 条件已满足）
 *
 * 效果：站在 B3 时只看到 B3→C3 的线（B3 无 north→B2 出口）；
 *       站在 B2 时能看到 B2→B3 和 B2→C2 的线。
 */
const connectionLines = computed<ConnectionLine[]>(() => {
  const lines: ConnectionLine[] = []
  const data = gridData.value
  const rows = data.length
  if (rows === 0) return lines
  const cols = data[0].length
  if (cols === 0) return lines

  // 定位当前房间在网格中的行列
  let curRow = -1
  let curCol = -1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (data[r][c].isCurrent) {
        curRow = r
        curCol = c
        break
      }
    }
    if (curRow >= 0) break
  }
  if (curRow < 0) return lines

  const currentCell = data[curRow][curCol]
  if (!currentCell.room) return lines

  function centerX(gcIdx: number): number {
    return (gcIdx + 0.5) * 100 / cols
  }
  function centerY(grIdx: number): number {
    return (grIdx + 0.5) * 100 / rows
  }

  // 逐方向检查当前房间的出口
  // 方向 → 网格偏移量
  const directions: { exit: 'north' | 'south' | 'east' | 'west'; dr: number; dc: number }[] = [
    { exit: 'north', dr: -1, dc: 0 },
    { exit: 'south', dr: 1, dc: 0 },
    { exit: 'east', dr: 0, dc: 1 },
    { exit: 'west', dr: 0, dc: -1 },
  ]

  for (const dir of directions) {
    const targetCoord = currentCell.room.exits[dir.exit]
    if (!targetCoord) continue

    const tr = curRow + dir.dr
    const tc = curCol + dir.dc
    if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue

    const targetCell = data[tr][tc]
    if (!targetCell?.room) continue
    if (targetCell.coord !== targetCoord) continue
    if (isRoomLocked(targetCell.room)) continue

    lines.push({
      x1: centerX(curCol), y1: centerY(curRow),
      x2: centerX(tc), y2: centerY(tr),
      isCurrentLink: true,
    })
  }

  return lines
})

function onCellClick(cell: GridCell): void {
  if (cell.isAdjacent && cell.room) {
    emit('move', cell.coord)
  }
}

function cellClass(cell: GridCell): string {
  if (!cell.room) return 'grid-cell-void'
  if (cell.isCurrent) return 'grid-cell-current'
  if (cell.isAdjacent) return 'grid-cell-adjacent'
  if (cell.explored) return 'grid-cell-explored'
  return 'grid-cell-unknown'
}

function shortLabel(type: RoomConfig['type']): string {
  const labels: Record<string, string> = {
    start: '始', combat: '战', elite: '精', boss: '王',
    medical: '医', lab: '实', security: '安', utility: '设',
    corridor: '廊', storage: '库', rest: '休', exit: '出',
    locked: '锁', hidden: '密',
  }
  return labels[type] ?? '·'
}
</script>

<template>
  <div 
    class="dungeon-grid-map" 
    :class="{ 'radar-mode': radius === 1 }"
    :style="gridScaleStyle"
  >
    <div class="fog-overlay"></div>
    <div class="grid-wrapper">
      <div class="grid-content">
        <!-- SVG 连线覆盖层 -->
        <svg class="connection-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            v-for="(line, idx) in connectionLines"
            :key="'conn-' + idx"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :class="['conn-line', { 'conn-line-active': line.isCurrentLink }]"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <div 
          v-for="(row, rowIdx) in gridData" 
          :key="rowIdx" 
          class="grid-row"
        >
          <div
            v-for="cell in row"
            :key="cell.coord"
            :class="['grid-cell', cellClass(cell)]"
            :title="cell.room ? `${cell.coord} ${cell.room.name}` : cell.coord"
            @click="onCellClick(cell)"
          >
            <template v-if="cell.room && (cell.explored || cell.isCurrent || cell.isAdjacent)">
              <span class="cell-label">{{ shortLabel(cell.room.type) }}</span>
              <span v-if="cell.isCurrent" class="cell-coord-tag">{{ cell.coord }}</span>
              <span v-else-if="cell.explored" class="cell-coord-tag">{{ cell.coord }}</span>
            </template>
            <template v-else-if="cell.room && !cell.explored">
              <span class="cell-unknown">？</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dungeon-grid-map {
  background: #06060c;
  border: 1px solid rgba(0, 200, 255, 0.25);
  border-radius: 6px;
  padding: 8px;
  overflow: hidden;
  height: 100%;
  width: 100%;
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.08), inset 0 0 12px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  /* CSS 变量：由 gridScaleStyle 动态设置 */
  --grid-cols: 5;
  --grid-rows: 5;
}

.fog-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.3) 65%, rgba(0, 0, 0, 0.7) 100%);
}

/* ==================== 网格包装器 ==================== */
.grid-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

/* ==================== 网格内容 ==================== */
.grid-content {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: 3px;
  position: relative;
  
  /* 动态计算尺寸：保持正方形比例，同时填充容器 */
  width: min(
    calc(100% - 8px),
    calc((100% - 8px) * var(--aspect-ratio, 1))
  );
  height: min(
    calc(100% - 8px),
    calc((100% - 8px) / var(--aspect-ratio, 1))
  );
  
  /* 确保最小尺寸 */
  min-width: 0;
  min-height: 0;
}

/* ==================== SVG 连线覆盖层 ==================== */
.connection-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  filter: drop-shadow(0 0 2px rgba(6, 182, 212, 0.3));
}

.conn-line {
  stroke: rgba(6, 182, 212, 0.6);
  stroke-width: 2;
  stroke-dasharray: 4 4;
  stroke-linecap: round;
  fill: none;
  animation: dash-flow 1.2s linear infinite;
}

.conn-line-active {
  stroke: #22d3ee;
  stroke-width: 2.5;
  animation: dash-flow 0.8s linear infinite;
}

@keyframes dash-flow {
  to { stroke-dashoffset: -8; }
}

/* ==================== 网格行（在 CSS Grid 中不再需要，但为了过渡保留） ==================== */
.grid-row {
  display: contents;
}

/* ==================== 网格单元格 ==================== */
.grid-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.15s;
  position: relative;
  z-index: 10;
  border: 1px solid #1e293b;
  background: #050507;
  
  /* 字体大小根据容器自适应 */
  font-size: clamp(12px, 2.5vw, 20px);
  min-width: 0;
  min-height: 0;
}

/* ==================== 雷达模式（3×3） ==================== */
.radar-mode .grid-content {
  gap: 24px;
}

.radar-mode .grid-cell {
  border-radius: 6px;
}

.grid-cell-void {
  background: #030305;
  border: 1px solid #0a0a14;
}

.grid-cell-unknown {
  background: #050507;
  border: 1px solid #1e293b;
}

.grid-cell-explored {
  background: #050507;
  border: 1px solid #2a3a4e;
  cursor: pointer;
}

.grid-cell-explored:hover {
  border-color: #3a5a7e;
  background: #0a0a14;
}

.grid-cell-adjacent {
  background: #050507;
  border: 1px solid rgba(6, 182, 212, 0.6);
  cursor: pointer;
  animation: pulse-border 1.5s infinite;
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.15);
}

.grid-cell-adjacent:hover {
  background: #0a1018;
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
}

.grid-cell-current {
  background: #050507;
  border: 2px solid #ff3366;
  box-shadow: 0 0 12px rgba(255, 51, 102, 0.5);
}

@keyframes pulse-border {
  0%, 100% { border-color: rgba(6, 182, 212, 0.6); }
  50% { border-color: rgba(0, 255, 136, 0.5); }
}

.cell-label {
  font-size: clamp(14px, 3vw, 24px);
  font-weight: bold;
  color: #88aacc;
  line-height: 1;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.radar-mode .cell-label {
  font-size: clamp(20px, 5vw, 36px);
}

.grid-cell-current .cell-label {
  color: #ff6688;
  text-shadow: 0 0 6px rgba(255, 51, 102, 0.5);
}

.grid-cell-adjacent .cell-label {
  color: #00c8ff;
  text-shadow: 0 0 4px rgba(0, 200, 255, 0.3);
}

.cell-coord-tag {
  font-size: clamp(7px, 1.2vw, 10px);
  font-family: 'Courier New', monospace;
  color: rgba(100, 130, 160, 0.4);
  margin-top: 2px;
  line-height: 1;
}

.radar-mode .cell-coord-tag {
  font-size: clamp(9px, 1.8vw, 12px);
  color: rgba(100, 130, 160, 0.6);
}

.cell-unknown {
  font-size: clamp(14px, 3vw, 24px);
  color: #1a1a2e;
  font-weight: bold;
}

.radar-mode .cell-unknown {
  font-size: clamp(20px, 5vw, 32px);
}
</style>
