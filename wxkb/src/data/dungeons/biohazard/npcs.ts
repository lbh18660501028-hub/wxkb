/**
 * 《生化危机：蜂巢》— NPC 模板配置
 *
 * ==================== NPC 生成规则 ====================
 * 副本内有三类 NPC：
 *
 * A. 新人轮回者 NPC（主神投放，开局随机生成 3 名）
 * - calm_analyst:      冷静分析型（黑客/医疗/资料分析）
 * - reckless_charger:  冲动莽撞型（近战/破门/抗伤）
 * - selfish_survivor:  自私求生型（可能偷道具/发现隐藏通道/可能背叛）
 *
 * B. 引导型 NPC（固定生成 1 名）
 * - guide:             老关，资深轮回者，担任新手引导
 *
 * C. 电影剧情 NPC（固定生成，非轮回者，承担剧情功能）
 * - movie_rain:        Rain Ocampo 小雨 — 火力支援、感染支线核心
 * - movie_alice:       Alice 艾莉丝 — 核心剧情人物
 * - movie_kaplan:      Kaplan 克普兰 — 黑客/门禁/激光支援
 * - movie_matt:        Matt Addison 麦特 — 公司黑幕支线关键人物
 * - movie_spence:      Spence Parks 史班逊 — 隐藏背叛线
 * - movie_one:         One 一 — 佣兵队长，激光走廊死亡演示
 * - movie_jd:          J.D. Salinas 杰迪 — 前期火力支援
 *
 * ==================== 如何新增 NPC 模板 ====================
 * 1. 随机生成型在 NPC_TEMPLATES 中添加新模板
 * 2. 引导型模板放在 GUIDE_NPC_TEMPLATE 中（固定生成）
 * 3. 电影 NPC 模板放在 MOVIE_NPC_TEMPLATES 中（固定生成）
 * 4. 引擎会在副本初始化时根据模板生成 NPC
 */

import type { NpcTemplate } from '../../../types/dungeon-v2'

// ==================== 随机生成的新人轮回者模板 ====================

export const NPC_TEMPLATES: NpcTemplate[] = [
  // ==================== 冷静分析型 ====================
  {
    role: 'calm_analyst',
    possible_names: ['林策', '沈鸢', '许理', '周然'],
    possible_identities: [
      '程序员，擅长破解电子门禁',
      '医学生，熟悉病毒样本处理',
      '研究助理，能从碎片信息中拼凑出完整图景',
    ],
    possible_skills: ['黑客', '医疗', '资料分析'],
    possible_hidden_traits: [
      '实际上见过 T 病毒文件，隐瞒了部分信息',
      '曾经是保护伞公司的内部人员',
      '拥有隐藏的急救技能，但只在信任足够时使用',
    ],
    base_hp: 60,
  },

  // ==================== 冲动莽撞型 ====================
  {
    role: 'reckless_charger',
    possible_names: ['赵猛', '韩东', '罗刚', '陈彪'],
    possible_identities: [
      '退伍兵，擅长近战格斗和破门',
      '健身教练，力大无穷，能扛住伤害',
      '保安出身，懂得使用安保设备',
    ],
    possible_skills: ['近战', '破门', '抗伤'],
    possible_hidden_traits: [
      '有严重的幽闭恐惧症，在狭窄空间会失控',
      '失去过一整个小队，对保护他人有执念',
      '感染了早期阶段的病毒，但还在潜伏期',
    ],
    base_hp: 90,
  },

  // ==================== 自私求生型 ====================
  {
    role: 'selfish_survivor',
    possible_names: ['唐小曼', '孟辉', '陆启', '孙雅'],
    possible_identities: [
      '白领，精于算计和发现隐藏路线',
      '主管，习惯独来独往',
      '网吧青年，曾靠牺牲同伴活下来过',
    ],
    possible_skills: ['观察细节', '藏匿', '开锁'],
    possible_hidden_traits: [
      '背包里藏有一支隐藏血清，信任高时才会交出',
      '实际上知道一条隐藏通道，但不会轻易透露',
      '可能在关键时刻偷走玩家的道具',
    ],
    base_hp: 50,
  },
]

// ==================== 引导型 NPC 模板（老关） ====================
// 老关是资深轮回者，比新人有经验，担任引导角色。
// 他会一路带领玩家直到通关或死亡，永不离开。

export const GUIDE_NPC_TEMPLATE: NpcTemplate = {
  role: 'guide',
  possible_names: ['老关'],
  possible_identities: ['资深轮回者，经历过多次副本任务'],
  possible_skills: ['全能战斗'],
  possible_hidden_traits: ['真实身份和目的不明'],
  base_hp: 150,
  is_guide: true,
  combat_power: 80,
}

// ==================== 电影剧情 NPC 模板 ====================
// 电影 NPC 是固定生成的剧情角色，不属于随机生成的新人轮回者。
// 它们不是轮回者（is_reincarnator = false），承担特定剧情功能。

export const MOVIE_NPC_TEMPLATES: NpcTemplate[] = [
  // ---------- Rain Ocampo 小雨 ----------
  {
    role: 'movie_rain',
    possible_names: ['小雨'],
    possible_identities: ['保护伞公司特安部队成员，擅长火力压制'],
    possible_skills: ['枪械', '战斗', '抗感染'],
    possible_hidden_traits: ['感染 T 病毒但仍在抵抗，信任足够时会交出隐藏的弹药'],
    base_hp: 90,
    is_movie_npc: true,
    movie_combat_power: 70,
  },

  // ---------- Alice 艾莉丝 ----------
  {
    role: 'movie_alice',
    possible_names: ['艾莉丝'],
    possible_identities: ['保护伞公司安全主管，记忆缺失但战斗直觉惊人'],
    possible_skills: ['战斗', '观察', '指挥'],
    possible_hidden_traits: ['与蜂巢的秘密有深层联系'],
    base_hp: 120,
    is_movie_npc: true,
    movie_combat_power: 85,
  },

  // ---------- Kaplan 克普兰 ----------
  {
    role: 'movie_kaplan',
    possible_names: ['克普兰'],
    possible_identities: ['特安部队技术员，擅长黑客入侵和门禁破解'],
    possible_skills: ['黑客', '电子', '修复'],
    possible_hidden_traits: ['对红后有独特的理解方式，能提高说服成功率'],
    base_hp: 70,
    is_movie_npc: true,
    movie_combat_power: 40,
  },

  // ---------- Matt Addison 麦特 ----------
  {
    role: 'movie_matt',
    possible_names: ['麦特'],
    possible_identities: ['记者，为揭露保护伞公司黑幕而潜入蜂巢'],
    possible_skills: ['调查', '格斗', '说服'],
    possible_hidden_traits: ['Lisa Addison 的哥哥，掌握保护伞内部线索'],
    base_hp: 80,
    is_movie_npc: true,
    movie_combat_power: 50,
  },

  // ---------- Spence Parks 史班逊 ----------
  {
    role: 'movie_spence',
    possible_names: ['史班逊'],
    possible_identities: ['保护伞公司安保人员，Alice 的前搭档'],
    possible_skills: ['战斗', '伪装', '开锁'],
    possible_hidden_traits: ['实际是 T 病毒样本的盗窃者，随时可能背叛'],
    base_hp: 85,
    is_movie_npc: true,
    movie_combat_power: 55,
  },

  // ---------- One 一 ----------
  {
    role: 'movie_one',
    possible_names: ['一'],
    possible_identities: ['特安部队队长，指挥佣兵行动'],
    possible_skills: ['战斗', '指挥', '战术'],
    possible_hidden_traits: ['忠诚于任务，但激光走廊可能成为他的葬身之地'],
    base_hp: 100,
    is_movie_npc: true,
    movie_combat_power: 65,
  },

  // ---------- J.D. Salinas 杰迪 ----------
  {
    role: 'movie_jd',
    possible_names: ['杰迪'],
    possible_identities: ['特安部队成员，擅长火力支援'],
    possible_skills: ['枪械', '战斗'],
    possible_hidden_traits: ['与 Rain 关系密切，救下他可以提升 Rain 信任'],
    base_hp: 75,
    is_movie_npc: true,
    movie_combat_power: 45,
  },
]

// ==================== Rain Ocampo 详细对话 ====================
// Rain 是感染救援线的核心 NPC，在 G3 医疗室触发。

export const RAIN_NPC_ID = 'rain'

export const RAIN_DIALOGUE = {
  first_meet: '……你还活着？太好了。我是保护伞特安部队的小雨，我被感染了，但还能打。如果你有抗病毒喷雾或医疗包，先帮我处理一下伤口。',
  helped: '谢了。这支抗病毒喷雾给你，算是我的一点心意。如果你能帮我找到抗病毒原型样本，也许我能撑到最后。',
  low_trust: '别以为帮我包扎一下我就会信任你。我见过太多靠不住的人了。',
  high_trust: '我看得出，你和那些只会逃跑的人不一样。这支弹药我留着没用，给你吧。活下去。',
  infected_warning: '我的感染值已经很高了……如果不找到抗病毒原型样本，我可能撑不到撤离。',
}

// ==================== 电影 NPC 固定生成参数 ====================
// 各电影 NPC 在副本中的初始位置和状态
// defaultDialogueEventId / dialogueByFlag 用于对话驱动交互

export const MOVIE_NPC_SPAWNS = {
  rain: {
    room: 'G3',
    trust: 40,
    fear: 10,
    infection: 20,
    follow_state: 'waiting' as const,
    defaultDialogueEventId: 'ev_g3_meet_rain',
    dialogueByFlag: {
      rain_infection_known: 'ev_g3_rain_symptoms',
    },
  },
  alice: {
    room: 'B3',
    trust: 30,
    fear: 0,
    infection: 0,
    follow_state: 'waiting' as const,
    defaultDialogueEventId: 'ev_alice_talk',
  },
  kaplan: {
    room: 'H3',
    trust: 35,
    fear: 15,
    infection: 0,
    follow_state: 'waiting' as const,
    defaultDialogueEventId: 'ev_i3_laser_entrance',
    dialogueByFlag: {
      kaplan_steady: 'ev_kaplan_steady_talk',
    },
  },
  matt: {
    room: 'E1',
    trust: 25,
    fear: 20,
    infection: 0,
    follow_state: 'waiting' as const,
  },
  spence: {
    room: 'E2',
    trust: 20,
    fear: 10,
    infection: 0,
    follow_state: 'waiting' as const,
  },
  one: {
    room: 'I3',
    trust: 30,
    fear: 5,
    infection: 0,
    follow_state: 'waiting' as const,
  },
  jd: {
    room: 'D4',
    trust: 25,
    fear: 15,
    infection: 0,
    follow_state: 'waiting' as const,
  },
}
