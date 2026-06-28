/**
 * 副本 V2 — 战术战斗弹窗 (Tactical Combat Modal Overlay)
 *
 * ==================== 设计说明 ====================
 * 12 列网格三栏战术 HUD 布局（全屏宽屏）：
 * - 左栏(col-span-3 ~25%)：小队遥测面板（角色名/状态标签/HP·MP·SANITY 条）
 * - 中栏(col-span-5 ~42%)：敌人威胁网格（3x3 目标锁定卡片，浮动伤害数字）
 * - 右栏(col-span-4 ~33%)：高速终端战斗日志
 *
 * 半透明深色遮罩 + 毛玻璃模糊，地图背景隐约可见
 * 碳纤维暗色面板，锐利切角，霓虹脉冲边框
 * 底部控制栏全宽固定在弹窗底部
 *
 * ==================== 动画系统 ====================
 * - 定时器每 interval ms 执行一个战斗回合
 * - 回合结算后更新血条、播放伤害数字弹出动画
 * - 固定倍速（不可调速）
 * - 胜利/失败/逃跑时亮起确认按钮
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { DungeonCombatState, DungeonNpc, GridPosition, CombatAbility, CombatInputMode } from '../../types/dungeon-v2'

const props = defineProps<{
  combat: DungeonCombatState | null
  squadNpcs: DungeonNpc[]
  playerName: string
  playerGeneLockActive: boolean
  playerGeneLockTier: number
  playerInfection: number
  logs: string[]
  result: 'victory' | 'defeat' | 'fled' | null
  rewards: { xp: number; rewardPoints: number; sidePlots: { D: number; C: number }; items: string[] } | null
  // ---- 手动模式相关 ----
  /** 是否正在等待玩家操作 */
  waitingForPlayer: boolean
  /** 当前战斗模式：'auto' | 'manual' */
  tacticsMode: 'auto' | 'manual'
  /** 当前行动单位 uid */
  currentTurnUid: string | null
  /** 玩家可移动格子列表 */
  playerMovableCells: GridPosition[]
  /** 玩家可攻击目标列表（旧版，保留兼容） */
  playerAttackTargets: { uid: string; name: string; position: GridPosition | null }[]
  /** 玩家本回合是否已移动 */
  playerHasMoved: boolean
  /** 玩家本回合是否已攻击 */
  playerHasAttacked: boolean
  // ---- 技能/行动系统（第二步改造） ----
  /** 战斗 UI 输入模式（状态机） */
  combatInputMode: CombatInputMode
  /** 玩家可用技能列表 */
  playerAbilities: CombatAbility[]
  /** 当前选中的技能 ID */
  selectedAbilityId: string | null
  /** 选中技能的可施放范围格子列表 */
  abilityRangeCells: GridPosition[]
  /** 选中技能的合法目标单位 uid 列表 */
  validTargetUnitIds: string[]
  // ---- AOE 预览（第三步改造） ----
  /** AOE hover 预览的影响范围格子列表 */
  aoePreviewCells: GridPosition[]
  /** AOE hover 预览中受影响的单位 uid 列表 */
  aoeAffectedUnitIds: string[]
}>()

const emit = defineEmits<{
  close: []
  step: []
  flee: []
  processResult: []
  // ---- 手动模式事件 ----
  toggleMode: []
  playerMove: [pos: GridPosition]
  playerAttack: [targetUid: string]
  endTurn: []
  // ---- 技能/行动系统事件（第二步改造） ----
  selectAbility: [abilityId: string]
  cancelAbility: []
  executeAbility: [targetUid: string]
  // ---- AOE 技能事件（第三步改造） ----
  aoeCellHover: [pos: GridPosition | null]
  executeAoeAbility: [pos: GridPosition]
}>()

const FIXED_INTERVAL = 400

const isRunning = ref(true)
const combatEnded = computed(() => props.combat?.over ?? false)
const floatingDamages = ref<Map<string, { id: number; value: number; isCrit: boolean; isPlayer: boolean }>>(new Map())
const resultProcessed = ref(false)
let damageIdCounter = 0
let combatTimer: ReturnType<typeof setTimeout> | null = null
let stepInProgress = false

// currentEnemyIndex 已废弃（3x3 敌人卡片已移除）
const totalEnemies = computed(() => props.combat?.enemies.length ?? 0)
const defeatedEnemies = computed(() => {
  if (!props.combat) return 0
  return props.combat.enemies.filter((enemy) => enemy.hp <= 0).length
})

interface SquadMember {
  name: string
  tag: string
  tagColor: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  sanity: number
  maxSanity: number
  isPlayer: boolean
  alive: boolean
}

const roleTags: Record<string, { tag: string; color: string }> = {
  calm_analyst: { tag: '[分析员]', color: '#00c8ff' },
  reckless_charger: { tag: '[突击手]', color: '#ff3366' },
  selfish_survivor: { tag: '[求生者]', color: '#ffd700' },
}

const squadMembers = computed<SquadMember[]>(() => {
  const members: SquadMember[] = []

  if (props.combat) {
    const sanity = Math.max(0, 100 - props.playerInfection)
    members.push({
      name: props.playerName || '主角',
      tag: props.playerGeneLockActive ? `[基因锁 L${props.playerGeneLockTier}]` : '[新兵]',
      tagColor: props.playerGeneLockActive ? '#ffd700' : '#00c8ff',
      hp: props.combat.player_hp,
      maxHp: props.combat.player_max_hp,
      mp: props.combat.player_mp,
      maxMp: props.combat.player_max_mp,
      sanity,
      maxSanity: 100,
      isPlayer: true,
      alive: props.combat.player_hp > 0,
    })
  }

  for (const ally of props.combat?.allies.slice(0, 3) ?? []) {
    const npc = props.squadNpcs.find((member) => member.id === ally.npc_id)
    const roleInfo = roleTags[npc?.role ?? ''] ?? { tag: '[队员]', color: '#88aacc' }
    members.push({
      name: ally.name,
      tag: roleInfo.tag,
      tagColor: roleInfo.color,
      hp: ally.hp,
      maxHp: ally.max_hp,
      mp: 0,
      maxMp: 0,
      sanity: Math.max(0, 100 - (npc?.infection ?? 0)),
      maxSanity: 100,
      isPlayer: false,
      alive: !ally.down && ally.hp > 0,
    })
  }

  while (members.length < 4) {
    members.push({
      name: '—空位—',
      tag: '[待命]',
      tagColor: '#4a4a6a',
      hp: 0,
      maxHp: 0,
      mp: 0,
      maxMp: 0,
      sanity: 0,
      maxSanity: 0,
      isPlayer: false,
      alive: false,
    })
  }

  return members
})

const threatLevel = computed(() => {
  if (!props.combat || props.combat.enemies.length === 0) return 'F'
  const maxHp = Math.max(...props.combat.enemies.map((enemy) => enemy.max_hp))
  if (maxHp >= 150) return 'S'
  if (maxHp >= 100) return 'A'
  if (maxHp >= 60) return 'B'
  if (maxHp >= 30) return 'C'
  return 'D'
})

const threatColor = computed(() => {
  const map: Record<string, string> = {
    S: '#ff3366',
    A: '#ff8800',
    B: '#ffd700',
    C: '#00c8ff',
    D: '#00ff88',
    F: '#4a4a6a',
  }
  return map[threatLevel.value] ?? '#aaaacc'
})

const battleLogEl = ref<HTMLDivElement | null>(null)
const displayLogs = computed(() => props.logs.slice(-80))

function getLogColor(log: string): string {
  if (log.includes('击败') || log.includes('胜利')) return '#00ff88'
  if (log.includes('倒下') || log.includes('失败')) return '#ff3366'
  if (log.includes('感染') || log.includes('撤退')) return '#ff8800'
  if (log.includes('暴击') || log.includes('CRIT')) return '#ffd700'
  if (log.includes('你的') || log.includes('剩余 HP')) return '#ff3366'
  if (log.includes('剩余 HP') && !log.includes('你的')) return '#00ff88'
  if (log.includes('回合')) return '#00c8ff'
  return '#88aacc'
}

function showFloatingDamage(targetId: string, value: number, isPlayer: boolean, isCrit: boolean): void {
  const id = ++damageIdCounter
  floatingDamages.value.set(targetId, { id, value, isCrit, isPlayer })
  setTimeout(() => {
    if (floatingDamages.value.get(targetId)?.id === id) {
      floatingDamages.value.delete(targetId)
    }
  }, 1200)
}

function stopTimer(): void {
  if (combatTimer) {
    clearTimeout(combatTimer)
    combatTimer = null
  }
}

function scheduleNextStep(): void {
  stopTimer()
  if (!isRunning.value || combatEnded.value) return
  combatTimer = setTimeout(() => {
    combatTimer = null
    executeStep()
  }, FIXED_INTERVAL)
}

function startTimer(): void {
  scheduleNextStep()
}

function processResultOnce(): void {
  if (resultProcessed.value) return
  resultProcessed.value = true
  emit('processResult')
}

function executeStep(): void {
  if (stepInProgress) return

  if (!isRunning.value || !props.combat || props.combat.over) {
    stopTimer()
    return
  }

  const enemyIndexBefore = props.combat.current_enemy_index
  const enemyBefore = props.combat.enemies[enemyIndexBefore]
  const enemyDamageKey = enemyBefore ? `enemy-${enemyIndexBefore}` : null
  const enemyHpBefore = enemyBefore?.hp ?? 0
  const playerHpBefore = props.combat.player_hp
  stepInProgress = true

  emit('step')

  nextTick(() => {
    try {
      if (!props.combat) return

      const enemyAfter = props.combat.enemies[enemyIndexBefore] ?? null
      const enemyHpAfter = enemyAfter?.hp ?? 0
      const playerHpAfter = props.combat.player_hp

      if (enemyHpBefore > enemyHpAfter && enemyDamageKey) {
        showFloatingDamage(enemyDamageKey, enemyHpBefore - enemyHpAfter, false, false)
      }

      if (playerHpBefore > playerHpAfter) {
        showFloatingDamage('player', playerHpBefore - playerHpAfter, true, false)
      }

      if (props.combat.over) {
        stopTimer()
        processResultOnce()
        return
      }

      scheduleNextStep()
    } finally {
      stepInProgress = false
    }
  })
}

function togglePause(): void {
  isRunning.value = !isRunning.value
  if (isRunning.value && !combatEnded.value) {
    startTimer()
  } else {
    stopTimer()
  }
}

function handleFlee(): void {
  stopTimer()
  emit('flee')
  nextTick(() => {
    processResultOnce()
  })
}

function handleResultConfirm(): void {
  emit('close')
}

watch(
  () => props.combat,
  (combat) => {
    stopTimer()
    isRunning.value = true
    resultProcessed.value = false
    floatingDamages.value = new Map()
    stepInProgress = false

    if (!combat) return

    if (combat.over) {
      nextTick(() => {
        processResultOnce()
      })
      return
    }

    nextTick(() => {
      startTimer()
    })
  },
  { immediate: true },
)

watch(
  () => props.combat?.over,
  (over) => {
    if (over) {
      stopTimer()
      processResultOnce()
    }
  },
)

watch(
  displayLogs,
  () => {
    nextTick(() => {
      if (battleLogEl.value) {
        battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight
      }
    })
  },
  { flush: 'post', immediate: true },
)

/** ESC 键取消技能选择 */
function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !props.waitingForPlayer) return
  if (props.combatInputMode === 'selecting_ability_target' || props.combatInputMode === 'selecting_aoe_cell') {
    emit('cancelAbility')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  stopTimer()
})

function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (current / max) * 100))
}

function hpBarColor(percent: number): string {
  if (percent > 60) return '#00ff88'
  if (percent > 30) return '#ffd700'
  return '#ff3366'
}

const confirmBtnText = computed(() => {
  switch (props.result) {
    case 'victory': return '确认胜利'
    case 'defeat': return '确认失败'
    case 'fled': return '确认撤退'
    default: return '确认结果'
  }
})

const confirmBtnColor = computed(() => {
  switch (props.result) {
    case 'victory': return '#00ff88'
    case 'defeat': return '#ff3366'
    case 'fled': return '#ffd700'
    default: return '#4a4a5a'
  }
})

// ==================== 战术网格数据（3b 改造） ====================

/**
 * 单个格子内容
 */
interface GridCell {
  x: number
  y: number
  type: 'empty' | 'player' | 'enemy' | 'ally'
  name: string
  hp: number
  maxHp: number
  uid: string
  defeated: boolean
}

/**
 * 构建战术网格的格子列表
 *
 * 按 y→x 顺序排列，方便 v-for 渲染。
 * 每个格子包含该位置上的单位信息（或空格子标记）。
 */
const gridCells = computed<GridCell[]>(() => {
  if (!props.combat) return []
  const width = props.combat.grid_width
  const height = props.combat.grid_height
  const cells: GridCell[] = []

  // 先建立位置→单位的映射
  const cellMap = new Map<string, GridCell>()

  // 玩家
  if (props.combat.player_position) {
    const key = `${props.combat.player_position.x},${props.combat.player_position.y}`
    cellMap.set(key, {
      x: props.combat.player_position.x,
      y: props.combat.player_position.y,
      type: 'player',
      name: props.playerName || '主角',
      hp: props.combat.player_hp,
      maxHp: props.combat.player_max_hp,
      uid: 'player',
      defeated: props.combat.player_hp <= 0,
    })
  }

  // 敌人
  for (let i = 0; i < props.combat.enemies.length; i++) {
    const enemy = props.combat.enemies[i]
    if (enemy.position) {
      const key = `${enemy.position.x},${enemy.position.y}`
      cellMap.set(key, {
        x: enemy.position.x,
        y: enemy.position.y,
        type: 'enemy',
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.max_hp,
        uid: `enemy:${i}`,
        defeated: enemy.hp <= 0,
      })
    }
  }

  // 队友
  for (let i = 0; i < props.combat.allies.length; i++) {
    const ally = props.combat.allies[i]
    if (ally.position) {
      const key = `${ally.position.x},${ally.position.y}`
      cellMap.set(key, {
        x: ally.position.x,
        y: ally.position.y,
        type: 'ally',
        name: ally.name,
        hp: ally.hp,
        maxHp: ally.max_hp,
        uid: `ally:${i}`,
        defeated: ally.down || ally.hp <= 0,
      })
    }
  }

  // 生成所有格子（y→x 顺序）
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`
      const unit = cellMap.get(key)
      if (unit) {
        cells.push(unit)
      } else {
        cells.push({ x, y, type: 'empty', name: '', hp: 0, maxHp: 0, uid: '', defeated: false })
      }
    }
  }

  return cells
})

/** 当前战棋回合数（从 combat 对象读取） */
const tacticsRound = computed(() => props.combat?.tactics_round ?? 0)

/** 格子是否为当前行动单位（高亮显示） */
function isActiveCell(cell: GridCell): boolean {
  if (!cell.uid || combatEnded.value) return false
  return cell.uid === props.currentTurnUid
}

/** 格子是否在玩家可移动列表中（仅 idle 模式高亮） */
function isMovableCell(x: number, y: number): boolean {
  if (!props.waitingForPlayer || props.playerHasMoved) return false
  if (props.combatInputMode !== 'idle') return false
  return props.playerMovableCells.some((c) => c.x === x && c.y === y)
}

/** 格子是否在选中技能的射程范围内（淡红色范围高亮） */
function isAbilityRangeCell(x: number, y: number): boolean {
  if (props.combatInputMode !== 'selecting_ability_target' && props.combatInputMode !== 'selecting_aoe_cell') return false
  return props.abilityRangeCells.some((c) => c.x === x && c.y === y)
}

/** 格子是否为选中技能的合法目标（红色高亮 + 可点击） */
function isAbilityTargetCell(x: number, y: number): boolean {
  if (props.combatInputMode !== 'selecting_ability_target') return false
  const cell = gridCells.value.find((c) => c.x === x && c.y === y)
  if (!cell || !cell.uid) return false
  return props.validTargetUnitIds.includes(cell.uid)
}

/** 格子是否在 AOE hover 预览范围内（橙色半透明高亮） */
function isAoePreviewCell(x: number, y: number): boolean {
  if (props.combatInputMode !== 'selecting_aoe_cell') return false
  return props.aoePreviewCells.some((c) => c.x === x && c.y === y)
}

/** 格子是否为 AOE 预览中受影响的单位（橙色高亮 + 脉冲） */
function isAoeAffectedCell(x: number, y: number): boolean {
  if (props.combatInputMode !== 'selecting_aoe_cell') return false
  const cell = gridCells.value.find((c) => c.x === x && c.y === y)
  if (!cell || !cell.uid) return false
  return props.aoeAffectedUnitIds.includes(cell.uid)
}

/** 当前选中技能的显示名称 */
const selectedAbilityName = computed(() => {
  if (!props.selectedAbilityId) return ''
  const ability = props.playerAbilities.find((a) => a.id === props.selectedAbilityId)
  return ability?.name ?? props.selectedAbilityId
})

/** 当前选中技能的射程 */
const selectedAbilityRange = computed(() => {
  if (!props.selectedAbilityId) return 0
  const ability = props.playerAbilities.find((a) => a.id === props.selectedAbilityId)
  return ability?.range ?? 0
})

/** 取名字前两个字作为缩写 */
function shortName(name: string): string {
  if (!name) return '·'
  return name.slice(0, 2)
}

/** 格式化坐标显示 */
function formatCoord(pos: GridPosition): string {
  return `(${pos.x},${pos.y})`
}

// ==================== UI 打磨：指令面板辅助 ====================

/** 本地 hover 格子追踪（单体/AOE 两种模式的 hover 信息展示） */
const localHoveredCell = ref<GridPosition | null>(null)

/** 当前行动单位名称 */
const currentActingUnitName = computed(() => {
  if (!props.combat || !props.currentTurnUid) return ''
  const cell = gridCells.value.find((c) => c.uid === props.currentTurnUid)
  return cell?.name ?? ''
})

/** 输入模式指令文本 */
const inputModeInstruction = computed(() => {
  switch (props.combatInputMode) {
    case 'idle':
      if (props.playerHasMoved && props.playerHasAttacked) return '行动已用完，请结束回合'
      return '请选择行动'
    case 'selecting_ability_target':
      return '请选择目标'
    case 'selecting_aoe_cell':
      return '请选择释放位置'
    case 'selecting_move_cell':
      return '请选择移动位置'
    default:
      return ''
  }
})

/** 技能形状标签 */
function abilityShapeLabel(ability: CombatAbility): string {
  return ability.shape === 'single' ? '单体' : 'AOE'
}

/** 技能目标类型标签 */
function abilityTargetTypeLabel(ability: CombatAbility): string {
  switch (ability.targetType) {
    case 'enemy': return '敌方'
    case 'ally': return '友方'
    case 'self': return '自身'
    case 'cell': return '格子'
  }
}

/** 每个技能的可用性检查（用于禁用按钮并显示原因） */
const abilityAvailability = computed<Record<string, { available: boolean; reason: string }>>(() => {
  const result: Record<string, { available: boolean; reason: string }> = {}
  const playerPos = props.combat?.player_position
  if (!playerPos) return result

  for (const ability of props.playerAbilities) {
    if (ability.shape === 'single' && ability.targetType === 'enemy') {
      const hasTarget = gridCells.value.some((cell) => {
        if (cell.type !== 'enemy' || cell.defeated) return false
        const dx = Math.abs(cell.x - playerPos.x)
        const dy = Math.abs(cell.y - playerPos.y)
        return dx + dy <= ability.range
      })
      result[ability.id] = hasTarget
        ? { available: true, reason: '' }
        : { available: false, reason: '范围内无目标' }
    } else {
      result[ability.id] = { available: true, reason: '' }
    }
  }
  return result
})

/** 单体模式 hover 目标信息 */
const hoveredTargetInfo = computed(() => {
  if (props.combatInputMode !== 'selecting_ability_target') return null
  if (!localHoveredCell.value) return null
  const cell = gridCells.value.find(
    (c) => c.x === localHoveredCell.value!.x && c.y === localHoveredCell.value!.y,
  )
  if (!cell || !cell.uid || !props.validTargetUnitIds.includes(cell.uid)) return null
  return {
    name: cell.name,
    hp: cell.hp,
    maxHp: cell.maxHp,
    abilityName: selectedAbilityName.value,
  }
})

/** AOE 模式 hover 释放信息 */
const hoveredAoeInfo = computed(() => {
  if (props.combatInputMode !== 'selecting_aoe_cell') return null
  if (!localHoveredCell.value || props.aoePreviewCells.length === 0) return null
  const affectedNames = gridCells.value
    .filter((c) => c.uid && props.aoeAffectedUnitIds.includes(c.uid))
    .map((c) => c.name)
  return {
    cellCoord: localHoveredCell.value,
    count: props.aoeAffectedUnitIds.length,
    names: affectedNames,
  }
})

/** watch: 输入模式变化时清除本地 hover */
watch(
  () => props.combatInputMode,
  () => {
    localHoveredCell.value = null
  },
)

/**
 * 点击网格格子：
 * - idle 模式：点击可移动格 → emit playerMove
 * - selecting_ability_target 模式：点击合法目标 → emit executeAbility
 * - selecting_aoe_cell 模式：点击范围内格子 → emit executeAoeAbility
 */
function onCellClick(x: number, y: number): void {
  if (!props.waitingForPlayer) return

  // AOE 格子选择模式：点击射程内任意格子释放
  if (props.combatInputMode === 'selecting_aoe_cell') {
    if (props.abilityRangeCells.some((c) => c.x === x && c.y === y)) {
      emit('executeAoeAbility', { x, y })
    }
    return
  }

  // 技能目标选择模式：点击合法目标单位
  if (props.combatInputMode === 'selecting_ability_target') {
    const cell = gridCells.value.find((c) => c.x === x && c.y === y)
    if (cell && cell.uid && props.validTargetUnitIds.includes(cell.uid)) {
      emit('executeAbility', cell.uid)
    }
    return
  }

  // idle 模式：点击可移动格
  if (props.combatInputMode === 'idle' && !props.playerHasMoved) {
    const movable = props.playerMovableCells.find((c) => c.x === x && c.y === y)
    if (movable) {
      emit('playerMove', movable)
    }
  }
}

/**
 * 鼠标 hover 格子
 * - AOE 模式：emit aoeCellHover 触发预览
 * - 单体模式：记录本地 hover 用于显示目标信息
 */
function onCellHover(x: number, y: number): void {
  if (props.combatInputMode === 'selecting_aoe_cell') {
    if (props.abilityRangeCells.some((c) => c.x === x && c.y === y)) {
      localHoveredCell.value = { x, y }
      emit('aoeCellHover', { x, y })
    }
  } else if (props.combatInputMode === 'selecting_ability_target') {
    localHoveredCell.value = { x, y }
  }
}

/** 鼠标离开网格区域（清除所有 hover 状态） */
function onGridMouseLeave(): void {
  localHoveredCell.value = null
  if (props.combatInputMode === 'selecting_aoe_cell') {
    emit('aoeCellHover', null)
  }
}
</script>

<template>
  <div class="tactical-overlay">
    <!-- ==================== 战术弹窗主体 ==================== -->
    <div class="tactical-modal" :class="{ 'modal-combat-active': !combatEnded }">

      <!-- ==================== 头部 ==================== -->
      <div class="combat-header">
        <div class="header-left">
          <span class="alert-banner" :class="{ 'alert-pulse': !combatEnded }">
            [ ! 警告：遭遇敌人 ! ]
          </span>
        </div>
        <div class="header-right">
          <span class="threat-readout" :style="{ color: threatColor }">
            威胁评估：等级 {{ threatLevel }}
            <span class="threat-suffix">({{ totalEnemies >= 3 ? '小队风险' : totalEnemies >= 2 ? '高危' : '中危' }})</span>
          </span>
        </div>
      </div>

      <!-- ==================== 三栏内容区（12列网格，全宽水平排列） ==================== -->
      <div class="combat-content">

        <!-- ==================== 左栏(col-span-3)：小队遥测 ==================== -->
        <div class="col-squad">
          <div class="col-title">小队状态</div>
          <div class="squad-roster">
            <div
              v-for="(member, idx) in squadMembers"
              :key="idx"
              :class="['squad-row', { 'squad-empty': !member.alive && member.name === '—空位—', 'squad-down': !member.alive && member.name !== '—空位—' }]"
            >
              <div class="squad-row-header">
                <span class="squad-name">{{ member.name }}</span>
                <span class="squad-tag" :style="{ color: member.tagColor }">{{ member.tag }}</span>
              </div>
              <template v-if="member.alive">
                <!-- HP 条 -->
                <div class="stat-bar-wrap">
                  <span class="stat-label">生命</span>
                  <div class="stat-bar-track">
                    <div
                      class="stat-bar-fill stat-hp"
                      :style="{ width: hpPercent(member.hp, member.maxHp) + '%', background: hpBarColor(hpPercent(member.hp, member.maxHp)) }"
                    ></div>
                  </div>
                  <span class="stat-num">{{ member.hp }}/{{ member.maxHp }}</span>
                </div>
                <!-- MP 条 -->
                <div v-if="member.maxMp > 0" class="stat-bar-wrap">
                  <span class="stat-label">法力</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill stat-mp" :style="{ width: hpPercent(member.mp, member.maxMp) + '%' }"></div>
                  </div>
                  <span class="stat-num">{{ member.mp }}/{{ member.maxMp }}</span>
                </div>
                <!-- SANITY 条 -->
                <div class="stat-bar-wrap">
                  <span class="stat-label">理智</span>
                  <div class="stat-bar-track">
                    <div
                      class="stat-bar-fill stat-sanity"
                      :style="{ width: hpPercent(member.sanity, member.maxSanity) + '%', background: hpBarColor(hpPercent(member.sanity, member.maxSanity)) === '#00ff88' ? '#9d4edd' : hpBarColor(hpPercent(member.sanity, member.maxSanity)) }"
                    ></div>
                  </div>
                  <span class="stat-num">{{ member.sanity }}/{{ member.maxSanity }}</span>
                </div>
              </template>
              <div v-else class="squad-down-text">
                {{ member.name === '—空位—' ? '— 待命 —' : '— 阵亡 —' }}
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== 中栏(col-span-5)：战术网格 ==================== -->
        <div class="col-enemies">
          <div class="col-title">战术网格 // TACTICAL GRID</div>
          <div class="tactics-grid-container" @mouseleave="onGridMouseLeave">
            <!-- 顶部坐标标尺 -->
            <div class="grid-ruler-row">
              <div class="grid-ruler-corner"></div>
              <div
                v-for="x in (combat?.grid_width ?? 6)"
                :key="'rx-' + x"
                class="grid-ruler-cell"
              >{{ x - 1 }}</div>
            </div>
            <!-- 网格主体：每行 = 左侧标尺 + grid_width 个格子 -->
            <div
              v-for="y in (combat?.grid_height ?? 6)"
              :key="'row-' + y"
              class="grid-row"
            >
              <div class="grid-ruler-cell grid-ruler-y">{{ y - 1 }}</div>
              <div
                v-for="x in (combat?.grid_width ?? 6)"
                :key="`cell-${x}-${y}`"
                class="grid-cell"
                :class="[
                  `cell-${gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)]?.type ?? 'empty'}`,
                  {
                    'cell-active': isActiveCell(gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)] ?? { uid: '' }),
                    'cell-defeated': gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)]?.defeated,
                    'cell-movable': isMovableCell(x - 1, y - 1),
                    'cell-ability-range': isAbilityRangeCell(x - 1, y - 1),
                    'cell-ability-target': isAbilityTargetCell(x - 1, y - 1),
                    'cell-aoe-preview': isAoePreviewCell(x - 1, y - 1),
                    'cell-aoe-affected': isAoeAffectedCell(x - 1, y - 1),
                  }
                ]"
                @click="onCellClick(x - 1, y - 1)"
                @mouseenter="onCellHover(x - 1, y - 1)"
              >
                <template v-if="gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)]?.type !== 'empty'">
                  <div class="cell-name">{{ shortName(gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)].name) }}</div>
                  <div class="cell-hp-bar">
                    <div
                      class="cell-hp-fill"
                      :style="{ width: hpPercent(gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)].hp, gridCells[(y - 1) * (combat?.grid_width ?? 6) + (x - 1)].maxHp) + '%' }"
                    ></div>
                  </div>
                </template>
                <template v-else>
                  <span class="cell-dot">·</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 玩家受伤浮动数字（显示在网格区域上方） -->
          <Transition name="dmg-float">
            <div
              v-if="floatingDamages.get('player')"
              :class="['floating-damage', 'floating-damage-player', { 'dmg-crit': floatingDamages.get('player')?.isCrit }]"
            >
              -{{ floatingDamages.get('player')?.value }}
            </div>
          </Transition>

          <!-- ==================== 范围图例（仅手动模式等待玩家时显示） ==================== -->
          <div v-if="waitingForPlayer" class="range-legend">
            <span class="legend-title">图例</span>
            <span class="legend-item"><span class="legend-swatch legend-movable"></span>可移动</span>
            <span class="legend-item"><span class="legend-swatch legend-range"></span>射程</span>
            <span class="legend-item"><span class="legend-swatch legend-target"></span>目标</span>
            <span class="legend-item"><span class="legend-swatch legend-aoe"></span>AOE</span>
            <span class="legend-item"><span class="legend-swatch legend-active"></span>行动中</span>
          </div>

          <!-- ==================== 手动操作面板（仅手动模式 + 等待玩家时显示） ==================== -->
          <div v-if="waitingForPlayer" class="manual-panel">
            <!-- 指令头部：当前行动单位 + 模式提示 -->
            <div class="manual-instruction">
              <div class="instruction-actor">
                <span class="instruction-icon">▶</span>
                <span class="instruction-text">{{ currentActingUnitName || '主角' }} 的回合</span>
              </div>
              <div class="instruction-mode">{{ inputModeInstruction }}</div>
            </div>

            <!-- idle 模式：行动菜单 -->
            <template v-if="combatInputMode === 'idle'">
              <div class="action-area">
                <!-- 移动区 -->
                <div class="action-section">
                  <div class="action-section-header">
                    <span class="action-section-label">移动</span>
                    <span class="action-section-status" :class="{ 'status-done': playerHasMoved }">
                      {{ playerHasMoved ? '✓ 已完成' : `${playerMovableCells.length} 格可选` }}
                    </span>
                  </div>
                  <div class="action-section-content">
                    <span v-if="playerHasMoved" class="action-done-text">本回合已移动</span>
                    <span v-else class="action-hint-text">点击蓝色格子移动</span>
                  </div>
                </div>

                <!-- 技能区：卡片 -->
                <div class="action-section action-section-abilities">
                  <div class="action-section-header">
                    <span class="action-section-label">技能</span>
                    <span class="action-section-status" :class="{ 'status-done': playerHasAttacked }">
                      {{ playerHasAttacked ? '✓ 已完成' : '可选' }}
                    </span>
                  </div>
                  <div class="action-section-content">
                    <span v-if="playerHasAttacked" class="action-done-text">本回合已攻击</span>
                    <span v-else-if="playerAbilities.length === 0" class="action-done-text">无可用技能</span>
                    <div v-else class="ability-cards">
                      <button
                        v-for="ability in playerAbilities"
                        :key="ability.id"
                        class="ability-card"
                        :class="{ 'ability-disabled': !abilityAvailability[ability.id]?.available }"
                        :disabled="!abilityAvailability[ability.id]?.available"
                        @click="emit('selectAbility', ability.id)"
                      >
                        <div class="ability-card-header">
                          <span class="ability-card-name">{{ ability.name }}</span>
                          <span class="ability-card-shape" :class="ability.shape === 'single' ? 'shape-single' : 'shape-aoe'">
                            {{ abilityShapeLabel(ability) }}
                          </span>
                        </div>
                        <div class="ability-card-stats">
                          <span class="ability-stat">射程 {{ ability.range }}</span>
                          <span v-if="ability.area > 0" class="ability-stat">范围 {{ ability.area }}</span>
                          <span class="ability-stat">{{ abilityTargetTypeLabel(ability) }}</span>
                        </div>
                        <div v-if="!abilityAvailability[ability.id]?.available" class="ability-card-reason">
                          {{ abilityAvailability[ability.id]?.reason }}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 结束回合 -->
                <button class="action-btn-end" @click="emit('endTurn')">
                  结束回合
                </button>
              </div>
            </template>

            <!-- selecting_ability_target 模式：目标选择 -->
            <template v-else-if="combatInputMode === 'selecting_ability_target'">
              <div class="action-area">
                <div class="action-section">
                  <div class="action-section-header">
                    <span class="action-section-label">选择目标 — {{ selectedAbilityName }}</span>
                    <span class="action-section-status">射程 {{ selectedAbilityRange }}</span>
                  </div>
                  <div class="action-section-content">
                    <span v-if="validTargetUnitIds.length === 0" class="action-done-text">射程内无合法目标</span>
                    <span v-else class="action-hint-text">{{ validTargetUnitIds.length }} 个目标可选 · 点击红色高亮单位</span>
                  </div>
                </div>
                <!-- hover 预览：单体目标信息 -->
                <div v-if="hoveredTargetInfo" class="hover-preview">
                  <div class="preview-header">瞄准预览</div>
                  <div class="preview-content">
                    <span class="preview-name">{{ hoveredTargetInfo.name }}</span>
                    <span class="preview-hp">HP {{ hoveredTargetInfo.hp }}/{{ hoveredTargetInfo.maxHp }}</span>
                    <span class="preview-ability">{{ hoveredTargetInfo.abilityName }}</span>
                  </div>
                </div>
                <button class="action-btn-cancel" @click="emit('cancelAbility')">
                  <span class="cancel-icon">✕</span> 取消选择 <span class="cancel-hint">ESC</span>
                </button>
              </div>
            </template>

            <!-- selecting_aoe_cell 模式：格子选择 + hover 预览 -->
            <template v-else-if="combatInputMode === 'selecting_aoe_cell'">
              <div class="action-area">
                <div class="action-section">
                  <div class="action-section-header">
                    <span class="action-section-label">选择释放位置 — {{ selectedAbilityName }}</span>
                    <span class="action-section-status">射程 {{ selectedAbilityRange }}</span>
                  </div>
                  <div class="action-section-content">
                    <span class="action-hint-text">hover 格子预览范围 · 点击橙色格子释放</span>
                  </div>
                </div>
                <!-- hover 预览：AOE 释放信息 -->
                <div v-if="hoveredAoeInfo" class="hover-preview">
                  <div class="preview-header">
                    AOE 预览 <span class="preview-coord">{{ formatCoord(hoveredAoeInfo.cellCoord) }}</span>
                  </div>
                  <div class="preview-content">
                    <span class="preview-count">命中 {{ hoveredAoeInfo.count }} 个单位</span>
                    <span v-if="hoveredAoeInfo.names.length > 0" class="preview-names">
                      {{ hoveredAoeInfo.names.join('、') }}
                    </span>
                  </div>
                </div>
                <div v-else class="hover-preview-empty">
                  移动鼠标到射程内格子查看预览
                </div>
                <button class="action-btn-cancel" @click="emit('cancelAbility')">
                  <span class="cancel-icon">✕</span> 取消选择 <span class="cancel-hint">ESC</span>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- ==================== 右栏(col-span-4)：战斗日志终端 ==================== -->
        <div class="col-log">
          <div class="col-title">战斗终端</div>
          <div ref="battleLogEl" class="battle-log-terminal">
            <div
              v-for="(log, idx) in displayLogs"
              :key="idx"
              class="log-line"
              :style="{ color: getLogColor(log) }"
            >
              <span class="log-prefix">&gt;</span>{{ log }}
            </div>
          </div>
        </div>

      </div>

      <!-- ==================== 底部控制栏 ==================== -->
      <div class="combat-footer">
        <!-- 左：波次进度条 -->
        <div class="footer-left">
          <div class="wave-progress-wrap">
            <span class="wave-label">目标</span>
            <div class="wave-progress-track">
              <div
                class="wave-progress-fill"
                :style="{ width: (defeatedEnemies / Math.max(1, totalEnemies) * 100) + '%' }"
              ></div>
            </div>
            <span class="wave-count">{{ defeatedEnemies }}/{{ totalEnemies }}</span>
          </div>
          <div class="round-info">
            战棋回合 {{ tacticsRound }}
          </div>
        </div>

        <!-- 右：控制按钮 -->
        <div class="footer-right">
          <!-- 自动/手动模式切换 -->
          <button
            class="ctrl-btn ctrl-mode"
            :class="{ 'ctrl-mode-manual': tacticsMode === 'manual' }"
            :disabled="combatEnded"
            @click="emit('toggleMode')"
          >
            {{ tacticsMode === 'manual' ? '手动' : '自动' }}
          </button>
          <button
            class="ctrl-btn ctrl-confirm"
            :style="combatEnded ? { color: confirmBtnColor, borderColor: confirmBtnColor } : {}"
            :disabled="!combatEnded"
            @click="handleResultConfirm"
          >
            {{ confirmBtnText }}
          </button>
          <button class="ctrl-btn ctrl-pause" @click="togglePause" :disabled="combatEnded">
            {{ isRunning ? '暂停' : '继续' }}
          </button>
          <button class="ctrl-btn ctrl-retreat" @click="handleFlee" :disabled="combatEnded">
            撤退
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ==================== 遮罩层 ==================== */
.tactical-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

/* ==================== 主弹窗容器 — 全屏宽屏 ==================== */
.tactical-modal {
  /*
   * ===== 战棋网格可调参数（集中管理，方便微调）=====
   * 改格子大小只调 --cell-size，其他自动跟随
   */
  --cell-size: 76px;          /* 每格边长（px） */
  --ruler-size: 18px;         /* 坐标标尺宽高（px） */
  --grid-gap: 3px;            /* 格子之间间距（px） */
  --grid-padding: 20px;       /* 网格四周留白（px） */
  --color-player: #00c8ff;    /* 玩家色 — 青 */
  --color-enemy: #ff3366;     /* 敌人色 — 品红 */
  --color-ally: #00ff88;      /* 队友色 — 绿 */
  --color-active: #ffd700;    /* 当前行动单位高亮色 — 金 */
  --color-ruler: rgba(100, 100, 140, 0.22);   /* 坐标标尺颜色（极淡，退到背景） */
  --color-empty-line: rgba(50, 50, 80, 0.12);  /* 空格线颜色（极淡） */

  position: relative;
  width: 96vw;
  height: 94vh;
  max-width: 1800px;
  background:
    repeating-linear-gradient(
      45deg,
      #0a0a12 0px,
      #0a0a12 2px,
      #0d0d18 2px,
      #0d0d18 4px
    ),
    #0a0a12;
  border: 2px solid #00c8ff;
  clip-path: polygon(
    0 12px, 12px 0,
    calc(100% - 12px) 0, 100% 12px,
    100% calc(100% - 12px), calc(100% - 12px) 100%,
    12px 100%, 0 calc(100% - 12px)
  );
  box-shadow:
    0 0 30px rgba(0, 200, 255, 0.3),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-in 0.3s ease-out;
}

.tactical-modal.modal-combat-active {
  box-shadow:
    0 0 34px rgba(0, 200, 255, 0.35),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* ==================== 头部 ==================== */
.combat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: linear-gradient(90deg, rgba(255, 51, 102, 0.08), rgba(0, 200, 255, 0.08));
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
  flex-shrink: 0;
}

.alert-banner {
  font-size: 20px;
  font-weight: bold;
  color: #ff3366;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.alert-pulse {
  animation: alert-flash 1s ease-in-out infinite;
}

@keyframes alert-flash {
  0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255, 51, 102, 0.6); }
  50% { opacity: 0.5; text-shadow: 0 0 4px rgba(255, 51, 102, 0.3); }
}

.threat-readout {
  font-size: 16px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.threat-suffix {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 4px;
}

/* ==================== 三栏内容区 — 12列网格全宽水平排列 ==================== */
.combat-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 6px;
  overflow: hidden;
  padding: 6px;
  min-height: 0; /* 关键：允许 flex 子项在垂直方向收缩 */
}

.col-title {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #00c8ff;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.15);
  background: rgba(0, 200, 255, 0.03);
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* ==================== 左栏(col-span-3 ~25%)：小队遥测 ==================== */
.col-squad {
  flex: 0 0 25%;
  min-width: 0; /* 关键：防止 flex 子项被内容撑开 */
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 18, 0.6);
  border: 1px solid rgba(0, 200, 255, 0.1);
}

.squad-roster {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.squad-row {
  background: rgba(18, 18, 31, 0.8);
  border: 1px solid rgba(42, 42, 78, 0.5);
  padding: 8px 10px;
  transition: border-color 0.2s;
}

.squad-row:not(.squad-empty):not(.squad-down) {
  border-left: 3px solid #00c8ff;
}

.squad-row.squad-down {
  border-left: 3px solid #ff3366;
  opacity: 0.5;
}

/* 空位收缩成极细条，不占空间 */
.squad-row.squad-empty {
  padding: 2px 10px;          /* 大幅缩小内边距 */
  opacity: 0.2;               /* 更淡 */
  border: 1px dashed rgba(42, 42, 78, 0.3);
  border-left: 2px solid rgba(42, 42, 78, 0.3);
}

.squad-row.squad-empty .squad-row-header {
  margin-bottom: 0;           /* 去掉底部间距 */
}

.squad-row.squad-empty .squad-name {
  font-size: 10px;            /* 缩小文字 */
  color: #4a4a6a;
}

.squad-row.squad-empty .squad-tag {
  font-size: 9px;
}

/* 空位隐藏"待命"文字，进一步收缩 */
.squad-row.squad-empty .squad-down-text {
  display: none;
}

.squad-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.squad-name {
  font-size: 15px;
  font-weight: bold;
  color: #ccccee;
}

.squad-tag {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.stat-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.stat-label {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #8a8aaa;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}

.stat-bar-track {
  flex: 1;
  min-width: 0;
  height: 8px;
  background: #0a0a12;
  border: 1px solid rgba(42, 42, 78, 0.5);
  overflow: hidden;
  position: relative;
}

.stat-bar-fill {
  height: 100%;
  transition: width 0.3s ease-out, background 0.3s;
  box-shadow: 0 0 4px currentColor;
}

.stat-hp {
  background: #00ff88;
  color: #00ff88;
}

.stat-mp {
  background: #00c8ff;
  color: #00c8ff;
}

.stat-sanity {
  background: #9d4edd;
  color: #9d4edd;
}

.stat-num {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #ffffff;
  width: 60px;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
}

.squad-down-text {
  text-align: center;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #ff3366;
  padding: 4px;
}

/* ==================== 中栏(col-span-5 ~42%)：战术网格 ==================== */
.col-enemies {
  flex: 0 0 42%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 18, 0.6);
  border: 1px solid rgba(0, 200, 255, 0.1);
  position: relative;
}

/* ---- 战术网格容器：居中、不撑满 ---- */
.tactics-grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;       /* 水平居中 */
  justify-content: center;    /* 垂直居中 */
  gap: var(--grid-gap);
  padding: var(--grid-padding);
  min-height: 0;
}

/* ---- 坐标标尺行（顶部 x 轴） ---- */
.grid-ruler-row {
  display: flex;
  gap: var(--grid-gap);
  margin-bottom: 1px;
  flex-shrink: 0;
}

/* 标尺左上角空白 */
.grid-ruler-corner {
  width: var(--ruler-size);
  height: var(--ruler-size);
  flex-shrink: 0;
}

/* 标尺格子（x 轴标签）——固定宽度跟随格子，极淡颜色退到背景 */
.grid-ruler-cell {
  width: var(--cell-size);
  height: var(--ruler-size);
  flex: none;                 /* 固定尺寸，不伸缩 */
  text-align: center;
  font-size: 9px;
  font-family: 'Courier New', monospace;
  color: var(--color-ruler);  /* 极淡，退到背景 */
  line-height: var(--ruler-size);
  min-width: 0;
}

/* 标尺格子（y 轴标签，左侧） */
.grid-ruler-y {
  width: var(--ruler-size);
  height: var(--cell-size);
  flex: none;
  line-height: var(--cell-size);
}

/* ---- 网格行：固定高度，不再撑满 ---- */
.grid-row {
  display: flex;
  gap: var(--grid-gap);
  flex: none;                 /* 不再 flex:1 自动撑满 */
  height: var(--cell-size);
}

/* ---- 单个格子：固定尺寸 + 微圆角 ---- */
.grid-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  flex: none;                 /* 固定尺寸，不伸缩 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px;
  overflow: hidden;
  transition: all 0.2s;
  position: relative;
  border-radius: 4px;         /* 微圆角，更精致 */
}

/* ---- 空格子：极淡虚线，背景透明，彻底退到背景 ---- */
.grid-cell.cell-empty {
  border: 1px solid var(--color-empty-line);
  background: transparent;
}

/* 空格不显示点号，更干净 */
.cell-dot {
  display: none;
}

/* ---- 玩家格子：实心棋子 ---- */
.grid-cell.cell-player {
  border: 2px solid var(--color-player);
  background: rgba(0, 200, 255, 0.18);
  box-shadow: 0 0 6px rgba(0, 200, 255, 0.15);
}

/* ---- 敌人格子：实心棋子 ---- */
.grid-cell.cell-enemy {
  border: 2px solid var(--color-enemy);
  background: rgba(255, 51, 102, 0.18);
  box-shadow: 0 0 6px rgba(255, 51, 102, 0.15);
}

/* ---- 队友格子：实心棋子 ---- */
.grid-cell.cell-ally {
  border: 2px solid var(--color-ally);
  background: rgba(0, 255, 136, 0.18);
  box-shadow: 0 0 6px rgba(0, 255, 136, 0.15);
}

/* ---- 当前行动单位高亮：柔和脉冲，不刺眼 ---- */
.grid-cell.cell-active {
  border-width: 2px;
  animation: cell-active-pulse 1.5s ease-in-out infinite alternate;  /* 更慢更柔和 */
  z-index: 2;                 /* 提到空格之上 */
}

.grid-cell.cell-active.cell-player {
  border-color: var(--color-player);
  box-shadow: 0 0 10px var(--color-player), inset 0 0 6px rgba(0, 200, 255, 0.1);
}

.grid-cell.cell-active.cell-enemy {
  border-color: var(--color-enemy);
  box-shadow: 0 0 10px var(--color-enemy), inset 0 0 6px rgba(255, 51, 102, 0.1);
}

.grid-cell.cell-active.cell-ally {
  border-color: var(--color-ally);
  box-shadow: 0 0 10px var(--color-ally), inset 0 0 6px rgba(0, 255, 136, 0.1);
}

@keyframes cell-active-pulse {
  from { filter: brightness(1); }
  to { filter: brightness(1.12); }  /* 幅度更小，不刺眼 */
}

/* ---- 阵亡/击败样式：统一灰度 ---- */
.grid-cell.cell-defeated {
  opacity: 0.3;
  filter: grayscale(1);       /* 完全灰度，更统一 */
}

/* ---- 手动模式：可移动格子高亮（青色虚线 + 半透明填充） ---- */
.grid-cell.cell-movable {
  cursor: pointer;
  border: 1px dashed rgba(0, 200, 255, 0.5);
  background: rgba(0, 200, 255, 0.06);
  animation: cell-move-hint 1.5s ease-in-out infinite alternate;
}

.grid-cell.cell-movable:hover {
  background: rgba(0, 200, 255, 0.2);
  border-style: solid;
}

@keyframes cell-move-hint {
  from { background: rgba(0, 200, 255, 0.04); }
  to { background: rgba(0, 200, 255, 0.1); }
}

/* ---- 技能射程范围：淡红色半透明（非目标的范围格） ---- */
.grid-cell.cell-ability-range {
  background: rgba(255, 51, 102, 0.06);
  border: 1px dashed rgba(255, 51, 102, 0.25);
}

/* ---- 技能合法目标：红色高亮 + 可点击 ---- */
.grid-cell.cell-ability-target {
  cursor: crosshair;
  border: 2px dashed rgba(255, 51, 102, 0.7);
  background: rgba(255, 51, 102, 0.15);
  animation: cell-ability-target-pulse 1s ease-in-out infinite alternate;
  z-index: 3;
}

.grid-cell.cell-ability-target:hover {
  background: rgba(255, 51, 102, 0.3);
  border-style: solid;
  box-shadow: 0 0 12px rgba(255, 51, 102, 0.5);
}

@keyframes cell-ability-target-pulse {
  from { box-shadow: 0 0 4px rgba(255, 51, 102, 0.3); }
  to { box-shadow: 0 0 10px rgba(255, 51, 102, 0.5); }
}

/* ---- AOE 预览范围：橙色半透明（非受影响单位的格子） ---- */
.grid-cell.cell-aoe-preview {
  background: rgba(255, 170, 0, 0.08);
  border: 1px dashed rgba(255, 170, 0, 0.3);
  cursor: crosshair;
}

.grid-cell.cell-aoe-preview:hover {
  background: rgba(255, 170, 0, 0.15);
  border-style: solid;
}

/* ---- AOE 受影响单位：橙色高亮 + 脉冲 ---- */
.grid-cell.cell-aoe-affected {
  border: 2px dashed rgba(255, 170, 0, 0.8) !important;
  background: rgba(255, 170, 0, 0.2) !important;
  animation: cell-aoe-pulse 1s ease-in-out infinite alternate;
  z-index: 3;
}

.grid-cell.cell-aoe-affected:hover {
  background: rgba(255, 170, 0, 0.35) !important;
  border-style: solid !important;
  box-shadow: 0 0 12px rgba(255, 170, 0, 0.5);
}

@keyframes cell-aoe-pulse {
  from { box-shadow: 0 0 4px rgba(255, 170, 0, 0.3); }
  to { box-shadow: 0 0 10px rgba(255, 170, 0, 0.6); }
}

/* ==================== 范围图例 ==================== */
.range-legend {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  background: rgba(10, 10, 18, 0.6);
  border-top: 1px solid rgba(0, 200, 255, 0.1);
  font-size: 10px;
  font-family: 'Courier New', monospace;
}

.legend-title {
  color: #6a6a8a;
  letter-spacing: 1px;
  font-weight: bold;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8a8aaa;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid;
  flex-shrink: 0;
}

.legend-movable {
  border-color: rgba(0, 200, 255, 0.5);
  border-style: dashed;
  background: rgba(0, 200, 255, 0.1);
}

.legend-range {
  border-color: rgba(255, 51, 102, 0.3);
  border-style: dashed;
  background: rgba(255, 51, 102, 0.06);
}

.legend-target {
  border-color: rgba(255, 51, 102, 0.7);
  border-style: dashed;
  background: rgba(255, 51, 102, 0.15);
}

.legend-aoe {
  border-color: rgba(255, 170, 0, 0.6);
  border-style: dashed;
  background: rgba(255, 170, 0, 0.15);
}

.legend-active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.3);
}

/* ==================== 手动操作面板 ==================== */
.manual-panel {
  flex-shrink: 0;
  padding: 8px 12px;
  background: rgba(10, 10, 18, 0.85);
  border-top: 1px solid rgba(0, 200, 255, 0.15);
}

/* ---- 指令头部 ---- */
.manual-instruction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.1);
}

.instruction-actor {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #ffd700;
}

.instruction-icon {
  animation: hint-blink 1s ease-in-out infinite alternate;
}

@keyframes hint-blink {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.instruction-mode {
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #00c8ff;
  letter-spacing: 0.5px;
}

/* ---- 行动区 ---- */
.action-area {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 120px;
}

.action-section-abilities {
  flex: 2;
}

.action-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.action-section-label {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #8a8aaa;
  letter-spacing: 1px;
  font-weight: bold;
}

.action-section-status {
  font-size: 9px;
  color: #ffd700;
}

.action-section-status.status-done {
  color: #00ff88;
}

.action-section-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-done-text {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #4a4a6a;
  padding: 4px 0;
}

.action-hint-text {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #6a6a8a;
  padding: 4px 0;
}

/* ---- 技能卡片 ---- */
.ability-cards {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ability-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 8px;
  min-width: 90px;
  cursor: pointer;
  border: 1px solid rgba(255, 51, 102, 0.5);
  background: rgba(255, 51, 102, 0.08);
  border-radius: 3px;
  transition: all 0.15s;
  text-align: left;
}

.ability-card:hover:not(:disabled) {
  background: rgba(255, 51, 102, 0.2);
  box-shadow: 0 0 6px rgba(255, 51, 102, 0.3);
  border-color: rgba(255, 51, 102, 0.8);
}

.ability-card:disabled,
.ability-card.ability-disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: rgba(74, 74, 90, 0.4);
  background: rgba(42, 42, 62, 0.3);
}

.ability-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.ability-card-name {
  font-size: 11px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: #ff6688;
}

.ability-card.ability-disabled .ability-card-name {
  color: #6a6a8a;
}

.ability-card-shape {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: bold;
  flex-shrink: 0;
}

.shape-single {
  color: #ff6688;
  background: rgba(255, 51, 102, 0.15);
  border: 1px solid rgba(255, 51, 102, 0.3);
}

.shape-aoe {
  color: #ffaa00;
  background: rgba(255, 170, 0, 0.15);
  border: 1px solid rgba(255, 170, 0, 0.3);
}

.ability-card-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ability-stat {
  font-size: 9px;
  font-family: 'Courier New', monospace;
  color: #8a8aaa;
}

.ability-card-reason {
  font-size: 9px;
  color: #ff6644;
  font-family: 'Courier New', monospace;
}

/* ---- hover 预览信息 ---- */
.hover-preview {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  background: rgba(255, 170, 0, 0.06);
  border: 1px solid rgba(255, 170, 0, 0.2);
  border-radius: 3px;
  flex: 1;
  min-width: 140px;
}

.preview-header {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #ffaa00;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-coord {
  font-size: 9px;
  color: #8a8aaa;
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.preview-name {
  font-size: 11px;
  font-weight: bold;
  color: #ff6688;
  font-family: 'Courier New', monospace;
}

.preview-hp {
  font-size: 10px;
  color: #ff3366;
  font-family: 'Courier New', monospace;
}

.preview-ability {
  font-size: 9px;
  color: #8a8aaa;
}

.preview-count {
  font-size: 11px;
  font-weight: bold;
  color: #ffaa00;
  font-family: 'Courier New', monospace;
}

.preview-names {
  font-size: 10px;
  color: #ccccee;
  font-family: 'Courier New', monospace;
}

.hover-preview-empty {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: #4a4a6a;
  padding: 6px 8px;
  flex: 1;
}

/* ---- 结束回合按钮 ---- */
.action-btn-end {
  padding: 6px 16px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.6);
  background: rgba(255, 215, 0, 0.1);
  border-radius: 3px;
  transition: all 0.15s;
  align-self: flex-end;
  white-space: nowrap;
}

.action-btn-end:hover {
  background: rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

/* ---- 取消按钮 ---- */
.action-btn-cancel {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  color: #ffaa00;
  border: 1px solid rgba(255, 170, 0, 0.5);
  background: rgba(255, 170, 0, 0.08);
  border-radius: 3px;
  transition: all 0.15s;
  align-self: flex-end;
  white-space: nowrap;
}

.action-btn-cancel:hover {
  background: rgba(255, 170, 0, 0.2);
  box-shadow: 0 0 8px rgba(255, 170, 0, 0.4);
  border-color: rgba(255, 170, 0, 0.8);
}

.cancel-icon {
  font-size: 10px;
}

.cancel-hint {
  font-size: 8px;
  padding: 1px 3px;
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: 2px;
  color: #8a8aaa;
  margin-left: 2px;
}

/* ==================== 模式切换按钮 ==================== */
.ctrl-mode {
  color: #00c8ff;
  border-color: rgba(0, 200, 255, 0.4);
}

.ctrl-mode:hover {
  background: rgba(0, 200, 255, 0.1);
}

/* 手动模式下按钮变金色 */
.ctrl-mode-manual {
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.08);
}

.ctrl-mode-manual:hover {
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.3);
}

.ctrl-mode:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ---- 格子内文字：更大更醒目 ---- */
.cell-name {
  font-size: 13px;            /* 11px → 13px，更醒目 */
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: #ccccee;
  text-align: center;
  line-height: 1.2;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.cell-player .cell-name { color: var(--color-player); }
.cell-enemy .cell-name { color: #ff6688; }
.cell-ally .cell-name { color: var(--color-ally); }

/* ---- 格子内 HP 条：更粗、带圆角 ---- */
.cell-hp-bar {
  width: 80%;
  height: 5px;                /* 4px → 5px，更醒目 */
  background: rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  overflow: hidden;
}

.cell-hp-fill {
  height: 100%;
  transition: width 0.3s ease-out;
  border-radius: 2px;
}

.cell-player .cell-hp-fill { background: var(--color-player); box-shadow: 0 0 4px rgba(0, 200, 255, 0.3); }
.cell-enemy .cell-hp-fill { background: var(--color-enemy); box-shadow: 0 0 4px rgba(255, 51, 102, 0.3); }
.cell-ally .cell-hp-fill { background: var(--color-ally); box-shadow: 0 0 4px rgba(0, 255, 136, 0.3); }

.enemy-slot-empty {
  color: #2a2a4e;
  font-size: 20px;
}

/* ==================== 浮动伤害数字：缩小 + 描边 ==================== */
.floating-damage {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;            /* 28px → 18px，缩小 */
  font-weight: bold;
  color: #ffd700;
  /* 4 方向黑色描边 + 柔光，浮在格子上方不糊 */
  text-shadow:
    -1px -1px 0 rgba(0,0,0,0.9),
     1px -1px 0 rgba(0,0,0,0.9),
    -1px  1px 0 rgba(0,0,0,0.9),
     1px  1px 0 rgba(0,0,0,0.9),
     0 0 6px rgba(255, 215, 0, 0.4);
  font-family: 'Courier New', monospace;
  pointer-events: none;
  z-index: 10;
}

.floating-damage-player {
  color: #ff3366;
  text-shadow:
    -1px -1px 0 rgba(0,0,0,0.9),
     1px -1px 0 rgba(0,0,0,0.9),
    -1px  1px 0 rgba(0,0,0,0.9),
     1px  1px 0 rgba(0,0,0,0.9),
     0 0 6px rgba(255, 51, 102, 0.4);
}

.dmg-crit {
  font-size: 24px;            /* 36px → 24px，暴击稍大但仍克制 */
  color: #ff3366;
  text-shadow:
    -1px -1px 0 rgba(0,0,0,0.9),
     1px -1px 0 rgba(0,0,0,0.9),
    -1px  1px 0 rgba(0,0,0,0.9),
     1px  1px 0 rgba(0,0,0,0.9),
     0 0 8px rgba(255, 51, 102, 0.6);
}

.dmg-float-enter-active {
  transition: all 0.8s ease-out;
}

.dmg-float-leave-active {
  transition: all 0.4s ease-in;
}

.dmg-float-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.5);
}

.dmg-float-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-40px) scale(1.2);
}

/* ==================== 右栏(col-span-4 ~33%)：战斗日志终端 ==================== */
.col-log {
  flex: 0 0 33%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 18, 0.6);
  border: 1px solid rgba(0, 200, 255, 0.1);
}

.battle-log-terminal {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
  scrollbar-width: thin;
  scrollbar-color: #2a2a4e transparent;
  min-height: 0;
}

.battle-log-terminal::-webkit-scrollbar {
  width: 4px;
}

.battle-log-terminal::-webkit-scrollbar-thumb {
  background: #2a2a4e;
}

/*
 * 日志行：左侧 3px 色条
 * CSS 中 border-left 不写颜色时自动用 currentColor（=文字色），
 * 而文字色已由模板 :style="{ color: getLogColor(log) }" 设好，
 * 所以无需改模板，纯 CSS 即可实现色条效果
 */
.log-line {
  margin-bottom: 2px;
  word-break: break-all;
  white-space: pre-wrap;
  padding: 2px 0 2px 8px;     /* 左侧留出色条空间 */
  border-left: 3px solid;     /* 颜色自动跟随文字色 */
}

.log-prefix {
  margin-right: 4px;
  opacity: 0.5;
}

/* ==================== 底部控制栏 — 全宽固定底部 ==================== */
.combat-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: rgba(10, 10, 18, 0.8);
  border-top: 1px solid rgba(0, 200, 255, 0.15);
  flex-shrink: 0;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wave-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wave-label {
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #6a6a8a;
  letter-spacing: 1px;
}

.wave-progress-track {
  width: 120px;
  height: 8px;
  background: #0a0a12;
  border: 1px solid rgba(42, 42, 78, 0.5);
  overflow: hidden;
}

.wave-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00c8ff, #00ff88);
  transition: width 0.3s ease-out;
  box-shadow: 0 0 4px rgba(0, 200, 255, 0.5);
}

.wave-count {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #ccccee;
  font-weight: bold;
}

.round-info {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #ffd700;
  font-weight: bold;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  border: 1px solid;
  background: transparent;
  transition: all 0.2s;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.ctrl-pause {
  color: #00c8ff;
  border-color: #00c8ff;
}

.ctrl-pause:hover {
  background: rgba(0, 200, 255, 0.1);
}

.ctrl-retreat {
  color: #888899;
  border-color: #4a4a5a;
}

.ctrl-retreat:hover:not(:disabled) {
  color: #ff3366;
  border-color: #ff3366;
  background: rgba(255, 51, 102, 0.1);
}

.ctrl-retreat:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ==================== 结果确认按钮 ==================== */
.ctrl-confirm {
  color: #4a4a5a;
  border-color: #2a2a3a;
}

.ctrl-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-confirm:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 8px currentColor;
}
</style>
