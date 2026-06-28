/**
 * 角色创建系统 - 职业、缺陷、天赋定义
 */

import type { AttributeId } from '../config/combat'

// ==================== 类型定义 ====================

export interface Profession {
  id: string
  name: string
  reference: string      // 参考角色
  description: string
  icon: string
  position: string       // 定位
  startingSkill: string  // 初始技能ID（角色创建时获得Lv.1）
  /** 主属性 */
  mainAttribute: AttributeId
  /** 副属性 */
  secondaryAttribute: AttributeId
  weaponPassive: {
    name: string         // 武器被动名称
    description: string  // 武器被动描述
  }
}

export interface Flaw {
  id: string
  name: string
  points: number         // 提供的天赋点数
  description: string
  effects: {
    type: string
    value: number
  }[]
}

export interface Talent {
  id: string
  name: string
  cost: number           // 所需天赋点数
  description: string
  effects: {
    type: string
    value: number
  }[]
}

// ==================== 职业定义（13个） ====================

export const PROFESSIONS: Profession[] = [
  {
    id: 'captain',
    name: '队长',
    reference: '郑吒',
    description: '中洲队领袖，近战爆发型输出。极度重视队友，在生死边缘不断突破。',
    icon: '👊',
    position: '近战输出',
    startingSkill: 'persuasion',
    mainAttribute: 'strength',
    secondaryAttribute: 'endurance',
    weaponPassive: { name: '刀剑精通', description: '刀剑伤害+15%' },
  },
  {
    id: 'smoker',
    name: '烟鬼',
    reference: '张杰',
    description: '中洲队引导者，精神力控制者。性格豪爽不羁，为团队牺牲自我。',
    icon: '🚬',
    position: '团队辅助',
    startingSkill: 'empathy',
    mainAttribute: 'composure',
    secondaryAttribute: 'strength',
    weaponPassive: { name: '枪械精通', description: '枪械伤害+15%' },
  },
  {
    id: 'colonel',
    name: '大校',
    reference: '楚轩',
    description: '中洲队首席智者，智商220。以团队存活、利益最大化为目标。',
    icon: '🎖️',
    position: '科技输出',
    startingSkill: 'lore',
    mainAttribute: 'intelligence',
    secondaryAttribute: 'composure',
    weaponPassive: { name: '科技武器', description: '科技伤害+15%' },
  },
  {
    id: 'prophet',
    name: '先知',
    reference: '萧宏律',
    description: '中洲队第二智者，凡人智慧的顶点。能洞察即将死亡之人。',
    icon: '🔮',
    position: '暴击控制',
    startingSkill: 'occult',
    mainAttribute: 'perception',
    secondaryAttribute: 'intelligence',
    weaponPassive: { name: '魔幻精通', description: '魔法伤害+10%' },
  },
  {
    id: 'assassin',
    name: '刺客',
    reference: '赵樱空',
    description: '亚洲刺客世家成员，首个解开基因锁的人。拥有正副两种人格。',
    icon: '🗡️',
    position: '刺客爆发',
    startingSkill: 'athletics',
    mainAttribute: 'agility',
    secondaryAttribute: 'strength',
    weaponPassive: { name: '匕首精通', description: '匕首伤害+15%' },
  },
  {
    id: 'writer',
    name: '作家',
    reference: '詹岚',
    description: '中洲队精神力控制者，网络小说作家。为团队创造涅槃重生的条件。',
    icon: '📝',
    position: '精神控制',
    startingSkill: 'empathy',
    mainAttribute: 'resolve',
    secondaryAttribute: 'intelligence',
    weaponPassive: { name: '魔幻精通', description: '魔法伤害+10%' },
  },
  {
    id: 'killer',
    name: '杀手',
    reference: '零点',
    description: '国际顶级杀手，中洲队狙击手。惜字如金，但极可靠。',
    icon: '🎯',
    position: '狙击远程',
    startingSkill: 'investigation',
    mainAttribute: 'perception',
    secondaryAttribute: 'agility',
    weaponPassive: { name: '步枪精通', description: '步枪伤害+15%' },
  },
  {
    id: 'bow',
    name: '长弓',
    reference: '张恒',
    description: '从小有射箭天赋，因懦弱曾抛弃爱人。进入轮回世界后不断赎罪。',
    icon: '🏹',
    position: '弓箭输出',
    startingSkill: 'athletics',
    mainAttribute: 'agility',
    secondaryAttribute: 'perception',
    weaponPassive: { name: '弓弩精通', description: '弓弩伤害+15%' },
  },
  {
    id: 'medic',
    name: '军医',
    reference: '程啸',
    description: '特种部队军医，家传武术与炼蛊技术。天生拥有内力者。',
    icon: '🏥',
    position: '治疗续航',
    startingSkill: 'medicine',
    mainAttribute: 'intelligence',
    secondaryAttribute: 'endurance',
    weaponPassive: { name: '魔幻精通', description: '魔法伤害+10%' },
  },
  {
    id: 'cannon',
    name: '重炮',
    reference: '霸王',
    description: '国际顶级雇佣兵，因战友全部阵亡而心灰意冷。',
    icon: '💥',
    position: '火力压制',
    startingSkill: 'athletics',
    mainAttribute: 'strength',
    secondaryAttribute: 'endurance',
    weaponPassive: { name: '炮精通', description: '炮伤害+20%' },
  },
  {
    id: 'wolf',
    name: '贪狼',
    reference: '王侠',
    description: '特种部队成员，代号"贪狼"。擅长侦查、反侦查、地雷与陷阱。',
    icon: '🐺',
    position: '侦查陷阱',
    startingSkill: 'investigation',
    mainAttribute: 'perception',
    secondaryAttribute: 'intelligence',
    weaponPassive: { name: '科技武器', description: '科技伤害+15%' },
  },
  {
    id: 'archaeologist',
    name: '考古',
    reference: '齐腾一',
    description: '考古学者，精通古代文字。对语言有种天赋，拥有高于常人的计算能力。',
    icon: '📚',
    position: '魔法辅助',
    startingSkill: 'lore',
    mainAttribute: 'intelligence',
    secondaryAttribute: 'resolve',
    weaponPassive: { name: '魔幻精通', description: '魔法伤害+10%' },
  },
  {
    id: 'ranger',
    name: '游侠',
    reference: '铭烟薇',
    description: '复合弓射击亚军之女，与张恒青梅竹马。公司公关部经理。',
    icon: '🐎',
    position: '弓箭穿透',
    startingSkill: 'persuasion',
    mainAttribute: 'agility',
    secondaryAttribute: 'perception',
    weaponPassive: { name: '弓弩精通', description: '弓弩伤害+15%' },
  },
]

// ==================== 缺陷定义（6个） ====================

export const FLAWS: Flaw[] = [
  {
    id: 'old_injury',
    name: '旧伤',
    points: 1,
    description: '你有一处旧伤，生命值上限-10%',
    effects: [{ type: 'maxHpPercent', value: -10 }],
  },
  {
    id: 'coward',
    name: '胆怯',
    points: 1,
    description: '你容易恐惧，闪避率-5%',
    effects: [{ type: 'dodgeRate', value: -5 }],
  },
  {
    id: 'clumsy',
    name: '笨拙',
    points: 1,
    description: '你动作笨拙，暴击率-5%',
    effects: [{ type: 'critRate', value: -5 }],
  },
  {
    id: 'slow_learner',
    name: '学渣',
    points: 1,
    description: '你学习能力差，经验值获取-10%',
    effects: [{ type: 'xpGain', value: -10 }],
  },
  {
    id: 'frail',
    name: '体弱',
    points: 2,
    description: '你体质虚弱，生命值上限-20%',
    effects: [{ type: 'maxHpPercent', value: -20 }],
  },
  {
    id: 'unlucky',
    name: '倒霉',
    points: 1,
    description: '你运气不佳，暴击率-5%',
    effects: [{ type: 'critRate', value: -5 }],
  },
]

// ==================== 天赋定义（8个） ====================

export const TALENTS: Talent[] = [
  {
    id: 'tough',
    name: '坚韧',
    cost: 1,
    description: '你意志坚定，生命值上限+10%',
    effects: [{ type: 'maxHpPercent', value: 10 }],
  },
  {
    id: 'agile',
    name: '敏捷',
    cost: 1,
    description: '你身手敏捷，闪避率+5%',
    effects: [{ type: 'dodgeRate', value: 5 }],
  },
  {
    id: 'sharp',
    name: '精准',
    cost: 1,
    description: '你目光敏锐，暴击率+5%',
    effects: [{ type: 'critRate', value: 5 }],
  },
  {
    id: 'quick_learner',
    name: '学霸',
    cost: 1,
    description: '你学习能力强，经验值获取+10%',
    effects: [{ type: 'xpGain', value: 10 }],
  },
  {
    id: 'regeneration',
    name: '再生',
    cost: 2,
    description: '你恢复力强，每回合回复2%生命值',
    effects: [{ type: 'hpRegen', value: 50 }],
  },
  {
    id: 'first_strike',
    name: '先手',
    cost: 1,
    description: '你反应迅速，先攻+1',
    effects: [{ type: 'initiative', value: 1 }],
  },
  {
    id: 'dual_wield',
    name: '双持',
    cost: 2,
    description: '你擅长双持武器，双持伤害+10%',
    effects: [{ type: 'dualWieldDamage', value: 10 }],
  },
  {
    id: 'dark_vision',
    name: '夜视',
    cost: 1,
    description: '你在黑暗中视物如常，黑暗命中减值-5%',
    effects: [{ type: 'darkHitPenalty', value: -5 }],
  },
]

// ==================== 辅助函数 ====================

export function getProfessionById(id: string): Profession | undefined {
  return PROFESSIONS.find(p => p.id === id)
}

export function getFlawById(id: string): Flaw | undefined {
  return FLAWS.find(f => f.id === id)
}

export function getTalentById(id: string): Talent | undefined {
  return TALENTS.find(t => t.id === id)
}
