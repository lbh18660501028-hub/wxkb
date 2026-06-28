/**
 * 魔法系统配置
 * 
 * ==================== 设计概述 ====================
 * MP上限 = 智力 × 10
 * 魔法伤害 = 决心 × 2 + 法术基础伤害
 * 
 * ==================== 法术分类 ====================
 * - 火系：高伤害，附加燃烧
 * - 冰系：中等伤害，附加减速
 * - 雷系：高爆发，单体秒杀
 * 
 * ==================== 如何扩展新法术 ====================
 * 1. 在 spells 数组中添加新法术对象
 * 2. 确保 id 唯一
 * 3. 设置 element（元素类型）
 * 4. 设置 mpCost（MP消耗）
 * 5. 设置 baseDamage（基础伤害）
 * 6. 设置 statusEffect（附加状态，可选）
 */

/**
 * 元素类型
 */
export type Element = 'fire' | 'ice' | 'lightning' | 'none'

/**
 * 法术配置
 */
export interface SpellConfig {
  id: string                    // 唯一ID
  name: string                  // 法术名称
  element: Element              // 元素类型
  mpCost: number                // MP消耗
  baseDamage: number            // 基础伤害
  description: string           // 法术描述
  icon: string                  // 图标
  statusEffect?: {              // 附加状态效果（可选）
    type: string                // 状态类型
    chance: number              // 触发概率（0-1）
    duration: number            // 持续回合数
  }
}

// ==================== 法术数据 ====================

/**
 * 所有法术列表
 * 
 * 扩展新法术时，将法术对象添加到此数组
 */
export const spells: SpellConfig[] = [
  // ==================== 火系法术 ====================
  {
    id: 'fireball',
    name: '火球术',
    element: 'fire',
    mpCost: 15,
    baseDamage: 20,
    description: '发射一枚火球，造成火焰伤害并有概率附加燃烧',
    icon: '🔥',
    statusEffect: {
      type: 'burn',
      chance: 0.4,
      duration: 3,
    },
  },
  {
    id: 'fire_breath',
    name: '烈焰吐息',
    element: 'fire',
    mpCost: 30,
    baseDamage: 40,
    description: '喷出烈焰，造成大量火焰伤害',
    icon: '🔥',
    statusEffect: {
      type: 'burn',
      chance: 0.6,
      duration: 4,
    },
  },
  {
    id: 'inferno',
    name: '地狱火',
    element: 'fire',
    mpCost: 50,
    baseDamage: 70,
    description: '召唤地狱之火，造成毁灭性伤害',
    icon: '🔥',
    statusEffect: {
      type: 'burn',
      chance: 0.8,
      duration: 5,
    },
  },

  // ==================== 冰系法术 ====================
  {
    id: 'ice_lance',
    name: '冰枪术',
    element: 'ice',
    mpCost: 12,
    baseDamage: 15,
    description: '发射冰枪，造成冰冻伤害并有概率附加减速',
    icon: '🧊',
    statusEffect: {
      type: 'slow',
      chance: 0.5,
      duration: 2,
    },
  },
  {
    id: 'blizzard',
    name: '暴风雪',
    element: 'ice',
    mpCost: 25,
    baseDamage: 35,
    description: '召唤暴风雪，造成范围冰冻伤害',
    icon: '🧊',
    statusEffect: {
      type: 'slow',
      chance: 0.7,
      duration: 3,
    },
  },
  {
    id: 'absolute_zero',
    name: '绝对零度',
    element: 'ice',
    mpCost: 45,
    baseDamage: 60,
    description: '冻结一切，造成极高冰冻伤害',
    icon: '🧊',
    statusEffect: {
      type: 'freeze',
      chance: 0.6,
      duration: 2,
    },
  },

  // ==================== 雷系法术 ====================
  {
    id: 'lightning_bolt',
    name: '闪电箭',
    element: 'lightning',
    mpCost: 18,
    baseDamage: 25,
    description: '发射闪电，造成雷电伤害',
    icon: '⚡',
  },
  {
    id: 'chain_lightning',
    name: '连锁闪电',
    element: 'lightning',
    mpCost: 35,
    baseDamage: 50,
    description: '释放连锁闪电，造成高额雷电伤害',
    icon: '⚡',
    statusEffect: {
      type: 'stun',
      chance: 0.3,
      duration: 1,
    },
  },
  {
    id: 'thunder_god',
    name: '雷神之怒',
    element: 'lightning',
    mpCost: 60,
    baseDamage: 90,
    description: '召唤雷神之力，造成毁灭性雷电伤害',
    icon: '⚡',
    statusEffect: {
      type: 'stun',
      chance: 0.5,
      duration: 2,
    },
  },
]

// ==================== 辅助函数 ====================

/**
 * 根据ID获取法术
 */
export function getSpellById(id: string): SpellConfig | undefined {
  return spells.find(s => s.id === id)
}

/**
 * 根据元素类型获取法术列表
 */
export function getSpellsByElement(element: Element): SpellConfig[] {
  return spells.filter(s => s.element === element)
}

/**
 * 获取法术伤害（基础伤害 + 决心加成）
 * @param spell 法术配置
* @param resolve 决心属性值
* @returns 最终魔法伤害
*/
export function getSpellDamage(spell: SpellConfig, resolve: number): number {
return spell.baseDamage + resolve * 2
}
