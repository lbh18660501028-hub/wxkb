/**
 * 副本系统 V2 — 三列战术驾驶舱
 *
 * ==================== 设计理念 ====================
 * 全屏无滚动条军事级 HUD 布局
 * 三列结构：左22% 终端日志 | 中56% 战术矩阵 | 右22% 导航锚点
 * 暗黑科幻主题：void black + neon cyan + radioactive green
 *
 * ==================== 页面结构 ====================
 * - 顶部全宽横幅：位置遥测 + 主神倒计时 + 撤离按钮
 * - 左列(22%)：终端主日志流 + 过滤标签
 * - 中列(56%)：上层(70%) 雷达+节点信息 | 下层(30%) 后勤保障部
 * - 右列(22%)：上层(60%) 任务追踪 | 下层(40%) 全局小地图
 */
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useGameStore } from '../../stores/game'
import { useDungeonV2 } from '../../composables/useDungeonV2'
import DungeonGridMap from '../dungeon/DungeonGridMap.vue'
import DungeonMiniMap from '../dungeon/DungeonMiniMap.vue'
import DungeonCombatOverlay from '../dungeon/DungeonCombatOverlay.vue'
import DungeonEventPopup from '../dungeon/DungeonEventPopup.vue'
import DungeonTransitionOverlay from '../dungeon/DungeonTransitionOverlay.vue'
import type { ConditionalAction, ItemConfig, DungeonLogEntry } from '../../types/dungeon-v2'

const store = useGameStore()
const dungeon = useDungeonV2()

// ==================== 日志过滤 ====================

type LogFilter = 'all' | 'combat' | 'system' | 'plot'
const logFilter = ref<LogFilter>('all')

const filteredLogs = computed<DungeonLogEntry[]>(() => {
  const logs = dungeon.visibleLogs.value
  switch (logFilter.value) {
    case 'combat':
      return logs.filter(l => l.type === 'danger' || l.type === 'warning')
    case 'system':
      return logs.filter(l => l.type === 'info')
    case 'plot':
      return logs.filter(l => l.type === 'gold' || l.type === 'success')
    default:
      return logs
  }
})

// ==================== 终端日志自动滚动 ====================
const terminalBodyRef = ref<HTMLDivElement | null>(null)

function scrollTerminalToBottom(): void {
  nextTick(() => {
    if (terminalBodyRef.value) {
      terminalBodyRef.value.scrollTop = terminalBodyRef.value.scrollHeight
    }
  })
}

watch(
  () => [
    filteredLogs.value.length,
    filteredLogs.value[filteredLogs.value.length - 1]?.id ?? null,
    logFilter.value,
  ],
  () => {
    scrollTerminalToBottom()
  },
  { flush: 'post', immediate: true },
)

// ==================== 辅助函数 ====================

function getInfectionColor(value: number): string {
  if (value <= 30) return '#00ff88'
  if (value <= 60) return '#ffd700'
  if (value <= 80) return '#ff8800'
  return '#ff3366'
}

function getAlertColor(value: number): string {
  // 优先使用副本提供的警戒阶段配色
  const tier = dungeon.currentAlertTier.value
  if (tier) return tier.color
  // 后备：无警戒配置时用默认配色
  if (value <= 25) return '#00ff88'
  if (value <= 50) return '#ffd700'
  if (value <= 75) return '#ff8800'
  return '#ff3366'
}

function npcRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    calm_analyst: '分析',
    reckless_charger: '突击',
    selfish_survivor: '求生',
    guide: '引导',
    movie_alice: '艾莉丝',
    movie_rain: '小雨',
    movie_kaplan: '黑客',
    movie_matt: '线索',
    movie_spence: '可疑',
    movie_one: '队长',
    movie_jd: '火力',
  }
  return labels[role] ?? role
}

function npcRoleColor(role: string): string {
  const colors: Record<string, string> = {
    calm_analyst: '#00c8ff',
    reckless_charger: '#ff3366',
    selfish_survivor: '#ffd700',
    guide: '#00ff88',
    movie_alice: '#d8f0ff',
    movie_rain: '#ff5577',
    movie_kaplan: '#00c8ff',
    movie_matt: '#d0b070',
    movie_spence: '#aa66ff',
    movie_one: '#ffaa00',
    movie_jd: '#ff8844',
  }
  return colors[role] ?? '#aaaacc'
}

function questStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    locked: '锁定', available: '可接', active: '进行中',
    completed: '完成', failed: '失败',
  }
  return labels[status] ?? status
}

function questStatusColor(status: string): string {
  const colors: Record<string, string> = {
    locked: '#4a4a6a', available: '#00c8ff', active: '#ffd700',
    completed: '#00ff88', failed: '#ff3366',
  }
  return colors[status] ?? '#aaaacc'
}

function itemTypeColor(type: string): string {
  const colors: Record<string, string> = {
    temporary: '#3a3a4e', permanent: '#00c8ff', quest: '#ff3366',
    weapon: '#ff3366', medical: '#00ff88', tool: '#ffaa00', key: '#ffd700',
  }
  return colors[type] ?? '#3a3a4e'
}

function itemTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    temporary: 'T', permanent: 'P', quest: 'Q', weapon: 'W',
    medical: 'M', tool: 'U', key: 'K',
  }
  return icons[type] ?? '?'
}

/** 判断触发型状态是否进入紧急状态 */
function isTriggeredCritical(ts: { critical_threshold?: number; value: number }): boolean {
  return ts.critical_threshold !== undefined && ts.value <= ts.critical_threshold
}

// ==================== 统一动作列表 ====================

interface UnifiedAction {
  id: string
  label: string
  turnCost: number
  kind: 'conditional' | 'search'
  action?: ConditionalAction
  quick?: boolean
  /** 是否已检定失败（灰色显示，但可点击弹出意志力重试） */
  failed?: boolean
  /** 是否高亮（由选中物体触发） */
  highlighted?: boolean
}

// ==================== 可互动物体 ====================

/** 统一的可互动物体芯片（物品 + NPC + Interactable） */
interface InteractableChip {
  /** 唯一 key */
  key: string
  /** 显示名称 */
  name: string
  /** 类型：物品、NPC 或 Interactable（新对话驱动系统） */
  type: 'object' | 'npc' | 'interactable'
  /** 物品名称（type='object' 时有效，用于匹配 linked_object） */
  objectName?: string
  /** NPC ID（type='npc' 时有效） */
  npcId?: string
  /** NPC 角色（type='npc' 时有效） */
  role?: string
  /** 是否为纯描述性物体（无关联动作，仅 type='object' 有效） */
  decorative: boolean
  /** 是否有关联动作 */
  hasAction: boolean
  /** Interactable 对象（type='interactable' 时有效） */
  interactable?: import('../../types/dungeon-v2').DungeonInteractable
  /** 是否已禁用（条件不满足） */
  disabled?: boolean
  /** 禁用提示文本 */
  unmetText?: string
  /** 图标（emoji 字符） */
  icon?: string
  /** NPC 是否有对话事件（type='npc' 时有效） */
  hasDialogue?: boolean
}

/** 统一可互动物体列表（Interactable 优先 → NPC → 物品） */
const interactableList = computed<InteractableChip[]>(() => {
  const chips: InteractableChip[] = []

  // ==================== 新系统：Interactable（对话驱动） ====================
  const newInteractables = dungeon.currentRoomInteractables.value
  const interactableIds = new Set<string>()
  const interactableNames = new Set<string>()

  for (const item of newInteractables) {
    chips.push({
      key: 'int_' + item.interactable.id,
      name: item.interactable.name,
      type: 'interactable',
      interactable: item.interactable,
      decorative: false,
      hasAction: true,
      disabled: !item.enabled,
      unmetText: item.unmetText,
      icon: item.interactable.icon,
    })
    interactableIds.add(item.interactable.id)
    if (item.interactable.name) {
      interactableNames.add(item.interactable.name)
    }
  }

  // ==================== NPC（旧系统，跳过已有 interactable 的 NPC） ====================
  if (dungeon.state.value) {
    const playerPos = dungeon.state.value.player.position
    for (const npc of dungeon.state.value.npcs) {
      if (npc.alive && npc.follow_state !== 'dead' && npc.follow_state !== 'following' && npc.current_room === playerPos) {
        // 如果该 NPC 已有 interactable 条目，跳过
        if (interactableIds.has(npc.id)) continue

        const hasDialogue = dungeon.npcHasDialogue(npc)
        chips.push({
          key: 'npc_' + npc.id,
          name: npc.name,
          type: 'npc',
          npcId: npc.id,
          role: npc.role,
          decorative: false,
          hasAction: true,
          hasDialogue,
        })
      }
    }
  }

  // ==================== 旧系统：房间静态可见物体 ====================
  const room = dungeon.currentRoom.value
  if (room) {
    for (const name of room.visible_objects) {
      // 跳过与新 interactable 同名的物体
      if (interactableNames.has(name)) continue
      const hasAction = room.conditional_actions.some(a => a.linked_object === name)
      chips.push({
        key: 'obj_' + name,
        name,
        type: 'object',
        objectName: name,
        decorative: !hasAction,
        hasAction,
      })
    }
  }

  return chips
})

/** 点击可互动物芯片 */
function onChipClick(chip: InteractableChip): void {
  // 新系统：Interactable → 触发对话事件
  if (chip.type === 'interactable' && chip.interactable) {
    if (chip.disabled) return
    dungeon.interactWithObject(chip.interactable)
    return
  }

  // NPC：优先检查是否有对话事件
  if (chip.type === 'npc' && chip.npcId) {
    const npc = dungeon.state.value?.npcs.find(n => n.id === chip.npcId)
    if (npc && chip.hasDialogue) {
      dungeon.triggerNpcDialogue(npc)
      return
    }
    // 无对话配置的 NPC → 旧交互面板
    dungeon.selectNpc(chip.npcId)
    dungeon.clearSelectedObject()
    return
  }

  // 旧系统：物体 → 选中并显示关联动作
  if (chip.type === 'object' && chip.hasAction && chip.objectName) {
    dungeon.selectObject(chip.objectName)
    dungeon.clearSelectedNpc()
  }
  // 纯描述性物体点击无效果
}

/** 当前选中的芯片 key（用于高亮） */
const selectedChipKey = computed<string | null>(() => {
  if (dungeon.selectedNpcId.value) return 'npc_' + dungeon.selectedNpcId.value
  if (dungeon.selectedObject.value) return 'obj_' + dungeon.selectedObject.value
  return null
})

/** 搜索动作（始终显示，不依赖物体选择） */
const searchActions = computed<UnifiedAction[]>(() => {
  const actions: UnifiedAction[] = []
  const roomSearched = dungeon.isCurrentRoomSearched.value
  if (!roomSearched && dungeon.defaultActions.value.includes('quick_search')) {
    actions.push({ id: 'quick_search', label: '快速搜索', turnCost: 1, kind: 'search', quick: true })
  }
  if (!roomSearched && dungeon.defaultActions.value.includes('deep_search')) {
    actions.push({ id: 'deep_search', label: '彻底搜索', turnCost: 2, kind: 'search', quick: false })
  }
  return actions
})

/** 条件动作（按 selectedObject 过滤） */
const objectActions = computed<UnifiedAction[]>(() => {
  const actions: UnifiedAction[] = []
  const failedIds = dungeon.failedActionIds.value
  const selectedObj = dungeon.selectedObject.value

  for (const action of dungeon.availableActions.value) {
    // 有 linked_object 的动作：仅在选中对应物体时显示
    if (action.linked_object) {
      if (selectedObj === action.linked_object) {
        actions.push({
          id: action.id, label: action.label,
          turnCost: action.turn_cost ?? 1, kind: 'conditional', action,
          highlighted: true,
        })
      }
    } else {
      // 无 linked_object 的动作始终显示
      actions.push({
        id: action.id, label: action.label,
        turnCost: action.turn_cost ?? 1, kind: 'conditional', action,
      })
    }
  }

  // 已失败但可重试的动作（灰色显示）
  for (const action of dungeon.retryableActions.value) {
    if (!failedIds.includes(action.id)) continue
    // 有 linked_object 的失败动作也只在选中时显示
    if (action.linked_object && selectedObj !== action.linked_object) continue
    actions.push({
      id: action.id + '_failed', label: action.label + ' [失败]',
      turnCost: action.turn_cost ?? 1, kind: 'conditional', action,
      failed: true,
    })
  }

  return actions
})

/** 全部可见动作（搜索 + 条件） */
const allActions = computed<UnifiedAction[]>(() => {
  return [...searchActions.value, ...objectActions.value]
})

function executeAction(action: UnifiedAction): void {
  if (action.kind === 'conditional' && action.action) {
    if (action.failed) {
      // 点击已失败的按钮 → 弹出意志力重试对话框
      showRetryDialog(action.action)
    } else {
      dungeon.doAction(action.action)
    }
  } else if (action.kind === 'search') {
    dungeon.doSearch(action.quick ?? true)
  }
}

// ==================== 意志力重试对话框 ====================

const retryDialogVisible = ref(false)
const retryTargetAction = ref<ConditionalAction | null>(null)

function showRetryDialog(action: ConditionalAction): void {
  retryTargetAction.value = action
  retryDialogVisible.value = true
}

function confirmRetry(): void {
  if (retryTargetAction.value) {
    dungeon.doRetryWithWillpower(retryTargetAction.value)
  }
  retryDialogVisible.value = false
  retryTargetAction.value = null
}

function cancelRetry(): void {
  retryDialogVisible.value = false
  retryTargetAction.value = null
}

// ==================== 道具系统 ====================

const CARGO_SLOT_COUNT = 16

const cargoSlots = computed<(ItemConfig | null)[]>(() => {
  const items = dungeon.playerItems.value
  const slots: (ItemConfig | null)[] = []
  for (let i = 0; i < CARGO_SLOT_COUNT; i++) {
    slots.push(items[i] ?? null)
  }
  return slots
})

const selectedItem = ref<ItemConfig | null>(null)
const showItemDiagnostics = computed(() => selectedItem.value !== null)

function onCargoClick(item: ItemConfig | null): void {
  if (!item) return
  selectedItem.value = selectedItem.value?.id === item.id ? null : item
}

function useSelectedItem(): void {
  if (!selectedItem.value) return
  if (selectedItem.value.use_effect) {
    dungeon.doUseItem(selectedItem.value.id)
  }
  selectedItem.value = null
}

function useSelectedItemOnNpc(): void {
  if (!selectedItem.value || !dungeon.selectedNpc.value) return
  if (selectedItem.value.use_effect && selectedItem.value.usable_targets.includes('npc')) {
    dungeon.doUseItem(selectedItem.value.id, dungeon.selectedNpc.value.id)
  }
  selectedItem.value = null
}

function equipSelectedWeapon(): void {
  if (!selectedItem.value) return
  dungeon.doEquipWeapon(selectedItem.value.id)
  selectedItem.value = null
}

function discardSelectedItem(): void {
  selectedItem.value = null
}

// ==================== 状态图标 ====================

const statusIcons = computed<{ icon: string; title: string }[]>(() => {
  const icons: { icon: string; title: string }[] = []
  if (dungeon.powerRestored.value) icons.push({ icon: '⚡', title: '电力已恢复' })
  if (dungeon.laserDisabled.value) icons.push({ icon: '🔓', title: '激光已关闭' })
  if (dungeon.aiProcessed.value) icons.push({ icon: '🤖', title: 'AI已处理' })
  return icons
})

// ==================== 位置遥测 ====================

const locationTelemetry = computed(() => {
  const room = dungeon.currentRoom.value
  const area = room?.area ?? '未知区域'
  const name = room?.name ?? '未知'
  return `ZONE: ${area} — ${name}`
})
</script>

<template>
  <div class="cockpit">
    <!-- ==================== 主神投放过渡特效 ==================== -->
    <DungeonTransitionOverlay
      v-if="dungeon.showTransition.value"
      @done="dungeon.finishTransition"
    />

    <!-- ==================== 副本选择界面 ==================== -->
    <div v-if="dungeon.mode.value === 'select'" class="select-screen">
      <h2 class="select-title">副本选择 / DUNGEON SELECT</h2>
      <div class="dungeon-list">
        <div
          v-for="d in dungeon.dungeonList.value"
          :key="d.id"
          class="dungeon-card"
          @click="dungeon.enterDungeon(d.id)"
        >
          <div class="dungeon-card-header">
            <span class="dungeon-tier">{{ d.tier }}级</span>
            <span class="dungeon-name">{{ d.name }}</span>
          </div>
          <div class="dungeon-desc">{{ d.description }}</div>
          <div class="dungeon-meta">
            <span>难度: {{ d.difficulty }}</span>
            <span>推荐: Lv.{{ d.min_level }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 三列战术驾驶舱 ==================== -->
    <div v-else-if="dungeon.isExploring.value || dungeon.inCombat.value || dungeon.hasEvent.value" class="tc-main">
      <!-- ========== 顶部全宽横幅 ========== -->
      <div class="tc-banner">
        <!-- 左：位置遥测 -->
        <div class="banner-left">
          <span class="banner-zone-icon">◆</span>
          <span class="banner-zone-text">{{ locationTelemetry }}</span>
        </div>

        <!-- 中：状态条 + 触发型状态 -->
        <div class="banner-center">
          <!-- 常驻状态条 -->
          <div class="status-strip">
            <div class="ss-item">
              <span class="ss-label" style="color: #00ff88">感染</span>
              <span class="ss-val" :style="{ color: getInfectionColor(dungeon.playerInfection.value) }">{{ dungeon.playerInfection.value }}</span>
            </div>
            <span class="ss-sep">/</span>
            <div class="ss-item">
              <span class="ss-label" style="color: #ffaa00">警戒</span>
              <span class="ss-val" :style="{ color: getAlertColor(dungeon.securityAlert.value) }">{{ dungeon.securityAlert.value }}{{ dungeon.currentAlertTier.value ? ` ${dungeon.currentAlertTier.value.name}` : '' }}</span>
            </div>
            <span class="ss-sep">/</span>
            <div class="ss-item">
              <span class="ss-label" style="color: #00c8ff">回合</span>
              <span class="ss-val" style="color: #fff">{{ dungeon.turnCount.value }}/{{ dungeon.maxTurns.value }}</span>
            </div>
          </div>

          <!-- 触发型状态（模块化，仅在触发后显示） -->
          <div
            v-for="ts in dungeon.triggeredStatuses.value"
            :key="ts.id"
            :class="['ts-badge', { 'ts-critical': isTriggeredCritical(ts) }]"
          >
            <span class="ts-icon">⚠</span>
            <span class="ts-label" :style="{ color: isTriggeredCritical(ts) ? '#ff3366' : ts.color }">{{ ts.label }}</span>
            <span class="ts-val" :style="{ color: isTriggeredCritical(ts) ? '#ff3366' : ts.color }">{{ ts.value }}{{ ts.unit }}</span>
          </div>
        </div>

        <!-- 右：撤离按钮 -->
        <div class="banner-right">
          <div class="banner-status-icons">
            <span v-for="s in statusIcons" :key="s.title" class="banner-status-icon" :title="s.title">{{ s.icon }}</span>
          </div>
          <button class="abort-btn" @click="dungeon.exitDungeon()">[ 中止渗透 / 撤离 ]</button>
        </div>
      </div>

      <!-- ========== 三列主体 ========== -->
      <div class="tc-columns">
        <!-- ==================== 左列 22% — 终端主日志流 ==================== -->
        <div class="col-left">
          <div class="terminal-feed">
            <div class="terminal-header">
              <span class="terminal-title">▌终端主日志 // TERMINAL FEED</span>
              <span class="terminal-count">{{ filteredLogs.length }}</span>
            </div>
            <div ref="terminalBodyRef" class="terminal-body">
              <div
                v-for="log in filteredLogs"
                :key="log.id"
                :class="['terminal-entry', 'log-' + log.type]"
              >
                <span class="terminal-turn">[T{{ log.turn }}]</span>
                <span class="terminal-text">{{ log.text }}</span>
              </div>
              <div v-if="filteredLogs.length === 0" class="terminal-empty">
                [ 无日志记录 ]
              </div>
            </div>
            <!-- 过滤标签 -->
            <div class="terminal-filters">
              <button
                v-for="f in (['all', 'combat', 'system', 'plot'] as LogFilter[])"
                :key="f"
                :class="['filter-tab', { active: logFilter === f }]"
                @click="logFilter = f"
              >
                {{ f === 'all' ? '全部' : f === 'combat' ? '战斗' : f === 'system' ? '系统' : '剧情' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ==================== 中列 56% — 战术矩阵 ==================== -->
        <div class="col-center">
          <!-- 上层 70%：雷达 + 节点信息 -->
          <div class="center-top">
            <!-- 左侧 col-span-7：3x3 邻近雷达 -->
            <div class="radar-panel">
              <div class="panel-header">
                <span class="panel-title">▌邻近雷达 // PROXIMITY RADAR</span>
              </div>
              <div class="radar-content">
                <DungeonGridMap
                  :state="dungeon.state.value!"
                  :adjacent-room-ids="dungeon.adjacentRooms.value.map(r => r.roomId)"
                  :radius="1"
                  @move="dungeon.moveToRoom"
                />
              </div>
            </div>

            <!-- 右侧 col-span-5：当前节点信息 / 道具诊断 -->
            <div class="sightings-panel">
              <!-- 道具诊断覆盖层 -->
              <template v-if="showItemDiagnostics && selectedItem">
                <div class="panel-header">
                  <span class="panel-title">▌道具诊断 // ITEM DIAGNOSTICS</span>
                </div>
                <div class="diagnostics-body">
                  <div class="diag-name" :style="{ color: itemTypeColor(selectedItem.type) }">
                    {{ selectedItem.name }}
                  </div>
                  <div class="diag-type">[{{ selectedItem.type.toUpperCase() }}]</div>
                  <div class="diag-desc">{{ selectedItem.description }}</div>
                  <div class="diag-buttons">
                    <button
                      v-if="selectedItem.use_effect"
                      class="diag-btn diag-use"
                      @click="useSelectedItem"
                    >[ 使用道具 ]</button>
                    <button
                      v-if="selectedItem.use_effect && selectedItem.usable_targets.includes('npc') && dungeon.selectedNpc.value"
                      class="diag-btn diag-use"
                      @click="useSelectedItemOnNpc"
                    >[ 对 {{ dungeon.selectedNpc.value.name }} 使用 ]</button>
                    <button
                      v-if="selectedItem.type === 'weapon'"
                      class="diag-btn diag-use"
                      @click="equipSelectedWeapon"
                    >[ 装备武器 ]</button>
                    <button class="diag-btn diag-discard" @click="discardSelectedItem">[ 丢弃 ]</button>
                    <button class="diag-btn diag-return" @click="selectedItem = null">[ 返回扫描 ]</button>
                  </div>
                </div>
              </template>

              <!-- 默认：当前节点信息 -->
              <template v-else>
                <div class="panel-header">
                  <span class="panel-title">▌当前节点 // TILE SIGHTINGS</span>
                </div>
                <div class="sightings-body">
                  <div class="sight-coord">{{ dungeon.state.value?.player.position }}</div>
                  <div class="sight-name">{{ dungeon.currentRoom.value?.name ?? '未知' }}</div>
                  <div class="sight-area">{{ dungeon.currentRoom.value?.area ?? '' }}</div>
                  <div class="sight-desc">{{ dungeon.roomDescription.value }}</div>
                  <!-- 上半区：可互动物 -->
                  <div v-if="interactableList.length" class="interact-top">
                    <div class="interact-section-label">▸ 可互动物</div>
                    <div class="sight-objects">
                      <div
                        v-for="chip in interactableList"
                        :key="chip.key"
                        :class="[
                          'sight-obj-chip',
                          {
                            'obj-npc': chip.type === 'npc',
                            'obj-interactable': chip.type === 'interactable',
                            'obj-decorative': chip.decorative,
                            'obj-selected': selectedChipKey === chip.key,
                            'obj-disabled': chip.disabled,
                          },
                        ]"
                        :title="chip.unmetText ?? (chip.interactable?.description ?? '')"
                        @click="onChipClick(chip)"
                      >
                        <span v-if="chip.type === 'interactable' && chip.icon" class="obj-interactable-icon">{{ chip.icon }}</span>
                        <span v-else-if="chip.type === 'npc'" class="obj-npc-icon">{{ chip.hasDialogue ? '💬' : '👤' }}</span>
                        {{ chip.name }}
                      </div>
                    </div>
                  </div>
                  <!-- 下半区：互动操作 -->
                  <div class="interact-bottom">
                    <div class="interact-section-label">▸ 互动操作</div>
                    <!-- 选中 NPC 时：显示 NPC 交互面板 -->
                    <div v-if="dungeon.selectedNpc.value" class="npc-interact-panel">
                      <div class="npc-interact-header">
                        <span class="npc-interact-name" :style="{ color: npcRoleColor(dungeon.selectedNpc.value.role) }">
                          {{ dungeon.selectedNpc.value.name }}
                        </span>
                        <span class="npc-interact-identity">{{ dungeon.selectedNpc.value.identity }}</span>
                        <button class="npc-interact-close" @click="dungeon.clearSelectedNpc()">×</button>
                      </div>
                      <div class="npc-interact-body">
                        <div
                          v-for="interaction in dungeon.npcInteractions.value"
                          :key="interaction.type"
                          class="npc-interact-btn"
                          @click="dungeon.interactWithNpc(interaction)"
                        >
                          <span class="npc-interact-label">{{ interaction.label }}</span>
                          <span v-if="interaction.turn_cost > 0" class="npc-interact-cost">{{ interaction.turn_cost }}T</span>
                        </div>
                      </div>
                    </div>
                    <!-- 未选中 NPC 时：显示动作按钮（搜索 + 物体关联动作） -->
                    <div v-else class="sight-actions">
                      <button
                        v-for="action in allActions"
                        :key="action.id"
                        :class="['sight-action-btn', { 'sight-action-failed': action.failed, 'sight-action-highlighted': action.highlighted }]"
                        @click="executeAction(action)"
                      >
                        {{ action.label }}
                        <span v-if="action.turnCost" class="action-cost">{{ action.turnCost }}T</span>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 下层 30%：后勤保障部 -->
          <div class="center-bottom">
            <div class="logistics-hub">
              <div class="logistics-corner"></div>
              <!-- Row 1: 货物系统 -->
              <div class="cargo-section">
                <div class="cargo-label">[ 渗透载荷系统 // CARGO ]</div>
                <div class="cargo-hotbar">
                  <div
                    v-for="(slot, idx) in cargoSlots"
                    :key="idx"
                    :class="['cargo-slot', { filled: slot, selected: selectedItem?.id === slot?.id }]"
                    :style="slot ? { borderColor: itemTypeColor(slot.type) } : {}"
                    :title="slot ? `${slot.name} [${slot.type}]${slot.description ? '\n' + slot.description : ''}` : ''"
                    @click="onCargoClick(slot)"
                  >
                    <template v-if="slot">
                      <span class="cargo-icon" :style="{ color: itemTypeColor(slot.type) }">{{ itemTypeIcon(slot.type) }}</span>
                      <span class="cargo-name">{{ slot.name.substring(0, 3) }}</span>
                    </template>
                    <template v-else>
                      <span class="cargo-crosshair">+</span>
                    </template>
                  </div>
                </div>
              </div>
              <!-- 分隔线 -->
              <div class="logistics-divider"></div>
              <!-- Row 2: 盟友生命体征（仅显示已加入队伍的 NPC） -->
              <div class="ally-section">
                <div class="ally-label">[ 临时盟友监控 // ALLY LIFESIGN ]</div>
                <div class="ally-list">
                  <div
                    v-for="npc in dungeon.followingNpcs.value"
                    :key="npc.id"
                    :class="['ally-card', { 'ally-selected': dungeon.selectedNpcId.value === npc.id }]"
                    @click="dungeon.selectNpc(npc.id)"
                  >
                    <div class="ally-header">
                      <span class="ally-name" :style="{ color: npcRoleColor(npc.role) }">{{ npc.name }}</span>
                      <span class="ally-tag" :style="{ color: npcRoleColor(npc.role) }">[{{ npcRoleLabel(npc.role) }}]</span>
                      <span v-if="!npc.is_reincarnator" class="ally-tag" style="color: #ff8800">[副本NPC]</span>
                    </div>
                    <div class="ally-hp-bar">
                      <div class="ally-hp-track">
                        <div class="ally-hp-fill" :style="{ width: (npc.max_hp > 0 ? npc.hp / npc.max_hp * 100 : 0) + '%' }"></div>
                      </div>
                      <span class="ally-hp-value">{{ npc.hp }}/{{ npc.max_hp }}</span>
                    </div>
                    <!-- 信任/恐惧/感染状态条 -->
                    <div class="ally-stats" v-if="npc.is_reincarnator">
                      <div class="ally-stat-row">
                        <span class="ally-stat-label">信任</span>
                        <div class="ally-stat-track">
                          <div class="ally-stat-fill trust" :style="{ width: ((npc.trust + 100) / 2) + '%' }"></div>
                        </div>
                        <span class="ally-stat-num">{{ npc.trust }}</span>
                      </div>
                      <div class="ally-stat-row">
                        <span class="ally-stat-label">恐惧</span>
                        <div class="ally-stat-track">
                          <div class="ally-stat-fill fear" :style="{ width: npc.fear + '%' }"></div>
                        </div>
                        <span class="ally-stat-num">{{ npc.fear }}</span>
                      </div>
                      <div class="ally-stat-row" v-if="npc.infection > 0">
                        <span class="ally-stat-label">感染</span>
                        <div class="ally-stat-track">
                          <div class="ally-stat-fill infection" :style="{ width: npc.infection + '%' }"></div>
                        </div>
                        <span class="ally-stat-num">{{ npc.infection }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="dungeon.followingNpcs.value.length === 0" class="ally-empty">
                    [ 无盟友生命体征监控 ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== 右列 22% — 导航锚点 ==================== -->
        <div class="col-right">
          <!-- 上层 60%：任务追踪 -->
          <div class="right-top">
            <div class="panel-header">
              <span class="panel-title">▌主神任务 // LORD GOD QUESTS</span>
            </div>
            <div class="quest-list">
              <div
                v-for="quest in dungeon.activeQuests.value"
                :key="quest.id"
                class="quest-entry"
              >
                <div class="quest-header">
                  <span class="quest-type" :class="'qt-' + quest.type">{{ quest.type === 'main' ? '主' : '支' }}</span>
                  <span class="quest-title" :style="{ color: questStatusColor(quest.status) }">{{ quest.title }}</span>
                  <span class="quest-status" :style="{ color: questStatusColor(quest.status) }">{{ questStatusLabel(quest.status) }}</span>
                </div>
                <div
                  v-for="obj in quest.objectives"
                  :key="obj.id"
                  :class="['quest-obj', { done: obj.status === 'completed' }]"
                >
                  {{ obj.status === 'completed' ? '✓' : '○' }} {{ obj.description }}
                </div>
              </div>
              <div
                v-for="quest in dungeon.completedQuests.value"
                :key="'done-' + quest.id"
                class="quest-entry quest-done"
              >
                <span class="quest-type qt-main">主</span>
                <span class="quest-title" style="color: #00ff88">✓ {{ quest.title }}</span>
              </div>
              <div v-if="dungeon.activeQuests.value.length === 0 && dungeon.completedQuests.value.length === 0" class="quest-empty">
                [ 暂无任务数据 ]
              </div>
            </div>
          </div>

          <!-- 下层 40%：全局小地图 -->
          <div class="right-bottom">
            <div class="panel-header">
              <span class="panel-title">▌全局拓扑 // TOPOLOGY MAP</span>
            </div>
            <div class="minimap-wrapper">
              <DungeonMiniMap
                :state="dungeon.state.value!"
                @navigate="dungeon.moveToRoom"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 战斗弹窗 ==================== -->
    <DungeonCombatOverlay
      v-if="dungeon.inCombat.value && dungeon.combatState.value"
      :combat="dungeon.combatState.value"
      :squad-npcs="dungeon.followingNpcs.value"
      :player-name="store.name"
      :player-gene-lock-active="store.geneLock.active"
      :player-gene-lock-tier="store.geneLock.activeTier || store.geneLock.tier"
      :player-infection="dungeon.playerInfection.value"
      :logs="dungeon.combatLogs.value"
      :result="dungeon.combatResult.value"
      :rewards="dungeon.combatRewards.value"
      :waiting-for-player="dungeon.isWaitingForPlayer.value"
      :tactics-mode="dungeon.tacticsMode.value"
      :current-turn-uid="dungeon.currentTurnUid.value"
      :player-movable-cells="dungeon.playerMovableCells.value"
      :player-attack-targets="dungeon.playerAttackTargets.value"
      :player-has-moved="dungeon.playerHasMoved.value"
      :player-has-attacked="dungeon.playerHasAttacked.value"
      :combat-input-mode="dungeon.combatInputMode.value"
      :player-abilities="dungeon.playerAbilities.value"
      :selected-ability-id="dungeon.selectedAbilityId.value"
      :ability-range-cells="dungeon.abilityRangeCells.value"
      :valid-target-unit-ids="dungeon.validTargetUnitIds.value"
      :aoe-preview-cells="dungeon.aoePreviewCells.value"
      :aoe-affected-unit-ids="dungeon.aoeAffectedUnitIds.value"
      @close="dungeon.closeCombatOverlay"
      @step="dungeon.stepCombat"
      @flee="dungeon.fleeCombat"
      @process-result="dungeon.processCombatResult"
      @toggle-mode="dungeon.toggleTacticsMode"
      @player-move="dungeon.doPlayerMove"
      @player-attack="dungeon.doPlayerAttack"
      @end-turn="dungeon.doEndPlayerTurn"
      @select-ability="dungeon.selectAbility"
      @cancel-ability="dungeon.cancelAbilitySelection"
      @execute-ability="dungeon.executeAbilityOnTarget"
      @aoe-cell-hover="dungeon.setAoeHoverCell"
      @execute-aoe-ability="dungeon.executeAoeAbility"
    />

    <!-- ==================== 事件弹窗 ==================== -->
    <DungeonEventPopup
      v-if="dungeon.hasEvent.value && dungeon.currentPendingEvent.value"
      :event="dungeon.currentPendingEvent.value"
      :choices="dungeon.currentPendingEvent.value.choices"
      :runtime-state="dungeon.state.value"
      :character="store.characters[0]"
      :session="dungeon.dialogueSession.value"
      :current-dialogue-event="dungeon.currentDialogueEvent.value"
      :resolve-dialogue-option="dungeon.resolveDialogueEventOption"
      @choose="dungeon.chooseEventOption"
      @dismiss="dungeon.dismissEvent"
      @dialogue-complete="dungeon.completeDialogueEvent"
      @select-option="dungeon.selectDialogueOption"
      @close-dialogue="dungeon.closeDialogueSession"
    />

    <!-- ==================== 副本结算界面 ==================== -->
    <div v-if="dungeon.isResult.value && dungeon.ratingResult.value" class="result-screen">
      <div class="result-panel">
        <div :class="['result-rating', 'rating-' + dungeon.ratingResult.value.rating.toLowerCase()]">
          {{ dungeon.ratingResult.value.rating }}
        </div>
        <div class="result-title">{{ dungeon.ratingResult.value.title }}</div>
        <div class="result-desc">{{ dungeon.ratingResult.value.description }}</div>
        <div class="result-stats">
          <div>完成回合: {{ dungeon.turnCount.value }}</div>
          <div>完成任务: {{ dungeon.completedQuests.value.length }}</div>
          <div>存活队友: {{ dungeon.aliveNpcs.value.length }}</div>
          <div>最终感染: {{ dungeon.playerInfection.value }}</div>
        </div>
        <div class="result-reward">奖励倍率: ×{{ dungeon.ratingResult.value.reward_multiplier }}</div>
        <button class="result-exit-btn" @click="dungeon.exitDungeon()">返回</button>
      </div>
    </div>

    <!-- ==================== 失败界面 ==================== -->
    <div v-if="dungeon.isGameOver.value" class="gameover-screen">
      <div class="gameover-panel">
        <div class="gameover-title">副本失败</div>
        <div class="gameover-desc">
          {{ dungeon.state.value?.global.failed ? '你没能活着离开蜂巢……' : '未知原因' }}
        </div>
        <button class="gameover-exit-btn" @click="dungeon.exitDungeon()">返回</button>
      </div>
    </div>

    <!-- ==================== 意志力重试对话框 ==================== -->
    <div v-if="retryDialogVisible" class="retry-overlay">
      <div class="retry-dialog">
        <div class="retry-title">⚠ 检定失败 — 意志力重试</div>
        <div class="retry-desc">
          <div>动作: {{ retryTargetAction?.label ?? '未知' }}</div>
          <div class="retry-willpower">
            当前意志力: {{ dungeon.playerWillpower.value }} / {{ dungeon.playerMaxWillpower.value }}
          </div>
          <div class="retry-cost">消耗 1 点意志力重新检定</div>
        </div>
        <div class="retry-buttons">
          <button
            class="retry-confirm-btn"
            :disabled="dungeon.playerWillpower.value < 1"
            @click="confirmRetry"
          >
            确认重试
          </button>
          <button class="retry-cancel-btn" @click="cancelRetry">
            放弃
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 意志力重试对话框 ==================== */
.retry-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.retry-dialog {
  background: #12121f;
  border: 1px solid #ff3366;
  border-radius: 12px;
  padding: 24px 32px;
  min-width: 360px;
  text-align: center;
}

.retry-title {
  font-size: 18px;
  font-weight: bold;
  color: #ff3366;
  margin-bottom: 16px;
}

.retry-desc {
  font-size: 14px;
  color: #ccccee;
  line-height: 1.8;
  margin-bottom: 20px;
}

.retry-willpower {
  color: #00c8ff;
  font-weight: bold;
}

.retry-cost {
  color: #ffd700;
  font-size: 13px;
}

.retry-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.retry-confirm-btn {
  background: linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(200, 0, 50, 0.2));
  border: 1px solid #ff3366;
  color: #ff3366;
  padding: 8px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.retry-confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(255, 51, 102, 0.3), rgba(200, 0, 50, 0.3));
}

.retry-confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.retry-cancel-btn {
  background: rgba(80, 80, 100, 0.3);
  border: 1px solid rgba(150, 150, 170, 0.4);
  color: #aaaacc;
  padding: 8px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.retry-cancel-btn:hover {
  background: rgba(80, 80, 100, 0.5);
}

.sight-action-failed {
  opacity: 0.4;
  border-color: #ff3366 !important;
  color: #ff3366 !important;
  cursor: pointer !important;
}

.sight-action-failed:hover {
  opacity: 0.7;
}
.cockpit {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #050507;
  color: #ccccee;
  overflow: hidden;
  user-select: none;
  font-size: var(--text-body-sm);
  font-family: 'Courier New', monospace;
}

/* ==================== 副本选择 ==================== */
.select-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.select-title {
  color: #00c8ff;
  font-size: 22px;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.dungeon-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
  width: 100%;
}

.dungeon-card {
  background: #0d0d14;
  border: 1px solid #1a1a2e;
  border-radius: 6px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.dungeon-card:hover { border-color: #00c8ff; background: #0d1a2e; }
.dungeon-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dungeon-tier { background: #1a1a2e; color: #ffd700; padding: 2px 8px; border-radius: 3px; font-size: var(--text-body-sm); font-weight: bold; }
.dungeon-name { color: #00c8ff; font-size: var(--text-body-sm); font-weight: bold; }
.dungeon-desc { color: #88aacc; font-size: var(--text-body-sm); line-height: 1.5; margin-bottom: 6px; }
.dungeon-meta { display: flex; gap: 16px; font-size: var(--text-body-sm); color: #6a6a8a; }

/* ==================== 战术驾驶舱主体 ==================== */
.tc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* ========== 顶部横幅 ========== */
.tc-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #08080c;
  border-bottom: 1px solid #1e2a3e;
  flex-shrink: 0;
  height: 56px;
  gap: 12px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.banner-zone-icon { color: #00c8ff; font-size: var(--text-body-sm); }
.banner-zone-text {
  color: #88aacc;
  font-size: var(--text-body-sm);
  letter-spacing: 1px;
  white-space: nowrap;
}

.banner-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

/* ==================== 常驻状态条 ==================== */
.status-strip {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ss-item {
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.ss-label {
  font-size: var(--text-body-sm);
  font-weight: bold;
  letter-spacing: 1px;
}

.ss-val {
  font-size: var(--text-body-sm);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.ss-sep {
  color: #2a2a3e;
  font-size: var(--text-body-sm);
}

/* ==================== 触发型状态徽章 ==================== */
.ts-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: rgba(255, 51, 102, 0.08);
  border: 1px solid rgba(255, 51, 102, 0.25);
  border-radius: 3px;
  animation: blink-critical 1s infinite;
}

.ts-badge.ts-critical {
  background: rgba(255, 51, 102, 0.12);
  border-color: rgba(255, 51, 102, 0.4);
}

.ts-icon {
  font-size: var(--text-body-sm);
}

.ts-label {
  font-size: var(--text-body-sm);
  font-weight: bold;
  letter-spacing: 1px;
}

.ts-val {
  font-size: var(--text-body-sm);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

@keyframes blink-critical { 50% { opacity: 0.6; } }

.banner-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.banner-status-icons {
  display: flex;
  gap: 3px;
}

.banner-status-icon { font-size: var(--text-body-sm); }

.abort-btn {
  padding: 4px 14px;
  background: transparent;
  color: #ff3366;
  border: 1px solid #4a2a3e;
  border-radius: 2px;
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
}

.abort-btn:hover {
  background: rgba(255, 51, 102, 0.1);
  border-color: #ff3366;
  box-shadow: 0 0 6px rgba(255, 51, 102, 0.2);
}

/* ========== 三列布局 ========== */
.tc-columns {
  flex: 1;
  display: flex;
  gap: 4px;
  padding: 4px;
  overflow: hidden;
  min-height: 0;
}

/* ==================== 左列 22% ==================== */
.col-left {
  width: 22%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.terminal-feed {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #06060c;
  border: 1px solid #1a2a3e;
  border-radius: 4px;
  overflow: hidden;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #1a2a3e;
  flex-shrink: 0;
}

.terminal-title {
  font-size: var(--text-body);
  color: rgba(0, 255, 136, 0.6);
  letter-spacing: 1px;
}

.terminal-count {
  font-size: var(--text-body-sm);
  color: rgba(0, 255, 136, 0.3);
}

.terminal-body {
  flex: 1 1 0%;
  width: 100%;
  overflow-y: auto;
  padding: 4px 8px;
}

.terminal-body::-webkit-scrollbar { width: 2px; }
.terminal-body::-webkit-scrollbar-thumb { background: rgba(0, 255, 136, 0.15); border-radius: 1px; }
.terminal-body::-webkit-scrollbar-track { background: transparent; }

.terminal-entry {
  font-size: var(--text-body-sm);
  line-height: 1.6;
  margin-bottom: 1px;
}

.terminal-turn {
  color: rgba(0, 255, 136, 0.3);
  margin-right: 3px;
}

.terminal-entry.log-success .terminal-text { color: rgba(0, 255, 136, 0.8); }
.terminal-entry.log-warning .terminal-text { color: rgba(255, 170, 0, 0.8); }
.terminal-entry.log-danger .terminal-text { color: rgba(255, 51, 102, 0.8); }
.terminal-entry.log-info .terminal-text { color: rgba(136, 170, 204, 0.7); }
.terminal-entry.log-gold .terminal-text { color: rgba(255, 215, 0, 0.8); font-weight: bold; }

.terminal-empty {
  color: #2a2a3e;
  font-size: var(--text-body-sm);
  text-align: center;
  padding: 20px 0;
}

.terminal-filters {
  display: flex;
  border-top: 1px solid #1a2a3e;
}

.filter-tab {
  flex: 1;
  padding: 4px 0;
  background: transparent;
  color: #4a5a6a;
  border: none;
  border-right: 1px solid #1a2a3e;
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Courier New', monospace;
}

.filter-tab:last-child { border-right: none; }

.filter-tab:hover { color: #88aacc; background: rgba(0, 200, 255, 0.04); }

.filter-tab.active {
  color: #00ff88;
  background: rgba(0, 255, 136, 0.06);
  box-shadow: inset 0 -2px 0 rgba(0, 255, 136, 0.3);
}

/* ==================== 中列 56% ==================== */
.col-center {
  width: 56%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  min-width: 0;
}

/* 上层 70% */
.center-top {
  flex: 7;
  display: flex;
  gap: 4px;
  min-height: 0;
}

.radar-panel {
  flex: 7;
  display: flex;
  flex-direction: column;
  background: #06060c;
  border: 1px solid #1a2a3e;
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
}

.sightings-panel {
  flex: 5;
  display: flex;
  flex-direction: column;
  background: #08080c;
  border: 1px solid #1a2a3e;
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
}

.panel-header {
  padding: 6px 10px;
  border-bottom: 1px solid #1a2a3e;
  flex-shrink: 0;
}

.panel-title {
  font-size: var(--text-body);
  color: rgba(0, 200, 255, 0.6);
  letter-spacing: 1px;
}

.radar-content {
  flex: 1;
  min-height: 0;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 节点信息 */
.sightings-body {
  flex: 1;
  padding: 8px 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sight-coord {
  display: inline-block;
  background: #141428;
  color: #00c8ff;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: var(--text-body-sm);
  font-weight: bold;
  margin-bottom: 4px;
  align-self: flex-start;
}

.sight-name {
  color: #ccccee;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.sight-area {
  color: #4a5a6a;
  font-size: var(--text-body-sm);
  margin-bottom: 6px;
}

.sight-desc {
  color: #6a8aaa;
  font-size: var(--text-body-sm);
  line-height: 1.6;
  margin-bottom: 6px;
  max-height: 48px;
  overflow: hidden;
}

.sight-objects {
display: flex;
flex-wrap: wrap;
gap: 4px;
margin-bottom: 6px;
}

.sight-obj-chip {
background: #141428;
color: #8aaacc;
padding: 2px 8px;
border-radius: 3px;
font-size: var(--text-body-sm);
cursor: pointer;
transition: all 0.15s;
border: 1px solid #1a1a2e;
user-select: none;
display: inline-flex;
align-items: center;
gap: 3px;
}

.sight-obj-chip:hover {
background: #1a1a3e;
border-color: #2a4a5e;
color: #00c8ff;
}

.sight-obj-chip.obj-selected {
background: #0d2a4e;
border-color: #00c8ff;
color: #00c8ff;
box-shadow: 0 0 6px rgba(0, 200, 255, 0.3);
}

.sight-obj-chip.obj-npc {
background: #1a1a28;
border-color: #2a2a4e;
color: #ffd700;
}

.sight-obj-chip.obj-npc:hover {
background: #2a2a3e;
border-color: #ffd700;
color: #ffd700;
box-shadow: 0 0 6px rgba(255, 215, 0, 0.2);
}

.sight-obj-chip.obj-decorative {
color: #4a5a6a;
cursor: default;
font-style: italic;
}

.sight-obj-chip.obj-decorative:hover {
  background: #141428;
  border-color: #1a1a2e;
  color: #4a5a6a;
  box-shadow: none;
}

.sight-obj-chip.obj-interactable {
  background: #0d1a1a;
  border-color: #1a3a3a;
  color: #00ff88;
}

.sight-obj-chip.obj-interactable:hover {
  background: #0d2a2a;
  border-color: #00ff88;
  color: #00ff88;
  box-shadow: 0 0 6px rgba(0, 255, 136, 0.2);
}

.obj-interactable-icon {
  font-size: 11px;
}

.sight-obj-chip.obj-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.sight-obj-chip.obj-disabled:hover {
  background: #141428;
  border-color: #1a1a2e;
  box-shadow: none;
}

.obj-npc-icon {
font-size: 10px;
}

.sight-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
}

.sight-action-btn {
  padding: 5px 10px;
  background: #0d1a2e;
  color: #00c8ff;
  border: 1px solid #1a3a4e;
  border-radius: 3px;
  font-size: var(--text-body-sm);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}

.sight-action-btn:hover {
background: #102a3e;
border-color: #00c8ff;
box-shadow: 0 0 6px rgba(0, 200, 255, 0.15);
}

.sight-action-highlighted {
background: #0d2a4e !important;
border-color: #00c8ff !important;
color: #00c8ff !important;
box-shadow: 0 0 8px rgba(0, 200, 255, 0.4) !important;
animation: highlight-pulse 1.5s ease-in-out infinite;
}

@keyframes highlight-pulse {
0%, 100% { box-shadow: 0 0 6px rgba(0, 200, 255, 0.3); }
50% { box-shadow: 0 0 12px rgba(0, 200, 255, 0.5); }
}

.action-cost {
  color: #4a5a6a;
  font-size: var(--text-body-sm);
  margin-left: 2px;
}

/* 道具诊断 */
.diagnostics-body {
  flex: 1;
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.diag-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.diag-type {
  font-size: var(--text-body-sm);
  color: #4a5a6a;
  margin-bottom: 8px;
}

.diag-desc {
  font-size: var(--text-body-sm);
  color: #6a8aaa;
  line-height: 1.6;
  margin-bottom: 8px;
  flex: 1;
  overflow-y: auto;
}

.diag-desc::-webkit-scrollbar { width: 2px; }
.diag-desc::-webkit-scrollbar-thumb { background: rgba(0, 200, 255, 0.15); }

.diag-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.diag-btn {
  padding: 5px 10px;
  border: 1px solid #1a3a4e;
  border-radius: 3px;
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.diag-use { background: #0d1a2e; color: #00c8ff; }
.diag-use:hover { border-color: #00c8ff; box-shadow: 0 0 6px rgba(0, 200, 255, 0.15); }
.diag-discard { background: transparent; color: #ff3366; border-color: #4a2a3e; }
.diag-discard:hover { border-color: #ff3366; background: rgba(255, 51, 102, 0.08); }
.diag-return { background: transparent; color: #6a6a8a; border-color: #2a2a3e; }
.diag-return:hover { color: #88aacc; border-color: #4a4a6a; }

/* 下层 30%：后勤保障部 */
.center-bottom {
  flex: 3;
  min-height: 0;
}

.logistics-hub {
  height: 100%;
  background: #08080c;
  border: 1px solid #1e2a3e;
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
}

.logistics-corner {
position: absolute;
top: 0;
left: 0;
width: 12px;
height: 12px;
border-top: 2px solid #00c8ff;
border-left: 2px solid #00c8ff;
}

/* 货物系统 */
.cargo-section {
  flex-shrink: 0;
}

.cargo-label {
  font-size: var(--text-body-sm);
  color: rgba(0, 200, 255, 0.4);
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.cargo-hotbar {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 3px;
}

.cargo-slot {
  aspect-ratio: 1;
  background: #040408;
  border: 1px solid #12121e;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.15s;
  position: relative;
  min-height: 0;
}

.cargo-slot.filled {
  cursor: pointer;
  background: #0a0a14;
}

.cargo-slot.filled:hover {
  background: #0d1020;
  transform: scale(1.1);
  z-index: 2;
}

.cargo-slot.selected {
  background: #0d1a2e;
  box-shadow: 0 0 6px rgba(0, 200, 255, 0.4);
  z-index: 2;
}

.cargo-icon {
  font-size: var(--text-body-sm);
  font-weight: bold;
  line-height: 1;
}

.cargo-name {
  font-size: var(--text-body-sm);
  color: #6a8aaa;
  margin-top: 1px;
  line-height: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.cargo-crosshair {
  color: #12121e;
  font-size: var(--text-body-sm);
  font-weight: bold;
}

/* 分隔线 */
.logistics-divider {
  border-top: 1px dashed #1a1a2e;
  margin: 2px 0;
}

/* 盟友监控 */
.ally-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ally-label {
  font-size: var(--text-body-sm);
  color: rgba(0, 255, 136, 0.4);
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.ally-list {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-height: 0;
}

.ally-list::-webkit-scrollbar { height: 2px; }
.ally-list::-webkit-scrollbar-thumb { background: rgba(0, 255, 136, 0.15); }

.ally-card {
  background: #040408;
  border: 1px solid #141428;
  border-radius: 3px;
  padding: 4px 8px;
  min-width: 120px;
  flex-shrink: 0;
}

.ally-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}

.ally-name {
  font-size: var(--text-body-sm);
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ally-tag {
  font-size: var(--text-body-sm);
  flex-shrink: 0;
}

.ally-hp-bar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ally-hp-track {
  flex: 1;
  height: 8px;
  background: #050508;
  border: 1px solid #141428;
  border-radius: 1px;
  overflow: hidden;
}

.ally-hp-fill {
  height: 100%;
  background: #00ff88;
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
  transition: width 0.3s;
}

.ally-hp-value {
  font-size: var(--text-body-sm);
  color: #6a6a8a;
  min-width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ally-empty {
  color: #2a2a3e;
  font-size: var(--text-body-sm);
  padding: 8px 0;
  text-align: center;
  width: 100%;
}

/* 选中状态 */
.ally-card.ally-selected {
  border-color: #00c8ff;
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.3);
  cursor: pointer;
}

.ally-card {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ally-card:hover {
  border-color: rgba(0, 200, 255, 0.4);
}

/* NPC 迷你状态条 */
.ally-stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.ally-stat-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ally-stat-label {
  font-size: 12px;
  color: #6a6a8a;
  min-width: 28px;
  text-align: right;
}

.ally-stat-track {
  flex: 1;
  height: 6px;
  background: #050508;
  border-radius: 2px;
  overflow: hidden;
}

.ally-stat-fill {
  height: 100%;
  transition: width 0.3s;
}

.ally-stat-fill.trust {
  background: #00c8ff;
}

.ally-stat-fill.fear {
  background: #ff3366;
}

.ally-stat-fill.infection {
  background: #ff8800;
}

.ally-stat-num {
  font-size: 12px;
  color: #7a7a9a;
  min-width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 两段式交互区域 */
.interact-top {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #1a2a3a;
}

.interact-bottom {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.interact-section-label {
  color: #4a6a8a;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  margin-bottom: 3px;
  padding-bottom: 2px;
  border-bottom: 1px dashed #1a2a3a;
}

/* NPC 交互面板 */
.npc-interact-panel {
  background: #08081a;
  border: 1px solid #00c8ff;
  border-radius: 4px;
  padding: 6px 8px;
  margin-top: 4px;
  box-shadow: 0 0 12px rgba(0, 200, 255, 0.15);
}

.npc-interact-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #141428;
}

.npc-interact-name {
  font-size: var(--text-body-sm);
  font-weight: bold;
}

.npc-interact-identity {
  font-size: 9px;
  color: #4a4a6a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.npc-interact-close {
  background: none;
  border: none;
  color: #4a4a6a;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.npc-interact-close:hover {
  color: #ff3366;
}

.npc-interact-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.npc-interact-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: #0a0a18;
  border: 1px solid #1a1a2e;
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.npc-interact-btn:hover {
  border-color: #00c8ff;
  background: #0c0c22;
}

.npc-interact-label {
  font-size: var(--text-body-sm);
  color: #8a8aaa;
}

.npc-interact-cost {
  font-size: 9px;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 0 3px;
  border-radius: 2px;
}

/* ==================== 右列 22% ==================== */
.col-right {
  width: 22%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  min-width: 0;
}

.right-top {
  flex: 6;
  display: flex;
  flex-direction: column;
  background: #06060c;
  border: 1px solid #1a2a3e;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}

.right-bottom {
  flex: 4;
  display: flex;
  flex-direction: column;
  background: #06060c;
  border: 1px solid #1a2a3e;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}

/* 任务列表 */
.quest-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.quest-list::-webkit-scrollbar { width: 2px; }
.quest-list::-webkit-scrollbar-thumb { background: rgba(0, 200, 255, 0.15); }
.quest-list::-webkit-scrollbar-track { background: transparent; }

.quest-entry {
  background: #040408;
  border: 1px solid #141428;
  border-radius: 3px;
  padding: 4px 6px;
}

.quest-entry.quest-done { opacity: 0.5; }

.quest-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.quest-type {
  font-size: var(--text-body-sm);
  font-weight: bold;
  padding: 1px 3px;
  border-radius: 1px;
  flex-shrink: 0;
}

.quest-type.qt-main { background: #1a1a2e; color: #ffd700; }
.quest-type.qt-side { background: #1a1a2e; color: #aa66ff; }

.quest-title {
  font-size: var(--text-body-sm);
  font-weight: bold;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quest-status { font-size: var(--text-body-sm); }

.quest-obj {
  font-size: var(--text-body-sm);
  color: #6a8aaa;
  padding-left: 12px;
  line-height: 1.5;
}

.quest-obj.done { color: #00ff88; text-decoration: line-through; }

.quest-empty {
  color: #2a2a3e;
  font-size: var(--text-body-sm);
  text-align: center;
  padding: 16px 0;
}

/* 小地图 */
.minimap-wrapper {
  flex: 1;
  padding: 4px;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ==================== 结算/失败界面 ==================== */
.result-screen,
.gameover-screen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.result-panel,
.gameover-panel {
  background: #0d0d14;
  border: 1px solid #1a1a2e;
  border-radius: 8px;
  padding: 28px;
  text-align: center;
  max-width: 440px;
}

.result-rating { font-size: 56px; font-weight: bold; margin-bottom: 8px; }
.rating-s { color: #ffd700; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
.rating-a { color: #00ff88; }
.rating-b { color: #00c8ff; }
.rating-c { color: #ff8800; }
.rating-d { color: #ff3366; }

.result-title { color: #ccccee; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
.result-desc { color: #88aacc; font-size: 13px; line-height: 1.6; margin-bottom: 14px; }
.result-stats { display: flex; flex-direction: column; gap: 3px; color: #6a6a8a; font-size: 12px; margin-bottom: 14px; }
.result-reward { color: #ffd700; font-size: 15px; font-weight: bold; margin-bottom: 18px; }

.result-exit-btn,
.gameover-exit-btn {
  padding: 8px 28px;
  background: #00c8ff;
  color: #08080a;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}

.result-exit-btn:hover,
.gameover-exit-btn:hover { background: #00ddff; }

.gameover-title { color: #ff3366; font-size: 26px; font-weight: bold; margin-bottom: 10px; }
.gameover-desc { color: #88aacc; font-size: 13px; margin-bottom: 18px; }
</style>
