/**
 * 血统系统配置
 * 
 * ==================== 血统概述 ====================
 * 血统 = 属性加成 + 特性效果
 * - 属性加成：解锁后永久生效
 * - 特性效果：触发条件满足时自动激活
 * 
 * ==================== 血统等级 ====================
 * D级: 属性上限6, 赠送1属性点
 * DD级: 属性上限8, 赠送2属性点
 * C级: 属性上限11, 赠送3属性点
 * CC级: 属性上限13, 赠送6属性点
 * B级: 属性上限16, 赠送9属性点
 * BB级: 属性上限18, 赠送18属性点
 * A级: 属性上限21, 赠送27属性点
 * AA级: 属性上限26, 赠送54属性点
 * S级: 属性上限36, 全属性+9
 * 
 * ==================== 如何添加新血统 ====================
 * 1. 在此文件的 bloodlines 数组中添加新血统
 * 2. 确保 id 唯一
 * 3. 设置 category（分类）
 * 4. 设置 tier（等级）
 * 5. 设置 stats（属性加成）
 * 6. 设置 traits（特性列表）
 */

/**
 * 血统分类
 */
export type BloodlineCategory = 'human' | 'nonhuman' | 'dark' | 'light'

/**
 * 特性触发条件类型
 */
export type TriggerType = 'passive' | 'combat' | 'low_hp' | 'kill' | 'skill_check'

/**
 * 血统特性
 */
export interface BloodlineTrait {
  name: string              // 特性名称
  description: string       // 效果描述
  trigger: TriggerType      // 触发条件
  duration?: string         // 持续时间（可选）
  cooldown?: string         // 冷却时间（可选）
}

/**
 * 血统配置
 */
export interface BloodlineConfig {
  id: string                    // 唯一ID
  name: string                  // 血统名称
  category: BloodlineCategory   // 血统分类
  tier: string                  // 血统等级（D/DD/C/CC/B/BB/A/AA/S）
  
  // 属性加成
  stats: {
    strength: number    // 肌肉强度
    reaction: number    // 神经反应
    intelligence: number // 智力
    vitality: number    // 细胞活力
    spirit: number      // 精神力
    immunity: number    // 免疫强度
  }
  
  // 特性列表
  traits: BloodlineTrait[]
  
  // 描述
  description: string
  
  // 价格（奖励点）
  price: number
}

/**
 * 血统等级配置
 * tier: 等级名称
 * attributeCap: 属性上限
 * giftPoints: 赠送属性点
 */
export const BLOODLINE_TIER_CONFIG: Record<string, { attributeCap: number; giftPoints: number }> = {
  'D':  { attributeCap: 6,  giftPoints: 1 },
  'DD': { attributeCap: 8,  giftPoints: 2 },
  'C':  { attributeCap: 11, giftPoints: 3 },
  'CC': { attributeCap: 13, giftPoints: 6 },
  'B':  { attributeCap: 16, giftPoints: 9 },
  'BB': { attributeCap: 18, giftPoints: 18 },
  'A':  { attributeCap: 21, giftPoints: 27 },
  'AA': { attributeCap: 26, giftPoints: 54 },
  'S':  { attributeCap: 36, giftPoints: 100 }, // S级特殊，全属性+9
}

// ==================== 血统数据 ====================

/**
 * 两仪家血脉（示例血统）
 * 
 * 两仪家是与七夜相似的旧家系，退魔一族之一。
 * 这些家族企图创造出超越人类的人类。
 */
const liangyiBloodlines: BloodlineConfig[] = [
  // D级血脉
  {
    id: 'liangyi_d',
    name: '两仪家血脉',
    category: 'human',
    tier: 'D',
    stats: { strength: 0, reaction: 1, intelligence: 1, vitality: 0, spirit: 1, immunity: 1 },
    traits: [
      {
        name: '双重人格',
        description: '获得双重人格，切换人格时可调整属性分配',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '两仪家是与七夜相似的旧家系，退魔一族之一。',
    price: 500,
  },
  
  // C级血脉
  {
    id: 'liangyi_c',
    name: '两仪家血脉',
    category: 'human',
    tier: 'C',
    stats: { strength: 0, reaction: 2, intelligence: 2, vitality: 0, spirit: 1, immunity: 1 },
    traits: [
      {
        name: '双重人格强化',
        description: '第二人格获得与主人格相同的技能，对抗心灵效果获得额外成功',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '两仪家是与七夜相似的旧家系，退魔一族之一。',
    price: 2000,
  },
  
  // B级血脉
  {
    id: 'liangyi_b',
    name: '两仪家血脉',
    category: 'human',
    tier: 'B',
    stats: { strength: 0, reaction: 3, intelligence: 3, vitality: 1, spirit: 2, immunity: 2 },
    traits: [
      {
        name: '双重人格进化',
        description: '第二人格技能随主人格成长，每次受到心灵效果时可切换人格',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '两仪家是与七夜相似的旧家系，退魔一族之一。',
    price: 8000,
  },
  
  // A级血脉
  {
    id: 'liangyi_a',
    name: '两仪家血脉',
    category: 'human',
    tier: 'A',
    stats: { strength: 0, reaction: 3, intelligence: 3, vitality: 3, spirit: 3, immunity: 3 },
    traits: [
      {
        name: '双重人格融合',
        description: '主人格和辅人格完全融合，属性和技能均取较高者',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '两仪家是与七夜相似的旧家系，退魔一族之一。',
    price: 20000,
  },
  
  // S级血脉
  {
    id: 'liangyi_s',
    name: '两仪家血脉',
    category: 'human',
    tier: 'S',
    stats: { strength: 3, reaction: 3, intelligence: 3, vitality: 3, spirit: 3, immunity: 3 },
    traits: [
      {
        name: '两仪终极',
        description: '全属性+6，所有抗性+50%，免疫心灵控制',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '两仪家是与七夜相似的旧家系，退魔一族之一。',
    price: 50000,
  },
]

/**
 * 吸血鬼血脉
 * 
 * 来自黑暗世界的古老血脉，赋予使用者超凡的力量和速度。
 */
const vampireBloodlines: BloodlineConfig[] = [
  {
    id: 'vampire_d',
    name: '吸血鬼血脉',
    category: 'dark',
    tier: 'D',
    stats: { strength: 1, reaction: 1, intelligence: 0, vitality: 0, spirit: 0, immunity: 1 },
    traits: [
      {
        name: '吸血本能',
        description: '击杀敌人时恢复10%最大生命值',
        trigger: 'kill',
        duration: '即时',
      },
    ],
    description: '来自黑暗世界的古老血脉。',
    price: 600,
  },
  {
    id: 'vampire_c',
    name: '吸血鬼血脉',
    category: 'dark',
    tier: 'C',
    stats: { strength: 2, reaction: 2, intelligence: 0, vitality: 1, spirit: 0, immunity: 1 },
    traits: [
      {
        name: '吸血强化',
        description: '击杀敌人时恢复20%最大生命值，获得10%生命偷取',
        trigger: 'kill',
        duration: '即时',
      },
    ],
    description: '来自黑暗世界的古老血脉。',
    price: 2500,
  },
  {
    id: 'vampire_b',
    name: '吸血鬼血脉',
    category: 'dark',
    tier: 'B',
    stats: { strength: 3, reaction: 3, intelligence: 1, vitality: 2, spirit: 0, immunity: 2 },
    traits: [
      {
        name: '吸血鬼之触',
        description: '攻击附带15%生命偷取，击杀恢复30%生命值',
        trigger: 'combat',
        duration: '永久',
      },
    ],
    description: '来自黑暗世界的古老血脉。',
    price: 10000,
  },
]

/**
 * 天使血脉
 * 
 * 来自光明世界神圣血脉，赋予使用者治愈和防护能力。
 */
const angelBloodlines: BloodlineConfig[] = [
  {
    id: 'angel_d',
    name: '天使血脉',
    category: 'light',
    tier: 'D',
    stats: { strength: 0, reaction: 0, intelligence: 1, vitality: 1, spirit: 1, immunity: 1 },
    traits: [
      {
        name: '神圣护盾',
        description: '每回合恢复1%最大生命值',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '来自光明世界的神圣血脉。',
    price: 600,
  },
  {
    id: 'angel_c',
    name: '天使血脉',
    category: 'light',
    tier: 'C',
    stats: { strength: 0, reaction: 1, intelligence: 2, vitality: 2, spirit: 2, immunity: 1 },
    traits: [
      {
        name: '神圣治愈',
        description: '每回合恢复3%最大生命值，异常状态持续时间减半',
        trigger: 'passive',
        duration: '永久',
      },
    ],
    description: '来自光明世界的神圣血脉。',
    price: 2500,
  },
]

/**
 * 狼人血脉
 * 
 * 野性的力量，在满月时力量倍增。
 */
const werewolfBloodlines: BloodlineConfig[] = [
  {
    id: 'werewolf_d',
    name: '狼人血脉',
    category: 'nonhuman',
    tier: 'D',
    stats: { strength: 2, reaction: 1, intelligence: 0, vitality: 1, spirit: 0, immunity: 0 },
    traits: [
      {
        name: '野性本能',
        description: '低HP时（<30%），攻击力+20%',
        trigger: 'low_hp',
        duration: '战斗期间',
      },
    ],
    description: '野性的力量，在满月时力量倍增。',
    price: 500,
  },
  {
    id: 'werewolf_c',
    name: '狼人血脉',
    category: 'nonhuman',
    tier: 'C',
    stats: { strength: 3, reaction: 2, intelligence: 0, vitality: 2, spirit: 0, immunity: 1 },
    traits: [
      {
        name: '狼人变身',
        description: '低HP时（<30%），全属性+2，攻击力+30%',
        trigger: 'low_hp',
        duration: '战斗期间',
      },
    ],
    description: '野性的力量，在满月时力量倍增。',
    price: 2000,
  },
]

/**
 * 所有血统列表
 * 
 * 扩展新血统时，将血统对象添加到对应分类的数组中
 */
export const bloodlines: BloodlineConfig[] = [
  ...liangyiBloodlines,
  ...vampireBloodlines,
  ...angelBloodlines,
  ...werewolfBloodlines,
]

// ==================== 辅助函数 ====================

/**
 * 根据ID获取血统
 */
export function getBloodlineById(id: string): BloodlineConfig | undefined {
  return bloodlines.find(b => b.id === id)
}

/**
 * 根据分类获取血统列表
 */
export function getBloodlinesByCategory(category: BloodlineCategory): BloodlineConfig[] {
  return bloodlines.filter(b => b.category === category)
}

/**
 * 根据等级获取血统列表
 */
export function getBloodlinesByTier(tier: string): BloodlineConfig[] {
  return bloodlines.filter(b => b.tier === tier)
}

/**
 * 获取血统等级配置
 */
export function getBloodlineTierConfig(tier: string) {
  return BLOODLINE_TIER_CONFIG[tier] || BLOODLINE_TIER_CONFIG['D']
}
