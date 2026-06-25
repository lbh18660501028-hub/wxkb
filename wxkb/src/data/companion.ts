/**
 * 队友招募系统配置
 */

export const COMPANION_CONFIG = {
  MAX_COMPANIONS: 3,

  // 招募费用（递增）
  RECRUIT_COSTS: [500, 1500, 3000],

  // 队友每点属性提供的自动攻击伤害
  ATTACK_PER_POINT: 2,

  // 队友基础HP倍率（与玩家相同公式但无体积修正）
  HP_VITALITY_MULTIPLIER: 10,
  BASE_HP: 100,

  // 队友自动攻击使用的职业攻击技能等级（固定值，队友不升级技能）
  COMPANION_SKILL_LEVEL: 1,
}

export function getRecruitCost(companionCount: number): number {
  if (companionCount >= COMPANION_CONFIG.RECRUIT_COSTS.length) {
    return Infinity
  }
  return COMPANION_CONFIG.RECRUIT_COSTS[companionCount]
}
