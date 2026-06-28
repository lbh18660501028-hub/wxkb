/**
 * 副本 V2 — 道具管理系统
 *
 * ==================== 功能说明 ====================
 * - 添加/移除道具
 * - 使用道具（执行使用效果）
 * - 检查道具是否拥有
 * - 获取道具信息
 * - 武器/医疗道具的特殊处理
 */

import type {
  DungeonPlayerState,
  ItemConfig,
  ActionEffect,
} from '../../types/dungeon-v2'
import { getItem } from '../../data/dungeons/biohazard/items'

// ==================== 道具操作 ====================

/** 检查玩家是否拥有指定道具 */
export function hasItem(player: DungeonPlayerState, itemId: string): boolean {
  return player.inventory.includes(itemId) ||
    player.permanent_rewards.includes(itemId)
}

/** 添加道具到玩家背包 */
export function addItem(player: DungeonPlayerState, itemId: string): string | null {
  const item = getItem(itemId)
  if (!item) {
    console.warn(`[dungeon-v2] 未知道具 ID: ${itemId}`)
    return null
  }

  if (item.temporary) {
    player.inventory.push(itemId)
  } else {
    if (!player.permanent_rewards.includes(itemId)) {
      player.permanent_rewards.push(itemId)
    }
  }

  return item.name
}

/** 从玩家背包移除道具 */
export function removeItem(player: DungeonPlayerState, itemId: string): boolean {
  const idx = player.inventory.indexOf(itemId)
  if (idx >= 0) {
    player.inventory.splice(idx, 1)
    return true
  }
  // 永久道具不可移除
  return false
}

/**
 * 使用道具
 * 返回使用效果（如果道具可用），否则返回 null
 */
export function useItem(
  player: DungeonPlayerState,
  itemId: string,
  targetNpcId?: string,
): { effect: ActionEffect; itemName: string } | null {
  const item = getItem(itemId)
  if (!item || !hasItem(player, itemId)) {
    return null
  }

  // 如果道具没有使用效果，返回 null
  if (!item.use_effect) {
    return null
  }

  // 如果道具消耗，则移除一个
  if (item.consume_on_use) {
    removeItem(player, itemId)
  }

  const effect: ActionEffect = targetNpcId
    ? {
        ...item.use_effect,
        hp: undefined,
        infection: undefined,
        npc_heal: item.use_effect.hp ? { npc_id: targetNpcId, amount: item.use_effect.hp } : undefined,
        npc_infection: item.use_effect.infection ? { npc_id: targetNpcId, value: item.use_effect.infection } : undefined,
      }
    : item.use_effect

  return {
    effect,
    itemName: item.name,
  }
}

/** 获取玩家所有道具的配置信息 */
export function getPlayerItems(player: DungeonPlayerState): ItemConfig[] {
  const items: ItemConfig[] = []
  const seen = new Set<string>()

  for (const itemId of player.inventory) {
    if (seen.has(itemId)) continue
    const item = getItem(itemId)
    if (item) {
      items.push(item)
      seen.add(itemId)
    }
  }

  for (const itemId of player.permanent_rewards) {
    if (seen.has(itemId)) continue
    const item = getItem(itemId)
    if (item) {
      items.push(item)
      seen.add(itemId)
    }
  }

  return items
}

/** 按类型分组获取道具 */
export function getItemsByType(player: DungeonPlayerState): Record<string, ItemConfig[]> {
  const items = getPlayerItems(player)
  const grouped: Record<string, ItemConfig[]> = {}

  for (const item of items) {
    if (!grouped[item.type]) {
      grouped[item.type] = []
    }
    grouped[item.type].push(item)
  }

  return grouped
}

/** 获取当前装备的武器 */
export function getEquippedWeapon(player: DungeonPlayerState): ItemConfig | null {
  if (!player.weapon) return null
  return getItem(player.weapon) ?? null
}

/** 装备武器 */
export function equipWeapon(player: DungeonPlayerState, itemId: string): boolean {
  const item = getItem(itemId)
  if (!item || item.type !== 'weapon') return false
  if (!hasItem(player, itemId)) return false
  player.weapon = itemId
  return true
}
