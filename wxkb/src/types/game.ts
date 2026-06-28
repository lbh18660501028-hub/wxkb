import type { ActiveStatusEffect } from '../data/statusEffects'

/**
 * 九属性系统
 * - physical: strength, agility, endurance
 * - mental: intelligence, perception, resolve
 * - social: presence, manipulation, composure
 */
export interface Attributes {
  strength: number       // 力量
  agility: number        // 敏捷
  endurance: number      // 耐力
  intelligence: number   // 智力
  perception: number     // 感知
  resolve: number        // 决心
  presence: number       // 风度
  manipulation: number   // 操控
  composure: number      // 沉着
}

export type AttributeKey = keyof Attributes

export interface DerivedAttributes {
  hpMax: number
  speed: number
  defense: number
  willpower: number
  volume: number
}

export interface SidePlots {
  D: number
  C: number
  B: number
  A: number
  S: number
}

export interface OfflineIdle {
  lastLogoutTime: number
  offlineDuration: number
  maxOfflineDuration: number
}

export interface IdleState {
  isRunning: boolean
  startTime: number | null
  totalSeconds: number
  maxHours: number
  currentMapId: number
  offline: OfflineIdle
}

export interface FacilityPlacement {
  id: string
  type: string
  x: number
  y: number
  level: number
  skin?: string
}

export interface PersonalSpaceState {
  roomType: 'indoor' | 'outdoor'
  roomStyle: string
  currentEnvironment: string
  facilityPlacements: FacilityPlacement[]
  storage: Record<string, number>
  trainingAssignments: Record<string, AttributeKey | null>
  trainingProgress: Record<string, Partial<Record<AttributeKey, number>>>
}

export interface MapProgress {
  unlockedMaps: number[]
  completedScenarios: number[]
}

export interface GameState {
  name: string
  level: number
  xp: number
  xpMax: number
  rewardPoints: number
  attributes: Attributes
  sidePlots: SidePlots
  idle: IdleState
  mapProgress: MapProgress
  logs: LogEntry[]
}

export interface LogEntry {
  text: string
  type: 'success' | 'warning' | 'danger' | 'info' | 'gold' | ''
  timestamp: number
}

export type PageId =
  | 'home' | 'cycle' | 'personal' | 'dungeonGrid' | 'guide' | 'settings'
  | 'shop' | 'exchange' | 'equipment' | 'geneLock' | 'squad' | 'bloodline'
  | 'cybernetic' | 'cultivation' | 'eyeTech' | 'energy' | 'title' | 'multiverse'

export interface Scenario {
  id: string
  name: string
  description: string
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  reward: string
}

/**
 * 旧版商店物品接口（已废弃）
 *
 * 请使用 equipment.ts 中的 ShopItemDef
 * 保留此接口仅为兼容旧代码
 */
export interface ShopItem {
  id: string
  icon: string
  name: string
  price: number
}

/**
 * 基因锁状态（每个角色独立）
 */
export interface CharacterGeneLock {
  tier: number
  proficiency: number[]
  active: boolean
  activeTier: number
}

/**
 * 统一角色接口 — 取消玩家/队友区分
 *
 * 所有角色（包括主角）使用同一数据结构。
 * 角色通过 characters 数组管理，index 0 为主角。
 *
 * 扩展方法：添加新字段时需在 createDefaultCharacter() 中提供默认值，
 * 并在 loadSave() 迁移逻辑中处理旧存档兼容。
 */
export interface Character {
  id: string
  name: string
  professionId: string
  gender: string
  attributes: Attributes
  equippedItems: Record<string, string>
  geneLock: CharacterGeneLock
  equippedBloodline: string | null
  skills: Record<string, number>
  spells: Record<string, boolean>
  currentMp: number
  volumeLevel: number
  statusEffects: ActiveStatusEffect[]
}

/**
 * @deprecated 使用 Character 代替
 */
export interface Companion {
  id: string
  name: string
  professionId: string
  attributes: Attributes
  equippedItems: Record<string, string>
}

export interface GeneLockTier {
  tier: number
  name: string
  desc: string
  passive: string
  active: string
  willpowerCost: number
  unlocked: boolean
}
