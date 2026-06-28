/**
 * 副本系统 V2 — Composable 状态桥接
 *
 * ==================== 功能说明 ====================
 * 将引擎的纯逻辑与 Vue 响应式系统连接
 * 桥接游戏 Store 的玩家数据到引擎
 * 提供所有 UI 需要的响应式状态和操作方法
 *
 * ==================== 使用方式 ====================
 * const dungeon = useDungeonV2()
 * dungeon.enterDungeon('biohazard_deepnest')
 * dungeon.moveToRoom('C3')
 */

import { ref, computed, watch, type Ref } from 'vue'
import { useGameStore } from '../stores/game'
import type { WeaponEssence } from '../types/equipment'
import type { EssenceDamageType } from '../config/combat'
import { TURN_COST } from '../config/dungeon-v2'
import type {
  DungeonRuntimeState,
  DungeonLogEntry,
  RoomConfig,
  ConditionalAction,
  PendingEvent,
  DungeonEvent,
  DungeonRatingConfig,
  DungeonNpc,
  NpcInteractionDef,
  QuestConfig,
  TriggeredStatus,
  AlertTier,
  GridPosition,
  CombatAbility,
  CombatInputMode,
  DungeonInteractable,
  DialogueSession,
  DialogueHistoryEntry,
  DungeonDialogueEvent,
} from '../types/dungeon-v2'
import type { DungeonBundle } from '../data/dungeons'
import { getDungeonBundle, getDungeonList } from '../data/dungeons'
import { getItem } from '../data/dungeons/biohazard/items'
import { getEvent } from '../data/dungeons/biohazard/events'
import {
  createInitialState,
  tryMove,
  executeConditionalAction,
  executeSearch,
  isRoomSearched,
  getAvailableActions,
  getDefaultActions,
  getCurrentRoom,
  getAdjacentRooms,
  getRoomDescription,
  checkRoomCombat,
  markRoomCombatCleared,
  checkRandomEncounter,
  checkBossRelease,
  advanceTurn,
  applyEffect,
  addLog,
  evaluateRating,
  isGameOver,
  resolveEventChoice,
  resolveAutoEvent,
  completeObjective,
  getCompletedQuestCount,
  getCompletedMainQuestCount,
  retryActionWithWillpower,
  getFailedActionIds,
  getRetryableActions,
  initPlayerWillpower,
  getAlertTier,
  getAlertMax,
} from '../systems/dungeon/engine'
import { initCombat, stepTacticsTurn, syncAlliesAfterCombat, executePlayerMove, executePlayerAttack, executePlayerAoeAttack, endPlayerTurn, getPlayerMovableCells, getPlayerAttackTargets, type PlayerCombatContext, type StepRoundResult } from '../systems/dungeon/combat'
import { getUnitAbilities, findAbility, getAbilityRangeCells, getValidTargetUnitIds, getAoeAreaCells, getUnitsInAoeArea, DEFAULT_PLAYER_LOADOUT, getAbilityAvailability } from '../systems/dungeon/abilities'
import { resolveAbilityEffect } from '../systems/dungeon/resolveAbilityEffect'
import { collectTacticsUnits, getTacticsUnit, playerUid, markUnitAttacked, type TacticsUnit } from '../systems/dungeon/tactics'
import { addItem, getPlayerItems, useItem, equipWeapon } from '../systems/dungeon/inventory'
import { countAliveNpcs, findNpcById, getNpcInteractions } from '../systems/dungeon/npc'
import {
  checkActionTriggerEvents,
  checkFirstEnterEvents,
  createPendingEvent,
  markEventTriggered,
} from '../systems/dungeon/events'
import {
  resolveDialogueOption,
  getOptionLifecycleState,
  checkInteractableRequirements,
  type DialogueResolveResult,
} from '../systems/dungeon/dialogue'

// ==================== Composable 状态 ====================

type DungeonMode = 'select' | 'loading' | 'exploring' | 'combat' | 'event' | 'result' | 'gameover'

export function useDungeonV2() {
  const store = useGameStore()

  // 响应式状态
  const state = ref<DungeonRuntimeState | null>(null) as Ref<DungeonRuntimeState | null>
  const bundle = ref<DungeonBundle | null>(null) as Ref<DungeonBundle | null>
  const mode = ref<DungeonMode>('select')
  const combatLogs = ref<string[]>([])
  const combatRewards = ref<{ xp: number; rewardPoints: number; sidePlots: { D: number; C: number }; items: string[] } | null>(null)
  const currentPendingEvent = ref<PendingEvent | null>(null)
  const ratingResult = ref<DungeonRatingConfig | null>(null)
  const showInventory = ref(false)
  const showNpcPanel = ref(false)
  const showQuestPanel = ref(false)
  const searchResult = ref<string | null>(null)
  const showTransition = ref(false)

  // NPC 交互状态
  const selectedNpcId = ref<string | null>(null)

  // ==================== 对话会话状态 ====================
  /** 当前对话会话（仅在弹窗打开期间存在，关闭后置 null） */
  const dialogueSession = ref<DialogueSession | null>(null)

  // 当前选中的可互动物体名称（visible_objects 中的值）
  const selectedObject = ref<string | null>(null)

  // 战斗逐步执行状态
  const combatState = ref<import('../types/dungeon-v2').DungeonCombatState | null>(null)
  const combatPlayerCtx = ref<PlayerCombatContext | null>(null)
  const combatResult = ref<'victory' | 'defeat' | 'fled' | null>(null)
  const combatInitialized = ref(false)
  const combatResultProcessed = ref(false)
  const queuedCombatEvents = ref<DungeonEvent[]>([])
  const queuedCombatEnemyGroups = ref<string[][]>([])

  // ==================== 技能/行动系统状态（第二步改造） ====================
  /** 战斗 UI 输入模式（状态机） */
  const combatInputMode = ref<CombatInputMode>('idle')
  /** 当前选中的技能 ID */
  const selectedAbilityId = ref<string | null>(null)

  // ==================== AOE 预览状态（第三步改造） ====================
  /** AOE 模式下鼠标 hover 的格子（null = 未 hover） */
  const hoveredAoeCell = ref<GridPosition | null>(null)

  // ==================== Computed ====================

  const dungeonList = computed(() => getDungeonList())

  const currentRoom = computed<RoomConfig | null>(() => {
    if (!state.value) return null
    return getCurrentRoom(state.value)
  })

  const playerHp = computed(() => state.value?.player.hp ?? 0)
  const playerMaxHp = computed(() => state.value?.player.max_hp ?? 0)
  const playerInfection = computed(() => state.value?.player.infection ?? 0)
  const turnCount = computed(() => state.value?.global.turn_count ?? 0)
  const maxTurns = computed(() => bundle.value?.config.config.max_turns ?? 120)
  const securityAlert = computed(() => state.value?.global.security_alert ?? 0)
  const alertMax = computed(() => {
    if (!state.value) return 100
    return getAlertMax(state.value)
  })
  const currentAlertTier = computed<AlertTier | null>(() => {
    if (!state.value) return null
    return getAlertTier(state.value)
  })
  const countdown = computed(() => state.value?.global.countdown ?? 0)
  const selfDestructActive = computed(() => state.value?.global.self_destruct_started ?? false)
  const triggeredStatuses = computed<TriggeredStatus[]>(() => state.value?.global.triggered_statuses ?? [])
  const powerRestored = computed(() => state.value?.global.power_restored ?? false)
  const laserDisabled = computed(() => state.value?.global.laser_disabled ?? false)
  const aiProcessed = computed(() => state.value?.global.red_queen_processed ?? false)
  const bossTrackingTurns = computed(() => state.value?.global.boss_tracking_turns ?? 0)
  const bossReleased = computed(() => state.value?.global.licker_released ?? false)

  const adjacentRooms = computed(() => {
    if (!state.value) return []
    return getAdjacentRooms(state.value)
  })

  const availableActions = computed<ConditionalAction[]>(() => {
    if (!state.value) return []
    return getAvailableActions(state.value)
  })

  const defaultActions = computed(() => {
    if (!state.value) return []
    return getDefaultActions(state.value)
  })

  const roomDescription = computed(() => {
    if (!state.value) return ''
    return getRoomDescription(state.value)
  })

  const visibleLogs = computed<DungeonLogEntry[]>(() => {
    if (!state.value) return []
    return state.value.logs
  })

  const playerItems = computed(() => {
    if (!state.value) return []
    return getPlayerItems(state.value.player)
  })

  const aliveNpcs = computed<DungeonNpc[]>(() => {
    if (!state.value) return []
    return state.value.npcs.filter((n) => n.alive)
  })

  const followingNpcs = computed<DungeonNpc[]>(() => {
    if (!state.value) return []
    return state.value.npcs.filter((n) => n.alive && n.follow_state === 'following')
  })

  /** 未加入队伍的存活 NPC（等待邀请同行） */
  const nonFollowingNpcs = computed<DungeonNpc[]>(() => {
    if (!state.value) return []
    return state.value.npcs.filter((n) => n.alive && n.follow_state !== 'following' && n.follow_state !== 'dead')
  })

  /** 当前选中的 NPC */
  const selectedNpc = computed<DungeonNpc | null>(() => {
    if (!state.value || !selectedNpcId.value) return null
    return findNpcById(state.value.npcs, selectedNpcId.value) ?? null
  })

  /** 当前选中 NPC 的可用交互列表 */
  const npcInteractions = computed<NpcInteractionDef[]>(() => {
    if (!selectedNpc.value) return []
    return getNpcInteractions(selectedNpc.value)
  })

  const activeQuests = computed<QuestConfig[]>(() => {
    if (!state.value) return []
    return state.value.quests.filter((q) => q.status === 'active' || q.status === 'available')
  })

  const completedQuests = computed<QuestConfig[]>(() => {
    if (!state.value) return []
    return state.value.quests.filter((q) => q.status === 'completed')
  })

  const isExploring = computed(() => mode.value === 'exploring')
  const inCombat = computed(() => mode.value === 'combat')
  const hasEvent = computed(() => mode.value === 'event' && (currentPendingEvent.value !== null || dialogueSession.value !== null))
  const isGameOver_ = computed(() => mode.value === 'gameover')
  const isResult = computed(() => mode.value === 'result')

  // ==================== 对话会话 Computed ====================

  /** 当前对话事件（从 session.eventId 查找 DungeonEvent.dialogue_event） */
  const currentDialogueEvent = computed<DungeonDialogueEvent | null>(() => {
    if (!dialogueSession.value) return null
    const event = getEvent(dialogueSession.value.eventId)
    return event?.dialogue_event ?? null
  })

  /** 是否处于会话式对话模式（而非旧版单次弹窗） */
  const isSessionDialogue = computed(() => dialogueSession.value !== null && currentDialogueEvent.value !== null)

  // ==================== 战斗上下文构建 ====================

function buildPlayerCombatContext(): PlayerCombatContext {
  const char = store.characters[0]
  if (!char) {
    throw new Error('主角数据不存在')
  }

  const advancedStats = store.getAdvancedCombatStats()
  const weaponInfo = store.getWeaponCombatInfo()
  const dungeonWeapon = state.value?.player.weapon ? getItem(state.value.player.weapon) : null
  const maxHp = store.getMaxHp()
  const maxMp = store.getMaxMp()
  const maxWillpower = store.getCharacterMaxWillpower(0)
  // 获取九属性战斗属性（含装备/基因锁/血统加成）
  const combatInternal = store.getCharacterCombatStatsInternal(0)

  return {
    attributes: {
      strength: combatInternal.strength,
      agility: combatInternal.agility,
      endurance: combatInternal.endurance,
      intelligence: combatInternal.intelligence,
      perception: combatInternal.perception,
      resolve: combatInternal.resolve,
      presence: combatInternal.presence,
      manipulation: combatInternal.manipulation,
      composure: combatInternal.composure,
    },
    allSkills: { ...char.skills },
    advancedStats,
    maxHp,
    maxMp,
    currentMp: char.currentMp,
    weaponAttack: dungeonWeapon?.weapon_stats?.attack ?? weaponInfo.attack,
    weaponEssence: (dungeonWeapon?.weapon_stats?.damage_type ?? weaponInfo.essence) as EssenceDamageType,
    attackMode: 'normal' as const,
    skillCoefficient: 1,
    proficiencyBonus: 0,
    maxWillpower,
  }
}

  // ==================== 进入副本 ====================

  function enterDungeon(dungeonId: string): void {
    const b = getDungeonBundle(dungeonId)
    if (!b) {
      console.error(`[dungeon-v2] 未找到副本: ${dungeonId}`)
      return
    }

    if (store.level < b.config.min_level) {
      console.warn(`[dungeon-v2] 等级不足: ${store.level} < ${b.config.min_level}`)
      return
    }

    bundle.value = b
    const maxHp = store.getMaxHp()
    state.value = createInitialState(b, maxHp)

    // 初始化玩家意志力
    const ctx = buildPlayerCombatContext()
    initPlayerWillpower(state.value, ctx.maxWillpower)

    // 设置导航信息
    store.setDungeonNav({
      tier: b.config.tier,
      name: b.config.name,
      description: b.config.description,
    })

    // 进入过渡动画状态
    showTransition.value = true
    mode.value = 'loading'
    combatLogs.value = []
    combatRewards.value = null
    currentPendingEvent.value = null
    ratingResult.value = null
  }

  /** 过渡动画结束后调用，正式进入探索模式 */
  function finishTransition(): void {
    if (!state.value || !bundle.value) return

    mode.value = 'exploring'
    if (processQueuedCombatFollowups()) {
      return
    }
    showTransition.value = false

    addLog(state.value, `进入副本：${bundle.value.config.name}`, 'gold')
    addLog(state.value, state.value.player.position + ' — ' + (getCurrentRoom(state.value)?.name ?? ''), 'info')

    // ==================== 开场文字提示 ====================
    addLog(state.value, '玩家在一节停运的地下列车中醒来，耳边传来冰冷提示：', 'info')
    addLog(state.value, '"新人轮回者已投放。', 'gold')
    addLog(state.value, '当前副本：蜂巢。', 'gold')
    addLog(state.value, '主线任务：在实验室自毁前逃离。', 'gold')
    addLog(state.value, '警告：本副本存在感染机制，感染值达到 100 后将死亡或转化。"', 'danger')

    // 检查起始房间的事件
    processRoomEntryEvents()
  }

  // ==================== 移动 ====================

  function moveToRoom(roomId: string): void {
    if (!state.value || mode.value !== 'exploring') return

    const result = tryMove(state.value, roomId)
    if (!result.success) {
      for (const log of result.logs) {
        addLog(state.value, log.text, log.type)
      }
      return
    }

    // 输出移动日志
    for (const log of result.logs) {
      addLog(state.value, log.text, log.type)
    }

    // 清除选中物体（进入新房间）
    selectedObject.value = null

    // 处理房间进入事件
    processRoomEntryEvents()

    // 检查 BOSS 追踪（优先于普通战斗和随机遭遇）
    checkBossTracking()

    // 检查战斗
    if (mode.value === 'exploring') {
      checkAndStartCombat()
    }

    // 检查随机遭遇
    if (mode.value === 'exploring') {
      const randomEnemies = checkRandomEncounter(state.value)
      if (randomEnemies && randomEnemies.length > 0) {
        addLog(state.value, '遭遇随机敌人！', 'danger')
        startCombatFlow(randomEnemies)
      }
    }

    // 检查游戏结束
    checkGameOver()
  }

  // ==================== 动作执行 ====================

function doAction(action: ConditionalAction): void {
if (!state.value || mode.value !== 'exploring') return

const ctx = buildPlayerCombatContext()
const result = executeConditionalAction(state.value, action, ctx)

// 清除选中物体（动作执行后状态已变化）
selectedObject.value = null

    for (const log of result.logs) {
      addLog(state.value, log.text, log.type)
    }

    // 同步技能成长到 Store
    syncSkillsFromContext(ctx)

    // 处理动作触发事件
    for (const event of result.events) {
      handleEvent(event)
      if (event.once) markEventTriggered(event.id)
    }

    // 如果触发了战斗
    if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
      startCombatFlow(result.combat_enemy_ids)
      return
    }

    // 推进回合
    const turnResult = advanceTurn(state.value, 0)
    for (const log of turnResult.logs) {
      addLog(state.value, log.text, log.type)
    }
    for (const event of turnResult.events) {
      handleEvent(event)
      if (event.once) markEventTriggered(event.id)
    }

    // 检查 BOSS 追踪
    checkBossTracking()

    checkGameOver()
  }

  // ==================== 意志力重试 ====================

  /** 当前已失败的动作ID列表 */
  const failedActionIds = computed<string[]>(() => {
    if (!state.value) return []
    return getFailedActionIds(state.value)
  })

  /** 当前可重试的动作列表 */
  const retryableActions = computed<ConditionalAction[]>(() => {
    if (!state.value) return []
    return getRetryableActions(state.value)
  })

  /** 当前意志力 */
  const playerWillpower = computed<number>(() => {
    return state.value?.player.willpower ?? 0
  })

  /** 意志力上限 */
  const playerMaxWillpower = computed<number>(() => {
    return state.value?.player.max_willpower ?? 0
  })

  /**
   * 使用意志力重试已失败的动作
   */
  function doRetryWithWillpower(action: ConditionalAction): void {
    if (!state.value || mode.value !== 'exploring') return

    const ctx = buildPlayerCombatContext()
    const result = retryActionWithWillpower(state.value, action, ctx)

    for (const log of result.logs) {
      addLog(state.value, log.text, log.type)
    }

    // 同步技能成长到 Store
    syncSkillsFromContext(ctx)

    // 处理动作触发事件
    for (const event of result.events) {
      handleEvent(event)
      if (event.once) markEventTriggered(event.id)
    }

    // 如果触发了战斗
    if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
      startCombatFlow(result.combat_enemy_ids)
      return
    }

    // 推进回合
    const turnResult = advanceTurn(state.value, 0)
    for (const log of turnResult.logs) {
      addLog(state.value, log.text, log.type)
    }
    for (const event of turnResult.events) {
      handleEvent(event)
      if (event.once) markEventTriggered(event.id)
    }

    // 检查 BOSS 追踪
    checkBossTracking()

    checkGameOver()
  }

  /**
   * 同步 playerContext 中的技能等级回 Store（处理技能成长）
   */
  function syncSkillsFromContext(ctx: PlayerCombatContext): void {
    const char = store.characters[0]
    if (!char) return
    // 检查是否有技能等级变化
    for (const [skillId, level] of Object.entries(ctx.allSkills)) {
      if (char.skills[skillId] !== level) {
        char.skills[skillId] = level
      }
    }
  }

  // ==================== 搜索 ====================

  function doSearch(quick: boolean): void {
    if (!state.value || mode.value !== 'exploring') return
    if (!bundle.value) return

    const room = getCurrentRoom(state.value)
    if (!room) return

    // 构建玩家上下文（提供属性和技能等级用于检定）
    const ctx = buildPlayerCombatContext()
    const result = executeSearch(state.value, room, quick, bundle.value.search_table, ctx)

    for (const log of result.logs) {
      addLog(state.value, log.text, log.type)
    }

    // 同步技能成长到 Store
    syncSkillsFromContext(ctx)

    if (result.combat_triggered) {
      startCombatFlow(result.combat_enemy_ids)
      return
    }

    // 检查 BOSS 追踪
    checkBossTracking()

    checkGameOver()
  }

  // ==================== 搜索状态查询 ====================

  /** 当前房间是否已被搜索 */
  const isCurrentRoomSearched = computed<boolean>(() => {
    if (!state.value) return false
    return isRoomSearched(state.value, state.value.player.position)
  })

  // ==================== 使用道具 ====================

  function doUseItem(itemId: string, targetNpcId?: string): void {
    if (!state.value || mode.value !== 'exploring') return

    const result = useItem(state.value.player, itemId, targetNpcId)
    if (!result) {
      addLog(state.value, '无法使用此道具。', 'warning')
      return
    }

    addLog(state.value, `使用了【${result.itemName}】`, 'info')

    const effectResult = applyEffect(state.value, result.effect)
    for (const log of effectResult.logs) {
      addLog(state.value, log.text, log.type)
    }

    if (effectResult.combat_triggered) {
      startCombatFlow(effectResult.combat_enemy_ids)
      return
    }

    checkGameOver()
  }

  // ==================== 装备武器 ====================

  function doEquipWeapon(itemId: string): void {
    if (!state.value) return
    if (equipWeapon(state.value.player, itemId)) {
      const item = getItem(itemId)
      addLog(state.value, `装备了武器: ${item?.name ?? itemId}`, 'success')
    }
  }

  // ==================== 战斗流程 ====================

  /** 检查 BOSS 追踪是否追上玩家（生化危机副本专属） */
  function checkBossTracking(): void {
    if (!state.value) return
    if (mode.value !== 'exploring') return

    const bossEnemyIds = checkBossRelease(state.value)
    if (bossEnemyIds && bossEnemyIds.length > 0) {
      addLog(state.value, '暴走舔食者追上了你！', 'danger')
      startCombatFlow(bossEnemyIds)
    }
  }

  function checkAndStartCombat(): void {
    if (!state.value) return

    const enemyIds = checkRoomCombat(state.value)
    if (enemyIds && enemyIds.length > 0) {
      addLog(state.value, '遭遇敌人！', 'danger')
      startCombatFlow(enemyIds)
    }
  }

  function appendCombatLog(text: string, type: DungeonLogEntry['type'] = 'info'): void {
    if (!state.value) return
    addLog(state.value, text, type)
    if (combatState.value) {
      combatState.value.logs.push(text)
      combatLogs.value = [...combatState.value.logs]
    }
  }

  function queueCombatEnemyGroup(enemyIds: string[]): void {
    if (enemyIds.length === 0) return
    queuedCombatEnemyGroups.value.push([...enemyIds])
  }

  function consumeCombatTurnEvent(event: DungeonEvent): void {
    if (!state.value) return

    if ((event.dialogue_event?.options.length ?? 0) > 0 || (event.choices && event.choices.length > 0)) {
      queuedCombatEvents.value.push(event)
      appendCombatLog(`战斗结束后触发事件：${event.description ?? event.id}`, 'warning')
      return
    }

    for (const line of event.dialogue_event?.lines ?? event.dialogue ?? []) {
      appendCombatLog(`${line.speaker ? line.speaker + ': ' : ''}${line.text}`, 'info')
    }

    if (!event.auto_effects) return

    const result = resolveAutoEvent(state.value, event)
    for (const log of result.logs) {
      appendCombatLog(log.text, log.type)
    }

    if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
      if (event.id === 'ev_boss_released') {
        state.value.player.flags['boss_combat_triggered'] = true
      }
      queueCombatEnemyGroup(result.combat_enemy_ids)
    }
  }

  function processQueuedCombatFollowups(): boolean {
    if (!state.value || mode.value !== 'exploring') return false

    while (queuedCombatEvents.value.length > 0) {
      const nextEvent = queuedCombatEvents.value.shift()
      if (!nextEvent) continue
      handleEvent(nextEvent)
      if (mode.value !== 'exploring') return true
    }

    const nextEnemyGroup = queuedCombatEnemyGroups.value.shift()
    if (nextEnemyGroup && nextEnemyGroup.length > 0) {
      startCombatFlow(nextEnemyGroup, true)
      return true
    }

    return false
  }

  function startCombatFlow(enemyIds: string[], preserveCombatQueue = false): void {
    if (!state.value) return

    mode.value = 'combat'
    combatLogs.value = []
    combatRewards.value = null
    combatResult.value = null
    combatInitialized.value = false
    combatResultProcessed.value = false
    if (!preserveCombatQueue) {
      queuedCombatEvents.value = []
      queuedCombatEnemyGroups.value = []
    }

    try {
      const playerCtx = buildPlayerCombatContext()
      const combat = initCombat(state.value, enemyIds, playerCtx)
      // 设置玩家默认能力装配槽（近战攻击 + 范围打击）
      // 未来可从角色职业/装备/道具动态构建
      if (!combat.player_ability_loadout) {
        combat.player_ability_loadout = DEFAULT_PLAYER_LOADOUT
      }
      combat.logs.push('═══ 战斗开始 ═══')
      combatLogs.value = [...combat.logs]

      // 存储战斗状态供逐步执行
      combatState.value = combat
      combatPlayerCtx.value = playerCtx
      combatInitialized.value = true
    } catch (e) {
      console.error('[dungeon-v2] 战斗初始化出错:', e)
      combatLogs.value = ['战斗系统出错']
      mode.value = 'exploring'
    }
  }

    /** 执行一个战棋单位回合，返回回合结果 */
  function stepCombat(): StepRoundResult | null {
    if (!state.value || !combatState.value || !combatPlayerCtx.value) return null
    if (combatState.value.over) return null

    // 记录战棋回合号，用于判断是否完成了一整轮
    const roundBefore = combatState.value.tactics_round
    const result = stepTacticsTurn(state.value, combatState.value, combatPlayerCtx.value)
    const roundAfter = combatState.value.tactics_round

    // 只在完整战棋回合结束时推进副本回合（所有单位各行动一次 = 1 个副本回合）
    if (roundAfter > roundBefore) {
      const turnResult = advanceTurn(state.value, TURN_COST.combat_round)

      for (const log of turnResult.logs) {
        appendCombatLog(log.text, log.type)
      }
      for (const event of turnResult.events) {
        consumeCombatTurnEvent(event)
      }

      if (turnResult.game_over) {
        combatState.value.result = 'defeat'
        combatState.value.over = true
      }
    }

    combatLogs.value = [...combatState.value.logs]

    return result
  }

  // ==================== 手动模式 API（第三步改造） ====================

  /** 是否正在等待玩家操作（手动模式） */
  const isWaitingForPlayer = computed(() => combatState.value?.waiting_for_player ?? false)

  /** 当前战斗模式 */
  const tacticsMode = computed(() => combatState.value?.tactics_mode ?? 'auto')

  /** 当前行动单位的 uid */
  const currentTurnUid = computed<string | null>(() => {
    if (!combatState.value) return null
    if (combatState.value.turn_order.length === 0) return null
    const idx = combatState.value.current_turn_index
    if (idx >= combatState.value.turn_order.length) return null
    return combatState.value.turn_order[idx]
  })

  /** 玩家可移动格子（手动模式下响应式更新） */
  const playerMovableCells = computed<GridPosition[]>(() => {
    if (!state.value || !combatState.value || !combatPlayerCtx.value) return []
    return getPlayerMovableCells(combatState.value, combatPlayerCtx.value.attributes.agility + combatPlayerCtx.value.attributes.composure)
  })

  /** 玩家可攻击目标列表 */
  const playerAttackTargets = computed<{ uid: string; name: string; position: GridPosition | null }[]>(() => {
    if (!state.value || !combatState.value || !combatPlayerCtx.value) return []
    return getPlayerAttackTargets(combatState.value, combatPlayerCtx.value.attributes.agility + combatPlayerCtx.value.attributes.composure)
  })

  /** 玩家是否已移动过（本回合） */
  const playerHasMoved = computed(() => combatState.value?.player_has_moved ?? false)

  /** 玩家是否已攻击过（本回合） */
  const playerHasAttacked = computed(() => combatState.value?.player_has_attacked ?? false)

  // ==================== 技能/行动系统 Computed（第二步改造） ====================

  /** 战场上所有战术单位（响应式） */
  const allTacticsUnits = computed<TacticsUnit[]>(() => {
    if (!combatState.value || !combatPlayerCtx.value) return []
    const units = collectTacticsUnits(combatState.value)
    const pUnit = units.find((u) => u.uid === playerUid())
    if (pUnit) pUnit.speed = combatPlayerCtx.value.attributes.agility + combatPlayerCtx.value.attributes.composure
    return units
  })

  /** 玩家战术单位快照（响应式） */
  const playerTacticsUnit = computed<TacticsUnit | null>(() => {
    if (!combatState.value || !combatPlayerCtx.value) return null
    return getTacticsUnit(combatState.value, playerUid(), combatPlayerCtx.value.attributes.agility + combatPlayerCtx.value.attributes.composure)
  })

  /** 玩家可用技能列表（等待玩家操作且未攻击时） */
  const playerAbilities = computed<CombatAbility[]>(() => {
    if (!playerTacticsUnit.value || !isWaitingForPlayer.value) return []
    if (combatState.value?.player_has_attacked) return []
    return getUnitAbilities(playerTacticsUnit.value)
  })

  /** 当前选中的技能对象 */
  const selectedAbility = computed<CombatAbility | null>(() => {
    if (!selectedAbilityId.value) return null
    return findAbility(playerAbilities.value, selectedAbilityId.value)
  })

  /** 选中技能的可施放范围（格子列表，用于 UI 红色范围显示） */
  const abilityRangeCells = computed<GridPosition[]>(() => {
    if (!combatState.value || !selectedAbility.value || !playerTacticsUnit.value?.position) return []
    return getAbilityRangeCells(
      playerTacticsUnit.value.position,
      selectedAbility.value,
      combatState.value.grid_width,
      combatState.value.grid_height,
    )
  })

  /** 选中技能的合法目标单位 uid 列表（单体技能，用于 UI 高亮可点击敌人） */
  const validTargetUnitIds = computed<string[]>(() => {
    if (!selectedAbility.value || !playerTacticsUnit.value) return []
    if (selectedAbility.value.shape !== 'single') return []
    return getValidTargetUnitIds(playerTacticsUnit.value, selectedAbility.value, allTacticsUnits.value)
  })

  // ==================== AOE 预览 Computed（第三步改造） ====================

  /** AOE hover 预览的影响范围格子列表（橙色高亮） */
  const aoePreviewCells = computed<GridPosition[]>(() => {
    if (!combatState.value || !selectedAbility.value || !hoveredAoeCell.value) return []
    if (selectedAbility.value.shape !== 'aoe-diamond') return []
    return getAoeAreaCells(
      hoveredAoeCell.value,
      selectedAbility.value,
      combatState.value.grid_width,
      combatState.value.grid_height,
    )
  })

  /** AOE hover 预览中将受影响的单位 uid 列表（用于 UI 显示预计命中目标） */
  const aoeAffectedUnitIds = computed<string[]>(() => {
    if (!selectedAbility.value || !hoveredAoeCell.value || !playerTacticsUnit.value) return []
    if (selectedAbility.value.shape !== 'aoe-diamond') return []
    const affected = getUnitsInAoeArea(
      hoveredAoeCell.value,
      selectedAbility.value,
      allTacticsUnits.value,
      playerTacticsUnit.value.side,
    )
    return affected.map((u) => u.uid)
  })

  /** 切换自动/手动模式 */
  function toggleTacticsMode(): void {
    if (!combatState.value) return
    if (combatState.value.tactics_mode === 'auto') {
      combatState.value.tactics_mode = 'manual'
    } else {
      combatState.value.tactics_mode = 'auto'
      // 切回自动时，清除等待标记，让定时器恢复推进
      combatState.value.waiting_for_player = false
    }
    // 重置输入模式
    combatInputMode.value = 'idle'
    selectedAbilityId.value = null
  }

  // ==================== 技能选择 API（第二步改造） ====================

  /**
   * 选择技能 — 进入目标选择模式
   *
   * 根据技能形状设置不同的输入模式：
   * - single + enemy/ally → selecting_ability_target（点选单位）
   * - single + self → 直接执行（预留）
   * - aoe-diamond → selecting_aoe_cell（第三步实现）
   */
  function selectAbility(abilityId: string): void {
    if (!combatState.value) return
    if (combatState.value.player_has_attacked) return

    const ability = findAbility(playerAbilities.value, abilityId)
    if (!ability) return

    selectedAbilityId.value = abilityId

    if (ability.shape === 'single') {
      if (ability.targetType === 'self') {
        // 自身技能：直接执行（暂未实现，预留）
        combatInputMode.value = 'idle'
        selectedAbilityId.value = null
      } else {
        combatInputMode.value = 'selecting_ability_target'
      }
    } else if (ability.shape === 'aoe-diamond') {
      // AOE 技能：进入格子选择模式
      combatInputMode.value = 'selecting_aoe_cell'
      hoveredAoeCell.value = null
    }
  }

  /** 取消技能选择 — 回到 idle */
  function cancelAbilitySelection(): void {
    combatInputMode.value = 'idle'
    selectedAbilityId.value = null
    hoveredAoeCell.value = null
  }

  /**
   * 对指定目标执行当前选中的技能
   *
   * 根据技能属性路由到不同的执行路径：
   * - 敌对单体技能（hostile=true, shape='single'）→ executePlayerAttack
   * - 友方/自身技能（hostile=false）→ 未来扩展（治疗等）
   * - AOE 技能 → 通过 executeAoeAbility 处理（不走此函数）
   *
   * 未来扩展：根据 ability 的 damageMultiplier / healAmount / infectionBonus
   * 等效果字段，传入 combat 引擎进行差异化结算。
   */
  function executeAbilityOnTarget(targetUid: string): void {
    if (!selectedAbilityId.value || !selectedAbility.value) return
    if (!state.value || !combatState.value || !combatPlayerCtx.value) return

    const ability = selectedAbility.value

    if (ability.shape === 'single') {
      if (ability.hostile) {
        // 敌对单体技能：复用 executePlayerAttack（已支持 ability 参数）
        executePlayerAttack(state.value, combatState.value, combatPlayerCtx.value, targetUid, ability)
      } else {
        // 非敌对单体技能（治疗、感染等）：通过统一结算器处理
        const pushLog = (text: string): void => {
          combatState.value!.logs.push(text)
        }
        resolveAbilityEffect({
          state: state.value,
          combat: combatState.value,
          playerCtx: combatPlayerCtx.value,
          actorUid: playerUid(),
          ability,
          targetUid,
          pushLog,
        })
        markUnitAttacked(combatState.value, playerUid())
      }
      combatLogs.value = [...combatState.value.logs]
    }

    // 重置状态
    combatInputMode.value = 'idle'
    selectedAbilityId.value = null
    hoveredAoeCell.value = null
  }

  // ==================== AOE 技能 API（第三步改造） ====================

  /** 设置 AOE hover 格子（null = 清除 hover） */
  function setAoeHoverCell(pos: GridPosition | null): void {
    hoveredAoeCell.value = pos
  }

  /**
   * 对指定格子释放当前选中的 AOE 技能
   *
   * 交由 combat.ts 的 executePlayerAoeAttack 执行实际结算。
   * 执行后重置输入模式。
   */
  function executeAoeAbility(targetCell: GridPosition): void {
    if (!selectedAbilityId.value || !selectedAbility.value) return
    if (combatInputMode.value !== 'selecting_aoe_cell') return

    const ability = selectedAbility.value
    if (ability.shape !== 'aoe-diamond') return

    if (state.value && combatState.value && combatPlayerCtx.value) {
      executePlayerAoeAttack(state.value, combatState.value, combatPlayerCtx.value, targetCell, ability)
      combatLogs.value = [...combatState.value.logs]
    }

    // 重置状态
    combatInputMode.value = 'idle'
    selectedAbilityId.value = null
    hoveredAoeCell.value = null
  }

  /** 等待状态变化时重置输入模式 */
  watch(isWaitingForPlayer, (waiting) => {
    if (!waiting) {
      combatInputMode.value = 'idle'
      selectedAbilityId.value = null
      hoveredAoeCell.value = null
    }
  })

  /** 手动模式：玩家移动到指定格子 */
  function doPlayerMove(pos: GridPosition): void {
    if (!state.value || !combatState.value) return
    executePlayerMove(combatState.value, pos)
    combatLogs.value = [...combatState.value.logs]
    combatInputMode.value = 'idle'
  }

  /** 手动模式：玩家攻击指定目标 */
  function doPlayerAttack(targetUid: string, ability?: CombatAbility): { hit: boolean; damage: number; isCrit: boolean; enemyDefeated: boolean } {
    if (!state.value || !combatState.value || !combatPlayerCtx.value) {
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }
    const result = executePlayerAttack(state.value, combatState.value, combatPlayerCtx.value, targetUid, ability)
    combatLogs.value = [...combatState.value.logs]
    combatInputMode.value = 'idle'
    selectedAbilityId.value = null
    return result
  }

  /** 手动模式：玩家结束本回合 */
  function doEndPlayerTurn(): StepRoundResult | null {
    if (!state.value || !combatState.value || !combatPlayerCtx.value) return null

    const roundBefore = combatState.value.tactics_round
    const result = endPlayerTurn(state.value, combatState.value, combatPlayerCtx.value)
    const roundAfter = combatState.value.tactics_round

    // 只在完整战棋回合结束时推进副本回合
    if (roundAfter > roundBefore) {
      const turnResult = advanceTurn(state.value, TURN_COST.combat_round)
      for (const log of turnResult.logs) {
        appendCombatLog(log.text, log.type)
      }
      for (const event of turnResult.events) {
        consumeCombatTurnEvent(event)
      }
      if (turnResult.game_over) {
        combatState.value.result = 'defeat'
        combatState.value.over = true
      }
    }

    combatLogs.value = [...combatState.value.logs]
    return result
  }

  /** 逃跑 — 强制结束战斗 */
  function fleeCombat(): void {
    if (!state.value || !combatState.value) return
    combatState.value.result = 'fled'
    combatState.value.over = true
    syncAlliesAfterCombat(state.value, combatState.value)
    state.value.player.hp = combatState.value.player_hp
    combatState.value.logs.push('\n你选择了撤退……')
    combatLogs.value = [...combatState.value.logs]
    combatResult.value = 'fled'
  }

  /** 处理战斗结束后的奖励发放和状态同步 */
  function processCombatResult(): void {
    if (!state.value || !combatState.value) return
    if (combatResultProcessed.value) return
    combatResultProcessed.value = true

    const combat = combatState.value
    combatResult.value = combat.result

    // 处理战斗结果
    if (combat.result === 'victory') {
      markRoomCombatCleared(state.value)
      combatRewards.value = {
        xp: 0,
        rewardPoints: 0,
        sidePlots: { D: 0, C: 0 },
        items: combat.rewards.items,
      }

      // 发放道具掉落
      for (const itemId of combat.rewards.items) {
        addItem(state.value.player, itemId)
        const itemName = getItem(itemId)?.name ?? itemId
        addLog(state.value, `获得掉落: ${itemName}`, 'success')
      }

      // 发放 XP 和支线
    } else if (combat.result === 'defeat') {
      addLog(state.value, '你被击败了……', 'danger')
      combatRewards.value = null
    } else {
      // fled
      combatRewards.value = null
      addLog(state.value, '你撤退了。', 'warning')
    }

    // 同步玩家 HP
    state.value.player.hp = combat.player_hp
  }

  /** 关闭战斗结果弹窗，返回探索模式 */
  function closeCombatOverlay(): void {
    if (!state.value) return

    // 清理战斗状态
    combatState.value = null
    combatPlayerCtx.value = null
    combatResult.value = null
    combatInitialized.value = false
    combatResultProcessed.value = false

    if (isGameOver(state.value)) {
      checkGameOver()
      return
    }

    mode.value = 'exploring'

    if (processQueuedCombatFollowups()) {
      return
    }

    // 战斗后检查是否有事件需要处理
    processRoomEntryEvents()

    // 检查 BOSS 追踪
    checkBossTracking()

    // 检查随机遭遇
    if (mode.value === 'exploring') {
      const randomEnemies = checkRandomEncounter(state.value)
      if (randomEnemies && randomEnemies.length > 0) {
        addLog(state.value, '遭遇随机敌人！', 'danger')
        startCombatFlow(randomEnemies)
        return
      }
    }

    checkGameOver()
  }

  // ==================== 事件处理 ====================

  function processRoomEntryEvents(): void {
    if (!state.value) return

    const room = getCurrentRoom(state.value)

    // ==================== 新系统：enterEventId（首次进入自动触发对话） ====================
    if (room?.enterEventId) {
      const enterCount = state.value.player.explored_rooms.filter((id) => id === room.id).length
      if (enterCount <= 1) {
        const event = getEvent(room.enterEventId)
        if (event) {
          handleEvent(event)
          if (event.once) markEventTriggered(event.id)
        }
      }
    }

    // 如果 enterEventId 已经打开了对话弹窗，跳过旧系统事件
    if (mode.value !== 'exploring') return

    // ==================== 旧系统：first_enter 事件 ====================
    const events = checkFirstEnterEvents(state.value, state.value.player.position)
    for (const event of events) {
      handleEvent(event)
      if (event.once) markEventTriggered(event.id)
    }
  }

  // ==================== 对话会话管理 ====================

  /**
   * 初始化对话会话 — 从 DungeonEvent 创建 DialogueSession
   *
   * 将场景文本和对话行写入 history，作为初始对话记录。
   * 选项运行时状态从 dungeon flags 中按需读取（不预加载到 session）。
   */
  function initDialogueSession(
    eventId: string,
    source?: { roomId?: string; interactableId?: string; npcId?: string },
  ): void {
    if (!state.value) return

    const event = getEvent(eventId)
    if (!event?.dialogue_event) return

    const now = Date.now()
    const history: DialogueHistoryEntry[] = []
    const de = event.dialogue_event

    // 场景文本
    if (de.sceneText) {
      history.push({
        id: `h${history.length}_${now}`,
        type: 'scene',
        text: de.sceneText,
        timestamp: now,
      })
    }

    // 对话行
    for (const line of de.lines ?? []) {
      history.push({
        id: `h${history.length}_${now}`,
        type: 'npc_line',
        speaker: line.speaker,
        text: line.text,
        timestamp: now,
      })
    }

    dialogueSession.value = {
      eventId,
      source,
      history,
      optionStates: {},
    }
  }

  /**
   * 在现有会话中追加新事件的场景文本和对话行（用于 trigger_event 同窗口切换）
   */
  function appendEventToSession(eventId: string): void {
    if (!dialogueSession.value) return

    const event = getEvent(eventId)
    if (!event?.dialogue_event) return

    const session = dialogueSession.value
    const now = Date.now()
    const de = event.dialogue_event

    if (de.sceneText) {
      session.history.push({
        id: `h${session.history.length}_${now}`,
        type: 'scene',
        text: de.sceneText,
        timestamp: now,
      })
    }

    for (const line of de.lines ?? []) {
      session.history.push({
        id: `h${session.history.length}_${now}`,
        type: 'npc_line',
        speaker: line.speaker,
        text: line.text,
        timestamp: now,
      })
    }

    // 切换 session 到新事件
    dialogueSession.value = {
      ...session,
      eventId,
      history: [...session.history],
    }
  }

  /**
   * 选择对话选项 — 在会话内解析选项，追加历史，处理链式事件
   *
   * 流程：
   * 1. 调用 resolveDialogueOption 获取检定结果和效果应用
   * 2. 将玩家选择、检定结果、结局文本追加到 session.history
   * 3. 如有 nextEventId → 同窗口追加新事件内容
   * 4. 如 closeAfter=true → 关闭会话并可能触发战斗
   * 5. 否则保持会话开启，玩家可继续选择其他选项
   */
  function selectDialogueOption(optionId: string): void {
    if (!state.value || !dialogueSession.value || !currentDialogueEvent.value) return

    const character = store.characters[0]
    const result = resolveDialogueOption({
      state: state.value,
      event: currentDialogueEvent.value,
      optionId,
      character,
    })
    if (!result) return

    const session = dialogueSession.value
    const now = Date.now()

    // 追加玩家选择
    session.history.push({
      id: `h${session.history.length}_${now}`,
      type: 'player_choice',
      text: result.optionLabel,
      timestamp: now,
    })

    // 追加检定结果
    if (result.check) {
      session.history.push({
        id: `h${session.history.length}_${now}`,
        type: 'check_result',
        text: `${result.check.skillLabel} DC${result.check.dc} → 成功数 ${result.check.successes}`,
        timestamp: now,
        dice: {
          dp: result.check.dp,
          dice: result.check.dice,
          successes: result.check.successes,
          dc: result.check.dc,
          level: result.level,
        },
      })
    }

    // 追加结局文本
    session.history.push({
      id: `h${session.history.length}_${now}`,
      type: 'outcome',
      text: result.outcomeText,
      timestamp: now,
    })

    // 追加额外日志（跳过第一条，因为它是 outcome 的重复）
    for (const log of result.logs.slice(1)) {
      session.history.push({
        id: `h${session.history.length}_${now}`,
        type: 'system_log',
        text: log.text,
        timestamp: now,
      })
    }

    // 触发响应式更新
    dialogueSession.value = { ...session, history: [...session.history] }

    // 处理链式事件（同窗口追加）
    if (result.nextEventId) {
      appendEventToSession(result.nextEventId)
      const nextEvent = getEvent(result.nextEventId)
      if (nextEvent?.once) markEventTriggered(nextEvent.id)
    }

    // 处理关闭
    if (result.closeAfter) {
      closeDialogueSession()
      if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
        startCombatFlow(result.combat_enemy_ids)
      }
    }
  }

  /** 关闭对话会话，返回探索模式 */
  function closeDialogueSession(): void {
    dialogueSession.value = null
    currentPendingEvent.value = null
    if (mode.value === 'event') {
      mode.value = 'exploring'
    }
    if (processQueuedCombatFollowups()) {
      return
    }
    checkGameOver()
  }

  // ==================== 事件处理 ====================

  function handleEvent(event: DungeonEvent): void {
    if (!state.value) return

    // TRPG 对话事件 → 创建会话
    if (event.dialogue_event && event.dialogue_event.options.length > 0) {
      currentPendingEvent.value = createPendingEvent(event)
      initDialogueSession(event.id)
      mode.value = 'event'
      return
    }

    // 如果有选项，显示事件弹窗（旧版兼容）
    if (event.choices && event.choices.length > 0) {
      currentPendingEvent.value = createPendingEvent(event)
      mode.value = 'event'
      return
    }

    // 如果有自动效果，立即执行
    if (event.auto_effects) {
      const result = resolveAutoEvent(state.value, event)
      for (const log of result.logs) {
        addLog(state.value, log.text, log.type)
      }

      // 如果触发了战斗
      if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
        startCombatFlow(result.combat_enemy_ids)
      }
    }

    // 如果有对话但没有选项和效果，只显示日志
    if (event.dialogue && event.dialogue.length > 0 && !event.choices && !event.auto_effects) {
      for (const line of event.dialogue) {
        addLog(state.value, `${line.speaker ? line.speaker + ': ' : ''}${line.text}`, 'info')
      }
    }
  }

  function resolveDialogueEventOption(optionId: string): DialogueResolveResult | null {
    if (!state.value || !currentPendingEvent.value?.dialogue_event) return null
    const character = store.characters[0]

    return resolveDialogueOption({
      state: state.value,
      event: currentPendingEvent.value.dialogue_event,
      optionId,
      character,
    })
  }

  function openNextDialogueEvent(eventId: string): boolean {
    if (!state.value) return false

    const nextEvent = getEvent(eventId)
    if (!nextEvent) {
      addLog(state.value, `未找到后续事件: ${eventId}`, 'warning')
      return false
    }

    if ((nextEvent.dialogue_event?.options.length ?? 0) > 0 || (nextEvent.choices?.length ?? 0) > 0) {
      currentPendingEvent.value = createPendingEvent(nextEvent)
      mode.value = 'event'
      if (nextEvent.once) markEventTriggered(nextEvent.id)
      return true
    }

    handleEvent(nextEvent)
    if (nextEvent.once) markEventTriggered(nextEvent.id)
    return mode.value === 'event'
  }

  function completeDialogueEvent(result: DialogueResolveResult): void {
    if (!state.value) return

    if (result.nextEventId && openNextDialogueEvent(result.nextEventId)) {
      return
    }

    if (!result.closeAfter) return

    currentPendingEvent.value = null
    if (mode.value === 'event') {
      mode.value = 'exploring'
    }

    if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
      startCombatFlow(result.combat_enemy_ids)
      return
    }

    if (processQueuedCombatFollowups()) {
      return
    }

    checkGameOver()
  }

  function chooseEventOption(choiceId: string): void {
    if (!state.value || !currentPendingEvent.value) return

    const result = resolveEventChoice(state.value, currentPendingEvent.value, choiceId)

    for (const log of result.logs) {
      addLog(state.value, log.text, log.type)
    }

    currentPendingEvent.value = null
    mode.value = 'exploring'

    // 如果触发了战斗
    if (result.combat_triggered && result.combat_enemy_ids.length > 0) {
      startCombatFlow(result.combat_enemy_ids)
      return
    }

    if (processQueuedCombatFollowups()) {
      return
    }

    checkGameOver()
  }

  function dismissEvent(): void {
    currentPendingEvent.value = null
    dialogueSession.value = null
    if (mode.value === 'event') {
      mode.value = 'exploring'
    }
    if (processQueuedCombatFollowups()) {
      return
    }
  }

  // ==================== 游戏结束 ====================

  function checkGameOver(): void {
    if (!state.value) return

    if (isGameOver(state.value)) {
      if (state.value.global.evacuated) {
        // 成功撤离，计算评语
        const rating = evaluateRating(state.value, bundle.value!)
        ratingResult.value = rating
        mode.value = 'result'
        addLog(state.value, `副本评价: ${rating.rating} — ${rating.title}`, 'gold')
        addLog(state.value, rating.description, 'info')
      } else {
        // 失败
        mode.value = 'gameover'
        addLog(state.value, '副本失败……', 'danger')
      }
    }
  }

  // ==================== 可互动物体 ====================

  /** 选中可互动物体 */
  function selectObject(name: string): void {
    selectedObject.value = name
  }

  /** 清除选中物体 */
  function clearSelectedObject(): void {
    selectedObject.value = null
  }

  // ==================== 对话驱动交互系统 ====================

  /**
   * 统一对话触发函数 — 根据 eventId 查找 DungeonEvent 并打开对话弹窗
   *
   * 调用场景：
   * 1. 玩家点击 interactable → interactWithObject() → triggerDungeonDialogue()
   * 2. 玩家点击有对话配置的 NPC → triggerNpcDialogue() → triggerDungeonDialogue()
   * 3. 房间 enterEventId 自动触发 → processRoomEntryEvents() → handleEvent()
   *
   * 仅在 exploring 模式下可用；链式事件由 completeDialogueEvent 内部处理。
   */
  function triggerDungeonDialogue(
    eventId: string,
    source?: { interactableId?: string; npcId?: string },
  ): void {
    if (!state.value) return
    if (mode.value !== 'exploring') return

    const event = getEvent(eventId)
    if (!event) {
      addLog(state.value, `未找到事件: ${eventId}`, 'warning')
      return
    }

    if (source?.npcId) {
      const npc = findNpcById(state.value.npcs, source.npcId)
      if (npc) {
        addLog(state.value, `与 ${npc.name} 对话…`, 'info')
      }
    }

    // 对话事件 → 创建会话
    if (event.dialogue_event && event.dialogue_event.options.length > 0) {
      currentPendingEvent.value = createPendingEvent(event)
      initDialogueSession(event.id, source)
      mode.value = 'event'
      if (event.once) markEventTriggered(event.id)
      return
    }

    // 非对话事件 → 旧版处理
    handleEvent(event)
    if (event.once) markEventTriggered(event.id)
  }

  /**
   * 点击可交互对象 — 检查条件后触发对应对话事件
   *
   * 流程：
   * 1. 检查 once + triggeredFlag → 已触发则跳过
   * 2. 检查 requirements → 不满足则提示
   * 3. 调用 triggerDungeonDialogue(dialogueEventId)
   * 4. 如果 once=true，设置 triggeredFlag
   */
  function interactWithObject(interactable: DungeonInteractable): void {
    if (!state.value || mode.value !== 'exploring') return

    // 检查是否已触发（once 交互对象）
    const flagName = interactable.triggeredFlag ?? `interactable_${interactable.id}_triggered`
    if (interactable.once && state.value.player.flags[flagName]) {
      addLog(state.value, `已经处理过: ${interactable.name}`, 'info')
      return
    }

    // 检查条件
    const character = store.characters[0]
    const reqState = checkInteractableRequirements({
      state: state.value,
      requirements: interactable.requirements,
      fallbackId: interactable.id,
      character,
    })

    if (!reqState.enabled) {
      addLog(state.value, reqState.unmetText ?? '条件不满足', 'warning')
      return
    }

    // 触发对话事件
    if (interactable.dialogueEventId) {
      triggerDungeonDialogue(interactable.dialogueEventId, { interactableId: interactable.id })
    } else {
      addLog(state.value, `${interactable.name}：${interactable.description ?? '没有什么特别的。'}`, 'info')
      return
    }

    // 标记为已触发
    if (interactable.once) {
      state.value.player.flags[flagName] = true
    }
  }

  /** 当前房间可见的可交互对象列表（过滤隐藏的） */
  const currentRoomInteractables = computed<{
    interactable: DungeonInteractable
    enabled: boolean
    unmetText?: string
  }[]>(() => {
    if (!state.value || !currentRoom.value) return []
    const character = store.characters[0]
    const room = currentRoom.value

    const result: { interactable: DungeonInteractable; enabled: boolean; unmetText?: string }[] = []

    for (const interactable of room.interactables ?? []) {
      // 检查是否已触发且需要隐藏
      const flagName = interactable.triggeredFlag ?? `interactable_${interactable.id}_triggered`
      if (
        interactable.once &&
        interactable.hideAfterTriggered !== false &&
        state.value!.player.flags[flagName]
      ) {
        continue
      }

      // 检查条件
      const reqState = checkInteractableRequirements({
        state: state.value!,
        requirements: interactable.requirements,
        fallbackId: interactable.id,
        character,
      })

      if (reqState.visibility === 'hidden') continue

      result.push({
        interactable,
        enabled: reqState.enabled,
        unmetText: reqState.unmetText,
      })
    }

    return result
  })

  // ==================== NPC 对话驱动 ====================

  /** NPC 是否有对话事件配置（优先于旧交互系统） */
  function npcHasDialogue(npc: DungeonNpc): boolean {
    return Boolean(npc.defaultDialogueEventId || npc.dialogueByFlag)
  }

  /**
   * 触发 NPC 对话 — 优先检查 dialogueByFlag，再回退到 defaultDialogueEventId
   *
   * dialogueByFlag 的键为 flag 名称，值为对应的 dialogue_event ID。
   * 引擎按此映射的键逐一检查 player.flags / global.custom，
   * 第一个匹配的 key 对应的事件即为要打开的对话。
   */
  function triggerNpcDialogue(npc: DungeonNpc): void {
    if (!state.value || mode.value !== 'exploring') return
    if (!npc.alive) return

    let eventId: string | undefined

    // 优先检查 dialogueByFlag
    if (npc.dialogueByFlag) {
      for (const [flagKey, dialogueEventId] of Object.entries(npc.dialogueByFlag)) {
        if (state.value.player.flags[flagKey] || state.value.global.custom[flagKey]) {
          eventId = dialogueEventId
          break
        }
      }
    }

    // 回退到 defaultDialogueEventId
    if (!eventId && npc.defaultDialogueEventId) {
      eventId = npc.defaultDialogueEventId
    }

    if (!eventId) return

    triggerDungeonDialogue(eventId, { npcId: npc.id })
  }

  // ==================== NPC 交互 ====================

  /** 选中 NPC */
  function selectNpc(npcId: string): void {
    selectedNpcId.value = npcId
  }

  /** 取消选中 */
  function clearSelectedNpc(): void {
    selectedNpcId.value = null
  }

  /** 执行 NPC 交互 */
  function interactWithNpc(interaction: NpcInteractionDef): void {
    if (!state.value || mode.value !== 'exploring') return
    if (!selectedNpc.value) return

    const npc = selectedNpc.value

    // 检查信任值要求
    if (interaction.require_trust_gte !== undefined && npc.trust < interaction.require_trust_gte) {
      addLog(state.value, `${npc.name} 信任值不足，拒绝了你的请求。`, 'warning')
      return
    }

    // 检查道具要求
    if (interaction.require_item && !state.value.player.inventory.includes(interaction.require_item)) {
      addLog(state.value, `你需要对应的道具才能进行此操作。`, 'warning')
      return
    }

    // 消耗道具
    if (interaction.consume_item && interaction.require_item) {
      const idx = state.value.player.inventory.indexOf(interaction.require_item)
      if (idx >= 0) {
        state.value.player.inventory.splice(idx, 1)
      }
    }

    // 应用效果
    const effectResult = applyEffect(state.value, interaction.effect)
    for (const log of effectResult.logs) {
      addLog(state.value, log.text, log.type)
    }

    // 显示结果文本
    if (interaction.result_text) {
      addLog(state.value, interaction.result_text, 'info')
    }

    // 消耗回合
    if (interaction.turn_cost > 0) {
      const turnResult = advanceTurn(state.value, interaction.turn_cost)
      for (const log of turnResult.logs) {
        addLog(state.value, log.text, log.type)
      }
      for (const event of turnResult.events) {
        handleEvent(event)
        if (event.once) markEventTriggered(event.id)
      }
    }

    // 检查是否触发了战斗
    if (effectResult.combat_triggered && effectResult.combat_enemy_ids.length > 0) {
      startCombatFlow(effectResult.combat_enemy_ids)
      return
    }

    checkGameOver()
  }

  // ==================== 退出副本 ====================

  function exitDungeon(): void {
    state.value = null
    bundle.value = null
    mode.value = 'select'
    combatLogs.value = []
    combatRewards.value = null
    currentPendingEvent.value = null
    dialogueSession.value = null
    ratingResult.value = null
    showInventory.value = false
    showNpcPanel.value = false
    showQuestPanel.value = false
  }

  // ==================== 战斗日志摘要 ====================

  const combatSummary = computed<string[]>(() => {
    if (!state.value) return []
    // 返回最后几条战斗日志
    return combatLogs.value.slice(-20)
  })

  // ==================== 导出 ====================

  return {
    // 状态
    state,
    bundle,
    mode,
    combatLogs,
    combatRewards,
    combatState,
    combatResult,
    combatInitialized,
    currentPendingEvent,
    ratingResult,
    showInventory,
    showNpcPanel,
    showQuestPanel,
    searchResult,
    showTransition,

    // NPC 交互
    selectedNpcId,
    selectedNpc,
    npcInteractions,

    // 可互动物体
    selectedObject,
    selectObject,
    clearSelectedObject,

    // 对话驱动交互系统
    triggerDungeonDialogue,
    interactWithObject,
    currentRoomInteractables,

    // NPC 对话驱动
    npcHasDialogue,
    triggerNpcDialogue,

    // 对话会话系统
    dialogueSession,
    currentDialogueEvent,
    isSessionDialogue,
    selectDialogueOption,
    closeDialogueSession,

    // Computed
    dungeonList,
    currentRoom,
    playerHp,
    playerMaxHp,
    playerInfection,
    turnCount,
    maxTurns,
    securityAlert,
    alertMax,
    currentAlertTier,
    countdown,
    selfDestructActive,
    triggeredStatuses,
    powerRestored,
    laserDisabled,
    aiProcessed,
    bossTrackingTurns,
    bossReleased,
    adjacentRooms,
    availableActions,
    defaultActions,
    roomDescription,
    visibleLogs,
    playerItems,
    aliveNpcs,
    followingNpcs,
    nonFollowingNpcs,
    activeQuests,
    completedQuests,
    isExploring,
    inCombat,
    hasEvent,
    isGameOver: isGameOver_,
    isResult,
    combatSummary,
    isCurrentRoomSearched,

    // Actions
    enterDungeon,
    finishTransition,
    moveToRoom,
    doAction,
    doSearch,
    doUseItem,
    doEquipWeapon,
    resolveDialogueEventOption,
    completeDialogueEvent,
    chooseEventOption,
    dismissEvent,
    closeCombatOverlay,
    exitDungeon,
    stepCombat,
    fleeCombat,
    processCombatResult,

    // 手动模式 API
    isWaitingForPlayer,
    tacticsMode,
    currentTurnUid,
    playerMovableCells,
    playerAttackTargets,
    playerHasMoved,
    playerHasAttacked,
    toggleTacticsMode,
    doPlayerMove,
    doPlayerAttack,
    doEndPlayerTurn,

    // 技能/行动系统 API（第二步改造）
    combatInputMode,
    selectedAbilityId,
    playerAbilities,
    selectedAbility,
    abilityRangeCells,
    validTargetUnitIds,
    selectAbility,
    cancelAbilitySelection,
    executeAbilityOnTarget,

    // AOE 技能 API（第三步改造）
    hoveredAoeCell,
    aoePreviewCells,
    aoeAffectedUnitIds,
    setAoeHoverCell,
    executeAoeAbility,

    // NPC 交互方法
    selectNpc,
    clearSelectedNpc,
    interactWithNpc,

    // 技能检定 & 意志力重试
    failedActionIds,
    retryableActions,
    playerWillpower,
    playerMaxWillpower,
    doRetryWithWillpower,
  }
}
