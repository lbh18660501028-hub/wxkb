/**
 * MUD副本地图系统
 *
 * ==================== 设计概述 ====================
 * 传统MUD房间连线图形式的副本探索
 * - 房间通过出口（exits）连接
 * - 玩家在房间间移动探索
 * - 每个房间可能有：敌人、NPC、陷阱、故事、商店、休息点、Boss
 *
 * ==================== 新增系统 ====================
 * - 感染值：被抓伤/咬伤/毒雾会增加，阈值影响行动
 * - 噪音值：开枪/爆炸会增加，吸引怪物
 * - 90分钟倒计时：副本限时，超时即失败
 * - NPC好感：影响结局分支
 * - 5种结局：根据选择和数据决定
 * - Boss三阶段：追击→适应→最终
 * - 恐惧检定：首次遭遇高级怪物
 */

import type { Enemy } from './scenarios'

// ==================== 类型定义 ====================

export type RoomType =
  | 'empty'
  | 'combat'
  | 'elite'
  | 'boss'
  | 'chest'
  | 'trap'
  | 'story'
  | 'shop'
  | 'rest'
  | 'start'
  | 'exit'

export type ExitDirection = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

export interface RoomExit {
  direction: ExitDirection
  roomId: string
  locked?: boolean
  keyRequired?: string
}

export interface RoomInteractableAction {
  id: string
  label: string
  effect: string
  nextRoom?: string
  grantRewards?: {
    rewardPoints?: number
    xp?: number
    sidePlots?: { D?: number; C?: number; B?: number; A?: number; S?: number }
  }
  // 新增：互动效果
  effects?: {
    xp?: number                   // 经验值
    rewardPoints?: number         // 奖励点
    infectionChange?: number      // 感染值变化
    noiseChange?: number          // 噪音值变化
    npcFavor?: Record<string, number>  // NPC好感变化 {罗森: +2, 林薇: -1}
    timerChange?: number          // 倒计时变化（秒）
    addItem?: string              // 获得物品
    removeItem?: string           // 消耗物品
    unlockExit?: string           // 解锁出口 roomId
    fearCheck?: boolean           // 触发恐惧检定
    bossWeakness?: string         // Boss弱点信息
    ending?: string               // 触发结局
    statusEffect?: string         // 触发状态效果
    damage?: number               // 直接伤害
    heal?: number                 // 直接治疗
    startCombat?: boolean         // 触发当前房间战斗
    spawnEnemies?: Enemy[]        // 触发战斗前刷出的敌人
  }
}

export interface RoomInteractable {
  id: string
  type: 'npc' | 'item' | 'device' | 'clue'
  title: string
  summary: string
  detail: string
  repeatable?: boolean
  actions: RoomInteractableAction[]
}

export interface MudRoom {
  id: string
  name: string
  type: RoomType
  description: string
  exits: RoomExit[]
  enemies?: Enemy[]
  chestReward?: {
    sidePlots?: { D?: number; C?: number; B?: number; A?: number; S?: number }
    xp?: number
    rewardPoints?: number
    items?: string[]
  }
  trapDamage?: number
  trapEffect?: string
  storyText?: string
  storyChoices?: {
    text: string
    effect: string
    nextRoom?: string
  }[]
  interactables?: RoomInteractable[]
  restHealPercent?: number
  visited?: boolean
  cleared?: boolean
  // 新增：进入房间时自动触发的效果
  onEnter?: {
    infectionChange?: number
    noiseChange?: number
    fearCheck?: boolean
    timerChange?: number
  }
  // 新增：动态刷怪
  dynamicEnemies?: boolean
  dynamicEnemiesPerVisit?: number
  // 新增：进入房间时自动触发战斗
  autoStartCombat?: boolean
}

// ==================== 任务系统 ====================

export type QuestType = 'main' | 'side'
export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed'

export interface QuestObjective {
  id: string
  description: string
  status: QuestStatus
  /** 触发完成的 action id 列表（任一完成即标记） */
  triggerActions: string[]
}

export interface Quest {
  id: string
  type: QuestType
  title: string
  description: string
  status: QuestStatus
  objectives: QuestObjective[]
  /** 完成奖励提示 */
  reward?: string
}

export interface DungeonQuests {
  /** 副本主线任务 */
  mainQuests: Quest[]
  /** 副本支线任务 */
  sideQuests: Quest[]
}

// 生化危机副本任务定义
export const RESIDENT_EVIL_QUESTS: DungeonQuests = {
  mainQuests: [
    {
      id: 'main_card',
      type: 'main',
      title: '获取蓝色权限卡',
      description: '前往值班室，从保安队长罗森处获取蓝色权限卡。',
      status: 'available',
      objectives: [
        { id: 'obj_visit_duty', description: '前往值班室', status: 'available', triggerActions: ['help_rosen', 'threaten_rosen', 'kill_rosen'] },
        { id: 'obj_get_card', description: '获得蓝色权限卡', status: 'available', triggerActions: ['help_rosen', 'threaten_rosen', 'kill_rosen'] },
      ],
      reward: '蓝色权限卡 ×1',
    },
    {
      id: 'main_power',
      type: 'main',
      title: '恢复B区供电',
      description: '前往配电间，操作配电控制台恢复B区电力。',
      status: 'locked',
      objectives: [
        { id: 'obj_visit_power', description: '前往配电间', status: 'available', triggerActions: ['restore_power', 'force_power'] },
        { id: 'obj_restore_power', description: '恢复B区供电', status: 'available', triggerActions: ['restore_power', 'force_power'] },
      ],
      reward: 'B区供电恢复',
    },
    {
      id: 'main_gate',
      type: 'main',
      title: '通过安全门',
      description: '使用蓝色权限卡和B区供电，打开安全门进入B区。',
      status: 'locked',
      objectives: [
        { id: 'obj_open_gate', description: '打开安全门', status: 'available', triggerActions: ['enter_b_zone'] },
      ],
      reward: '进入B区',
    },
    {
      id: 'main_boss',
      type: 'main',
      title: '击败或封印A-01',
      description: '在撤离平台与原型体A-01决战，击败或封印它。',
      status: 'locked',
      objectives: [
        { id: 'obj_reach_evac', description: '到达撤离平台', status: 'available', triggerActions: [] },
        { id: 'obj_defeat_boss', description: '击败或封印A-01', status: 'available', triggerActions: ['freeze_a01', 'use_high_freq', 'use_flame', 'use_pipe', 'use_sample'] },
      ],
      reward: '副本通关',
    },
    {
      id: 'main_escape',
      type: 'main',
      title: '安全撤离',
      description: '登上升降机，逃离研究所。',
      status: 'locked',
      objectives: [
        { id: 'obj_board_lift', description: '登上升降机', status: 'available', triggerActions: ['board_lift'] },
      ],
      reward: '完成副本',
    },
  ],
  sideQuests: [
    {
      id: 'side_rosen',
      type: 'side',
      title: '救助罗森',
      description: '在值班室用医用绷带救助受伤的保安队长罗森。',
      status: 'available',
      objectives: [
        { id: 'obj_help_rosen', description: '使用医用绷带救助罗森', status: 'available', triggerActions: ['help_rosen'] },
      ],
      reward: '罗森好感度 +3',
    },
    {
      id: 'side_linwei',
      type: 'side',
      title: '护送研究员林薇',
      description: '在样本室说服研究员林薇加入队伍。',
      status: 'locked',
      objectives: [
        { id: 'obj_escort_linwei', description: '护送林薇离开', status: 'available', triggerActions: ['escort_linwei'] },
      ],
      reward: '林薇好感度 +3',
    },
    {
      id: 'side_heche',
      type: 'side',
      title: '救助实习医生何澈',
      description: '在医务室解救被绑的实习医生何澈。',
      status: 'locked',
      objectives: [
        { id: 'obj_save_heche', description: '救助何澈', status: 'available', triggerActions: ['save_heche'] },
      ],
      reward: '何澈好感度 +3',
    },
    {
      id: 'side_weakness',
      type: 'side',
      title: '记录A-01弱点',
      description: '在样本室或监控室记录实验体的弱点信息。',
      status: 'available',
      objectives: [
        { id: 'obj_record_weakness', description: '记录弱点信息', status: 'available', triggerActions: ['record_weakness', 'study_boss'] },
      ],
      reward: 'Boss战优势',
    },
    {
      id: 'side_data',
      type: 'side',
      title: '获取研究数据',
      description: '在监控室下载零号样本资料芯片。',
      status: 'locked',
      objectives: [
        { id: 'obj_download_chip', description: '下载资料芯片', status: 'available', triggerActions: ['download_chip'] },
      ],
      reward: '零号样本资料芯片 ×1',
    },
    {
      id: 'side_armory',
      type: 'side',
      title: '获取武器补给',
      description: '打开武器保管室获取补给。',
      status: 'locked',
      objectives: [
        { id: 'obj_collect_armory', description: '收集武器补给', status: 'available', triggerActions: ['collect_armory'] },
      ],
      reward: '武器补给',
    },
  ],
}

export interface DungeonMap {
  id: string
  name: string
  description: string
  difficulty: string
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  minLevel: number
  rewards: {
    sidePlots: { D: number; C: number; B?: number; A?: number; S?: number }
    xp: number
    rewardPoints: number
  }
  startRoomId: string
  exitRoomId: string
  rooms: Record<string, MudRoom>
  quests: DungeonQuests
  // 新增：副本级配置
  config: {
    timerSeconds: number           // 倒计时（秒）
    infectionPerHit: number        // 每次被击中感染值
    noisePerGunshot: number        // 每次枪击噪音
    noisePerExplosion: number      // 每次爆炸噪音
    fearCheckThreshold: number     // 恐惧检定阈值（首次遭遇高级怪）
    bossPhases: number             // Boss阶段数
  }
}

// ==================== Boss阶段系统 ====================

export interface BossPhase {
  phase: number
  name: string
  description: string
  triggerHpPercent: number  // 血量百分比触发
  effects: {
    damageReduction?: number   // 伤害减免
    speedBonus?: number        // 速度加成
    armorBonus?: number        // 护甲加成
    specialAbility?: string    // 特殊能力
    weakness?: string          // 弱点
  }
}

export const BOSS_PHASES: BossPhase[] = [
  {
    phase: 1,
    name: '追击',
    description: 'A-01以压倒性力量追击，优先攻击受伤或感染值高的目标。',
    triggerHpPercent: 100,
    effects: {
      speedBonus: 2,
      specialAbility: '优先攻击受伤/感染目标',
    },
  },
  {
    phase: 2,
    name: '适应',
    description: 'A-01开始适应玩家战术。如果一直用枪，它会长出骨甲；如果一直近战，它会长出反击骨刺。',
    triggerHpPercent: 60,
    effects: {
      damageReduction: 3,
      armorBonus: 4,
      specialAbility: '根据玩家攻击方式适应',
    },
  },
  {
    phase: 3,
    name: '最终',
    description: 'A-01进入狂暴状态，但核心暴露。玩家可利用场景机关（高频诱导器/喷焰/燃料管道）击败它。',
    triggerHpPercent: 30,
    effects: {
      speedBonus: 4,
      specialAbility: '核心暴露，但攻击力极高',
      weakness: '高频诱导器/喷焰/燃料管道',
    },
  },
]

// ==================== 结局系统 ====================

export interface Ending {
  id: string
  name: string
  description: string
  conditions: {
    npcAlive?: string[]        // NPC必须存活
    npcDead?: string[]         // NPC必须死亡
    items?: string[]           // 必须拥有物品
    dataDownloaded?: boolean   // 是否下载了数据
    aiDeleted?: boolean        // 是否删除了AI
    virusSample?: boolean      // 是否携带病毒样本
    a01Sealed?: boolean        // 是否封印了A-01
    infectionBelow?: number    // 感染值低于
    timeRemaining?: number     // 剩余时间（秒）
  }
  rewards: {
    sidePlots: { D: number; C: number; B: number; A: number; S: number }
    xp: number
    rewardPoints: number
  }
  storyText: string
}

export const ENDINGS: Ending[] = [
  {
    id: 'normal',
    name: '逃出生天',
    description: '玩家登上撤离平台，实验室爆炸。',
    conditions: {},
    rewards: {
      sidePlots: { D: 4, C: 1, B: 0, A: 0, S: 0 },
      xp: 220,
      rewardPoints: 900,
    },
    storyText: '升降机缓缓上升，身后传来震耳欲聋的爆炸声。你回头看了一眼燃烧的研究所，然后消失在黑暗中。主神提示："主线任务完成。评价：B。"',
  },
  {
    id: 'evidence',
    name: '带证据撤离',
    description: '玩家带走资料芯片，揭露诺瓦公司真相，获得额外奖励点。',
    conditions: {
      items: ['零号样本资料芯片'],
      dataDownloaded: true,
    },
    rewards: {
      sidePlots: { D: 5, C: 1, B: 0, A: 0, S: 0 },
      xp: 280,
      rewardPoints: 1200,
    },
    storyText: '你带着资料芯片登上升降机。芯片里的数据足以揭露诺瓦公司的全部罪行。主神提示："主线任务完成。支线：零号样本资料芯片，完成。评价：A。"',
  },
  {
    id: 'rescue',
    name: '幸存者撤离',
    description: '至少一名NPC存活，奖励更高，后续副本可能再次出现该NPC。',
    conditions: {
      npcAlive: ['any'],
    },
    rewards: {
      sidePlots: { D: 5, C: 1, B: 0, A: 0, S: 0 },
      xp: 280,
      rewardPoints: 1200,
    },
    storyText: '你和幸存的NPC一起登上升降机。他们感激地看着你，承诺以后会报答你的恩情。主神提示："主线任务完成。支线：幸存者撤离，完成。评价：A。"',
  },
  {
    id: 'dark',
    name: '携带病毒样本撤离',
    description: '玩家获得强力道具，但后续副本可能触发生化污染事件。',
    conditions: {
      virusSample: true,
    },
    rewards: {
      sidePlots: { D: 5, C: 2, B: 0, A: 0, S: 0 },
      xp: 320,
      rewardPoints: 1500,
    },
    storyText: '你把病毒样本封存在特制容器中，带着它登上升降机。你知道这东西很危险，但也很有价值。主神提示："主线任务完成。评价：S。警告：你携带了危险物品。"',
  },
  {
    id: 'seal',
    name: '封印A-01',
    description: '玩家没有杀死A-01，而是把它困在冷冻仓或平台下层。后续可作为追踪型宿敌登场。',
    conditions: {
      a01Sealed: true,
    },
    rewards: {
      sidePlots: { D: 5, C: 2, B: 0, A: 0, S: 0 },
      xp: 320,
      rewardPoints: 1500,
    },
    storyText: '你启动了冷冻仓，A-01被冰封在零下180度的环境中。它的眼睛依然在盯着你，仿佛在说："我会回来的。"主神提示："主线任务完成。评价：S。警告：目标未被消灭。"',
  },
]

// ==================== 感染值阈值 ====================

export const INFECTION_THRESHOLDS = {
  safe: { min: 0, max: 30, name: '轻微感染', effect: '无明显影响' },
  mild: { min: 31, max: 60, name: '中度感染', effect: '偶尔咳嗽，行动检定降低' },
  severe: { min: 61, max: 80, name: '重度感染', effect: '视野模糊，可能误伤队友' },
  critical: { min: 81, max: 99, name: '危重感染', effect: '随机失控' },
  lethal: { min: 100, max: 100, name: '感染失控', effect: '变异，角色死亡或变成敌人' },
}

// ==================== 常量 ====================

export const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  empty: '□',
  combat: '⚔',
  elite: '☠',
  boss: '※',
  chest: '箱',
  trap: '危',
  story: '叙',
  shop: '商',
  rest: '休',
  start: '始',
  exit: '离',
}

export const ROOM_TYPE_NAMES: Record<RoomType, string> = {
  empty: '空房间',
  combat: '战斗区',
  elite: '精英战',
  boss: '实验体终局战',
  chest: '补给点',
  trap: '危险装置',
  story: '剧情节点',
  shop: '商店',
  rest: '临时休整',
  start: '起点',
  exit: '撤离点',
}

export const EXIT_ICONS: Record<ExitDirection, string> = {
  north: '↑',
  south: '↓',
  east: '→',
  west: '←',
  up: '↗',
  down: '↘',
}

// ==================== 生化危机：零号样本 ====================

const RESIDENT_EVIL_LAB_MAP: DungeonMap = {
  id: 'resident_evil_lab',
  name: '生化危机：零号样本',
  description: '主神投放的第一个教学副本。搜索、移动、交互、战斗、补给和撤离都会在这座泄漏实验室里依次展开。',
  difficulty: '新手教学 / 推荐 Lv.1',
  tier: 'D',
  minLevel: 1,
  startRoomId: 'lab_gate',
  exitRoomId: 'escape_lift',
  rewards: {
    sidePlots: { D: 10, C: 1 },
    xp: 320,
    rewardPoints: 1200,
  },
  config: {
    timerSeconds: 5400,        // 90分钟
    infectionPerHit: 3,        // 新手关降低感染压力
    noisePerGunshot: 10,       // 手枪噪音+10
    noisePerExplosion: 50,     // 爆炸噪音+50
    fearCheckThreshold: 70,    // 新手关只在关键遭遇触发恐惧压力
    bossPhases: 3,
  },
  rooms: {
    // ==================== 1. 实验室大门 ====================
    lab_gate: {
      id: 'lab_gate',
      name: '实验室大门',
      type: 'start',
      description: '猩红警报灯一明一灭，半掩的合金闸门后传来迟缓撞击声。这里是教程入口：先查看房间描述，再点击右侧对象完成搜索、调查和移动。地上有血迹拖向内部，墙上用血写着"不要相信广播"。',
      exits: [{ direction: 'east', roomId: 'main_corridor' }],
      storyText: '【林博士通讯】"如果你能听见，先去值班室拿门禁卡，再恢复B区供电。别在门口站太久——它们已经知道你在这里了。"',
      onEnter: {
        timerChange: 0, // 进入后开始倒计时
      },
      interactables: [
        {
          id: 'god_broadcast',
          type: 'clue',
          title: '主神提示',
          summary: '耳边响起冰冷的电子音。',
          detail: '"当前副本：零号样本。难度：低。世界背景：诺瓦生命科技地下实验室发生E-17泄漏，防疫系统封锁。主线任务：90分钟内抵达撤离平台并存活撤离。教学目标：学会观察房间、搜索线索、处理NPC、进入战斗和领取奖励。"',
          actions: [
            { id: 'acknowledge', label: '确认接收', effect: '你深吸一口气，准备进入实验室。' },
          ],
        },
        {
          id: 'corpse_search',
          type: 'item',
          title: '门口尸体',
          summary: '一具穿着实验服的尸体倒在门边。',
          detail: '尸体已经僵硬，但口袋里似乎还有东西。你小心翼翼地翻找着。',
          actions: [
            { id: 'search_corpse_1', label: '搜索尸体', effect: '你在尸体口袋里找到一张破损身份卡和一个手电筒。', effects: { addItem: '破损身份卡', noiseChange: 0 } },
          ],
        },
        {
          id: 'blood_trail',
          type: 'clue',
          title: '血迹',
          summary: '地上有新鲜的血迹拖向内部。',
          detail: '血迹很新鲜，看起来是不久前留下的。某种大型生物从里面拖走了人。',
          actions: [
            { id: 'examine_blood', label: '仔细检查', effect: '你发现血迹中混杂着某种蓝色液体，这可能是实验体的体液。', effects: { infectionChange: 2 } },
          ],
        },
        {
          id: 'gate_terminal',
          type: 'device',
          title: '大门控制面板',
          summary: '面板显示着研究所的封锁状态。',
          detail: '屏幕闪烁着红色警告：【A区已封锁】【B区供电中断】【安全门需要一级权限】。教程提示：当前可以先向东进入主走廊，再去值班室拿权限卡、去配电间恢复电力。',
          actions: [
            { id: 'check_layout', label: '查看研究所布局', effect: '你了解到研究所分为A区和B区，值班室在主走廊左侧，样本室在右侧，配电间在北侧。', effects: { xp: 10 } },
          ],
        },
      ],
    },

    // ==================== 2. 主走廊 ====================
    main_corridor: {
      id: 'main_corridor',
      name: '主走廊',
      type: 'story',
      description: '主走廊是第一个交通枢纽。左侧是值班室，右侧通向样本室，前方深处则是配电间和安全门。广播重复播放："请所有员工留在原地，救援即将抵达。"但地上全是弹壳和尸体，明显没人来救。',
      exits: [
        { direction: 'west', roomId: 'duty_room' },
        { direction: 'east', roomId: 'sample_room' },
        { direction: 'north', roomId: 'power_room' },
        { direction: 'up', roomId: 'security_gate' },
      ],
      enemies: [
        { name: '迟缓感染者', hp: 12, maxHp: 12, attack: 2, defense: 1, damage: 3, armor: 0, exp: 18, sidePlots: { D: 1 } },
      ],
      autoStartCombat: true,
      dynamicEnemies: true,
      dynamicEnemiesPerVisit: 0,
      onEnter: {
        fearCheck: false,
      },
      interactables: [
        {
          id: 'broadcast_ai',
          type: 'npc',
          title: 'AI"白匣子"广播',
          summary: '广播里传来AI"白匣子"的声音。',
          detail: '"请所有员工留在原地，救援即将抵达。检测到新生命体征，请前往最近的安全区域。"教程提示：遇到NPC、广播和线索时，先读摘要，再决定相信、质疑或忽略。',
          actions: [
            { id: 'listen_broadcast', label: '仔细聆听', effect: '你注意到广播的语气过于冷静，仿佛在伪装关怀。' },
            { id: 'ignore_broadcast', label: '忽略广播', effect: '你决定不被广播干扰。' },
          ],
        },
        {
          id: 'corridor_blood',
          type: 'clue',
          title: '墙上的血迹',
          summary: '走廊墙壁上有新鲜的血迹和拖拽痕迹。',
          detail: '血迹从样本室方向延伸过来，在配电间门口消失。看起来有人——或者什么东西——曾经在这里发生过激烈的冲突。',
          actions: [
            { id: 'examine_blood_2', label: '仔细检查', effect: '你发现血迹中混杂着某种蓝色液体，这可能是实验体的体液。', effects: { xp: 10 } },
          ],
        },
        {
          id: 'push_cabinet',
          type: 'device',
          title: '走廊柜子',
          summary: '一个沉重的金属柜子可以推动。',
          detail: '如果你推动柜子，可以挡住一侧通道，延缓怪物追击。',
          actions: [
            { id: 'push_cabinet_action', label: '推动柜子', effect: '你推动柜子挡住了一侧通道，噪音吸引了附近的感染者。', effects: { noiseChange: 15 } },
          ],
        },
      ],
    },

    // ==================== 3. 值班室 ====================
    duty_room: {
      id: 'duty_room',
      name: '值班室',
      type: 'chest',
      description: '值班室是第一个安全房。这里没有强制战斗，主要教学NPC选择、奖励获取和关键道具。受伤的保安队长罗森靠在墙边，终端还亮着。',
      exits: [{ direction: 'east', roomId: 'main_corridor' }],
      chestReward: {
        rewardPoints: 150,
        xp: 30,
        sidePlots: { D: 2 },
        items: ['蓝色权限卡', '手枪', '医用绷带', '急救喷雾', '值班日志'],
      },
      interactables: [
        {
          id: 'rosen',
          type: 'npc',
          title: '保安队长 罗森',
          summary: '一名受伤的保安靠在墙边，腹部受伤，感染未知。',
          detail: '罗森状态：腹部受伤，感染未知。性格：警惕、粗暴，但还保有人性。他死死握着蓝色权限卡，警惕地看着你。',
          actions: [
            {
              id: 'help_rosen',
              label: '救助罗森（需要医用绷带）',
              effect: '你替罗森止血，他感激地交出蓝色权限卡，并告诉你"B区有撤离平台"。',
              effects: {
                npcFavor: { '罗森': 3 },
                removeItem: '医用绷带',
                addItem: '蓝色权限卡',
                xp: 20,
              },
            },
            {
              id: 'threaten_rosen',
              label: '威胁罗森',
              effect: '你强行拿走权限卡，罗森愤怒地看着你。后期他可能拒绝协助。',
              effects: {
                npcFavor: { '罗森': -3 },
                addItem: '蓝色权限卡',
                rewardPoints: 20,
              },
            },
            {
              id: 'kill_rosen',
              label: '杀死罗森',
              effect: '你杀死了罗森，拿走了权限卡和手枪。主神扣除少量奖励点。',
              effects: {
                npcFavor: { '罗森': -10 },
                addItem: '蓝色权限卡',
                rewardPoints: -50,
              },
            },
          ],
        },
        {
          id: 'duty_terminal',
          type: 'device',
          title: '值班终端',
          summary: '终端上残留着B区封锁前的最后几条记录。',
          detail: '记录显示：23:41启动B区封锁，00:03安保失联，任何人不得开启样本室冷藏区。最后一条记录是："它们突破了B区防线，所有人员立即撤离——"记录在这里戛然而止。',
          actions: [
            { id: 'read_terminal', label: '阅读日志', effect: '你确认了B区封锁的时间线，也知道样本室并不是一条安全路线。', effects: { xp: 15 } },
            { id: 'access_security', label: '查看安保记录', effect: '你发现安保小队在B区全军覆没，只剩下雷克斯一人。', effects: { xp: 10 } },
          ],
        },
        {
          id: 'duty_log',
          type: 'clue',
          title: '值班日志',
          summary: '日志中写着关于A-01的记录。',
          detail: '"A-01的恢复速度超过预期。它不是感染者，更像是在学习。"',
          actions: [
            { id: 'read_log', label: '阅读日志', effect: '你了解到A-01的危险性远超普通感染者。', effects: { xp: 10, bossWeakness: 'A-01的恢复速度极快，普通武器难以消灭' } },
          ],
        },
      ],
    },

    // ==================== 4. 样本室 ====================
    sample_room: {
      id: 'sample_room',
      name: '样本室',
      type: 'combat',
      description: '白色冷雾从卡死的自动门缝中不断涌出，大半培养槽已经碎裂。这里教学"线索先行，战斗靠后"：你可以先记录研究资料，再清理冷藏区里的低阶感染体。',
      exits: [{ direction: 'west', roomId: 'main_corridor' }],
      enemies: [
        { name: '培养舱感染者', hp: 18, maxHp: 18, attack: 3, defense: 1, damage: 4, armor: 0, exp: 28, sidePlots: { D: 1 } },
        { name: '玻璃寄生虫', hp: 8, maxHp: 8, attack: 2, defense: 0, damage: 3, armor: 0, exp: 12, sidePlots: { D: 1 } },
      ],
      autoStartCombat: true,
      onEnter: {
        fearCheck: true,
      },
      interactables: [
        {
          id: 'linwei',
          type: 'npc',
          title: '研究员 林薇',
          summary: '她躲在样本柜后，精神濒临崩溃。',
          detail: '林薇知道的情报：1.诺瓦公司故意释放E-17进化株测试战斗数据。2.AI"白匣子"不是救援系统，而是实验监控系统。3.撤离平台需要两步启动：电力+监控室授权。4.原型体A-01会被高频声波短暂压制。',
          actions: [
            {
              id: 'escort_linwei',
              label: '护送她离开',
              effect: '你承诺保护林薇，她感激地加入你的队伍。开启支线"幸存者撤离"。',
              effects: { npcFavor: { '林薇': 3 } },
            },
            {
              id: 'interrogate_linwei',
              label: '逼问她',
              effect: '你逼问林薇，获得更多情报，但她精神崩溃，可能会逃跑。',
              effects: { npcFavor: { '林薇': -2 } },
            },
            {
              id: 'abandon_linwei',
              label: '放弃她',
              effect: '你决定不浪费时间在她身上。后期她可能变异成精英怪。',
              effects: { npcFavor: { '林薇': -5 } },
            },
            {
              id: 'give_antidote_linwei',
              label: '给她抗病毒剂',
              effect: '你给林薇注射抗病毒剂，她感激地帮你破解电脑。',
              effects: { npcFavor: { '林薇': 5 }, removeItem: '抗病毒剂' },
            },
          ],
        },
        {
          id: 'lab_note',
          type: 'clue',
          title: '研究记录',
          summary: '实验台上的记录可能影响你对终局实验体的判断。',
          detail: '记录指出，B区融合体会在短暂停滞时暴露核心部位。如果事先记住这个弱点，终局就不会只是硬碰硬。记录末尾有一行潦草的字迹："对不起，我们必须关闭B区——"',
          actions: [
            { id: 'record_weakness', label: '记录弱点', effect: '你记下了实验体的弱点。未来再面对它时，你会更有把握。', effects: { xp: 25, bossWeakness: 'A-01会在短暂停滞时暴露核心部位' } },
            { id: 'take_sample', label: '带走危险样本', effect: '你把样本封存起来，收益更高，但林博士显然不赞成。', effects: { rewardPoints: 100, npcFavor: { '林薇': -1 }, addItem: 'E-17抗体样本' } },
          ],
        },
        {
          id: 'broken_tank',
          type: 'device',
          title: '碎裂的培养槽',
          summary: '培养槽里还残留着一些蓝色液体。',
          detail: '液体散发着微弱的荧光，看起来像是某种基因改造剂。虽然不知道是否安全，但在紧急情况下可能有用。',
          actions: [
            {
              id: 'destroy_tank',
              label: '破坏样本罐',
              effect: '你破坏了样本罐，降低了后期怪物数量，但释放了毒雾。冷藏柜里残留的感染体被声音惊醒。',
              effects: {
                infectionChange: 10,
                noiseChange: 20,
                startCombat: true,
                spawnEnemies: [
                  { name: '惊醒的培养舱感染者', hp: 14, maxHp: 14, attack: 3, defense: 1, damage: 4, armor: 0, exp: 20, sidePlots: { D: 1 } },
                ],
              },
            },
            { id: 'collect_liquid', label: '收集液体', effect: '你收集了一些蓝色液体，也许能在关键时刻派上用场。', effects: { rewardPoints: 60 } },
          ],
        },
      ],
    },

    // ==================== 5. 配电间 ====================
    power_room: {
      id: 'power_room',
      name: '配电间',
      type: 'trap',
      description: '配电间里弥漫着焦糊味，成排配电柜噼啪作响。电弧的蓝光不时照亮墙壁上的焦痕，空气中充满了臭氧的味道。房间积水，电缆裸露。',
      exits: [
        { direction: 'south', roomId: 'main_corridor' },
        { direction: 'east', roomId: 'security_gate' },
      ],
      trapDamage: 6,
      trapEffect: 'shortCircuit',
      enemies: [
        { name: '电击感染者', hp: 18, maxHp: 18, attack: 3, defense: 1, damage: 5, armor: 0, exp: 28, sidePlots: { D: 1 } },
        { name: '管道爬行者', hp: 12, maxHp: 12, attack: 3, defense: 1, damage: 4, armor: 0, exp: 18, sidePlots: { D: 1 } },
      ],
      interactables: [
        {
          id: 'power_console',
          type: 'device',
          title: '配电控制台',
          summary: 'B区电力恢复的关键就在这排控制台上。',
          detail: '玩家需要调整三组开关：A组（照明）、B组（门禁）、C组（撤离平台预供电）。这是第一个轻量解谜：正确顺序会受一点电击但推进主线，强行合闸则更快但噪音更高。',
          actions: [
            {
              id: 'restore_power',
              label: '正确操作：关闭漏电→启动备用→重启门禁→启动撤离预供电',
              effect: '主供电逐段恢复，B区隔离门重新接受门禁卡验证。撤离平台预供电启动。',
              effects: { xp: 35, unlockExit: 'b_zone_corridor', startCombat: true },
            },
            {
              id: 'force_power',
              label: '强行合闸',
              effect: '你硬拉下总闸，刺耳警报在更深处回响起来。电力恢复，但吸引了大量感染者。',
              effects: {
                rewardPoints: 80,
                noiseChange: 50,
                startCombat: true,
                spawnEnemies: [
                  { name: '被警报吸引的感染者', hp: 12, maxHp: 12, attack: 3, defense: 1, damage: 4, armor: 0, exp: 18, sidePlots: { D: 1 } },
                ],
              },
            },
          ],
        },
        {
          id: 'circuit_breaker',
          type: 'device',
          title: '电路断路器',
          summary: '断路器可以暂时关闭某个区域的电力。',
          detail: '如果你关闭A区的电力，可能会让某些区域的感染者失去电力供应，但也可能导致其他区域的封锁失效。',
          actions: [
            { id: 'cut_power_a', label: '关闭A区电力', effect: '你关闭了A区电力，某些区域的感染者暂时失去了电力供应。' },
            { id: 'leave_power', label: '保持现状', effect: '你决定不冒险，保持现有电力供应。' },
          ],
        },
      ],
    },

    // ==================== 6. 安全门 ====================
    security_gate: {
      id: 'security_gate',
      name: '安全门',
      type: 'story',
      description: '厚重的安全隔离门横在尽头，识别面板仍在亮着。门上写着"B区：高危生物资产储存区"。教程提示：这扇门会检查你是否拿到蓝色权限卡、是否恢复电力。',
      exits: [
        { direction: 'west', roomId: 'power_room' },
        { direction: 'south', roomId: 'main_corridor' },
        { direction: 'east', roomId: 'b_zone_corridor' },
      ],
      onEnter: {
        fearCheck: true,
      },
      interactables: [
        {
          id: 'security_panel',
          type: 'device',
          title: '安全门面板',
          summary: '门禁芯片和供电状态都会在这里显示。',
          detail: '门上滚动显示着访问被拒绝的记录，直到你同时满足门禁卡与供电两个条件，它才会真正为你打开。',
          actions: [
            { id: 'scan_gate', label: '查看状态', effect: '门禁面板确认：需要蓝色权限卡与B区供电。若按钮仍显示锁定，请回值班室和配电间补齐步骤。' },
            { id: 'enter_b_zone', label: '尝试进入B区', effect: '你确认条件已经齐备，安全门缓缓向两侧滑开。', nextRoom: 'b_zone_corridor' },
          ],
        },
        {
          id: 'wrong_password',
          type: 'device',
          title: '密码输入',
          summary: '你可以尝试输入密码。',
          detail: '如果你输入密码错误3次，会触发警报，引来感染者。',
          actions: [
            {
              id: 'try_password',
              label: '尝试密码',
              effect: '你输入了错误的密码，警报响起！感染者被吸引过来了。',
              effects: { noiseChange: 30 },
            },
          ],
        },
        {
          id: 'force_door',
          type: 'device',
          title: '强行破门',
          summary: '你可以尝试暴力破门。',
          detail: '需要炸药或高力量角色，但会直接惊醒B区怪物。',
          actions: [
            {
              id: 'break_door',
              label: '强行破门',
              effect: '你强行破门而入，但直接惊醒了B区的怪物。',
              effects: { noiseChange: 50, timerChange: -300 },
            },
          ],
        },
      ],
    },

    // ==================== 7. B区通道 ====================
    b_zone_corridor: {
      id: 'b_zone_corridor',
      name: 'B区通道',
      type: 'combat',
      description: 'B区更加干净，但异常安静。墙壁上没有血迹，只有被利爪切开的钢板。这里不是正面击杀A-01的关卡，而是教学"遇到强敌时可以拖延、逃跑和利用环境"。',
      exits: [
        { direction: 'west', roomId: 'medical_room' },
        { direction: 'east', roomId: 'armory' },
        { direction: 'north', roomId: 'monitor_room' },
        { direction: 'south', roomId: 'security_gate' },
        { direction: 'up', roomId: 'evac_platform' },
      ],
      enemies: [
        { name: '警戒感染者', hp: 16, maxHp: 16, attack: 3, defense: 1, damage: 4, armor: 0, exp: 24, sidePlots: { D: 1 } },
        { name: '变异警卫', hp: 22, maxHp: 22, attack: 4, defense: 2, damage: 6, armor: 1, exp: 36, sidePlots: { D: 1 } },
      ],
      autoStartCombat: true,
      dynamicEnemies: true,
      dynamicEnemiesPerVisit: 0,
      onEnter: {
        fearCheck: true,
      },
      interactables: [
        {
          id: 'a01_appear',
          type: 'clue',
          title: 'A-01首次出现',
          summary: '天花板塌陷，原型体A-01出现。',
          detail: '它体型高大，有极强恢复能力，会学习玩家攻击方式。第一次遭遇时不可击杀，只能逃跑或拖延。教程提示：不是所有敌人都需要当场打死，环境交互也能解决问题。',
          actions: [
            {
              id: 'dodge_a01',
              label: '推倒货架阻挡',
              effect: '你推倒货架阻挡A-01，争取了逃跑时间。',
              effects: { timerChange: -60 },
            },
            {
              id: 'shoot_pipe',
              label: '射击管道制造蒸汽',
              effect: '你射击管道，蒸汽弥漫，A-01暂时失去视野。',
              effects: { noiseChange: 25 },
            },
            {
              id: 'flash_grenade',
              label: '使用闪光弹',
              effect: '你投掷闪光弹，A-01被强光致盲。',
              effects: { removeItem: '闪光弹' },
            },
          ],
        },
        {
          id: 'battlefield_reading',
          type: 'clue',
          title: '交火痕迹',
          summary: '这里保留着安保小队最后的防线痕迹。',
          detail: '墙上的枪痕和拖拽痕迹说明：B区不是被零散感染者攻破的，而是被更高阶的实验体正面冲碎。',
          actions: [
            { id: 'inspect_corridor', label: '观察战场', effect: '你确认越接近撤离平台，压力只会越来越大。', effects: { xp: 15 } },
          ],
        },
        {
          id: 'b_zone_map',
          type: 'clue',
          title: 'B区布局图',
          summary: '墙上贴着B区的简易布局图。',
          detail: '布局图显示B区分为三个主要区域：医务室、武器保管室和监控室。撤离平台在最深处，需要通过监控室才能到达。',
          actions: [
            { id: 'study_map', label: '研究布局', effect: '你对B区的布局有了清晰的了解。', effects: { xp: 10 } },
          ],
        },
      ],
    },

    // ==================== 8. 医务室 ====================
    medical_room: {
      id: 'medical_room',
      name: '医务室',
      type: 'rest',
      description: '医务室被临时改造成隔离病房，床上绑着几名半感染员工。这里教学治疗、感染值和道德选择。作为新手关，休整会恢复一半生命。',
      exits: [{ direction: 'east', roomId: 'b_zone_corridor' }],
      restHealPercent: 50,
      interactables: [
        {
          id: 'heche',
          type: 'npc',
          title: '实习医生 何澈',
          summary: '年轻、紧张，但懂医学。',
          detail: '何澈被困在医务室，他知道如何制作抗病毒剂。如果你救下他，他可以帮你降低感染值。如果玩家抢夺药品不救人，他会记恨，后期可能关门不让玩家进入。',
          actions: [
            {
              id: 'save_heche',
              label: '救助何澈',
              effect: '你帮何澈松绑，他感激地加入你的队伍，承诺帮你治疗感染。',
              effects: { npcFavor: { '何澈': 3 } },
            },
            {
              id: 'rob_heche',
              label: '抢夺药品',
              effect: '你强行拿走何澈的药品，他愤怒地看着你。',
              effects: { npcFavor: { '何澈': -3 }, addItem: '抗病毒剂' },
            },
            {
              id: 'ignore_heche',
              label: '无视他',
              effect: '你决定不浪费时间在他身上。',
              effects: { npcFavor: { '何澈': -1 } },
            },
          ],
        },
        {
          id: 'antidote_recipe',
          type: 'device',
          title: '医疗电脑',
          summary: '电脑里有抗病毒剂的制作配方。',
          detail: '你需要医疗材料和电脑才能制作抗病毒剂。',
          actions: [
            {
              id: 'make_antidote',
              label: '制作抗病毒剂（需要医疗材料）',
              effect: '你按照配方制作了一支抗病毒剂。',
              effects: { addItem: '抗病毒剂', removeItem: '医疗材料' },
            },
            {
              id: 'check_infection',
              label: '查看感染值',
              effect: '你查看了自己的感染值。',
              effects: { xp: 5 },
            },
          ],
        },
        {
          id: 'medical_supplies',
          type: 'item',
          title: '医疗物资',
          summary: '医务室里还有一些基本的医疗用品。',
          detail: '止血带、消毒剂和几支肾上腺素。虽然不多，但在关键时刻可能救你一命。',
          actions: [
            { id: 'take_medical', label: '收集医疗物资', effect: '你收集了医疗物资，获得了医疗材料。', effects: { addItem: '医疗材料' } },
          ],
        },
        {
          id: 'infected_patients',
          type: 'clue',
          title: '感染病患',
          summary: '病床上绑着几名半感染员工。',
          detail: '你可以选择解开束缚救他们，也可能释放怪物。',
          actions: [
            {
              id: 'free_patients',
              label: '解开束缚',
              effect: '你解开了病人的束缚，但他们已经感染太深，变成了怪物！',
              effects: {
                noiseChange: 20,
                startCombat: true,
                spawnEnemies: [
                  { name: '半感染病患', hp: 10, maxHp: 10, attack: 2, defense: 0, damage: 3, armor: 0, exp: 12, sidePlots: { D: 1 } },
                  { name: '半感染病患', hp: 10, maxHp: 10, attack: 2, defense: 0, damage: 3, armor: 0, exp: 12, sidePlots: { D: 1 } },
                ],
              },
            },
            {
              id: 'leave_patients',
              label: '保持束缚',
              effect: '你决定不冒险，让他们继续绑着。' },
          ],
        },
      ],
    },

    // ==================== 9. 武器保管室 ====================
    armory: {
      id: 'armory',
      name: '武器保管室',
      type: 'chest',
      description: '铁门上布满抓痕，但锁体依然完好。这里教学补给选择：武器能缩短战斗，但枪声和爆炸会提高噪音。新手关只提供基础武装，避免一上来数值膨胀。',
      exits: [{ direction: 'west', roomId: 'b_zone_corridor' }],
      chestReward: {
        rewardPoints: 120,
        xp: 35,
        sidePlots: { D: 2 },
        items: ['手枪弹药', '闪光弹', '燃烧瓶', '战术匕首', '防咬护甲', '高频诱导器部件'],
      },
      interactables: [
        {
          id: 'armory_lock',
          type: 'device',
          title: '武器柜锁',
          summary: '武器柜需要特殊方式打开。',
          detail: '需要罗森的指纹，或从监控室远程解锁，或暴力破坏门锁。',
          actions: [
            {
              id: 'rosen_fingerprint',
              label: '使用罗森指纹（需要罗森协助）',
              effect: '你用罗森的指纹打开了武器柜。',
              effects: { npcFavor: { '罗森': 1 } },
            },
            {
              id: 'remote_unlock',
              label: '远程解锁（需要监控室）',
              effect: '你从监控室远程解锁了武器柜。',
            },
            {
              id: 'force_lock',
              label: '暴力破坏',
              effect: '你强行破坏了门锁，但触发了自动炮塔！',
              effects: { noiseChange: 40 },
            },
          ],
        },
        {
          id: 'auto_turret',
          type: 'device',
          title: '自动炮塔',
          summary: '你拿走重型武器后，系统识别为"入侵者"，触发自动炮塔。',
          detail: '你可以关闭炮塔电源、让黑客型角色破解、用尸体挡住识别镜头，或强行冲过去。',
          actions: [
            {
              id: 'disable_turret',
              label: '关闭炮塔电源',
              effect: '你成功关闭了炮塔电源。',
            },
            {
              id: 'block_turret',
              label: '用尸体挡住识别镜头',
              effect: '你用尸体挡住了炮塔的识别镜头。',
              effects: { infectionChange: 5 },
            },
            {
              id: 'rush_turret',
              label: '强行冲过去',
              effect: '你强行冲过炮塔的射击范围，受到了伤害。',
              effects: { damage: 20 },
            },
          ],
        },
        {
          id: 'armory_stock',
          type: 'item',
          title: '武器与补给',
          summary: '这里保留着研究所最后一批可用物资。',
          detail: '弹药、护甲片和应急喷雾整齐堆放在架子上。角落里还有一把霰弹枪，虽然老旧，但依然致命。',
          actions: [
            { id: 'collect_armory', label: '全部带走', effect: '你尽可能带走了最关键的补给。', effects: { rewardPoints: 120, xp: 25 } },
          ],
        },
      ],
    },

    // ==================== 10. 监控室 ====================
    monitor_room: {
      id: 'monitor_room',
      name: '监控室',
      type: 'story',
      description: '数十个屏幕显示不同区域。玩家能看到自己刚才经过的房间，说明一切都被监视。这里教学终局前的信息整理：下载证据会增加奖励，但会压缩时间。',
      exits: [{ direction: 'south', roomId: 'b_zone_corridor' }],
      interactables: [
        {
          id: 'white_box_ai',
          type: 'npc',
          title: 'AI"白匣子"',
          summary: '它一直假装是救援广播，实际上是实验室管理AI。',
          detail: 'AI的真实目的：它不想让玩家离开，因为玩家和A-01的战斗数据非常珍贵。它会不断诱导玩家。',
          actions: [
            {
              id: 'ai_mislead',
              label: '相信AI',
              effect: '"请前往撤离平台。救援程序已经启动。"',
              effects: { npcFavor: { '白匣子': 2 } },
            },
            {
              id: 'ai_suspect',
              label: '质疑AI',
              effect: '"你们不是受害者，你们是新的实验组。"',
              effects: { npcFavor: { '白匣子': -2 } },
            },
          ],
        },
        {
          id: 'monitor_feed',
          type: 'device',
          title: '撤离平台监控',
          summary: '监控捕捉到了A-01的巡逻规律。',
          detail: '那东西并不是持续狂暴，它会在一小段停滞间隔暴露出核心部位。如果你把握好那个时机，就有机会压制它。',
          actions: [
            { id: 'study_boss', label: '记录巡逻规律', effect: '你记住了实验体的停滞间隔，终局不再完全未知。', effects: { xp: 30, bossWeakness: 'A-01会在短暂停滞时暴露核心部位' } },
          ],
        },
        {
          id: 'download_data',
          type: 'device',
          title: '下载数据',
          summary: '你可以下载零号样本资料芯片。',
          detail: '下载数据会揭露诺瓦公司的真相，但会触发自毁倒计时提前。',
          actions: [
            {
              id: 'download_chip',
              label: '下载零号样本资料芯片',
              effect: '你下载了资料芯片，揭露了诺瓦公司的真相。但自毁倒计时提前了！',
              effects: { addItem: '零号样本资料芯片', timerChange: -600, npcFavor: { '白匣子': -3 } },
            },
            {
              id: 'delete_ai',
              label: '删除AI数据',
              effect: '你删除了AI的数据，AI反击，释放更多怪物！但A-01会失去部分指挥辅助。',
              effects: { npcFavor: { '白匣子': -5 }, noiseChange: 40, timerChange: -300 },
            },
            {
              id: 'upload_truth',
              label: '上传病毒真相给外界',
              effect: '你完成了隐藏支线，但自毁倒计时提前。',
              effects: { timerChange: -600, npcFavor: { '白匣子': -5 } },
            },
          ],
        },
        {
          id: 'start_high_freq',
          type: 'device',
          title: '高频广播',
          summary: '你可以启动高频广播削弱A-01。',
          detail: '高频声波能短暂压制A-01，为终局战斗创造优势。',
          actions: [
            {
              id: 'activate_high_freq',
              label: '启动高频广播',
              effect: '高频广播启动，A-01在远处痛苦地嘶吼。',
              effects: { bossWeakness: '高频声波能短暂压制A-01' },
            },
          ],
        },
      ],
    },

    // ==================== 11. 撤离平台 ====================
    evac_platform: {
      id: 'evac_platform',
      name: '撤离平台',
      type: 'boss',
      description: '撤离平台上横倒着几辆运输车，探照灯忽明忽暗。平台升降机缓慢启动，地面震动。广播宣布："自毁程序启动。剩余时间：10分钟。"这是教学Boss：A-01很吓人，但数值被压低，真正重点是利用前面学过的线索和交互。',
      exits: [
        { direction: 'down', roomId: 'b_zone_corridor' },
        { direction: 'east', roomId: 'escape_lift' },
      ],
      enemies: [
        { name: '原型体 A-01（受损）', hp: 90, maxHp: 90, attack: 6, defense: 3, damage: 9, armor: 1, exp: 120, sidePlots: { D: 4, C: 1 } },
      ],
      autoStartCombat: true,
      interactables: [
        {
          id: 'final_strategy',
          type: 'clue',
          title: '终局判断',
          summary: '这里就是研究所最后的封锁点。',
          detail: '撤离平台空旷、退路极少，但你已经学过搜索、NPC、补给、环境机关和弱点判断。终局不要求硬拼，使用高频诱导器、喷焰、燃料管道或样本诱导都能争取优势。',
          actions: [
            { id: 'steady_heart', label: '稳住心神', effect: '你强迫自己忽略警报和尸体的味道，把全部注意力放在实验体身上。', effects: { xp: 20 } },
          ],
        },
        {
          id: 'boss_weakness_final',
          type: 'clue',
          title: '实验体弱点',
          summary: '如果你之前记录了弱点，这里会提供额外信息。',
          detail: '实验体的核心部位在胸腔中央，被厚厚的外壳保护着。它会在短暂停滞时暴露这个弱点——那就是你的机会。',
          actions: [
            { id: 'exploit_weakness', label: '利用弱点', effect: '你记住了实验体的弱点，战斗中将获得额外优势。', effects: { xp: 30 } },
          ],
        },
        {
          id: 'escape_options',
          type: 'clue',
          title: '逃离选项',
          summary: '你可以选择多种方式击败或拖延A-01。',
          detail: '用高频诱导器眩晕它、开启平台喷焰烧伤它、引爆燃料管道、牺牲NPC拖住它、把病毒样本扔给它引诱它远离升降机。',
          actions: [
            {
              id: 'use_high_freq',
              label: '使用高频诱导器',
              effect: '你启动高频诱导器，A-01痛苦地蜷缩，为你争取了时间。',
              effects: { removeItem: '高频诱导器部件' },
            },
            {
              id: 'use_flame',
              label: '开启平台喷焰',
              effect: '你启动平台喷焰，火焰灼烧着A-01。',
            },
            {
              id: 'use_pipe',
              label: '引爆燃料管道',
              effect: '你引爆了燃料管道，巨大的爆炸将A-01炸飞。',
              effects: { noiseChange: 50, timerChange: -120 },
            },
            {
              id: 'use_sample',
              label: '把病毒样本扔给它',
              effect: '你把病毒样本扔向A-01，它被样本吸引，远离了升降机。',
              effects: { removeItem: 'E-17抗体样本' },
            },
          ],
        },
        {
          id: 'seal_a01',
          type: 'device',
          title: '封印A-01',
          summary: '你可以尝试封印A-01而不是杀死它。',
          detail: '启动冷冻仓，将A-01冰封在零下180度的环境中。',
          actions: [
            {
              id: 'freeze_a01',
              label: '启动冷冻仓',
              effect: '你启动了冷冻仓，A-01被冰封。它的眼睛依然在盯着你，仿佛在说："我会回来的。"',
              effects: { ending: 'seal' },
            },
          ],
        },
      ],
    },

    // ==================== 12. 升降机撤离点 ====================
    escape_lift: {
      id: 'escape_lift',
      name: '升降机撤离点',
      type: 'exit',
      description: '实验体终于倒在平台中央，升降机门缓缓开启。你回头看了一眼失控研究所，随后踏入了通向生还的唯一通道。',
      exits: [],
      interactables: [
        {
          id: 'evac_complete',
          type: 'clue',
          title: '撤离程序',
          summary: '升降机已经就位，所有撤离条件均已满足。',
          detail: '你已经在这个研究所里拿到了足够多的情报、补给与代价。现在唯一正确的决定，就是带着这些东西活着离开。',
          actions: [
            {
              id: 'board_lift',
              label: '登上升降机',
              effect: '你成功突破研究所，完成了生化危机副本。',
              effects: { ending: 'normal' },
            },
          ],
        },
      ],
    },
  },
  quests: RESIDENT_EVIL_QUESTS,
}

// ==================== 导出 ====================

export const dungeonScenarios: DungeonMap[] = [
  RESIDENT_EVIL_LAB_MAP,
]

export function getDungeonById(id: string): DungeonMap | undefined {
  return dungeonScenarios.find((d) => d.id === id)
}
