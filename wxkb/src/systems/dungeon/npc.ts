/**
 * 副本 V2 — NPC 生成与 AI 系统
 *
 * ==================== 功能说明 ====================
 * - 副本开始时生成新人轮回者 NPC（3 随机 + 1 引导型老关）
 * - 生成副本固定 NPC（电影角色如 Rain/Alice/Kaplan 等，非轮回者）
 * - 管理 NPC 信任值/恐惧值/感染值变化
 * - NPC AI 行为（根据性格类型产生不同行为）
 * - NPC 交互系统（交谈/请求协助/安抚/质问等）
 * - 处理 NPC 死亡、感染变异、背叛等事件
 * - NPC → CombatAlly 转换（战斗参战）
 */

import type {
  NpcRole,
  NpcFollowState,
  NpcInfectedState,
  NpcTemplate,
  NpcInteractionDef,
  DungeonNpc,
  DungeonGlobalState,
  CombatAlly,
  ActionEffect,
} from '../../types/dungeon-v2'
import type { DamageType } from '../../config/combat'
import { NPC_CONFIG, TACTICS_CONFIG } from '../../config/dungeon-v2'
import { NPC_TEMPLATES, GUIDE_NPC_TEMPLATE, MOVIE_NPC_TEMPLATES, MOVIE_NPC_SPAWNS } from '../../data/dungeons/biohazard/npcs'

// ==================== NPC 生成 ====================

/** 从模板池中随机选取一个元素 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** role → 简短 ID 的映射（匹配 events.ts 中的 npc_id 引用） */
const ROLE_ID_MAP: Partial<Record<NpcRole, string>> = {
  calm_analyst: 'analyst',
  reckless_charger: 'reckless',
  selfish_survivor: 'selfish',
  guide: 'guide',
}

/**
 * 生成全部新人轮回者 NPC（3 随机新人 + 1 引导型老关）
 * 这些 NPC 是被主神投放的轮回者，和玩家同批进入副本。
 */
export function generateReincarnatorNpcs(): DungeonNpc[] {
  const npcs: DungeonNpc[] = []

  // 3 名随机新人（冷静/冲动/自私各1）
  for (const template of NPC_TEMPLATES) {
    npcs.push(generateOneNpc(template))
  }

  // 1 名引导型（老关，固定生成）
  npcs.push(generateGuideNpc())

  return npcs
}

/**
 * 从模板随机生成单个新人轮回者 NPC
 */
function generateOneNpc(template: NpcTemplate): DungeonNpc {
  const name = randomFrom(template.possible_names)
  const identity = randomFrom(template.possible_identities)
  const skill = randomFrom(template.possible_skills)
  const hiddenTrait = randomFrom(template.possible_hidden_traits)

  return {
    id: ROLE_ID_MAP[template.role] ?? template.role,
    name,
    role: template.role,
    identity,
    hp: template.base_hp,
    max_hp: template.base_hp,
    infection: 0,
    trust: 0,
    fear: 0,
    skill,
    follow_state: 'waiting',
    current_room: 'B3',
    hidden_trait: hiddenTrait,
    alive: true,
    infected_state: 'clean',
    fate_flag: 'none',
    is_reincarnator: true,
  }
}

/**
 * 生成引导型 NPC（老关）
 * 老关是资深轮回者，初始信任较高，不恐惧，永不离开。
 */
function generateGuideNpc(): DungeonNpc {
  const template = GUIDE_NPC_TEMPLATE
  return {
    id: ROLE_ID_MAP.guide ?? 'guide',
    name: template.possible_names[0],
    role: 'guide',
    identity: template.possible_identities[0],
    hp: template.base_hp,
    max_hp: template.base_hp,
    infection: 0,
    trust: 30,
    fear: 0,
    skill: template.possible_skills[0],
    follow_state: 'waiting',
    current_room: 'B3',
    hidden_trait: template.possible_hidden_traits[0],
    alive: true,
    infected_state: 'clean',
    fate_flag: 'guide',
    is_reincarnator: true,
    combat_power: template.combat_power,
  }
}

/**
 * 生成副本固定 NPC（电影剧情角色）
 * 这些 NPC 不是轮回者，属于副本场景原住民。
 * 包括 Rain、Alice、Kaplan、Matt、Spence、One、J.D. 等 7 名电影角色。
 */
export function createFixedNpcs(): DungeonNpc[] {
  return createMovieNpcs()
}

/**
 * 根据电影 NPC 模板和生成参数，创建全部电影剧情 NPC
 */
function createMovieNpcs(): DungeonNpc[] {
  const npcs: DungeonNpc[] = []
  for (const template of MOVIE_NPC_TEMPLATES) {
    const spawnKey = template.role.replace('movie_', '')
    const spawn = (MOVIE_NPC_SPAWNS as Record<string, { room: string; trust: number; fear: number; infection: number; follow_state: NpcFollowState; defaultDialogueEventId?: string; dialogueByFlag?: Record<string, string> }>)[spawnKey]
    if (!spawn) continue

    const name = template.possible_names[0] ?? '未知'
    const identity = template.possible_identities[0] ?? ''
    const skill = template.possible_skills[0] ?? '战斗'
    const hiddenTrait = template.possible_hidden_traits[0] ?? ''

    npcs.push({
      id: spawnKey,
      name,
      role: template.role,
      identity,
      hp: template.base_hp,
      max_hp: template.base_hp,
      infection: spawn.infection,
      trust: spawn.trust,
      fear: spawn.fear,
      skill,
      follow_state: spawn.follow_state,
      current_room: spawn.room,
      hidden_trait: hiddenTrait,
      alive: true,
      infected_state: spawn.infection > 0 ? 'mild' : 'clean',
      fate_flag: spawnKey,
      is_reincarnator: false,
      combat_power: template.movie_combat_power,
      defaultDialogueEventId: spawn.defaultDialogueEventId,
      dialogueByFlag: spawn.dialogueByFlag,
    })
  }
  return npcs
}

// ==================== 信任值/恐惧值管理 ====================

/** 修改 NPC 信任值（限制在 -100 ~ 100） */
export function changeNpcTrust(npc: DungeonNpc, delta: number): void {
  npc.trust = Math.max(
    NPC_CONFIG.TRUST_MIN,
    Math.min(NPC_CONFIG.TRUST_MAX, npc.trust + delta),
  )
}

/** 修改 NPC 恐惧值（限制在 0 ~ 100） */
export function changeNpcFear(npc: DungeonNpc, delta: number): void {
  npc.fear = Math.max(
    NPC_CONFIG.FEAR_MIN,
    Math.min(NPC_CONFIG.FEAR_MAX, npc.fear + delta),
  )
}

/** 修改 NPC 感染值 */
export function changeNpcInfection(npc: DungeonNpc, delta: number): void {
  npc.infection = Math.max(0, Math.min(100, npc.infection + delta))
  updateNpcInfectedState(npc)
}

/** 根据感染值更新 NPC 感染状态 */
function updateNpcInfectedState(npc: DungeonNpc): void {
  if (npc.infection >= 100) {
    npc.infected_state = 'turned'
    npc.alive = false
    npc.follow_state = 'dead'
  } else if (npc.infection >= 70) {
    npc.infected_state = 'severe'
  } else if (npc.infection >= 30) {
    npc.infected_state = 'mild'
  } else {
    npc.infected_state = 'clean'
  }
}

// ==================== NPC AI 行为 ====================

/**
 * NPC 每回合 AI 行为
 * 仅对新人轮回者执行完整 AI（副本固定 NPC 和引导型跳过）
 *
 * ==================== 行为逻辑 ====================
 * - 信任值行为：高信任主动提醒/牺牲；低信任可能背叛
 * - 恐惧值行为：高恐惧可能逃跑/崩溃；来源检测（玩家低HP/倒计时/警戒值）
 * - 感染值自然增长（已感染的 NPC 每回合 +1）
 * - 恐惧值自然恢复（每回合 -1）
 */
export interface NpcAiResult {
  logs: string[]
  /** 触发的 NPC 状态事件 ID（如果有） */
  triggered_events: string[]
}

export function processNpcAi(
  npcs: DungeonNpc[],
  global: DungeonGlobalState,
  playerInfection: number,
  playerHp: number,
  playerMaxHp: number,
  /** 警戒值导致的每回合 NPC 恐惧增加量（由副本 AlertConfig 驱动） */
  alertFearPerTurn?: number,
): NpcAiResult {
  const logs: string[] = []
  const triggeredEvents: string[] = []

  for (const npc of npcs) {
    if (!npc.alive || npc.follow_state === 'dead') continue

    // 副本固定 NPC（如电影角色）不执行轮回者 AI
    if (!npc.is_reincarnator) continue

    // 引导型 NPC：不恐惧、不背叛、不感染，仅提供战斗辅助
    if (npc.role === 'guide') continue

    // ==================== 信任值行为 ====================
    if (npc.trust >= NPC_CONFIG.TRUST_SACRIFICE_THRESHOLD) {
      // 信任极高：可能主动牺牲（通过事件触发）
      triggeredEvents.push(`${npc.id}_high_trust_sacrifice`)
    } else if (npc.trust >= NPC_CONFIG.HIGH_TRUST_THRESHOLD) {
      // 信任较高：主动提醒危险
      if (playerInfection >= 60 && Math.random() < 0.3) {
        logs.push(`${npc.name} 提醒你："你的感染值已经很高了，尽快找到抗病毒物品。"`)
      }
    } else if (npc.trust <= NPC_CONFIG.TRUST_HOSTILE_THRESHOLD) {
      // 敌视：可能背叛
      if (npc.role === 'selfish_survivor') {
        triggeredEvents.push('ev_selfish_betrayal')
      }
    }

    // ==================== 恐惧值行为 ====================
    if (npc.fear >= NPC_CONFIG.FEAR_BREAKDOWN_THRESHOLD) {
      // 崩溃，脱离队伍
      npc.follow_state = 'left'
      npc.fate_flag = 'flee'
      logs.push(`${npc.name} 精神崩溃，尖叫着跑进了黑暗中！`)
    } else if (npc.fear >= NPC_CONFIG.FLEE_FEAR_THRESHOLD) {
      // 可能逃跑、尖叫、误触机关
      if (npc.role === 'reckless_charger') {
        triggeredEvents.push('ev_reckless_high_fear')
      }
    }

    // ==================== 恐惧来源检测 ====================
    // 玩家低生命
    if (playerHp > 0 && playerMaxHp > 0 && playerHp / playerMaxHp < 0.3) {
      changeNpcFear(npc, NPC_CONFIG.FEAR_CHANGE.PLAYER_LOW_HP)
    }
    // 自毁倒计时
    if (global.self_destruct_started) {
      changeNpcFear(npc, NPC_CONFIG.FEAR_CHANGE.COUNTDOWN_START)
    }
    // 警戒值导致的恐惧增加（由副本 AlertConfig 驱动）
    if (alertFearPerTurn && alertFearPerTurn > 0) {
      changeNpcFear(npc, alertFearPerTurn)
    }

    // ==================== 感染值自然增长 ====================
    if (npc.infection > 0 && npc.infection < 100) {
      changeNpcInfection(npc, 1)
      if (npc.infection >= 100) {
        npc.fate_flag = 'infect'
        logs.push(`${npc.name} 的感染完全失控，变异成了敌人！`)
      }
    }

    // ==================== 恐惧值自然恢复 ====================
    if (npc.fear > 0) {
      changeNpcFear(npc, -1)
    }
  }

  return { logs, triggered_events: triggeredEvents }
}

// ==================== NPC 交互系统 ====================

/**
 * 获取 NPC 可用的交互列表（根据 role 和状态过滤）
 *
 * ==================== 交互类型分配 ====================
 * - 通用：交谈、给予道具、邀请同行、解散跟随
 * - 冷静分析型：请求分析、请求协助黑客
 * - 冲动莽撞型：请求破门、请求掩护、阻止冲动
 * - 自私求生型：安抚、质问、搜身
 * - 引导型：询问指引
 * - 副本固定 NPC：仅交谈
 */
export function getNpcInteractions(npc: DungeonNpc): NpcInteractionDef[] {
  if (!npc.is_reincarnator) {
    const fixedCommon: NpcInteractionDef[] = [
      {
        type: 'talk',
        label: '交谈',
        turn_cost: 0,
        effect: {},
        result_text: getMovieNpcTalkText(npc),
      },
    ]

    if (npc.follow_state === 'following') {
      fixedCommon.push({
        type: 'dismiss',
        label: '让其留守',
        turn_cost: 0,
        effect: {
          npc_follow: { npc_id: npc.id, state: 'waiting' as NpcFollowState },
        },
        result_text: `${npc.name} 点点头，留在当前位置等待你的消息。`,
      })
    } else if (canMovieNpcFollow(npc)) {
      fixedCommon.push({
        type: 'invite_follow',
        label: '邀请同行',
        turn_cost: 0,
        require_trust_gte: getMovieNpcFollowTrust(npc),
        effect: {
          npc_follow: { npc_id: npc.id, state: 'following' as NpcFollowState },
          npc_trust: { npc_id: npc.id, value: 5 },
        },
        result_text: `${npc.name} 决定暂时与你同行。`,
      })
    }

    return [...fixedCommon, ...getMovieNpcRoleInteractions(npc)]
  }

  // 通用交互（根据跟随状态过滤邀请/解散）
  const common: NpcInteractionDef[] = [
    {
      type: 'talk',
      label: '交谈',
      turn_cost: 0,
      effect: {},
      result_text: `${npc.name} 和你简短交谈了几句。`,
    },
    {
      type: 'give_item',
      label: '给予道具',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: NPC_CONFIG.TRUST_CHANGE.GIVE_MEDICAL },
      },
      result_text: `${npc.name} 收下了你的道具，信任度有所提升。`,
    },
  ]

  // 跟随状态相关交互：未跟随时可邀请，跟随时可解散
  if (npc.follow_state === 'following') {
    common.push({
      type: 'dismiss',
      label: '解散跟随',
      turn_cost: 0,
      effect: {
        npc_follow: { npc_id: npc.id, state: 'waiting' as NpcFollowState },
      },
      result_text: `${npc.name} 留在这里等待你的消息。`,
    })
  } else {
    common.push({
      type: 'invite_follow',
      label: '邀请同行',
      turn_cost: 0,
      effect: {
        npc_follow: { npc_id: npc.id, state: 'following' as NpcFollowState },
      },
      result_text: `${npc.name} 加入了你的队伍。`,
    })
  }

  // 角色专属交互
  const roleSpecific: Partial<Record<NpcRole, NpcInteractionDef[]>> = {
    calm_analyst: [
      {
        type: 'request_analysis',
        label: '请求分析',
        turn_cost: 1,
        effect: {
          npc_trust: { npc_id: npc.id, value: 5 },
          log: `${npc.name} 分析了当前形势，提供了一些建议。`,
        },
        result_text: `${npc.name} 仔细观察了周围环境，给出了一些有用的分析。`,
      },
      {
        type: 'request_hack',
        label: '请求协助黑客',
        turn_cost: 1,
        effect: {
          npc_trust: { npc_id: npc.id, value: 5 },
          log: `${npc.name} 协助你进行了黑客操作。`,
        },
        result_text: `${npc.name} 展示了他的技术能力，协助你完成了黑客操作。`,
      },
    ],
    reckless_charger: [
      {
        type: 'request_breach',
        label: '请求破门',
        turn_cost: 1,
        effect: {
          npc_trust: { npc_id: npc.id, value: 5 },
          hp: -2,
          log: `${npc.name} 用力破门，消耗了一些体力。`,
        },
        result_text: `${npc.name} 一脚踹开了门，虽然粗暴但很有效。`,
      },
      {
        type: 'request_cover',
        label: '请求掩护',
        turn_cost: 1,
        effect: {
          npc_trust: { npc_id: npc.id, value: 5 },
          log: `${npc.name} 表示会在战斗中为你提供掩护。`,
        },
        result_text: `${npc.name} 举起了武器，表示会掩护你。`,
      },
      {
        type: 'stop_rush',
        label: '阻止冲动',
        turn_cost: 0,
        effect: {
          npc_trust: { npc_id: npc.id, value: NPC_CONFIG.TRUST_CHANGE.COMFORT },
          npc_fear: { npc_id: npc.id, value: NPC_CONFIG.FEAR_CHANGE.COMFORT },
          log: `你阻止了 ${npc.name} 的冲动行为。`,
        },
        result_text: `${npc.name} 虽然不情愿，但还是听从了你的劝阻。`,
      },
    ],
    selfish_survivor: [
      {
        type: 'comfort',
        label: '安抚',
        turn_cost: 0,
        effect: {
          npc_fear: { npc_id: npc.id, value: NPC_CONFIG.FEAR_CHANGE.COMFORT },
          npc_trust: { npc_id: npc.id, value: NPC_CONFIG.TRUST_CHANGE.COMFORT },
          log: `你安抚了 ${npc.name}，他看起来镇定了一些。`,
        },
        result_text: `${npc.name} 深吸一口气，情绪稍有缓和。`,
      },
      {
        type: 'confront',
        label: '质问',
        turn_cost: 0,
        effect: {
          npc_trust: { npc_id: npc.id, value: -10 },
          log: `你质问了 ${npc.name}，他显得有些心虚。`,
        },
        result_text: `${npc.name} 矢口否认了一切，但你知道他心怀鬼胎。`,
      },
      {
        type: 'search_body',
        label: '搜身',
        turn_cost: 1,
        require_trust_gte: 30,
        effect: {
          npc_trust: { npc_id: npc.id, value: -20 },
          log: `你搜查了 ${npc.name} 的随身物品。`,
        },
        result_text: `你仔细检查了 ${npc.name} 的背包。`,
      },
    ],
    guide: [
      {
        type: 'ask_guide',
        label: '询问',
        turn_cost: 0,
        effect: {},
        result_text: `老关沉声说道："跟紧我，别掉队。这地方比你们想象的要危险得多。"`,
      },
    ],
  }

  return [...common, ...(roleSpecific[npc.role] ?? [])]
}

function getMovieNpcTalkText(npc: DungeonNpc): string {
  const text: Partial<Record<NpcRole, string>> = {
    movie_alice: '艾莉丝低声说："这里的系统不像只是失控。每个门、每条走廊，都像在把我们推向红后。"',
    movie_rain: npc.infection >= 60
      ? '小雨按住伤口，声音发哑："我还能开枪。但如果有血清，别犹豫。再拖我会变成你们要打的东西。"'
      : '小雨检查弹匣："别浪费子弹，等它们靠近再打。"',
    movie_kaplan: '克普兰盯着终端接口："门禁、摄像头、激光，我能帮你试试。但别让我在警报声里临场发挥。"',
    movie_matt: '麦特压低声音："Lisa 的资料就在蜂巢深处。找到它，就能证明保护伞做了什么。"',
    movie_spence: '史班逊的视线从样本箱上一扫而过："我们只需要逃出去。其他东西都不重要。"',
    movie_one: '一抬手示意队伍停下："激光走廊不是勇敢能解决的问题。先找到控制端。"',
    movie_jd: '杰迪拍了拍武器："我负责压住前面那波，你们别站到我的射线上。"',
  }
  return text[npc.role] ?? `${npc.name} 看着你，等待你的下一步行动。`
}

function canMovieNpcFollow(npc: DungeonNpc): boolean {
  return ['movie_alice', 'movie_rain', 'movie_kaplan', 'movie_matt', 'movie_jd'].includes(npc.role)
}

function getMovieNpcFollowTrust(npc: DungeonNpc): number {
  if (npc.role === 'movie_alice') return 20
  if (npc.role === 'movie_kaplan') return 25
  if (npc.role === 'movie_matt') return 20
  return 30
}

function getMovieNpcRoleInteractions(npc: DungeonNpc): NpcInteractionDef[] {
  const interactions: NpcInteractionDef[] = []

  if (npc.role === 'movie_alice') {
    interactions.push({
      type: 'request_analysis',
      label: '请求判断',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: 5 },
        log: '艾莉丝指出：先恢复电力，再处理监控室和激光系统，最后进入红后主机房。',
      },
      result_text: '艾莉丝把路线重新梳理了一遍，危险节点变得清晰许多。',
    })
  }

  if (npc.role === 'movie_rain' || npc.role === 'movie_jd') {
    interactions.push({
      type: 'request_cover',
      label: '请求火力掩护',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: 5 },
        log: `${npc.name} 会在下一场战斗中提供火力支援。`,
      },
      result_text: `${npc.name} 检查武器，示意你可以前进。`,
    })
  }

  if (npc.role === 'movie_kaplan') {
    interactions.push({
      type: 'request_hack',
      label: '请求黑客协助',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: 5 },
        log: 'Kaplan 接入附近系统：黑客、门禁、激光相关检定将更有把握。',
      },
      result_text: '克普兰展开便携终端，开始读取附近门禁协议。',
    })
  }

  if (npc.role === 'movie_spence') {
    interactions.push({
      type: 'confront',
      label: '质问样本',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: -15 },
        log: '你质问 Spence 对 T 病毒样本的异常关注。他的回答明显慢了半拍。',
      },
      result_text: '史班逊露出一瞬间的慌乱，但很快又恢复镇定。',
    })
  }

  if (npc.role === 'movie_one') {
    interactions.push({
      type: 'stop_rush',
      label: '阻止强闯激光',
      turn_cost: 0,
      effect: {
        npc_trust: { npc_id: npc.id, value: 10 },
        log: '你阻止 One 强闯激光走廊。他接受了你的判断，决定等待激光系统处理结果。',
      },
      result_text: '一沉默片刻，收回了推进手势。',
    })
  }

  return interactions
}

// ==================== NPC → CombatAlly 转换 ====================

/**
 * 将 DungeonNpc 转换为战斗盟友（CombatAlly）
 * 跟随中的 NPC 在战斗开始时作为独立战斗单位参战。
 *
 * ==================== 属性简化计算 ====================
 * - attack/damage 基于 role 和 skill 简化计算
 * - 引导型 NPC 拥有远高于普通 NPC 的战斗属性
 * - 副本固定 NPC（如电影角色）战斗力较低
 */
export function npcToCombatAlly(npc: DungeonNpc): CombatAlly {
  // 基础属性模板
  const BASE_STATS: Record<NpcRole, { attack: number; defense: number; damage: number; armor: number; speed: number; damage_type: DamageType }> = {
    calm_analyst: {
      attack: 4, defense: 3, damage: 3, armor: 0, speed: 6,
      damage_type: 'physical' as DamageType,
    },
    reckless_charger: {
      attack: 8, defense: 5, damage: 6, armor: 2, speed: 7,
      damage_type: 'physical' as DamageType,
    },
    selfish_survivor: {
      attack: 3, defense: 2, damage: 2, armor: 0, speed: 8,
      damage_type: 'physical' as DamageType,
    },
    guide: {
      attack: 12, defense: 8, damage: 10, armor: 3, speed: 9,
      damage_type: 'physical' as DamageType,
    },
    movie_alice: {
      attack: 11, defense: 7, damage: 8, armor: 2, speed: 10,
      damage_type: 'physical' as DamageType,
    },
    movie_rain: {
      attack: 10, defense: 5, damage: 8, armor: 2, speed: 8,
      damage_type: 'technology' as DamageType,
    },
    movie_kaplan: {
      attack: 5, defense: 4, damage: 4, armor: 1, speed: 6,
      damage_type: 'technology' as DamageType,
    },
    movie_matt: {
      attack: 6, defense: 5, damage: 5, armor: 1, speed: 7,
      damage_type: 'physical' as DamageType,
    },
    movie_spence: {
      attack: 7, defense: 5, damage: 6, armor: 1, speed: 7,
      damage_type: 'technology' as DamageType,
    },
    movie_one: {
      attack: 9, defense: 6, damage: 7, armor: 2, speed: 8,
      damage_type: 'technology' as DamageType,
    },
    movie_jd: {
      attack: 8, defense: 5, damage: 6, armor: 2, speed: 7,
      damage_type: 'technology' as DamageType,
    },
  }

  const stats = BASE_STATS[npc.role]

  return {
    npc_id: npc.id,
    name: npc.name,
    hp: npc.hp,
    max_hp: npc.max_hp,
    attack: stats.attack,
    defense: stats.defense,
    damage: stats.damage,
    armor: stats.armor,
    speed: stats.speed,
    damage_type: stats.damage_type,
    down: false,
    // ---- 战棋字段默认值（第二步回合调度改造时由 placeFormation 覆盖位置） ----
    position: null,
    move_range: TACTICS_CONFIG.DEFAULT_MOVE_RANGE,
    attack_range: TACTICS_CONFIG.MELEE_RANGE,
    control_mode: 'auto', // 队友默认 AI 托管，预留 'manual' 供玩家接管
    has_moved: false,
    has_attacked: false,
  }
}

/**
 * 战斗结束后将 CombatAlly 的 HP 同步回 DungeonNpc
 */
export function syncAllyHpToNpc(npc: DungeonNpc, ally: CombatAlly): void {
  npc.hp = ally.hp
  if (ally.hp <= 0) {
    npc.alive = false
    npc.follow_state = 'dead'
    npc.fate_flag = 'death'
  }
}

// ==================== NPC 查找工具 ====================

/** 按 role 查找 NPC */
export function findNpcByRole(npcs: DungeonNpc[], role: NpcRole): DungeonNpc | undefined {
  return npcs.find((npc) => npc.role === role && npc.alive)
}

/** 按 ID 查找 NPC */
export function findNpcById(npcs: DungeonNpc[], id: string): DungeonNpc | undefined {
  return npcs.find((npc) => npc.id === id)
}

/** 获取存活的跟随 NPC 数量 */
export function countAliveFollowingNpcs(npcs: DungeonNpc[]): number {
  return npcs.filter((npc) => npc.alive && npc.follow_state === 'following').length
}

/** 获取所有存活 NPC 数量 */
export function countAliveNpcs(npcs: DungeonNpc[]): number {
  return npcs.filter((npc) => npc.alive).length
}

/**
 * 存档兼容：将旧格式 fate_flags 迁移到 fate_flag
 * 旧格式: fate_flags: Record<string, boolean>
 * 新格式: fate_flag: string
 */
export function migrateFateFlags(npc: DungeonNpc): void {
  // 如果 fate_flag 已有值且不为空，不需要迁移
  if (npc.fate_flag !== undefined && npc.fate_flag !== ('' as string)) return

  // 尝试从旧格式迁移（如果存在旧字段则转换）
  const oldFlags = (npc as unknown as { fate_flags?: Record<string, boolean> }).fate_flags
  if (oldFlags && typeof oldFlags === 'object') {
    const trueKeys = Object.keys(oldFlags).filter((k) => oldFlags[k])
    npc.fate_flag = trueKeys.length > 0 ? trueKeys[0] : 'none'
    delete (npc as unknown as { fate_flags?: Record<string, boolean> }).fate_flags
  } else {
    npc.fate_flag = 'none'
  }

  // 迁移 is_reincarnator（旧存档默认为 true）
  if (npc.is_reincarnator === undefined) {
    // 非轮回者：引导型 NPC 和电影 NPC（含旧版 qinlan 兼容）
    const movieIds = Object.keys(MOVIE_NPC_SPAWNS)
    const isFixedNpc = movieIds.includes(npc.id) || npc.id === 'qinlan' || npc.role === 'guide'
    npc.is_reincarnator = !isFixedNpc
  }
}
