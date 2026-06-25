/**
 * 技能系统配置
 * 
 * ==================== 技能概述 ====================
 * 技能 = 属性 + 技能等级
 * - 属性：影响检定骰池大小
 * - 技能等级：影响附加成功和检定结果
 * 
 * ==================== 技能分类 ====================
 * 物理技能：依赖肌肉强度/神经反应
 * 精神技能：依赖智力/精神力
 * 社交技能：依赖魅力/意志
 * 
 * ==================== 如何添加新技能 ====================
 * 1. 在此文件的 skills 数组中添加新技能
 * 2. 确保 id 唯一
 * 3. 设置 category（分类）
 * 4. 设置 relatedAttr（关联属性）
 * 5. 设置 description（描述）
 */

/**
 * 技能分类
 */
export type SkillCategory = 'physical' | 'mental' | 'social'

/**
 * 技能配置
 */
export interface SkillConfig {
  id: string                    // 唯一ID
  name: string                  // 技能名称
  category: SkillCategory       // 技能分类
  relatedAttr: string           // 关联属性（用于检定）
  description: string           // 技能描述
  icon: string                  // 图标
}

/**
 * 技能等级配置
 * 每级提供的附加成功
 */
export const SKILL_LEVEL_BONUS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 1,   // 3级+1
  4: 1,
  5: 1,
  6: 2,   // 6级+2
  7: 2,
  8: 2,
  9: 3,   // 9级+3
  10: 3,
  11: 3,
  12: 4,  // 12级+4
}

/**
 * 技能升级所需XP
 */
export const SKILL_UPGRADE_COST: Record<number, number> = {
  0: 100,
  1: 150,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
  6: 700,
  7: 900,
  8: 1100,
  9: 1400,
  10: 1700,
  11: 2000,
  12: 2500,
}

// ==================== 技能数据 ====================

/**
 * 所有技能列表
 * 
 * 扩展新技能时，将技能对象添加到此数组
 */
export const skills: SkillConfig[] = [
  // ==================== 物理技能 ====================
  {
    id: 'melee',
    name: '肉搏',
    category: 'physical',
    relatedAttr: 'strength',
    description: '使用拳头、腿法等近身格斗技巧',
    icon: '👊',
  },
  {
    id: 'white_blade',
    name: '白刃',
    category: 'physical',
    relatedAttr: 'reaction',
    description: '使用刀剑等近战武器进行战斗',
    icon: '⚔️',
  },
  {
    id: 'firearm',
    name: '枪械',
    category: 'physical',
    relatedAttr: 'reaction',
    description: '使用手枪、步枪等远程武器',
    icon: '🔫',
  },
  {
    id: 'archery',
    name: '弓术',
    category: 'physical',
    relatedAttr: 'reaction',
    description: '使用弓箭进行远程攻击',
    icon: '🏹',
  },
  {
    id: 'dodge',
    name: '闪避',
    category: 'physical',
    relatedAttr: 'reaction',
    description: '躲避敌人攻击的技巧',
    icon: '💨',
  },
  {
    id: 'survival',
    name: '求生',
    category: 'physical',
    relatedAttr: 'vitality',
    description: '在野外或危险环境中生存的能力',
    icon: '🏕️',
  },

  // ==================== 精神技能 ====================
  {
    id: 'knowledge',
    name: '学识',
    category: 'mental',
    relatedAttr: 'intelligence',
    description: '知识储备和学习能力',
    icon: '📚',
  },
  {
    id: 'investigation',
    name: '调查',
    category: 'mental',
    relatedAttr: 'intelligence',
    description: '搜集信息和分析线索的能力',
    icon: '🔍',
  },
  {
    id: 'mysticism',
    name: '神秘学',
    category: 'mental',
    relatedAttr: 'spirit',
    description: '超自然知识和神秘力量',
    icon: '🔮',
  },
  {
    id: 'meditation',
    name: '冥想',
    category: 'mental',
    relatedAttr: 'spirit',
    description: '精神集中和内心平静的修炼',
    icon: '🧘',
  },
  {
    id: 'willpower',
    name: '意志',
    category: 'mental',
    relatedAttr: 'spirit',
    description: '抵抗精神干扰和诱惑的能力',
    icon: '💪',
  },

  // ==================== 社交技能 ====================
  {
    id: 'persuasion',
    name: '说服',
    category: 'social',
    relatedAttr: 'spirit',
    description: '通过言语影响他人的能力',
    icon: '🗣️',
  },
  {
    id: 'intimidation',
    name: '威吓',
    category: 'social',
    relatedAttr: 'strength',
    description: '通过恐吓让对方屈服',
    icon: '😠',
  },
  {
    id: 'stealth',
    name: '潜行',
    category: 'social',
    relatedAttr: 'reaction',
    description: '不被发现地移动和隐藏',
    icon: '🥷',
  },
  {
    id: 'first_aid',
    name: '急救',
    category: 'social',
    relatedAttr: 'intelligence',
    description: '紧急医疗救助技能',
    icon: '🏥',
  },
]

// ==================== 辅助函数 ====================

/**
 * 根据ID获取技能
 */
export function getSkillById(id: string): SkillConfig | undefined {
  return skills.find(s => s.id === id)
}

/**
 * 根据分类获取技能列表
 */
export function getSkillsByCategory(category: SkillCategory): SkillConfig[] {
  return skills.filter(s => s.category === category)
}

/**
 * 获取技能等级附加成功
 */
export function getSkillLevelBonus(level: number): number {
  return SKILL_LEVEL_BONUS[level] || 0
}

/**
 * 获取技能升级所需XP
 */
export function getSkillUpgradeCost(currentLevel: number): number {
  return SKILL_UPGRADE_COST[currentLevel] || 9999
}
