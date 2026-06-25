/**
 * 基因锁系统配置
 * 
 * ==================== 基因锁概述 ====================
 * 基因锁 = 被动效果 + 主动效果
 * - 被动: 解锁后永久生效（属性加成）
 * - 主动: 手动开启的额外加成（消耗意志力）
 * 
 * ==================== 解锁机制 ====================
 * 一阶: 受到伤害时自动触发（低HP加成）
 * 二阶+: 需要前一阶完全熟练后解锁
 * 
 * ==================== 熟练度 ====================
 * 每手动开启一次基因锁: 熟练度+1
 * 每次在副本中激活: 熟练度+2
 * 熟练度满后可自由开启
 */

/**
 * 基因锁阶位配置
 * 每阶包含：被动效果、主动效果、解锁条件
 */
export interface GeneLockTierConfig {
  tier: number              // 阶位 1-5
  name: string              // 名称
  description: string       // 描述
  
  // 被动效果（解锁后永久生效）
  passive: {
    allStats: number        // 全属性加成
  }
  
  // 主动效果（消耗意志力开启）
  active: {
    allStats: number        // 额外全属性加成
    crit: number            // 暴击率加成（小数，0.1 = 10%）
    dodge: number           // 闪避率加成（小数，0.1 = 10%）
    costPerTurn: number     // 每回合意志力消耗
  }
  
  // 解锁条件
  unlockCondition: string   // 解锁条件描述
  maxProficiency: number    // 最大熟练度
}

/**
 * 5阶基因锁配置
 * 
 * 扩展新阶位：
 * 1. 在此数组中添加新配置
 * 2. 更新 store 中的基因锁逻辑
 * 3. 更新 UI 显示
 */
export const GENE_LOCK_TIERS: GeneLockTierConfig[] = [
  // 一阶：基础战斗能力
  {
    tier: 1,
    name: '第一阶',
    description: '解开第一阶基因锁后，你可以解放远古人类时的战斗本能。',
    passive: { allStats: 1 },
    active: { allStats: 2, crit: 0.1, dodge: 0.1, costPerTurn: 1 },
    unlockCondition: '受到伤害时自动触发',
    maxProficiency: 10,
  },
  
  // 二阶：细胞级控制
  {
    tier: 2,
    name: '第二阶',
    description: '第二阶段意味着生物能从细胞层级控制自己的身体。',
    passive: { allStats: 2 },
    active: { allStats: 4, crit: 0.2, dodge: 0.2, costPerTurn: 2 },
    unlockCondition: '一阶熟练度满后解锁',
    maxProficiency: 18,
  },
  
  // 三阶：脑域开发
  {
    tier: 3,
    name: '第三阶',
    description: '第三阶段开始从外转内，允许你不断开发自己的脑域。',
    passive: { allStats: 3 },
    active: { allStats: 6, crit: 0.3, dodge: 0.3, costPerTurn: 3 },
    unlockCondition: '二阶熟练度满后解锁',
    maxProficiency: 21,
  },
  
  // 四阶：高级战斗特性
  {
    tier: 4,
    name: '第四阶',
    description: '第四阶段分为初、中、高三级，获得高级战斗特性。',
    passive: { allStats: 4 },
    active: { allStats: 8, crit: 0.4, dodge: 0.4, costPerTurn: 4 },
    unlockCondition: '三阶累计投入21XP后解锁',
    maxProficiency: 36,
  },
  
  // 五阶：终极形态
  {
    tier: 5,
    name: '第五阶',
    description: '终极形态，基因锁完全解放。',
    passive: { allStats: 5 },
    active: { allStats: 10, crit: 0.5, dodge: 0.5, costPerTurn: 5 },
    unlockCondition: '四阶熟练度满后解锁',
    maxProficiency: 50,
  },
]

/**
 * 计算基因锁解锁概率
 * 
 * @param tier 目标阶位
 * @param currentHP 当前HP
 * @param maxHP 最大HP
 * @param proficiency 当前熟练度
 * @returns 解锁概率（0-1）
 */
export function calculateUnlockChance(
  tier: number,
  currentHP: number,
  maxHP: number,
  proficiency: number
): number {
  const baseChance = 0.01 // 1% 基础概率
  
  if (tier === 1) {
    // 一阶：低HP加成
    const hpPercentage = currentHP / maxHP * 100
    const hpDrop = 100 - hpPercentage
    return Math.min(1, baseChance + hpDrop / 100)
  }
  
  // 后续阶段：熟练度加成
  const proficiencyBonus = proficiency * getProficiencyMultiplier(tier)
  return Math.min(1, baseChance + proficiencyBonus / 100)
}

/**
 * 获取熟练度乘数
 */
function getProficiencyMultiplier(tier: number): number {
  const multipliers: Record<number, number> = {
    2: 1,      // 每点+1%
    3: 0.3,    // 每点+0.3%
    4: 0.1,    // 每点+0.1%
    5: 0.05,   // 每点+0.05%
  }
  return multipliers[tier] || 0
}
