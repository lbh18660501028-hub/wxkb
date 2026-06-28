/**
 * 技能系统配置
 *
 * ==================== 技能概述 ====================
 * 技能 = 后天学习的专业能力，仅作用于副本中的骰子检定
 * 技能与战斗系统完全解绑，战斗属性纯由属性+装备驱动
 *
 * 检定公式（基于TRPG核心规则）：
 * - 骰池 DP = 关联属性值 + 技能等级 + 调整值
 * - 每个D10 ≥ 8 计1成功，掷出10额外加投1个
 * - 属性加成：≥6→+1, ≥11→+2, ≥16→+3, ≥21→+4
 * - 技能加成：3级→+1, 6级→+2, 9级→+3, 12级→+4
 * - 总成功数 ≥ DC 即为检定成功
 *
 * ==================== 成长系统 ====================
 * 双途径成长：
 * 1. XP升级：花费经验值提升技能等级
 * 2. 用进成长：副本检定成功时有概率自动提升
 *
 * ==================== 如何添加新技能 ====================
 * 1. 在此文件的 skills 数组中添加新技能
 * 2. 确保 id 唯一
 * 3. 设置 relatedAttr（默认关联属性，用于检定）
 * 4. 设置 altAttrs（备选属性，供副本事件覆盖）
 * 5. 设置 description（描述）
 */

import type { AttributeId } from '../config/combat'

/**
 * 技能配置
 */
export interface SkillConfig {
  id: string                    // 唯一ID
  name: string                  // 技能名称
  relatedAttr: AttributeId      // 默认关联属性（用于检定）
  altAttrs: AttributeId[]       // 备选属性（副本事件可覆盖）
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
 * 所有技能列表（10个，无分类）
 *
 * 扩展新技能时，将技能对象添加到此数组
 */
export const skills: SkillConfig[] = [
  {
    id: 'athletics',
    name: '运动',
    relatedAttr: 'agility',
    altAttrs: ['strength', 'agility', 'endurance', 'resolve'],
    description: '攀爬、跳跃、奔跑、游泳等身体运动能力',
    icon: '🏃',
  },
  {
    id: 'investigation',
    name: '调查',
    relatedAttr: 'perception',
    altAttrs: ['perception', 'intelligence', 'composure'],
    description: '搜集信息、分析线索、搜索发现隐藏物品',
    icon: '🔍',
  },
  {
    id: 'lockpicking',
    name: '开锁',
    relatedAttr: 'agility',
    altAttrs: ['agility', 'intelligence', 'strength', 'composure'],
    description: '开锁、解除陷阱、操作机械装置',
    icon: '🗝️',
  },
  {
    id: 'lore',
    name: '学识',
    relatedAttr: 'intelligence',
    altAttrs: ['intelligence', 'perception'],
    description: '判断道具、物品的来历和用途，知识储备',
    icon: '📚',
  },
  {
    id: 'hacking',
    name: '黑客',
    relatedAttr: 'intelligence',
    altAttrs: ['intelligence', 'composure', 'agility', 'manipulation'],
    description: '操作电子设备、电脑、终端，破解安防系统',
    icon: '💻',
  },
  {
    id: 'medicine',
    name: '医学',
    relatedAttr: 'intelligence',
    altAttrs: ['intelligence', 'perception', 'agility', 'composure'],
    description: '医疗道具使用、生物状态判断、急救处理',
    icon: '🏥',
  },
  {
    id: 'occult',
    name: '神秘',
    relatedAttr: 'resolve',
    altAttrs: ['intelligence', 'perception', 'resolve', 'presence'],
    description: '超自然现象感知、神秘力量辨识',
    icon: '🔮',
  },
  {
    id: 'animalHandling',
    name: '动物沟通',
    relatedAttr: 'perception',
    altAttrs: ['perception', 'presence', 'manipulation', 'composure'],
    description: '与动物沟通、驯服、安抚动物',
    icon: '🐾',
  },
  {
    id: 'empathy',
    name: '感受',
    relatedAttr: 'perception',
    altAttrs: ['perception', 'composure', 'resolve'],
    description: '判断NPC信息、意图、隐藏状态',
    icon: '🧠',
  },
  {
    id: 'persuasion',
    name: '交际',
    relatedAttr: 'manipulation',
    altAttrs: ['manipulation', 'presence', 'composure', 'strength', 'resolve'],
    description: '说服、交易、求助等对NPC操作的成功率',
    icon: '🗣️',
  },
]

/** 所有新技能ID集合（用于存档迁移判断） */
export const NEW_SKILL_IDS = skills.map(s => s.id)

/**
 * 旧技能ID列表（用于存档迁移清理）
 * 包含旧版技能系统（melee/firearm/dodge等）和上一版技能ID（knowledge/mysticism/animal_handling/socializing）
 */
export const LEGACY_SKILL_IDS = [
  'melee', 'white_blade', 'firearm', 'archery', 'dodge', 'survival',
  'meditation', 'willpower', 'persuasion', 'intimidation', 'stealth', 'first_aid',
  // 上一版 ID（需迁移到新 ID）
  'knowledge', 'mysticism', 'animal_handling', 'socializing',
]

/**
 * 旧技能ID → 新技能ID 映射表（用于存档迁移）
 */
export const SKILL_ID_MIGRATION: Record<string, string> = {
  knowledge: 'lore',
  mysticism: 'occult',
  animal_handling: 'animalHandling',
  socializing: 'persuasion',
  dodge: 'athletics',
}

// ==================== 辅助函数 ====================

/**
 * 根据ID获取技能
 */
export function getSkillById(id: string): SkillConfig | undefined {
  return skills.find(s => s.id === id)
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
