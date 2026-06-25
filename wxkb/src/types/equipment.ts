/**
 * 装备系统类型定义
 * 
 * 统一管理所有装备、物品、消耗品的类型
 * 扩展新物品时只需在 shop.ts 中添加数据即可
 */

// ==================== 基础枚举 ====================

/** 装备槽位类型 - 6个槽位 */
export type EquipmentSlot = 'weapon' | 'armor' | 'helmet' | 'gloves' | 'boots' | 'accessory'

/** 物品等级 - D/C/B/A/S 五档 */
export type ItemTier = 'D' | 'C' | 'B' | 'A' | 'S'

/** 物品分类 - 决定在商店中的显示位置 */
export type ItemCategory = 
  | 'consumable'    // 消耗品（药水、解毒剂等）
  | 'weapon'        // 武器（主手）
  | 'armor'         // 盔甲（身体）
  | 'helmet'        // 头盔（头部）
  | 'gloves'        // 手套（手部）
  | 'boots'         // 鞋子（脚部）
  | 'accessory'     // 饰品（额外槽位）
  | 'spell'         // 法术（魔法技能）
  | 'skill'         // 技能（被动或主动技能）

/** 武器本质：决定普通/技能攻击使用哪一种本质攻击 */
export type WeaponEssence = 'technology' | 'fantasy' | 'abnormal'

// ==================== 属性接口 ====================

/**
 * 装备属性加成
 * 所有属性均为可选，未定义的属性不提供加成
 */
export interface EquipmentStats {
  attack?: number       // 攻击力加成
  defense?: number      // 护甲防御加成（物理减伤）
  magicDefense?: number // 魔法抗性加成（精神减伤）
  hp?: number           // 生命值加成
  mp?: number           // 魔法值加成
  speed?: number        // 速度加成
  willpower?: number    // 意志值加成
  technologyAttack?: number
  fantasyAttack?: number
  abnormalAttack?: number
  technologyDefense?: number
  fantasyDefense?: number
  abnormalDefense?: number
  physicalAttack?: number // 旧字段：等同于 technologyAttack
  magicAttack?: number    // 旧字段：等同于 fantasyAttack
  physicalDefense?: number // 旧字段：等同于 technologyDefense
  critRate?: number
  critDamage?: number
  critResist?: number
  hit?: number
  evasion?: number
  counterRate?: number
  reflectRate?: number
  comboRate?: number
  shield?: number
  shieldRegen?: number
  stunRate?: number
  stunResist?: number
  lifeSteal?: number
  damageReduction?: number
  penetration?: number
  armorBreak?: number
  blockRate?: number
  toughness?: number
  trueDamage?: number
  trueDefense?: number
}

// ==================== 物品接口 ====================

/**
 * 商店物品定义
 * 
 * 扩展新物品步骤：
 * 1. 在 shop.ts 的 shopItems 数组中添加新物品
 * 2. 确保 id 唯一（推荐格式：类型_名称_等级，如 sword_iron_d）
 * 3. 根据物品类型设置 category 和 slot
 * 4. 消耗品需设置 effect 字段
 */
export interface ShopItemDef {
  id: string              // 唯一标识符
  icon: string            // 显示图标（emoji）
  name: string            // 物品名称
  description: string     // 物品描述
  category: ItemCategory  // 物品分类
  tier: ItemTier          // 物品等级
  price: number           // 购买价格（奖励点）
  
  // 装备属性（仅装备类物品需要）
  stats?: EquipmentStats
  
  // 消耗品效果（仅消耗品需要）
  // 格式："属性+数值" 如 "hp+50"、"mp+30"
  // 特殊效果： "cure_poison"（解毒）、"revive"（复活）
  effect?: string
  
  // 装备槽位（仅装备类物品需要，根据 category 自动推断）
  slot?: EquipmentSlot

  // 武器本质：technology/fantasy/abnormal 分别使用科技/魔幻/特异本质攻击
  essence?: WeaponEssence
  
  // 购买数量限制（可选，-1表示无限）
  maxQuantity?: number
}

// ==================== 装备实例接口 ====================

/**
 * 已拥有的装备实例
 * 用于存档和装备管理
 */
export interface OwnedEquipment {
  itemId: string        // 对应 ShopItemDef.id
  equipped: boolean     // 是否已装备
  slot?: EquipmentSlot  // 装备槽位
}

// ==================== 常量定义 ====================

/** 装备槽位中文名称 */
export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '盔甲',
  helmet: '头盔',
  gloves: '手套',
  boots: '鞋子',
  accessory: '饰品',
}

/** 物品分类中文名称和图标 */
export const CATEGORY_INFO: Record<ItemCategory, { label: string; icon: string }> = {
  consumable: { label: '消耗品', icon: '💊' },
  weapon: { label: '武器', icon: '⚔️' },
  armor: { label: '盔甲', icon: '🛡️' },
  helmet: { label: '头盔', icon: '⛑️' },
  gloves: { label: '手套', icon: '🧤' },
  boots: { label: '鞋子', icon: '👟' },
  accessory: { label: '饰品', icon: '💍' },
  spell: { label: '法术', icon: '✨' },
  skill: { label: '技能', icon: '📖' },
}

export const ESSENCE_INFO: Record<WeaponEssence, { label: string; description: string }> = {
  technology: {
    label: '科技',
    description: '借助科学技术构成，可以被科学理论完全或部分解释。',
  },
  fantasy: {
    label: '魔幻',
    description: '来自魔法、奇幻、灵异、仙侠或玄幻体系，完全脱离现实科学。',
  },
  abnormal: {
    label: '特异',
    description: '科学难以解释，也不属于常规魔法或法术定义的异常力量。',
  },
}

/** 物品等级颜色 */
export const TIER_COLORS: Record<ItemTier, string> = {
  D: '#8b8b8b',    // 灰色 - 基础
  C: '#4a9eff',    // 蓝色 - 进阶
  B: '#a855f7',    // 紫色 - 高级
  A: '#f59e0b',    // 金色 - 顶级
  S: '#ef4444',    // 红色 - 极品
}

/** 物品等级价格倍率 */
export const TIER_PRICE_MULTIPLIER: Record<ItemTier, number> = {
  D: 1,
  C: 5,
  B: 20,
  A: 100,
  S: 500,
}

// ==================== 辅助函数 ====================

/**
 * 根据分类获取推荐的装备槽位
 */
export function getSlotForCategory(category: ItemCategory): EquipmentSlot | null {
  const slotMap: Record<string, EquipmentSlot> = {
    weapon: 'weapon',
    armor: 'armor',
    helmet: 'helmet',
    gloves: 'gloves',
    boots: 'boots',
    accessory: 'accessory',
  }
  return slotMap[category] || null
}

/**
 * 格式化装备属性为可读字符串
 */
export function formatStats(stats: EquipmentStats): string {
  const parts: string[] = []
  if (stats.attack) parts.push(`攻击+${stats.attack}`)
  if (stats.defense) parts.push(`防御+${stats.defense}`)
  if (stats.magicDefense) parts.push(`魔抗+${stats.magicDefense}`)
  if (stats.hp) parts.push(`生命+${stats.hp}`)
  if (stats.mp) parts.push(`MP+${stats.mp}`)
  if (stats.speed) parts.push(`速度+${stats.speed}`)
  if (stats.willpower) parts.push(`意志+${stats.willpower}`)
  if (stats.technologyAttack) parts.push(`科技攻+${stats.technologyAttack}`)
  if (stats.fantasyAttack) parts.push(`魔幻攻+${stats.fantasyAttack}`)
  if (stats.abnormalAttack) parts.push(`特异攻+${stats.abnormalAttack}`)
  if (stats.technologyDefense) parts.push(`科技防+${stats.technologyDefense}`)
  if (stats.fantasyDefense) parts.push(`魔幻防+${stats.fantasyDefense}`)
  if (stats.abnormalDefense) parts.push(`特异防+${stats.abnormalDefense}`)
  if (stats.physicalAttack) parts.push(`科技攻+${stats.physicalAttack}`)
  if (stats.magicAttack) parts.push(`魔幻攻+${stats.magicAttack}`)
  if (stats.physicalDefense) parts.push(`科技防+${stats.physicalDefense}`)
  if (stats.critRate) parts.push(`暴击+${Math.round(stats.critRate * 100)}%`)
  if (stats.critDamage) parts.push(`爆伤+${Math.round(stats.critDamage * 100)}%`)
  if (stats.critResist) parts.push(`抗暴+${Math.round(stats.critResist * 100)}%`)
  if (stats.hit) parts.push(`命中+${Math.round(stats.hit * 100)}%`)
  if (stats.evasion) parts.push(`闪避+${Math.round(stats.evasion * 100)}%`)
  if (stats.counterRate) parts.push(`反击+${Math.round(stats.counterRate * 100)}%`)
  if (stats.reflectRate) parts.push(`反伤+${Math.round(stats.reflectRate * 100)}%`)
  if (stats.comboRate) parts.push(`连击+${Math.round(stats.comboRate * 100)}%`)
  if (stats.shield) parts.push(`护盾+${stats.shield}`)
  if (stats.shieldRegen) parts.push(`回盾+${stats.shieldRegen}`)
  if (stats.stunRate) parts.push(`眩晕+${Math.round(stats.stunRate * 100)}%`)
  if (stats.stunResist) parts.push(`抗眩+${Math.round(stats.stunResist * 100)}%`)
  if (stats.lifeSteal) parts.push(`吸血+${Math.round(stats.lifeSteal * 100)}%`)
  if (stats.damageReduction) parts.push(`减伤+${Math.round(stats.damageReduction * 100)}%`)
  if (stats.penetration) parts.push(`穿透+${stats.penetration}`)
  if (stats.armorBreak) parts.push(`破甲+${Math.round(stats.armorBreak * 100)}%`)
  if (stats.blockRate) parts.push(`格挡+${Math.round(stats.blockRate * 100)}%`)
  if (stats.toughness) parts.push(`韧性+${Math.round(stats.toughness * 100)}%`)
  if (stats.trueDamage) parts.push(`真实伤害+${stats.trueDamage}`)
  if (stats.trueDefense) parts.push(`真实防御+${stats.trueDefense}`)
  return parts.join(' ')
}
