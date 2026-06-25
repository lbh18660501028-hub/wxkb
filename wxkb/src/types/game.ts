export interface Attributes {
  intelligence: number
  spirit: number
  vitality: number
  reaction: number
  strength: number
  immunity: number
}

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
  | 'home' | 'cycle' | 'personal' | 'scenario' | 'dungeon' | 'guide' | 'settings'
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
