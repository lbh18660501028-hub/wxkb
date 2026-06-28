/**
 * 副本 V2 — 核心引擎
 *
 * ==================== 功能说明 ====================
 * 引擎是副本系统的中枢，负责：
 * - 初始化副本运行时状态
 * - 处理房间移动（坐标网格）
 * - 执行房间动作（搜索/检查/黑客/修复等）
 * - 推进回合系统
 * - 应用效果到状态
 * - 检测游戏结束条件
 * - 评估副本评语
 *
 * ==================== 架构原则 ====================
 * - 引擎是纯逻辑模块，不依赖 Vue 响应式
 * - 引擎不直接依赖游戏 Store，通过 PlayerCombatContext 接收数据
 * - 引擎操作 DungeonRuntimeState 对象，由 Composable 管理响应式
 */

import type {
  DungeonRuntimeState,
  DungeonPlayerState,
  DungeonGlobalState,
  DungeonLogEntry,
  RoomConfig,
  ConditionalAction,
  ActionEffect,
  ActionType,
  QuestConfig,
  QuestStatus,
  DungeonRatingConfig,
  PendingEvent,
  DungeonEvent,
  TriggeredStatus,
  SkillCheckConfig,
  SearchTable,
  SearchPoolEntry,
  AlertTier,
} from '../../types/dungeon-v2'
import type { DungeonBundle } from '../../data/dungeons'
import { getRoom } from '../../data/dungeons/biohazard/rooms'
import { getItem } from '../../data/dungeons/biohazard/items'
import {
  TURN_COST,
  SELF_DESTRUCT_CONFIG,
  MAX_INFECTION,
  MAX_SECURITY_ALERT,
  SKILL_GROWTH_CONFIG,
  DEFAULT_DICE_BASE,
  WILLPOWER_RETRY_CONFIG,
} from '../../config/dungeon-v2'
import {
  generateReincarnatorNpcs,
  createFixedNpcs,
  changeNpcTrust,
  changeNpcFear,
  changeNpcInfection,
  processNpcAi,
  countAliveNpcs,
} from './npc'
import { hasItem, addItem, removeItem } from './inventory'
import {
  checkCondition,
  checkFirstEnterEvents,
  checkActionTriggerEvents,
  checkGlobalStateEvents,
  checkNpcStateEvents,
  markEventTriggered,
  createPendingEvent,
  resetEventTracking,
} from './events'
import { initCombat, autoResolveCombat, type PlayerCombatContext } from './combat'
import { rollSkillCheck, getSkillBonus } from '../dice'
import { getSkillById } from '../../data/skills'

// ==================== 日志工具 ====================

let logIdCounter = 0

function createLog(text: string, type: DungeonLogEntry['type'], turn: number): DungeonLogEntry {
  return {
    id: ++logIdCounter,
    text,
    type,
    turn,
  }
}

// ==================== 初始化 ====================

/**
 * 创建副本初始运行时状态
 */
export function createInitialState(
  bundle: DungeonBundle,
  playerMaxHp: number,
): DungeonRuntimeState {
  const config = bundle.config

  // 重置事件追踪
  resetEventTracking()
  logIdCounter = 0

  // 玩家状态
  const player: DungeonPlayerState = {
    hp: playerMaxHp,
    max_hp: playerMaxHp,
    infection: 0,
    position: config.start_room,
    inventory: [],
    permanent_rewards: [],
    weapon: null,
    explored_rooms: [],
    flags: {},
    current_quest: null,
    alive: true,
    failed_actions: [],
    willpower: 0,
    max_willpower: 0,
  }

  // 全局状态
  const global: DungeonGlobalState = {
    turn_count: 0,
    security_alert: 0,
    power_restored: false,
    laser_disabled: false,
    red_queen_processed: false,
    self_destruct_started: false,
    countdown: config.config.self_destruct_turns,
    virus_sample_taken: false,
    virus_sample_destroyed: false,
    virus_sample_frozen: false,
    sample_marked: false,
    rain_saved: false,
    rain_infected: false,
    antivirus_prototype_found: false,
    company_dossier_obtained: false,
    lisa_addison_file_obtained: false,
    spence_exposed: false,
    boss_weakened_level: 0,
    boss_weakened_max: SELF_DESTRUCT_CONFIG.BOSS_WEAKEN_MAX,
    i4_valve_destroyed: false,
    f5_tank_destroyed_count: 0,
    licker_released: false,
    boss_tracking_turns: 0,
    one_survived_laser: false,
    jd_survived: false,
    kaplan_alive: true,
    matt_alive: true,
    alice_alive: true,
    evacuated: false,
    failed: false,
    ending_type: null,
    triggered_statuses: [],
    custom: {},
  }

  // NPC 列表（3 名随机新人轮回者 + 1 名引导型老关 + 副本固定 NPC 如 Rain）
  const npcs = [...generateReincarnatorNpcs(), ...createFixedNpcs()]

  // 任务列表（深拷贝）
  const quests: QuestConfig[] = JSON.parse(JSON.stringify(bundle.quests))

  // 初始化状态
  const state: DungeonRuntimeState = {
    player,
    global,
    npcs,
    quests,
    logs: [],
    combat: null,
    pending_event: null,
    completed: false,
    alert_config: bundle.alert_config,
  }

  // 标记起始房间为已探索
  player.explored_rooms.push(config.start_room)

  // 设置起始房间的 flags
  const startRoom = getRoom(config.start_room)
  if (startRoom) {
    for (const flag of startRoom.flags_set) {
      player.flags[flag] = true
    }
  }

  return state
}

// ==================== 房间移动 ====================

export interface MoveResult {
  success: boolean
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  events: DungeonEvent[]
  require_text?: string
}

/**
 * 尝试移动到目标房间
 * 检查：是否相邻、是否满足进入条件
 */
export function tryMove(
  state: DungeonRuntimeState,
  targetRoomId: string,
): MoveResult {
  const currentRoom = getRoom(state.player.position)
  if (!currentRoom) {
    return { success: false, logs: [{ text: '当前房间数据异常', type: 'danger' }], events: [] }
  }

  // 检查是否相邻
  const exits = currentRoom.exits
  const isAdjacent = Object.values(exits).includes(targetRoomId)
  if (!isAdjacent) {
    return { success: false, logs: [{ text: '目标房间不相邻', type: 'warning' }], events: [] }
  }

  // ==================== 自毁期间通道封锁判定（生化危机副本专属） ====================
  if (state.global.self_destruct_started) {
    const passageKey = `${state.player.position}->${targetRoomId}`
    if (SELF_DESTRUCT_CONFIG.BLOCKED_PASSES.includes(passageKey)) {
      return {
        success: false,
        logs: [{ text: '自毁程序启动后，此通道已被坍塌封锁。必须尽快前往撤离列车！', type: 'danger' }],
        events: [],
        require_text: '通道已封锁',
      }
    }
  }

  // 检查目标房间
  const targetRoom = getRoom(targetRoomId)
  if (!targetRoom) {
    return { success: false, logs: [{ text: '目标房间不存在', type: 'danger' }], events: [] }
  }

  // 检查进入条件
  for (const req of targetRoom.requires) {
    if (req.item && !hasItem(state.player, req.item)) {
      return { success: false, logs: [{ text: req.fail_text, type: 'warning' }], events: [], require_text: req.fail_text }
    }
    if (req.global_flag) {
      const key = req.global_flag as keyof typeof state.global
      if (!state.global[key]) {
        return { success: false, logs: [{ text: req.fail_text, type: 'warning' }], events: [], require_text: req.fail_text }
      }
    }
    if (req.global_flag_false) {
      const key = req.global_flag_false as keyof typeof state.global
      if (state.global[key]) {
        return { success: false, logs: [{ text: req.fail_text, type: 'warning' }], events: [], require_text: req.fail_text }
      }
    }
    if (req.flag && !state.player.flags[req.flag]) {
      return { success: false, logs: [{ text: req.fail_text, type: 'warning' }], events: [], require_text: req.fail_text }
    }
  }

  // 移动成功
  const isFirstEnter = !state.player.explored_rooms.includes(targetRoomId)
  state.player.position = targetRoomId
  state.player.explored_rooms.push(targetRoomId)
  if (targetRoom.random_encounter?.once_per_visit) {
    delete state.player.flags[`random_encounter_triggered_${targetRoomId}`]
  }
  for (const npc of state.npcs) {
    if (npc.alive && npc.follow_state === 'following') {
      npc.current_room = targetRoomId
    }
  }

  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  logs.push({ text: `移动到【${targetRoom.name}】`, type: 'info' })

  // 显示房间描述
  const desc = isFirstEnter ? targetRoom.desc_first : targetRoom.desc_repeat
  logs.push({ text: desc, type: 'info' })

  // 设置房间 flags
  for (const flag of targetRoom.flags_set) {
    state.player.flags[flag] = true
  }

  // 检查首次进入事件
  let events: DungeonEvent[] = []
  if (isFirstEnter) {
    events = checkFirstEnterEvents(state, targetRoomId)
  }

  // 消耗回合
  advanceTurn(state, TURN_COST.move)

  return { success: true, logs, events }
}

// ==================== 动作执行 ====================

export interface ActionResult {
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  events: DungeonEvent[]
  combat_triggered: boolean
  combat_enemy_ids: string[]
  /** 检定失败且不可重试时为 true（UI 用子灰化按钮） */
  check_failed: boolean
}

/**
 * 执行条件动作
 */
export function executeConditionalAction(
  state: DungeonRuntimeState,
  action: ConditionalAction,
  playerContext?: PlayerCombatContext,
): ActionResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  const events: DungeonEvent[] = []
  let combatTriggered = false
  let combatEnemyIds: string[] = []
  let checkFailed = false

  // 检查条件
  if (!checkCondition(state, action.condition)) {
    logs.push({ text: '条件不满足，无法执行此操作。', type: 'warning' })
    return { logs, events, combat_triggered: false, combat_enemy_ids: [], check_failed: false }
  }

  // 检查是否已失败（不可重试）
  if (state.player.failed_actions.includes(action.id)) {
    logs.push({ text: '此操作已检定失败，本次副本内不可重试。', type: 'warning' })
    return { logs, events, combat_triggered: false, combat_enemy_ids: [], check_failed: true }
  }

  // 技能检定分支
  if (action.skill_check) {
    const checkResult = performSkillCheck(state, action.skill_check, action.id, playerContext)
    logs.push(...checkResult.logs)

    if (checkResult.combat_triggered) {
      combatTriggered = true
      combatEnemyIds = checkResult.combat_enemy_ids
    }

    if (checkResult.failed) {
      checkFailed = true
    }
  } else {
    // 无检定，直接应用效果（原有逻辑）
    if (action.effect) {
      const effectResult = applyEffect(state, action.effect)
      logs.push(...effectResult.logs)

      if (effectResult.combat_triggered) {
        combatTriggered = true
        combatEnemyIds = effectResult.combat_enemy_ids
      }
    }
  }

  // 检查动作触发事件
  const actionEvents = checkActionTriggerEvents(state, action.id)
  events.push(...actionEvents)

  // 消耗回合
  const turnCost = action.turn_cost ?? 1
  if (turnCost > 0) {
    advanceTurn(state, turnCost)
  }

  return { logs, events, combat_triggered: combatTriggered, combat_enemy_ids: combatEnemyIds, check_failed: checkFailed }
}

// ==================== 搜索系统（模块化） ====================

/**
 * 从加权随机池中选取一个条目
 */
function pickWeighted(pool: SearchPoolEntry[]): SearchPoolEntry | null {
  if (pool.length === 0) return null
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return null
  let roll = Math.random() * totalWeight
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return pool[pool.length - 1]
}

/**
 * 检查房间是否已被搜索
 */
export function isRoomSearched(state: DungeonRuntimeState, roomId: string): boolean {
  return !!state.player.flags[`searched_${roomId}`]
}

/**
 * 执行搜索动作（模块化版）
 *
 * ==================== 流程说明 ====================
 * 1. 标记房间已搜索（不可重复）
 * 2. 使用 searchTable 中配置的技能进行 D10 骰子检定
 * 3. 检定成功 → 从 success_pool 加权随机抽取奖励
 * 4. 检定失败 → 从 failure_pool 加权随机抽取惩罚
 * 5. 警戒值增加（无论成功失败）
 * 6. 消耗回合
 *
 * @param searchTable 副本专属搜索表（从 DungeonBundle 获取）
 * @param playerContext 玩家上下文（提供属性和技能等级）
 */
export function executeSearch(
  state: DungeonRuntimeState,
  room: RoomConfig,
  quick: boolean,
  searchTable: SearchTable,
  playerContext?: PlayerCombatContext,
): ActionResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  const config = quick ? searchTable.quick_search : searchTable.deep_search
  const searchTypeLabel = quick ? '快速搜索' : '彻底搜索'

  // 标记房间已搜索（无论成功失败都不可重复）
  state.player.flags[`searched_${room.id}`] = true

  // ==================== 技能检定 ====================
  const skillId = config.skill_id
  const skill = getSkillById(skillId)
  if (!skill) {
    logs.push({ text: `搜索配置错误：未知技能 ${skillId}`, type: 'danger' })
    advanceTurn(state, quick ? TURN_COST.quick_search : TURN_COST.deep_search)
    return { logs, events: [], combat_triggered: false, combat_enemy_ids: [], check_failed: false }
  }

  const skillLevel = playerContext?.allSkills?.[skillId] ?? 0
  const attrName = skill.relatedAttr
  const attrValue = getAttributeValue(state, attrName, playerContext)

  // 计算骰池：每5点属性 = 1枚骰子，保底1枚
  const attrDice = Math.max(Math.floor(attrValue / 5), 1)
  const dp = attrDice + skillLevel
  const skillBonus = getSkillBonus(skillLevel)

  // 执行检定
  const result = rollSkillCheck(dp, skillBonus, config.dc)

  logs.push({
    text: `【${searchTypeLabel}】${skill.name}检定 DC${config.dc} → 掷 ${dp}枚D10，成功数 ${result.total}/${config.dc}`,
    type: 'info',
  })

  let combatTriggered = false
  let combatEnemyIds: string[] = []

  if (result.success) {
    // ==================== 检定成功 ====================
    logs.push({ text: '检定成功！', type: 'success' })

    // 从成功池中加权随机抽取
    const entry = pickWeighted(config.success_pool)
    if (entry) {
      const effectResult = applyEffect(state, entry.effect)
      logs.push(...effectResult.logs)
      if (effectResult.combat_triggered) {
        combatTriggered = true
        combatEnemyIds = effectResult.combat_enemy_ids
      }
    }

    // 技能成长判定（仅在有技能且检定成功时触发）
    if (skillLevel < SKILL_GROWTH_CONFIG.MAX_LEVEL && playerContext) {
      const growthChance = Math.min(
        SKILL_GROWTH_CONFIG.GROWTH_CHANCE_MAX,
        SKILL_GROWTH_CONFIG.GROWTH_CHANCE + (config.dc - 1) * SKILL_GROWTH_CONFIG.GROWTH_CHANCE_PER_DC,
      )
      if (Math.random() < growthChance) {
        playerContext.allSkills[skillId] = skillLevel + 1
        logs.push({ text: `【技能成长】${skill.name} 提升至 Lv.${skillLevel + 1}！`, type: 'gold' })
      }
    }
  } else {
    // ==================== 检定失败 ====================
    logs.push({ text: '检定失败。', type: 'warning' })

    // 从失败池中加权随机抽取
    const entry = pickWeighted(config.failure_pool)
    if (entry) {
      const effectResult = applyEffect(state, entry.effect)
      logs.push(...effectResult.logs)
      if (effectResult.combat_triggered) {
        combatTriggered = true
        combatEnemyIds = effectResult.combat_enemy_ids
      }
    }
  }

  // ==================== 警戒值增加 ====================
  if (config.alert_increase > 0) {
    state.global.security_alert = Math.min(
      MAX_SECURITY_ALERT,
      state.global.security_alert + config.alert_increase,
    )
    logs.push({ text: `警戒值 +${config.alert_increase}（当前: ${state.global.security_alert}）`, type: 'warning' })
  }

  // 消耗回合
  advanceTurn(state, quick ? TURN_COST.quick_search : TURN_COST.deep_search)

  return { logs, events: [], combat_triggered: combatTriggered, combat_enemy_ids: combatEnemyIds, check_failed: false }
}

// ==================== 技能检定系统 ====================

/** 技能检定内部结果 */
interface SkillCheckResult {
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  combat_triggered: boolean
  combat_enemy_ids: string[]
  /** 检定是否失败（需标记不可重试） */
  failed: boolean
}

/**
 * 执行技能检定
 * 基于TRPG核心规则：DP = 属性值 + 技能等级，掷 D10
 */
function performSkillCheck(
  state: DungeonRuntimeState,
  check: SkillCheckConfig,
  actionId: string,
  playerContext?: PlayerCombatContext,
): SkillCheckResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  let combatTriggered = false
  let combatEnemyIds: string[] = []

  // 确定技能ID和关联属性
  const skillId = check.skill_id
  let attrName: string
  let skillLevel = 0

  if (skillId) {
    const skill = getSkillById(skillId)
    if (!skill) {
      logs.push({ text: `技能配置错误：未知技能 ${skillId}`, type: 'danger' })
      return { logs, combat_triggered: false, combat_enemy_ids: [], failed: true }
    }
    attrName = check.attr ?? skill.relatedAttr
    // 从 playerContext 获取技能等级
    skillLevel = playerContext?.allSkills?.[skillId] ?? 0
  } else {
    // 默认骰：必须指定属性
    attrName = check.attr ?? 'agility'
  }

  // 获取属性值
  const attrValue = getAttributeValue(state, attrName, playerContext)

  // 计算骰池：每5点属性 = 1枚骰子，保底1枚
  const attrDice = Math.max(Math.floor(attrValue / 5), 1)

  let dp: number
  let skillBonus: number

  if (skillId) {
    // 有技能：DP = 属性骰 + 技能等级
    dp = attrDice + skillLevel
    skillBonus = getSkillBonus(skillLevel)
  } else {
    // 默认骰：DP = 属性骰 + DC档位基础骰
    const baseDice = DEFAULT_DICE_BASE[check.dc] ?? DEFAULT_DICE_BASE[6] ?? 2
    dp = attrDice + baseDice
    skillBonus = 0
  }

  // 执行检定
  const result = rollSkillCheck(dp, skillBonus, check.dc)

  // 日志：检定信息
  const skillName = skillId ? getSkillById(skillId)?.name ?? skillId : '默认检定'
  logs.push({
    text: `【${check.description}】${skillName}检定 DC${check.dc} → 掷 ${dp}枚D10，成功数 ${result.total}/${check.dc}`,
    type: 'info',
  })

  if (result.success) {
    // ==================== 检定成功 ====================
    if (check.success_text) {
      logs.push({ text: check.success_text, type: 'success' })
    } else if (check.success_effect.log) {
      logs.push({ text: check.success_effect.log, type: 'success' })
    } else {
      logs.push({ text: '检定成功！', type: 'success' })
    }

    // 应用成功效果
    const effectResult = applyEffect(state, check.success_effect)
    logs.push(...effectResult.logs)
    if (effectResult.combat_triggered) {
      combatTriggered = true
      combatEnemyIds = effectResult.combat_enemy_ids
    }

    // 技能成长判定（仅在有技能且检定成功时触发）
    if (skillId && skillLevel < SKILL_GROWTH_CONFIG.MAX_LEVEL && playerContext) {
      const growthChance = Math.min(
        SKILL_GROWTH_CONFIG.GROWTH_CHANCE_MAX,
        SKILL_GROWTH_CONFIG.GROWTH_CHANCE + (check.dc - 1) * SKILL_GROWTH_CONFIG.GROWTH_CHANCE_PER_DC,
      )
      if (Math.random() < growthChance) {
        // 技能成长（直接修改 playerContext.allSkills，由 Store 同步回角色）
        playerContext.allSkills[skillId] = skillLevel + 1
        const newLevel = skillLevel + 1
        const sName = getSkillById(skillId)?.name ?? skillId
        logs.push({ text: `【技能成长】${sName} 提升至 Lv.${newLevel}！`, type: 'gold' })
      }
    }
  } else {
    // ==================== 检定失败 ====================
    if (check.failure_text) {
      logs.push({ text: check.failure_text, type: 'warning' })
    } else {
      logs.push({ text: '检定失败。', type: 'warning' })
    }

    // 应用失败效果（如有）
    if (check.failure_effect) {
      const effectResult = applyEffect(state, check.failure_effect)
      logs.push(...effectResult.logs)
      if (effectResult.combat_triggered) {
        combatTriggered = true
        combatEnemyIds = effectResult.combat_enemy_ids
      }
      // 有 failure_effect → 受了惩罚，但可重试（不标记 failed_actions）
      logs.push({ text: '可以再次尝试此操作。', type: 'info' })
    } else {
      // 无 failure_effect → 标记不可重试
      state.player.failed_actions.push(actionId)
      logs.push({ text: '此操作本次副本内不可重试。', type: 'warning' })
    }
  }

  return {
    logs,
    combat_triggered: combatTriggered,
    combat_enemy_ids: combatEnemyIds,
    failed: !result.success && !check.failure_effect,
  }
}

/**
 * 获取玩家属性值
 * 从 playerContext 获取，如果未提供则返回 1（最低值）
 */
function getAttributeValue(
state: DungeonRuntimeState,
attrName: string,
playerContext?: PlayerCombatContext,
): number {
if (!playerContext) return 1
const attrs = playerContext.attributes
// 旧属性名→新属性名映射（向后兼容旧副本数据）
const legacyAttrMap: Record<string, string> = {
reaction: 'agility',
spirit: 'resolve',
vitality: 'endurance',
immunity: 'composure',
muscle: 'strength',
}
const mappedName = legacyAttrMap[attrName] ?? attrName
const attrMap: Record<string, number> = {
strength: attrs.strength,
agility: attrs.agility,
endurance: attrs.endurance,
intelligence: attrs.intelligence,
perception: attrs.perception,
resolve: attrs.resolve,
presence: attrs.presence,
manipulation: attrs.manipulation,
composure: attrs.composure,
}
return attrMap[mappedName] ?? 1
}

// ==================== 意志力重试系统 ====================

/**
 * 使用意志力重试已失败的动作
 * 消耗意志力，重新执行技能检定
 */
export function retryActionWithWillpower(
  state: DungeonRuntimeState,
  action: ConditionalAction,
  playerContext?: PlayerCombatContext,
): ActionResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  const events: DungeonEvent[] = []
  let combatTriggered = false
  let combatEnemyIds: string[] = []
  let checkFailed = false

  // 检查是否已失败
  if (!state.player.failed_actions.includes(action.id)) {
    logs.push({ text: '此操作未失败，无需重试。', type: 'warning' })
    return { logs, events, combat_triggered: false, combat_enemy_ids: [], check_failed: false }
  }

  // 检查意志力是否足够
  if (state.player.willpower < WILLPOWER_RETRY_CONFIG.COST_PER_RETRY) {
    logs.push({ text: `意志力不足（需要 ${WILLPOWER_RETRY_CONFIG.COST_PER_RETRY} 点，当前 ${state.player.willpower} 点）。`, type: 'danger' })
    return { logs, events, combat_triggered: false, combat_enemy_ids: [], check_failed: true }
  }

  // 检查是否有技能检定
  if (!action.skill_check) {
    logs.push({ text: '此操作无技能检定，无法重试。', type: 'warning' })
    return { logs, events, combat_triggered: false, combat_enemy_ids: [], check_failed: true }
  }

  // 消耗意志力
  state.player.willpower -= WILLPOWER_RETRY_CONFIG.COST_PER_RETRY
  logs.push({ text: `消耗 ${WILLPOWER_RETRY_CONFIG.COST_PER_RETRY} 点意志力进行重试。`, type: 'info' })

  // 从 failed_actions 中移除（允许重试）
  state.player.failed_actions = state.player.failed_actions.filter(id => id !== action.id)

  // 重新执行检定
  const checkResult = performSkillCheck(state, action.skill_check, action.id, playerContext)
  logs.push(...checkResult.logs)

  if (checkResult.combat_triggered) {
    combatTriggered = true
    combatEnemyIds = checkResult.combat_enemy_ids
  }

  if (checkResult.failed) {
    checkFailed = true
  }

  // 检查动作触发事件
  const actionEvents = checkActionTriggerEvents(state, action.id)
  events.push(...actionEvents)

  // 消耗回合
  const turnCost = action.turn_cost ?? 1
  if (turnCost > 0) {
    advanceTurn(state, turnCost)
  }

  return { logs, events, combat_triggered: combatTriggered, combat_enemy_ids: combatEnemyIds, check_failed: checkFailed }
}

/**
 * 获取当前房间已失败的动作ID列表（供 UI 灰化按钮使用）
 */
export function getFailedActionIds(state: DungeonRuntimeState): string[] {
  return state.player.failed_actions
}

/**
 * 获取当前房间中已失败但仍可重试（花费意志力）的动作列表
 */
export function getRetryableActions(state: DungeonRuntimeState): ConditionalAction[] {
  const room = getRoom(state.player.position)
  if (!room) return []

  return room.conditional_actions.filter((action) =>
    state.player.failed_actions.includes(action.id) && action.skill_check,
  )
}

/**
 * 初始化玩家意志力（进入副本时调用）
 */
export function initPlayerWillpower(state: DungeonRuntimeState, maxWillpower: number): void {
  state.player.willpower = maxWillpower
  state.player.max_willpower = maxWillpower
}

export interface EffectResult {
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  combat_triggered: boolean
  combat_enemy_ids: string[]
}

// ==================== 触发型状态管理 ====================

/** 添加触发型状态（如果已存在同 id 则覆盖） */
export function addTriggeredStatus(state: DungeonRuntimeState, status: TriggeredStatus): void {
  state.global.triggered_statuses = state.global.triggered_statuses.filter(s => s.id !== status.id)
  state.global.triggered_statuses.push(status)
  state.global.triggered_statuses.sort((a, b) => b.priority - a.priority)
}

/** 移除触发型状态 */
export function removeTriggeredStatus(state: DungeonRuntimeState, id: string): void {
  state.global.triggered_statuses = state.global.triggered_statuses.filter(s => s.id !== id)
}

/** 更新触发型状态的当前值 */
export function updateTriggeredStatusValue(state: DungeonRuntimeState, id: string, value: number): void {
  const status = state.global.triggered_statuses.find(s => s.id === id)
  if (status) {
    status.value = value
  }
}

/** 自毁倒计时触发型状态的固定 id */
const SELF_DESTRUCT_STATUS_ID = 'self_destruct'

/** 创建自毁倒计时触发型状态 */
function createSelfDestructStatus(countdown: number): TriggeredStatus {
  return {
    id: SELF_DESTRUCT_STATUS_ID,
    label: '自毁倒计时',
    value: countdown,
    max_value: countdown,
    unit: '回合',
    color: '#ff3366',
    priority: 100,
    critical_threshold: 10,
  }
}

/** BOSS 追踪触发型状态的固定 id（生化危机副本专属） */
const BOSS_TRACKING_STATUS_ID = 'boss_tracking'

/** 创建 BOSS 追踪触发型状态 */
function createBossTrackingStatus(turns: number): TriggeredStatus {
  return {
    id: BOSS_TRACKING_STATUS_ID,
    label: 'BOSS 追踪',
    value: turns,
    max_value: turns,
    unit: '回合',
    color: '#ffd700',
    priority: 90,
    critical_threshold: 3,
  }
}

/**
 * 应用动作效果到状态
 */
export function applyEffect(state: DungeonRuntimeState, effect: ActionEffect): EffectResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  let combatTriggered = false
  let combatEnemyIds: string[] = []

  // HP 变化
  if (effect.hp) {
    state.player.hp = Math.max(0, Math.min(state.player.max_hp, state.player.hp + effect.hp))
    const sign = effect.hp > 0 ? '+' : ''
    logs.push({ text: `HP ${sign}${effect.hp}（当前: ${state.player.hp}/${state.player.max_hp}）`, type: effect.hp > 0 ? 'success' : 'danger' })
    if (state.player.hp <= 0) {
      state.player.alive = false
      logs.push({ text: '你倒下了……', type: 'danger' })
    }
  }

  // 感染值变化
  if (effect.infection) {
    state.player.infection = Math.max(0, Math.min(MAX_INFECTION, state.player.infection + effect.infection))
    const sign = effect.infection > 0 ? '+' : ''
    logs.push({ text: `感染值 ${sign}${effect.infection}（当前: ${state.player.infection}）`, type: effect.infection > 0 ? 'warning' : 'success' })
  }

  // 警戒值变化
  if (effect.security_alert) {
    state.global.security_alert = Math.max(0, Math.min(MAX_SECURITY_ALERT, state.global.security_alert + effect.security_alert))
    const sign = effect.security_alert > 0 ? '+' : ''
    logs.push({ text: `警戒值 ${sign}${effect.security_alert}（当前: ${state.global.security_alert}）`, type: effect.security_alert > 0 ? 'warning' : 'success' })
  }

  // 设置玩家 flag
  if (effect.set_flag) {
    state.player.flags[effect.set_flag] = true
  }
  if (effect.set_flags) {
    for (const flag of effect.set_flags) {
      state.player.flags[flag] = true
    }
  }

  // 清除玩家 flag
  if (effect.clear_flag) {
    state.player.flags[effect.clear_flag] = false
  }
  if (effect.clear_flags) {
    for (const flag of effect.clear_flags) {
      state.player.flags[flag] = false
    }
  }

  // 设置全局 flag
  if (effect.set_global) {
    const key = effect.set_global as keyof typeof state.global
    ;(state.global[key] as unknown) = true
  }
  if (effect.set_globals) {
    for (const flag of effect.set_globals) {
      const key = flag as keyof typeof state.global
      ;(state.global[key] as unknown) = true
    }
  }

  // 自毁倒计时启动 — 创建触发型状态显示 + 自动解锁撤离井 + 初始化 BOSS 追踪
  const justStartedSelfDestruct =
    (effect.set_globals?.includes('self_destruct_started') ||
     effect.set_global === 'self_destruct_started') &&
    !state.global.triggered_statuses.some(s => s.id === SELF_DESTRUCT_STATUS_ID)
  if (justStartedSelfDestruct) {
    addTriggeredStatus(state, createSelfDestructStatus(state.global.countdown))
    // 自动解锁撤离井闸门（生化危机副本专属）
    state.player.flags['evac_shaft_open'] = true
    // 初始化 BOSS 追踪倒计时
    state.global.boss_tracking_turns = SELF_DESTRUCT_CONFIG.BOSS_TRACKING_DELAY
    addTriggeredStatus(state, createBossTrackingStatus(state.global.boss_tracking_turns))
  }

  // 清除全局 flag
  if (effect.clear_global) {
    const key = effect.clear_global as keyof typeof state.global
    ;(state.global[key] as unknown) = false
  }
  if (effect.clear_globals) {
    for (const flag of effect.clear_globals) {
      const key = flag as keyof typeof state.global
      ;(state.global[key] as unknown) = false
    }
  }

  // 添加道具
  if (effect.add_item) {
    const itemName = addItem(state.player, effect.add_item)
    if (itemName) {
      logs.push({ text: `获得道具: ${itemName}`, type: 'success' })
    }
  }
  if (effect.add_items) {
    for (const itemId of effect.add_items) {
      const itemName = addItem(state.player, itemId)
      if (itemName) {
        logs.push({ text: `获得道具: ${itemName}`, type: 'success' })
      }
    }
  }

  // 移除道具
  if (effect.remove_item) {
    if (removeItem(state.player, effect.remove_item)) {
      const item = getItem(effect.remove_item)
      logs.push({ text: `消耗道具: ${item?.name ?? effect.remove_item}`, type: 'info' })
    }
  }
  if (effect.remove_items) {
    for (const itemId of effect.remove_items) {
      if (removeItem(state.player, itemId)) {
        const item = getItem(itemId)
        logs.push({ text: `消耗道具: ${item?.name ?? itemId}`, type: 'info' })
      }
    }
  }

  // NPC 信任值变化
  if (effect.npc_trust) {
    const npc = state.npcs.find((n) => n.id === effect.npc_trust!.npc_id)
    if (npc && npc.alive) {
      changeNpcTrust(npc, effect.npc_trust.value)
      const sign = effect.npc_trust.value > 0 ? '+' : ''
      logs.push({ text: `${npc.name} 信任值 ${sign}${effect.npc_trust.value}（当前: ${npc.trust}）`, type: effect.npc_trust.value > 0 ? 'success' : 'warning' })
    }
  }

  // NPC 恐惧值变化
  if (effect.npc_fear) {
    const npc = state.npcs.find((n) => n.id === effect.npc_fear!.npc_id)
    if (npc && npc.alive) {
      changeNpcFear(npc, effect.npc_fear.value)
      const sign = effect.npc_fear.value > 0 ? '+' : ''
      logs.push({ text: `${npc.name} 恐惧值 ${sign}${effect.npc_fear.value}（当前: ${npc.fear}）`, type: effect.npc_fear.value > 0 ? 'warning' : 'success' })
    }
  }

  // NPC 跟随状态变更
  if (effect.npc_follow) {
    const npc = state.npcs.find((n) => n.id === effect.npc_follow!.npc_id)
    if (npc && npc.alive) {
      npc.follow_state = effect.npc_follow.state
      if (effect.npc_follow.state === 'following' || effect.npc_follow.state === 'waiting') {
        npc.current_room = state.player.position
      }
      const stateLabels: Record<string, string> = { following: '开始跟随', waiting: '就地留守', left: '离开了队伍', dead: '已死亡' }
      logs.push({ text: `${npc.name} ${stateLabels[effect.npc_follow.state] ?? effect.npc_follow.state}`, type: 'info' })
    }
  }

  // NPC HP 治疗
  if (effect.npc_heal) {
    const npc = state.npcs.find((n) => n.id === effect.npc_heal!.npc_id)
    if (npc && npc.alive) {
      npc.hp = Math.max(0, Math.min(npc.max_hp, npc.hp + effect.npc_heal.amount))
      logs.push({ text: `${npc.name} HP +${effect.npc_heal.amount}（当前: ${npc.hp}/${npc.max_hp}）`, type: 'success' })
    }
  }

  // NPC 感染值变化
  if (effect.npc_infection) {
    const npc = state.npcs.find((n) => n.id === effect.npc_infection!.npc_id)
    if (npc && npc.alive) {
      changeNpcInfection(npc, effect.npc_infection.value)
      const sign = effect.npc_infection.value > 0 ? '+' : ''
      logs.push({ text: `${npc.name} 感染值 ${sign}${effect.npc_infection.value}（当前: ${npc.infection}）`, type: effect.npc_infection.value > 0 ? 'warning' : 'success' })
    }
  }

  // 解锁出口
  if (effect.unlock_exit) {
    const room = getRoom(effect.unlock_exit.room)
    if (room) {
      logs.push({ text: `解锁了路线: ${room.name} 的 ${effect.unlock_exit.direction} 方向`, type: 'success' })
    }
  }

  // 开始任务
  if (effect.start_quest) {
    const quest = state.quests.find((q) => q.id === effect.start_quest)
    if (quest && quest.status === 'locked') {
      quest.status = 'active'
      logs.push({ text: `新任务: ${quest.title}`, type: 'gold' })
    }
  }

  // 完成任务目标
  if (effect.complete_objective) {
    completeObjective(state, effect.complete_objective)
  }
  if (effect.complete_objectives) {
    for (const objId of effect.complete_objectives) {
      completeObjective(state, objId)
    }
  }

  // 倒计时变化
  if (effect.countdown_change) {
    state.global.countdown = Math.max(0, state.global.countdown + effect.countdown_change)
    const sign = effect.countdown_change > 0 ? '+' : ''
    logs.push({ text: `自毁倒计时 ${sign}${effect.countdown_change} 回合（剩余: ${state.global.countdown}）`, type: effect.countdown_change < 0 ? 'warning' : 'success' })
    // 同步更新触发型状态显示
    updateTriggeredStatusValue(state, SELF_DESTRUCT_STATUS_ID, state.global.countdown)
  }

  // 削弱 Boss
  if (effect.boss_weaken) {
    state.global.boss_weakened_level += effect.boss_weaken
    logs.push({ text: `最终 BOSS 被削弱！削弱等级: ${state.global.boss_weakened_level}`, type: 'success' })
  }

  // 传送
  if (effect.teleport) {
    state.player.position = effect.teleport
    if (!state.player.explored_rooms.includes(effect.teleport)) {
      state.player.explored_rooms.push(effect.teleport)
    }
    const targetRoom = getRoom(effect.teleport)
    logs.push({ text: `传送至: ${targetRoom?.name ?? effect.teleport}`, type: 'info' })
  }

  // 触发战斗
  if (effect.start_combat) {
    combatTriggered = true
    combatEnemyIds = effect.spawn_enemies ?? []
    logs.push({ text: '遭遇敌人！', type: 'danger' })
  }

  // 日志文本
  if (effect.log) {
    logs.push({ text: effect.log, type: 'info' })
  }

  return { logs, combat_triggered: combatTriggered, combat_enemy_ids: combatEnemyIds }
}

// ==================== 任务系统 ====================

/**
 * 完成任务目标
 */
export function completeObjective(state: DungeonRuntimeState, objectiveId: string): void {
  for (const quest of state.quests) {
    const obj = quest.objectives.find((o) => o.id === objectiveId)
    if (obj && obj.status !== 'completed') {
      obj.status = 'completed'
      // 检查是否所有目标都完成了
      const allCompleted = quest.objectives.every((o) => o.status === 'completed')
      if (allCompleted) {
        quest.status = 'completed'
        addLog(state, `任务完成: ${quest.title}`, 'gold')
      }
    }
  }
}

/**
 * 更新任务状态（根据 actionId 推进）
 */
export function updateQuestsByAction(state: DungeonRuntimeState, actionId: string): void {
  for (const quest of state.quests) {
    if (quest.status === 'completed' || quest.status === 'failed') continue
    for (const obj of quest.objectives) {
      if (obj.status === 'completed') continue
      if (obj.trigger_actions.includes(actionId)) {
        obj.status = 'completed'
        // 如果任务还是 locked 或 available，变为 active
        if (quest.status === 'locked' || quest.status === 'available') {
          quest.status = 'active'
        }
        // 检查是否全部完成
        const allCompleted = quest.objectives.every((o) => o.status === 'completed')
        if (allCompleted) {
          quest.status = 'completed'
          addLog(state, `任务完成: ${quest.title}`, 'gold')
        }
      }
    }
  }
}

// ==================== 回合推进 ====================

export interface TurnResult {
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  events: DungeonEvent[]
  game_over: boolean
  game_over_reason?: string
}

/**
 * 推进回合
 * 消耗回合数，执行 NPC AI，检查全局事件和游戏结束
 */
export function advanceTurn(state: DungeonRuntimeState, cost: number): TurnResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  const events: DungeonEvent[] = []
  let gameOver = false
  let gameOverReason: string | undefined

  state.global.turn_count += cost

  // 自毁倒计时
  if (state.global.self_destruct_started) {
    state.global.countdown = Math.max(0, state.global.countdown - cost)
    // 同步更新触发型状态显示
    updateTriggeredStatusValue(state, SELF_DESTRUCT_STATUS_ID, state.global.countdown)
    if (state.global.countdown <= 0) {
      logs.push({ text: '自毁倒计时归零！设施即将毁灭！', type: 'danger' })
      state.global.failed = true
      gameOver = true
      gameOverReason = '自毁倒计时归零，设施毁灭'
    }
  }

  // ==================== BOSS 追踪倒计时（生化危机副本专属） ====================
  if (state.global.boss_tracking_turns > 0) {
    state.global.boss_tracking_turns = Math.max(0, state.global.boss_tracking_turns - cost)
    // 同步更新触发型状态显示
    updateTriggeredStatusValue(state, BOSS_TRACKING_STATUS_ID, state.global.boss_tracking_turns)
    if (state.global.boss_tracking_turns <= 0 && !state.global.licker_released) {
      state.global.licker_released = true
      removeTriggeredStatus(state, BOSS_TRACKING_STATUS_ID)
      logs.push({ text: '身后传来震耳欲聋的咆哮——暴走舔食者追上来了！', type: 'danger' })
    }
  }

  // 检查全局状态事件
  const globalEvents = checkGlobalStateEvents(state)
  for (const ev of globalEvents) {
    events.push(ev)
    if (ev.once) markEventTriggered(ev.id)
  }

  // NPC AI 行为
  const alertTier = getAlertTier(state)
  const alertFear = alertTier?.npc_fear_per_turn ?? 0
  const npcResult = processNpcAi(
    state.npcs,
    state.global,
    state.player.infection,
    state.player.hp,
    state.player.max_hp,
    alertFear,
  )
  for (const log of npcResult.logs) {
    logs.push({ text: log, type: 'info' })
  }

  // 检查 NPC 状态事件
  const npcIds = state.npcs.filter((n) => n.alive).map((n) => n.id)
  const npcEvents = checkNpcStateEvents(state, npcIds)
  for (const ev of npcEvents) {
    events.push(ev)
    if (ev.once) markEventTriggered(ev.id)
  }

  // 检查感染致死
  if (state.player.infection >= MAX_INFECTION) {
    logs.push({ text: '感染值达到 100，你变异了……', type: 'danger' })
    state.player.alive = false
    state.global.failed = true
    gameOver = true
    gameOverReason = '感染失控，角色变异'
  }

  // 检查玩家死亡
  if (!state.player.alive && !state.global.failed) {
    state.global.failed = true
    gameOver = true
    gameOverReason = '玩家死亡'
  }

  return { logs, events, game_over: gameOver, game_over_reason: gameOverReason }
}

// ==================== 可用动作获取 ====================

/**
 * 获取当前房间的可用条件动作
 * 过滤掉条件不满足的动作和已失败的动作
 */
export function getAvailableActions(state: DungeonRuntimeState): ConditionalAction[] {
  const room = getRoom(state.player.position)
  if (!room) return []

  return room.conditional_actions.filter((action) => {
    // 过滤已失败的动作
    if (state.player.failed_actions.includes(action.id)) return false
    // 过滤条件不满足的动作
    return checkCondition(state, action.condition)
  })
}

/**
 * 获取当前房间的默认动作
 */
export function getDefaultActions(state: DungeonRuntimeState): ActionType[] {
  const room = getRoom(state.player.position)
  if (!room) return []
  return room.default_actions
}

// ==================== 房间信息 ====================

/**
 * 获取当前房间描述
 */
export function getRoomDescription(state: DungeonRuntimeState): string {
  const room = getRoom(state.player.position)
  if (!room) return '未知区域'

  const isFirstEnter = state.player.explored_rooms.filter((id) => id === room.id).length <= 1
  return isFirstEnter ? room.desc_first : room.desc_repeat
}

/**
 * 获取当前房间配置
 */
export function getCurrentRoom(state: DungeonRuntimeState): RoomConfig | null {
  return getRoom(state.player.position) ?? null
}

/**
 * 获取当前房间可移动的相邻房间
 */
export function getAdjacentRooms(state: DungeonRuntimeState): { direction: string; roomId: string; name: string; locked: boolean }[] {
  const room = getRoom(state.player.position)
  if (!room) return []

  const result: { direction: string; roomId: string; name: string; locked: boolean }[] = []

  for (const [direction, roomId] of Object.entries(room.exits)) {
    const targetRoom = getRoom(roomId)
    if (!targetRoom) continue

    // 检查是否锁定
    let locked = false
    for (const req of targetRoom.requires) {
      if (req.item && !hasItem(state.player, req.item)) locked = true
      if (req.global_flag) {
        const key = req.global_flag as keyof typeof state.global
        if (!state.global[key]) locked = true
      }
      if (req.flag && !state.player.flags[req.flag]) locked = true
    }

    result.push({
      direction,
      roomId,
      name: targetRoom.name,
      locked,
    })
  }

  return result
}

// ==================== 战斗触发 ====================

/**
 * 检查并触发房间战斗
 * 返回需要战斗的敌人 ID 列表
 */
export function checkRoomCombat(state: DungeonRuntimeState): string[] | null {
  const room = getRoom(state.player.position)
  if (!room || !room.combat) return null

  // 如果是强制战斗且未清除
  if (room.combat.forced) {
    // 检查是否已经战斗过（通过 flag）
    const combatFlag = `combat_cleared_${room.id}`
    if (state.player.flags[combatFlag]) return null
    return room.combat.enemy_ids
  }

  return null
}

/**
 * 标记房间战斗已清除
 */
export function markRoomCombatCleared(state: DungeonRuntimeState): void {
  const room = getRoom(state.player.position)
  if (!room) return
  const flag = `combat_cleared_${room.id}`
  state.player.flags[flag] = true
}

/**
 * 检查随机遭遇
 */
export function checkRandomEncounter(state: DungeonRuntimeState): string[] | null {
  const room = getRoom(state.player.position)
  if (!room || !room.random_encounter) return null

  const config = room.random_encounter
  const onceFlag = `random_encounter_triggered_${room.id}`
  if (config.once_per_visit && state.player.flags[onceFlag]) return null

  const alertMax = state.alert_config?.max ?? MAX_SECURITY_ALERT
  let probability = config.probability

  // 警戒值修正
  if (config.alert_modifier) {
    probability += (state.global.security_alert / alertMax) * config.alert_modifier
  }

  // 警戒阶段额外遭遇加成
  const tier = getAlertTier(state)
  if (tier?.encounter_bonus) {
    probability += tier.encounter_bonus
  }

  // 自毁期间遭遇概率加成（生化危机副本专属）
  if (state.global.self_destruct_started) {
    probability += SELF_DESTRUCT_CONFIG.ENCOUNTER_BONUS
  }

  if (Math.random() < probability) {
    if (config.once_per_visit) {
      state.player.flags[onceFlag] = true
    }
    const enemyIds = [...config.enemy_ids]
    // 警戒阶段巡逻敌人加入遭遇池
    if (tier?.patrol_enemies) {
      enemyIds.push(...tier.patrol_enemies)
    }
    return enemyIds
  }

  return null
}

// ==================== BOSS 追踪检查（生化危机副本专属） ====================

/**
 * 检查 BOSS 是否追上玩家
 * 当 licker_released 为 true 且尚未触发 BOSS 战斗时，返回 BOSS 敌人 ID。
 * 调用后自动标记 boss_combat_triggered，确保只触发一次。
 *
 * @returns BOSS 敌人 ID 列表，或 null
 */
export function checkBossRelease(state: DungeonRuntimeState): string[] | null {
  if (state.global.licker_released && !state.player.flags['boss_combat_triggered']) {
    state.player.flags['boss_combat_triggered'] = true
    return [SELF_DESTRUCT_CONFIG.BOSS_ENEMY_ID]
  }
  return null
}

// ==================== 警戒值阶段查询 ====================

/**
 * 获取当前警戒值对应的阶段配置
 * 副本未提供 alert_config 时返回 null（警戒值无效果）
 */
export function getAlertTier(state: DungeonRuntimeState): AlertTier | null {
  if (!state.alert_config) return null
  const alert = state.global.security_alert
  for (const tier of state.alert_config.tiers) {
    if (alert >= tier.min && alert <= tier.max) {
      return tier
    }
  }
  return null
}

/**
 * 获取警戒值上限（副本配置或默认值）
 */
export function getAlertMax(state: DungeonRuntimeState): number {
  return state.alert_config?.max ?? MAX_SECURITY_ALERT
}

// ==================== 评语评估 ====================

/**
 * 评估副本评语
 * 根据任务完成度和全局状态给出评语等级
 */
export function evaluateRating(
  state: DungeonRuntimeState,
  bundle: DungeonBundle,
): DungeonRatingConfig {
  const completedQuests = state.quests.filter((q) => q.status === 'completed').length
  const completedMainQuests = state.quests.filter(
    (q) => q.type === 'main' && q.status === 'completed',
  ).length
  const aliveNpcs = countAliveNpcs(state.npcs)

  for (const rating of bundle.ratings) {
    const cond = rating.conditions
    let met = true

    if (cond.min_quests_completed !== undefined && completedQuests < cond.min_quests_completed) met = false
    if (cond.min_main_quests_completed !== undefined && completedMainQuests < cond.min_main_quests_completed) met = false
    if (cond.max_infection !== undefined && state.player.infection > cond.max_infection) met = false
    if (cond.min_npcs_alive !== undefined && aliveNpcs < cond.min_npcs_alive) met = false
    if (cond.min_turns_remaining !== undefined) {
      const remaining = bundle.config.config.self_destruct_turns - state.global.countdown
      if (remaining < cond.min_turns_remaining) met = false
    }

    if (met) return rating
  }

  // 默认返回最低评语
  return bundle.ratings[bundle.ratings.length - 1]
}

// ==================== 日志 ====================

/**
 * 添加日志到状态
 */
export function addLog(
  state: DungeonRuntimeState,
  text: string,
  type: DungeonLogEntry['type'] = 'info',
): void {
  state.logs.push(createLog(text, type, state.global.turn_count))
  // 限制日志数量
  if (state.logs.length > 100) {
    state.logs.shift()
  }
}

// ==================== 事件处理 ====================

/**
 * 处理待处理事件
 * 玩家选择选项后调用
 */
export function resolveEventChoice(
  state: DungeonRuntimeState,
  pendingEvent: PendingEvent,
  choiceId: string,
): { logs: { text: string; type: DungeonLogEntry['type'] }[]; combat_triggered: boolean; combat_enemy_ids: string[] } {
  const choice = pendingEvent.choices.find((c) => c.id === choiceId)
  if (!choice) {
    return { logs: [{ text: '无效选择', type: 'warning' }], combat_triggered: false, combat_enemy_ids: [] }
  }

  // 检查条件
  if (choice.condition && !checkCondition(state, choice.condition)) {
    return { logs: [{ text: '条件不满足', type: 'warning' }], combat_triggered: false, combat_enemy_ids: [] }
  }

  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []

  // 显示结果文本
  if (choice.result_text) {
    logs.push({ text: choice.result_text, type: 'info' })
  }

  // 应用效果
  if (choice.effect) {
    const effectResult = applyEffect(state, choice.effect)
    logs.push(...effectResult.logs)

    return {
      logs,
      combat_triggered: effectResult.combat_triggered,
      combat_enemy_ids: effectResult.combat_enemy_ids,
    }
  }

  return { logs, combat_triggered: false, combat_enemy_ids: [] }
}

/**
 * 处理自动事件（无选项，自动执行效果）
 */
export function resolveAutoEvent(
  state: DungeonRuntimeState,
  event: DungeonEvent,
): { logs: { text: string; type: DungeonLogEntry['type'] }[]; combat_triggered: boolean; combat_enemy_ids: string[] } {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []

  if (event.auto_effects) {
    const effectResult = applyEffect(state, event.auto_effects as ActionEffect)
    logs.push(...effectResult.logs)

    return {
      logs,
      combat_triggered: effectResult.combat_triggered,
      combat_enemy_ids: effectResult.combat_enemy_ids,
    }
  }

  return { logs, combat_triggered: false, combat_enemy_ids: [] }
}

/**
 * 获取事件的可选项（过滤条件不满足的）
 */
export function getEventChoices(
  state: DungeonRuntimeState,
  pendingEvent: PendingEvent,
): PendingEvent['choices'] {
  return pendingEvent.choices.filter((choice) => {
    if (!choice.condition) return true
    return checkCondition(state, choice.condition)
  })
}

// ==================== 状态查询 ====================

/**
 * 检查游戏是否结束
 */
export function isGameOver(state: DungeonRuntimeState): boolean {
  return state.global.failed || state.global.evacuated || !state.player.alive
}

/**
 * 获取已完成任务数量
 */
export function getCompletedQuestCount(state: DungeonRuntimeState): number {
  return state.quests.filter((q) => q.status === 'completed').length
}

/**
 * 获取已完成主线任务数量
 */
export function getCompletedMainQuestCount(state: DungeonRuntimeState): number {
  return state.quests.filter((q) => q.type === 'main' && q.status === 'completed').length
}
