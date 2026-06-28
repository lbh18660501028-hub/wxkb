/**
 * 副本注册表
 *
 * ==================== 设计说明 ====================
 * 所有副本在此注册，引擎通过此表查找副本配置
 * 新增副本只需：
 * 1. 在 data/dungeons/ 下新建副本目录
 * 2. 在此处导入并注册
 *
 * ==================== 当前已注册副本 ====================
 * - biohazard_hive: 生化危机·蜂巢
 */

import type {
  DungeonConfig,
  RoomConfig,
  ItemConfig,
  EnemyConfig,
  NpcTemplate,
  DungeonEvent,
  QuestConfig,
  DungeonRatingConfig,
  SearchTable,
  AlertConfig,
} from '../../types/dungeon-v2'

import { BIOHAZARD_DUNGEON, BIOHAZARD_RATINGS } from './biohazard/meta'
import { ROOMS, getRoom, getAllRooms } from './biohazard/rooms'
import { ITEMS, getItem, getItemName } from './biohazard/items'
import { ENEMIES, getEnemy } from './biohazard/enemies'
import { NPC_TEMPLATES, GUIDE_NPC_TEMPLATE, RAIN_NPC_ID, RAIN_DIALOGUE, MOVIE_NPC_TEMPLATES } from './biohazard/npcs'
import { EVENTS, getEvent } from './biohazard/events'
import { MAIN_QUESTS, SIDE_QUESTS, ALL_QUESTS } from './biohazard/quests'
import { SEARCH_TABLE as BIOHAZARD_SEARCH_TABLE } from './biohazard/search'
import { ALERT_CONFIG as BIOHAZARD_ALERT_CONFIG } from './biohazard/alert'

// ==================== 副本打包接口 ====================

/** 一个副本的完整数据包 */
export interface DungeonBundle {
  config: DungeonConfig
  rooms: RoomConfig[]
  items: ItemConfig[]
  enemies: EnemyConfig[]
  npc_templates: NpcTemplate[]
  /** 引导型 NPC 模板（固定生成，如老关） */
  guide_npc_template?: NpcTemplate
  events: DungeonEvent[]
  quests: QuestConfig[]
  ratings: DungeonRatingConfig[]
  /** 副本专属搜索表（物品池、失败惩罚、DC等） */
  search_table: SearchTable
  /** 警戒值系统配置（不提供则该副本不使用警戒值系统） */
  alert_config?: AlertConfig
  /** 固定 NPC 数据（不属于随机模板） */
  fixed_npcs?: Record<string, unknown>
}

// ==================== 生化危机副本打包 ====================

const BIOHAZARD_BUNDLE: DungeonBundle = {
  config: BIOHAZARD_DUNGEON,
  rooms: ROOMS,
  items: ITEMS,
  enemies: ENEMIES,
  npc_templates: NPC_TEMPLATES,
  guide_npc_template: GUIDE_NPC_TEMPLATE,
  events: EVENTS,
  quests: ALL_QUESTS,
  ratings: BIOHAZARD_RATINGS,
  search_table: BIOHAZARD_SEARCH_TABLE,
  alert_config: BIOHAZARD_ALERT_CONFIG,
  fixed_npcs: {
    rain: {
      id: RAIN_NPC_ID,
      dialogue: RAIN_DIALOGUE,
    },
    movie_templates: MOVIE_NPC_TEMPLATES,
  },
}

// ==================== 注册表 ====================

const DUNGEON_REGISTRY: Record<string, DungeonBundle> = {
  [BIOHAZARD_DUNGEON.id]: BIOHAZARD_BUNDLE,
}

/** 根据副本 ID 获取完整数据包 */
export function getDungeonBundle(id: string): DungeonBundle | undefined {
  return DUNGEON_REGISTRY[id]
}

/** 获取所有已注册副本的列表信息 */
export function getDungeonList(): DungeonConfig[] {
  return Object.values(DUNGEON_REGISTRY).map((bundle) => bundle.config)
}

// ==================== 便捷查找函数 ====================

export { getRoom, getAllRooms, getItem, getItemName, getEnemy, getEvent }
export { MAIN_QUESTS as BIOHAZARD_MAIN_QUESTS, SIDE_QUESTS as BIOHAZARD_SIDE_QUESTS }
