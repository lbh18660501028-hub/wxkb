/**
 * 不良状态系统
 * 
 * ==================== 设计概述 ====================
 * 8种简化不良状态，影响战斗属性
 * 
 * ==================== 状态列表 ====================
 * - 眩晕：无法行动，持续1回合
 * - 沉默：无法使用魔法，持续2回合
 * - 流血：每回合损失HP，持续3回合
 * - 燃烧：每回合损失HP，持续3回合
 * - 中毒：每回合损失HP，持续4回合
 * - 减速：闪避-30%，持续2回合
 * - 束缚：速度-50%，持续2回合
 * - 强化：攻击+30%，持续3回合
 * 
 * ==================== 如何扩展新状态 ====================
 * 1. 在 statusEffects 数组中添加新状态对象
 * 2. 确保 type 唯一
 * 3. 设置 name、description、icon
 * 4. 设置 duration（持续回合数）
 * 5. 设置 effect（效果配置）
 */

/**
 * 状态效果类型
 */
export type StatusEffectType = 
  | 'stun'      // 眩晕
  | 'silence'   // 沉默
  | 'bleed'     // 流血
  | 'burn'      // 燃烧
  | 'poison'    // 中毒
  | 'slow'      // 减速
  | 'root'      // 束缚
  | 'strengthen' // 强化

/**
 * 状态效果配置
 */
export interface StatusEffectConfig {
  type: StatusEffectType         // 状态类型
  name: string                   // 状态名称
  description: string            // 状态描述
  icon: string                   // 图标
  duration: number               // 持续回合数
  effect: {
    type: 'dot' | 'debuff' | 'disable' | 'buff'  // 效果类型
    stat?: string                // 影响的属性（debuff/buff时）
    value?: number               // 效果值（小数或整数）
    damagePerTurn?: number       // 每回合伤害（dot时）
  }
}

// ==================== 状态数据 ====================

/**
 * 所有状态效果列表
 */
export const statusEffects: StatusEffectConfig[] = [
  {
    type: 'stun',
    name: '眩晕',
    description: '无法行动',
    icon: '💫',
    duration: 1,
    effect: {
      type: 'disable',
    },
  },
  {
    type: 'silence',
    name: '沉默',
    description: '无法使用魔法',
    icon: '🤐',
    duration: 2,
    effect: {
      type: 'disable',
    },
  },
  {
    type: 'bleed',
    name: '流血',
    description: '每回合损失HP',
    icon: '🩸',
    duration: 3,
    effect: {
      type: 'dot',
      damagePerTurn: 10,
    },
  },
  {
    type: 'burn',
    name: '燃烧',
    description: '每回合损失HP',
    icon: '🔥',
    duration: 3,
    effect: {
      type: 'dot',
      damagePerTurn: 15,
    },
  },
  {
    type: 'poison',
    name: '中毒',
    description: '每回合损失HP',
    icon: '☠️',
    duration: 4,
    effect: {
      type: 'dot',
      damagePerTurn: 8,
    },
  },
  {
    type: 'slow',
    name: '减速',
    description: '闪避-30%',
    icon: '🐌',
    duration: 2,
    effect: {
      type: 'debuff',
      stat: 'dodge',
      value: -0.3,
    },
  },
  {
    type: 'root',
    name: '束缚',
    description: '速度-50%',
    icon: '🕸️',
    duration: 2,
    effect: {
      type: 'debuff',
      stat: 'speed',
      value: -0.5,
    },
  },
  {
    type: 'strengthen',
    name: '强化',
    description: '攻击+30%',
    icon: '💪',
    duration: 3,
    effect: {
      type: 'buff',
      stat: 'damage',
      value: 0.3,
    },
  },
]

// ==================== 运行时状态 ====================

/**
 * 战斗中的状态效果实例
 */
export interface ActiveStatusEffect {
  type: StatusEffectType         // 状态类型
  remainingDuration: number      // 剩余回合数
  source: 'player' | 'enemy'    // 来源
}

// ==================== 辅助函数 ====================

/**
 * 根据类型获取状态配置
 */
export function getStatusEffectConfig(type: StatusEffectType): StatusEffectConfig | undefined {
  return statusEffects.find(s => s.type === type)
}

/**
 * 计算状态抵抗概率
 * 免疫强度每点提供2%抗性
 * @param immunity 免疫强度属性值
 * @returns 抵抗概率（0-1）
 */
export function calculateStatusResistance(immunity: number): number {
  return Math.min(0.8, immunity * 0.01) // 最高80%抗性
}

/**
 * 判断是否抵抗状态
 * @param immunity 免疫强度属性值
 * @returns 是否抵抗
 */
export function rollStatusResist(immunity: number): boolean {
  const resistance = calculateStatusResistance(immunity)
  return Math.random() < resistance
}

/**
 * 应用状态效果
 * @param currentEffects 当前状态列表
 * @param newEffect 要添加的新状态
 * @param immunity 免疫强度（用于抵抗判定）
 * @returns 更新后的状态列表
 */
export function applyStatusEffect(
  currentEffects: ActiveStatusEffect[],
  newEffect: { type: StatusEffectType; duration: number; source: 'player' | 'enemy' },
  immunity: number
): ActiveStatusEffect[] {
  // 检查是否抵抗
  if (rollStatusResist(immunity)) {
    return currentEffects
  }

  // 检查是否已有相同状态（刷新持续时间）
  const existing = currentEffects.find(e => e.type === newEffect.type)
  if (existing) {
    existing.remainingDuration = Math.max(existing.remainingDuration, newEffect.duration)
    return currentEffects
  }

  // 添加新状态
  return [...currentEffects, {
    type: newEffect.type,
    remainingDuration: newEffect.duration,
    source: newEffect.source,
  }]
}

/**
 * 处理回合结束的状态效果
 * @param effects 当前状态列表
 * @returns { effects: 更新后的状态列表, damage: 本回合总伤害 }
 */
export function processStatusEffects(effects: ActiveStatusEffect[]): {
  effects: ActiveStatusEffect[]
  damage: number
  canAct: boolean
  canCast: boolean
} {
  let totalDamage = 0
  let canAct = true
  let canCast = true

  const updatedEffects = effects
    .map(effect => {
      const config = getStatusEffectConfig(effect.type)
      if (!config) return effect

      // 处理DOT伤害
      if (config.effect.type === 'dot' && config.effect.damagePerTurn) {
        totalDamage += config.effect.damagePerTurn
      }

      // 处理控制效果
      if (config.effect.type === 'disable') {
        if (effect.type === 'stun') canAct = false
        if (effect.type === 'silence') canCast = false
      }

      // 减少持续时间
      return { ...effect, remainingDuration: effect.remainingDuration - 1 }
    })
    .filter(effect => effect.remainingDuration > 0)

  return {
    effects: updatedEffects,
    damage: totalDamage,
    canAct,
    canCast,
  }
}

/**
 * 获取状态效果的属性加成/减益
 * @param effects 当前状态列表
 * @returns 属性修改器
 */
export function getStatusEffectsModifier(effects: ActiveStatusEffect[]): {
  dodge: number
  speed: number
  damage: number
} {
  let dodgeMod = 0
  let speedMod = 0
  let damageMod = 0

  for (const effect of effects) {
    const config = getStatusEffectConfig(effect.type)
    if (!config) continue

    if (config.effect.type === 'debuff' || config.effect.type === 'buff') {
      if (config.effect.stat === 'dodge') dodgeMod += config.effect.value || 0
      if (config.effect.stat === 'speed') speedMod += config.effect.value || 0
      if (config.effect.stat === 'damage') damageMod += config.effect.value || 0
    }
  }

  return { dodge: dodgeMod, speed: speedMod, damage: damageMod }
}
