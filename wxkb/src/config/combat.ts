/**
 * 战斗系统配置
 * 
 * ==================== 设计原则 ====================
 * 所有战斗相关常量都集中在此文件管理
 * 修改数值只需在此文件中修改，无需搜索整个代码库
 * 
 * ==================== 如何扩展 ====================
 * 1. 添加新的配置项到对应的部分
 * 2. 在代码中使用 CONFIG.xxx 引用配置值
 * 3. 避免在业务代码中直接写数字
 */

// ==================== 战斗公式配置 ====================

/**
 * 战斗公式常量
 */
export const COMBAT_CONFIG = {
  // 基础伤害
  BASE_DAMAGE: 10,              // 基础伤害值
  SKILL_DAMAGE_MULTIPLIER: 3,   // 技能等级伤害倍率
  DIFF_DAMAGE_MULTIPLIER: 2,    // 成功数差值伤害倍率
  
  // 暴击
  CRIT_MULTIPLIER: 1.5,         // 暴击伤害倍率
  CRIT_SUCCESS_RATIO: 2,        // 暴击成功数倍率（成功数≥敌人防御×此值触发暴击）
  
  // 闪避
  DODGE_BONUS_PER_POINT: 0.1,   // 每点闪避率提供的闪避加成（小数）
  
  // 护甲
  MIN_DAMAGE: 1,                // 最小伤害
  
  // 基因锁持续时间
  GENE_LOCK_BASE_ROUNDS: 5,     // 基因锁基础持续回合数
}

// ==================== 伤害类型配置 ====================

/**
 * 伤害类型
 * - technology：科技本质伤害，受科技本质防御减免
 * - fantasy：魔幻本质伤害，受魔幻本质防御减免
 * - abnormal：特异本质伤害，受特异本质防御减免
 * - mixed：混合本质伤害，三种本质各承担三分之一
 *
 * physical/magical 仅用于兼容旧副本与存档，结算时会自动映射为 technology/fantasy。
 */
export type EssenceDamageType = 'technology' | 'fantasy' | 'abnormal'
export type LegacyDamageType = 'physical' | 'magical'
export type DamageType = EssenceDamageType | LegacyDamageType | 'mixed'

/**
 * 进阶战斗属性
 * 小数属性按概率/比例记录：0.1 = 10%，1.5 = 150%暴击伤害。
 */
export interface AdvancedCombatStats {
  technologyAttack?: number // 科技本质攻击：科技本质伤害的基础来源
  fantasyAttack?: number    // 魔幻本质攻击：魔幻本质伤害的基础来源
  abnormalAttack?: number   // 特异本质攻击：特异本质伤害的基础来源
  technologyDefense?: number // 科技本质防御：抵消科技本质伤害
  fantasyDefense?: number    // 魔幻本质防御：抵消魔幻本质伤害
  abnormalDefense?: number   // 特异本质防御：抵消特异本质伤害
  speed: number            // 速度：决定自动战斗中的先后手
  critRate: number        // 暴击：触发暴击的概率
  critDamage: number      // 暴击伤害：暴击时的伤害倍率
  critResist: number      // 抗暴：降低被暴击概率
  hit: number             // 命中：攻击命中的基础概率
  evasion: number         // 闪避：降低被命中的概率
  counterRate: number     // 反击：被攻击后追加反击的概率
  reflectRate: number     // 反伤：把承受伤害的一部分反弹给攻击者
  comboRate: number       // 连击：命中后追加一次半额伤害的概率
  shield: number          // 护盾：每回合优先抵扣的临时伤害
  shieldRegen: number     // 回盾：每回合额外恢复的护盾量
  stunRate: number        // 眩晕：命中后使目标眩晕的概率
  stunResist: number      // 抗眩：降低被眩晕概率
  lifeSteal: number       // 吸血：按造成伤害回复生命的比例
  damageReduction: number // 减伤：最终伤害百分比减免
  penetration: number     // 穿透：无视固定防御
  armorBreak: number      // 破甲：按比例削弱目标防御
  blockRate: number       // 格挡：触发后降低本次受到的伤害
  toughness: number       // 韧性：降低暴击伤害和最终伤害
  trueDamage: number      // 真实伤害：普通减伤后追加的伤害
  trueDefense: number     // 真实防御：抵消真实伤害
  // Legacy aliases (used by dice.ts combat engine)
  physicalAttack: number
  magicAttack: number
  physicalDefense: number
  magicDefense: number
}

export const EMPTY_ADVANCED_STATS: AdvancedCombatStats = {
  technologyAttack: 0,
  fantasyAttack: 0,
  abnormalAttack: 0,
  technologyDefense: 0,
  fantasyDefense: 0,
  abnormalDefense: 0,
  speed: 0,
  critRate: 0,
  critDamage: 1.5,
  critResist: 0,
  hit: 0.75,
  evasion: 0,
  counterRate: 0,
  reflectRate: 0,
  comboRate: 0,
  shield: 0,
  shieldRegen: 0,
  stunRate: 0,
  stunResist: 0,
  lifeSteal: 0,
  damageReduction: 0,
  penetration: 0,
  armorBreak: 0,
  blockRate: 0,
  toughness: 0,
  trueDamage: 0,
  trueDefense: 0,
  physicalAttack: 0,
  magicAttack: 0,
  physicalDefense: 0,
  magicDefense: 0,
}

/**
 * 伤害类型配置
 */
export const DAMAGE_TYPE_CONFIG = {
  // 混合伤害的分配比例
  MIXED_TECHNOLOGY_RATIO: 1 / 3,
  MIXED_FANTASY_RATIO: 1 / 3,
  MIXED_ABNORMAL_RATIO: 1 / 3,
  
  // 伤害类型名称（用于显示）
  NAMES: {
    technology: '科技本质',
    fantasy: '魔幻本质',
    abnormal: '特异本质',
    mixed: '混合',
    physical: '科技本质',
    magical: '魔幻本质',
  },
}

// ==================== MP/魔法配置 ====================

/**
 * MP公式配置
 */
export const MP_CONFIG = {
  BASE_MP: 0,                   // 基础MP
  INTELLIGENCE_MP_MULTIPLIER: 10, // 智力MP倍率（MP上限=INT×10）
  
  // 魔法伤害公式
  MAGIC_DAMAGE_BASE: 0,         // 魔法伤害基础值
  RESOLVE_DAMAGE_MULTIPLIER: 2,  // 决心魔法伤害倍率
}

// ==================== 体积配置 ====================

/**
 * 体积属性配置
 * 体积影响：HP、速度、物理伤害、闪避、防御、武器要求
 */
export const VOLUME_CONFIG = {
  // 体积等级
  TINY: 0,      // 微型：-20%HP，+10%速度，-10%伤害
  SMALL: 1,     // 小型：-10%HP，+5%速度，-5%伤害
  MEDIUM: 2,    // 中型：无修正
  LARGE: 3,     // 大型：+10%HP，-5%速度，+10%伤害，+5%防御
  HUGE: 4,      // 巨型：+20%HP，-10%速度，+20%伤害，+10%防御
  
  // 体积修正值
  MODIFIERS: {
    0: { hp: -0.2, speed: 0.1, damage: -0.1, dodge: 0.1, armor: 0 },    // 微型
    1: { hp: -0.1, speed: 0.05, damage: -0.05, dodge: 0.05, armor: 0 },  // 小型
    2: { hp: 0, speed: 0, damage: 0, dodge: 0, armor: 0 },                // 中型
    3: { hp: 0.1, speed: -0.05, damage: 0.1, dodge: -0.05, armor: 0.05 }, // 大型
    4: { hp: 0.2, speed: -0.1, damage: 0.2, dodge: -0.1, armor: 0.1 },   // 巨型
  },
}

// ==================== 免疫配置 ====================

/**
 * 沉着属性配置
 * 沉着影响：状态抗性、异常状态持续时间减免
 */
export const COMPOSURE_CONFIG = {
  // 每点沉着提供的状态抗性（百分比）
  STATUS_RESIST_PER_POINT: 0.01,
  
  // 最大状态抗性
  MAX_STATUS_RESIST: 0.8,
  
  // 沉着等级效果
  TIERS: [
    { threshold: 5, name: '弱', resistBonus: 0 },
    { threshold: 10, name: '中', resistBonus: 0.1 },
    { threshold: 15, name: '强', resistBonus: 0.2 },
    { threshold: 20, name: '极', resistBonus: 0.3 },
    { threshold: Infinity, name: '神', resistBonus: 0.4 },
  ],
}

// ==================== HP/意志力公式 ====================

/**
 * 生命值公式配置
 */
export const HP_CONFIG = {
  BASE_HP: 100,                 // 基础HP
  ENDURANCE_HP_MULTIPLIER: 10,  // 耐力HP倍率（HP = BASE + END × 10）
  GENE_LOCK_HP_BONUS: 10,       // 基因锁每阶HP加成
  VOLUME_HP_BONUS: 0.1,         // 体积HP加成系数
}

/**
 * 意志力公式配置
 */
export const WILLPOWER_CONFIG = {
  // 意志力 = 决心 + 沉着
}

// ==================== 经验值配置 ====================

/**
 * 经验值配置
 */
export const XP_CONFIG = {
  LEVEL_UP_BASE: 100,           // 升级基础XP
  LEVEL_UP_MULTIPLIER: 1.15,    // 升级XP倍率（每级×1.15）
  SKILL_UPGRADE_BASE: 100,      // 技能升级基础XP
}

// ==================== 挂机配置 ====================

/**
 * 挂机奖励配置
 */
export const IDLE_CONFIG = {
  MAX_OFFLINE_HOURS: 5,         // 最大离线挂机时间（小时）
  ONLINE_TICK_SECONDS: 1,       // 在线挂机间隔（秒）
  STAT_BONUS_PER_POINT: 0.01,   // 每点属性提供的挂机奖励加成（1%）
}

// ==================== 属性定义与分组 ====================

/** 九属性 ID 类型 */
export type AttributeId =
  | 'strength' | 'agility' | 'endurance'
  | 'intelligence' | 'perception' | 'resolve'
  | 'presence' | 'manipulation' | 'composure'

/** 属性分组 */
export const ATTRIBUTE_GROUPS: Record<string, AttributeId[]> = {
  physical: ['strength', 'agility', 'endurance'],
  mental: ['intelligence', 'perception', 'resolve'],
  social: ['presence', 'manipulation', 'composure'],
}

/** 属性中文名 */
export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  strength: '力量',
  agility: '敏捷',
  endurance: '耐力',
  intelligence: '智力',
  perception: '感知',
  resolve: '决心',
  presence: '风度',
  manipulation: '操控',
  composure: '沉着',
}

/** 属性详细定义（图标、颜色、分组、描述） */
export const ATTRIBUTE_DEFS: Record<AttributeId, {
  icon: string
  color: string
  group: string
  label: string
  desc: string
}> = {
  strength:     { icon: '💪', color: '#ff6b35', group: 'physical', label: '力量', desc: '影响科技本质攻击力。' },
  agility:      { icon: '⚡', color: '#ffb000', group: 'physical', label: '敏捷', desc: '影响速度、命中与闪避。' },
  endurance:    { icon: '❤', color: '#ff0033', group: 'physical', label: '耐力', desc: '决定生命上限与续航。' },
  intelligence: { icon: '🧠', color: '#b026ff', group: 'mental', label: '智力', desc: '影响MP上限与法术成长。' },
  perception:   { icon: '👁', color: '#00c8ff', group: 'mental', label: '感知', desc: '影响暴击率与察觉能力。' },
  resolve:      { icon: '◈', color: '#00f0ff', group: 'mental', label: '决心', desc: '影响魔幻伤害与意志力。' },
  presence:     { icon: '✦', color: '#ffd700', group: 'social', label: '风度', desc: '影响社交压迫与特异伤害。' },
  manipulation: { icon: '🎭', color: '#ff3366', group: 'social', label: '操控', desc: '影响交际与特异伤害。' },
  composure:    { icon: '🛡', color: '#39ff14', group: 'social', label: '沉着', desc: '影响抗性、减伤与意志力。' },
}

// ==================== 属性配置 ====================

/**
 * 属性系统配置
 */
export const ATTRIBUTE_CONFIG = {
  MAX_BASE_ATTRIBUTE: 5,        // 无血统时属性上限
  ATTRIBUTE_UPGRADE_BASE_COST: 250, // 属性升级基础费用
  
  // 属性升级费用阶梯
  UPGRADE_COST_TIERS: [
    { threshold: 6, cost: 250 },
    { threshold: 11, cost: 500 },
    { threshold: 16, cost: 750 },
    { threshold: 21, cost: 1000 },
    { threshold: Infinity, cost: 1500 },
  ],
  
  // 衍生属性公式
  DERIVED: {
    // HP = BASE_HP + endurance × ENDURANCE_HP_MULTIPLIER
    ENDURANCE_HP_MULTIPLIER: 10,
    // MP = intelligence × INTELLIGENCE_MP_MULTIPLIER
    INTELLIGENCE_MP_MULTIPLIER: 10,
    // willpower = resolve + composure
    // speed = agility + composure (+ volume modifier)
    // defense = agility
    // mentalDefense = resolve + composure
    // senseRange = perception × 10
    // statusResistance = endurance + composure
    // fearResistance = resolve + composure
    // socialPressure = presence + manipulation
  },
  
  // 战斗属性映射
  COMBAT_MAPPING: {
    // technologyAttack = strength
    // fantasyAttack = resolve × 2
    // abnormalAttack = floor((resolve + presence) / 2)
    // technologyDefense = endurance
    // fantasyDefense = resolve
    // abnormalDefense = composure
    // speed = agility + composure
    // evasion = agility × 0.01
    // critRate = perception × 0.01
    // hit = 0.75 + perception × 0.005
    // damageReduction = endurance × 0.005
    // critResist = composure × 0.01
    // stunResist = composure × 0.01
  },
}

// ==================== 装备配置 ====================

/**
 * 装备系统配置
 */
export const EQUIPMENT_CONFIG = {
  MAX_SLOTS: 6,                 // 最大装备槽位
  
  // 装备等级价格
  TIER_PRICES: {
    D: 100,
    C: 500,
    B: 2000,
    A: 10000,
    S: 50000,
  },
}

// ==================== 基因锁配置 ====================

/**
 * 基因锁配置
 */
export const GENE_LOCK_CONFIG = {
  // 被动效果（每阶全属性加成）
  PASSIVE_BONUS_PER_TIER: 1,
  
  // 主动效果配置
  ACTIVE_EFFECTS: {
    1: { allStats: 2, crit: 0.1, dodge: 0.1, costPerTurn: 1 },
    2: { allStats: 4, crit: 0.2, dodge: 0.2, costPerTurn: 2 },
    3: { allStats: 6, crit: 0.3, dodge: 0.3, costPerTurn: 3 },
    4: { allStats: 8, crit: 0.4, dodge: 0.4, costPerTurn: 4 },
    5: { allStats: 10, crit: 0.5, dodge: 0.5, costPerTurn: 5 },
  },
  
  // 解锁概率
  UNLOCK_BASE_CHANCE: 0.01,     // 1% 基础概率
}

// ==================== 血统配置 ====================

/**
 * 血统系统配置
 */
export const BLOODLINE_CONFIG = {
  // 血统等级配置
  TIERS: {
    'D':  { attributeCap: 6,  giftPoints: 1 },
    'DD': { attributeCap: 8,  giftPoints: 2 },
    'C':  { attributeCap: 11, giftPoints: 3 },
    'CC': { attributeCap: 13, giftPoints: 6 },
    'B':  { attributeCap: 16, giftPoints: 9 },
    'BB': { attributeCap: 18, giftPoints: 18 },
    'A':  { attributeCap: 21, giftPoints: 27 },
    'AA': { attributeCap: 26, giftPoints: 54 },
    'S':  { attributeCap: 36, giftPoints: 100 },
  },
}

// ==================== 技能配置 ====================

/**
 * 技能系统配置
 */
export const SKILL_CONFIG = {
  MAX_LEVEL: 12,                // 最大技能等级
  
  // 技能等级附加成功
  LEVEL_BONUS: {
    3: 1,   // 3级+1
    6: 2,   // 6级+2
    9: 3,   // 9级+3
    12: 4,  // 12级+4
  },
  
  // 技能升级费用
  UPGRADE_COST: {
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
  },
}
