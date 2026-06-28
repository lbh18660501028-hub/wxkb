/**
 * 副本 V2 — 事件触发系统
 *
 * ==================== 功能说明 ====================
 * - 检测事件触发条件（6 种触发类型）
 * - 管理一次性事件的触发记录
 * - 执行事件效果（弹窗、选项、自动效果）
 * - 条件求值引擎
 *
 * ==================== 触发类型 ====================
 * - first_enter:       首次进入房间
 * - action_trigger:    点击特定按钮
 * - item_use:          使用特定道具
 * - npc_state:         NPC 状态达到条件
 * - global_state:      全局状态达到条件
 * - random_encounter:  随机遭遇
 */

import type {
  DungeonRuntimeState,
  DungeonEvent,
  EventTrigger,
  ActionCondition,
  EventChoice,
  PendingEvent,
} from '../../types/dungeon-v2'
import { EVENTS } from '../../data/dungeons/biohazard/events'
import { hasItem } from './inventory'
import { findNpcById } from './npc'

// ==================== 条件求值引擎 ====================

/**
 * 检查动作条件是否满足
 * 所有条件字段为 AND 关系（全部满足才返回 true）
 */
export function checkCondition(
  state: DungeonRuntimeState,
  condition: ActionCondition,
): boolean {
  // 检查 flags_not_set
  if (condition.flags_not_set) {
    for (const flag of condition.flags_not_set) {
      if (state.player.flags[flag]) return false
    }
  }

  // 检查 flags_set
  if (condition.flags_set) {
    for (const flag of condition.flags_set) {
      if (!state.player.flags[flag]) return false
    }
  }

  // 检查 has_item
  if (condition.has_item) {
    if (!hasItem(state.player, condition.has_item)) return false
  }

  // 检查 lacks_item
  if (condition.lacks_item) {
    if (hasItem(state.player, condition.lacks_item)) return false
  }

  // 检查 npc_alive
  if (condition.npc_alive) {
    const npc = findNpcById(state.npcs, condition.npc_alive)
    if (!npc || !npc.alive) return false
  }

  // 检查 npc_trust_gte
  if (condition.npc_trust_gte) {
    const npc = findNpcById(state.npcs, condition.npc_trust_gte.npc_id)
    if (!npc || !npc.alive || npc.trust < condition.npc_trust_gte.value) return false
  }

  // 检查 global_flag
  if (condition.global_flag) {
    const key = condition.global_flag as keyof typeof state.global
    if (!state.global[key]) return false
  }

  // 检查 global_flag_false
  if (condition.global_flag_false) {
    const key = condition.global_flag_false as keyof typeof state.global
    if (state.global[key]) return false
  }

  return true
}

// ==================== 事件触发检测 ====================

/** 已触发的一次性事件记录 */
const triggeredOnceEvents = new Set<string>()

/** 重置事件触发记录（新副本开始时调用） */
export function resetEventTracking(): void {
  triggeredOnceEvents.clear()
}

/**
 * 检测房间首次进入事件
 */
export function checkFirstEnterEvents(
  state: DungeonRuntimeState,
  roomId: string,
): DungeonEvent[] {
  const results: DungeonEvent[] = []

  // tryMove 会先把新房间写入 explored_rooms，再触发本函数。
  // 因此首次进入时计数应为 1；再次进入时计数会大于 1。
  const enterCount = state.player.explored_rooms.filter((id) => id === roomId).length
  if (enterCount > 1) {
    return results
  }

  // 查找该房间的 first_enter 事件
  // 通过房间配置的 events 字段查找
  for (const event of getAllEvents()) {
    if (
      event.trigger.type === 'first_enter' &&
      event.trigger.room === roomId
    ) {
      if (event.once && triggeredOnceEvents.has(event.id)) continue

      // 检查前置条件
      if (event.preconditions) {
        const allMet = event.preconditions.every((cond) => checkCondition(state, cond))
        if (!allMet) continue
      }

      results.push(event)
    }
  }

  return results
}

/**
 * 检测动作触发事件
 */
export function checkActionTriggerEvents(
  state: DungeonRuntimeState,
  actionId: string,
): DungeonEvent[] {
  const results: DungeonEvent[] = []

  for (const event of getAllEvents()) {
    if (
      event.trigger.type === 'action_trigger' &&
      event.trigger.action_id === actionId
    ) {
      if (event.once && triggeredOnceEvents.has(event.id)) continue

      if (event.preconditions) {
        const allMet = event.preconditions.every((cond) => checkCondition(state, cond))
        if (!allMet) continue
      }

      results.push(event)
    }
  }

  return results
}

/**
 * 检测全局状态事件
 */
export function checkGlobalStateEvents(state: DungeonRuntimeState): DungeonEvent[] {
  const results: DungeonEvent[] = []

  for (const event of getAllEvents()) {
    if (event.trigger.type !== 'global_state') continue
    if (event.once && triggeredOnceEvents.has(event.id)) continue

    let triggered = true

    if (event.trigger.countdown_lte !== undefined) {
      if (state.global.countdown > event.trigger.countdown_lte) triggered = false
    }

    if (event.trigger.security_alert_gte !== undefined) {
      if (state.global.security_alert < event.trigger.security_alert_gte) triggered = false
    }

    if (event.trigger.global_flag) {
      const key = event.trigger.global_flag as keyof typeof state.global
      if (!state.global[key]) triggered = false
    }

    if (event.trigger.global_flag_false) {
      const key = event.trigger.global_flag_false as keyof typeof state.global
      if (state.global[key]) triggered = false
    }

    if (triggered) {
      if (event.preconditions) {
        const allMet = event.preconditions.every((cond) => checkCondition(state, cond))
        if (!allMet) continue
      }
      results.push(event)
    }
  }

  return results
}

/**
 * 检测 NPC 状态事件
 */
export function checkNpcStateEvents(
  state: DungeonRuntimeState,
  npcIds: string[],
): DungeonEvent[] {
  const results: DungeonEvent[] = []

  for (const event of getAllEvents()) {
    if (event.trigger.type !== 'npc_state') continue
    if (event.once && triggeredOnceEvents.has(event.id)) continue
    if (!event.trigger.npc_id || !npcIds.includes(event.trigger.npc_id)) continue

    const npc = findNpcById(state.npcs, event.trigger.npc_id)
    if (!npc || !npc.alive) continue

    let triggered = true

    if (event.trigger.npc_trust_gte !== undefined) {
      if (npc.trust < event.trigger.npc_trust_gte) triggered = false
    }
    if (event.trigger.npc_trust_lte !== undefined) {
      if (npc.trust > event.trigger.npc_trust_lte) triggered = false
    }
    if (event.trigger.npc_fear_gte !== undefined) {
      if (npc.fear < event.trigger.npc_fear_gte) triggered = false
    }
    if (event.trigger.npc_infection_gte !== undefined) {
      if (npc.infection < event.trigger.npc_infection_gte) triggered = false
    }

    if (triggered) {
      results.push(event)
    }
  }

  return results
}

// ==================== 事件执行 ====================

/**
 * 标记事件已触发（用于 once 事件）
 */
export function markEventTriggered(eventId: string): void {
  triggeredOnceEvents.add(eventId)
}

/**
 * 将事件转换为待处理事件（等待玩家选择）
 */
export function createPendingEvent(event: DungeonEvent): PendingEvent {
  // 过滤掉条件不满足的选项
  // 注意：选项条件检查在调用时执行，这里先返回全部
  return {
    event_id: event.id,
    dialogue: event.dialogue ?? [],
    choices: event.choices ?? [],
    description: event.description ?? '',
    dialogue_event: event.dialogue_event,
  }
}

/**
 * 获取事件中可用的选项（过滤条件不满足的）
 */
export function getAvailableChoices(
  state: DungeonRuntimeState,
  pendingEvent: PendingEvent,
): EventChoice[] {
  return pendingEvent.choices.filter((choice) => {
    if (!choice.condition) return true
    return checkCondition(state, choice.condition)
  })
}

// ==================== 内部工具 ====================

/** 缓存所有事件列表 */
let allEventsCache: DungeonEvent[] | null = null

function getAllEvents(): DungeonEvent[] {
  if (!allEventsCache) {
    allEventsCache = EVENTS
  }
  return allEventsCache
}
