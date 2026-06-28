/**
 * 副本系统 V2 — 配置常量
 *
 * ==================== 设计原则 ====================
 * 所有副本相关数值常量集中在此文件管理
 * 修改数值只需在此文件中修改，无需搜索整个代码库
 * 禁止在业务代码中硬编码数字
 *
 * ==================== 如何扩展 ====================
 * 1. 添加新的配置项到对应的部分
 * 2. 在代码中使用 DUNGEON_V2_CONFIG.xxx 引用配置值
 * 3. 新增副本时不需要修改此文件（副本专属配置在 data/dungeons/xxx/meta.ts 中）
 */

// ==================== 回合消耗配置 ====================

/**
 * 各动作消耗的回合数
 * 基于需求文档第六节"回合系统"
 */
export const TURN_COST: Record<string, number> = {
  move: 1,              // 移动到相邻房间
  quick_search: 1,      // 快速搜索
  deep_search: 2,       // 彻底搜索
  hack: 1,              // 黑客
  repair: 1,            // 修复设备（部分场景2回合，由 conditional_action.turn_cost 覆盖）
  combat_round: 1,      // 战斗一轮
  key_dialogue: 1,      // 关键对话
  heal: 1,              // 治疗
  destroy: 1,           // 破坏设备
  sample: 1,            // 取样
  rest: 1,              // 休息
  inspect: 0,           // 检查（不消耗回合）
  open_door: 0,         // 开门（不消耗回合，但可能触发事件消耗回合）
  use_item: 0,          // 使用道具（不消耗回合，特殊道具除外）
  talk_npc: 0,          // 交谈（不消耗回合，关键对话除外）
  view_map: 0,          // 查看地图
  view_inventory: 0,    // 查看背包
  view_quests: 0,       // 查看任务
  view_npc_status: 0,   // 查看 NPC 状态
  evacuate: 0,          // 撤离（触发结局判定）
}

// ==================== 感染值阈值 ====================

/**
 * 感染值阶段及效果
 * 基于需求文档，感染值影响玩家行动
 */
export const INFECTION_THRESHOLDS = {
  safe:     { min: 0,  max: 30,  name: '轻微感染', effect: '无明显影响' },
  mild:     { min: 31, max: 60,  name: '中度感染', effect: '偶尔咳嗽，行动检定降低' },
  severe:   { min: 61, max: 80,  name: '重度感染', effect: '视野模糊，可能误伤队友' },
  critical: { min: 81, max: 99,  name: '危重感染', effect: '随机失控' },
  lethal:   { min: 100,max: 100, name: '感染失控', effect: '变异，角色死亡' },
} as const

/** 感染值上限 */
export const MAX_INFECTION = 100

// ==================== 警戒值配置（已模块化） ====================
//
// 警戒值阈值和阶段效果已迁移到每个副本的 data/dungeons/xxx/alert.ts 文件中。
// 每个副本独立配置警戒值阶段（AlertTier[]）、遭遇加成、NPC恐惧等。
// 引擎通过 DungeonBundle.alert_config → DungeonRuntimeState.alert_config 读取。
// 不使用警戒值系统的副本不提供 alert_config，security_alert 无实际效果。
//
// 参见: data/dungeons/biohazard/alert.ts
// 类型定义: types/dungeon-v2.ts → AlertConfig / AlertTier

/** 警戒值默认上限（副本未提供 AlertConfig 时使用） */
export const MAX_SECURITY_ALERT = 100

// ==================== 搜索配置（已模块化） ====================
//
// 搜索配置已迁移到每个副本的 data/dungeons/xxx/search.ts 文件中。
// 每个副本独立配置搜索物品池、失败惩罚、DC 等。
// 引擎通过 DungeonBundle.search_table 读取配置。
//
// 参见: data/dungeons/biohazard/search.ts
// 类型定义: types/dungeon-v2.ts → SearchTable

// ==================== NPC 配置 ====================

/**
 * NPC 信任值与恐惧值范围
 */
export const NPC_CONFIG = {
  // ==================== 范围与阈值 ====================
  TRUST_MIN: -100,
  TRUST_MAX: 100,
  FEAR_MIN: 0,
  FEAR_MAX: 100,
  /** 信任值低于此值时 NPC 可能背叛 */
  BETRAYAL_TRUST_THRESHOLD: -20,
  /** 信任值高于此值时 NPC 可能交出隐藏物品 */
  HIGH_TRUST_THRESHOLD: 50,
  /** 恐惧值高于此值时 NPC 可能逃跑 */
  FLEE_FEAR_THRESHOLD: 80,
  /** 敌视阈值（信任 <= -50） */
  TRUST_HOSTILE_THRESHOLD: -50,
  /** 愿意牺牲阈值（信任 >= 80） */
  TRUST_SACRIFICE_THRESHOLD: 80,
  /** 容易失控阈值（恐惧 >= 60） */
  FEAR_PANIC_THRESHOLD: 60,
  /** 崩溃阈值（恐惧 >= 100） */
  FEAR_BREAKDOWN_THRESHOLD: 100,

  // ==================== 数量 ====================
  /** 随机生成新人轮回者数量（不含引导型） */
  NPC_COUNT: 3,

  // ==================== 信任值变化常量 ====================
  TRUST_CHANGE: {
    GIVE_MEDICAL: 15,         // 给医疗道具
    RESCUE_NPC: 25,           // 救 NPC 脱险
    ABANDON_NPC: -40,         // 抛弃 NPC
    STEAL_ITEM: -30,          // 抢 NPC 道具
    ATTACK_NPC: -100,         // 攻击 NPC
    COMPLETE_SIDE_QUEST: 20,  // 带 NPC 完成支线
    HIDE_INFECTION: -20,      // 隐瞒感染风险
    COMFORT: 10,              // 安慰
    GIVE_WEAPON: 15,          // 分配武器
    DEFEAT_STRONG_ENEMY: 15,  // 成功击败强敌
  },

  // ==================== 恐惧值变化常量 ====================
  FEAR_CHANGE: {
    SEE_CORPSE: 10,           // 看到尸体
    SEE_NPC_DEATH: 30,        // 看到 NPC 死亡
    SURROUNDED: 15,           // 被感染体围攻
    PLAYER_LOW_HP: 10,        // 玩家低生命
    COUNTDOWN_START: 20,      // 倒计时开启
    PLAYER_PRESSURE: 10,      // 玩家对 NPC 施压
    COMFORT: -15,             // 玩家安慰
    GIVE_WEAPON: -10,         // 玩家分配武器
    SAFE_HOUSE_REST: -20,     // 完成安全屋休整
    HEAL_BY_RAIN: -15,        // Rain 治疗
    DEFEAT_STRONG_ENEMY: -15, // 成功击败强敌
  },

  // ==================== 命运标记类型 ====================
  /** NPC 命运标记可选值 */
  FATE_FLAGS: [
    'none',      // 无标记（初始状态）
    'survive',   // 存活到撤离
    'sacrifice', // 为玩家牺牲
    'betray',    // 背叛玩家
    'infect',    // 感染变异
    'scatter',   // 剧情节点分散
    'flee',      // 恐惧逃跑
    'death',     // 死亡（非变异）
    'guide',     // 引导型（永不离开）
    'rain',      // Rain Ocampo 专属
    'movie',     // 电影角色通用
  ] as const,
}

// ==================== 自毁倒计时配置 ====================

/**
 * 自毁倒计时相关配置
 *
 * ==================== 生化危机副本专属 ====================
 * 以下配置仅用于生化危机·蜂巢副本。
 * 其他副本不使用自毁系统，这些常量不会被引用。
 */
export const SELF_DESTRUCT_CONFIG = {
  /** 红后处理后启动自毁的初始回合数 */
  INITIAL_COUNTDOWN: 50,
  /** 倒计时归零时判定失败 */
  FAILURE_AT_ZERO: true,
  /** 最后 5 回合内撤离触发惨胜结局 */
  DESPERATE_ESCAPE_THRESHOLD: 5,

  // -------------------- 自毁启动后：通道封锁 --------------------
  /** 自毁启动后封锁的通道（双向），格式 "fromRoom->toRoom"
   *
   *  封锁原则：V2 设计 — 阻止玩家返回入口区/员工区探索，封锁南区死路，
   *  保留撤离路线 K3→K4→J5→K5 和 K3→J3→J4→J5→K5。
   *  新增：I3→J3 防火门关闭，H3→I3 塌陷，D3→E3 封锁门落下，
   *  E4→F4 样本库封锁，H5→I5 变异巢穴塌陷，B5→C5 泵管道进水。
   */
  BLOCKED_PASSES: [
    // 入口区封锁（阻止返回安检大厅）
    'D3->E3', 'E3->D3',
    // 北区入口封锁（阻止返回楼上研究区）
    'D3->D2', 'D2->D3',
    'F3->F2', 'F2->F3',
    'G3->G2', 'G2->G3',
    'H3->H1', 'H1->H3',
    // 监控区塌陷（不能原路返回激光入口）
    'H3->I3', 'I3->H3',
    // 激光走廊防火门关闭（不能无限往返）
    'I3->J3',
    // 样本库自动封锁（未取样时通过红卡或 Kaplan 可再开一次）
    // 注意：此封锁有条件例外，引擎需特殊处理
    // 南区死路封锁（阻止探索非撤离区域）
    'F4->F5', 'F5->F4',
    'G4->G5', 'G5->G4',
    'H4->H5', 'H5->H4',
    'I4->I5', 'I5->I4',
    // 变异巢穴塌陷
    'H5->I5',
    // 泵管道进水
    'B5->C5',
  ],

  // -------------------- 自毁启动后：遭遇提升 --------------------
  /** 自毁期间随机遭遇概率额外加成（叠加到房间基础概率上） */
  ENCOUNTER_BONUS: 0.2,

  // -------------------- 自毁启动后：敌人加速 --------------------
  /** 自毁期间敌人速度加成（叠加到敌人基础速度上） */
  ENEMY_SPEED_BONUS: 3,

  // -------------------- 自毁启动后：BOSS 追踪 --------------------
  /** 自毁启动后多少回合 BOSS 开始追击玩家 */
  BOSS_TRACKING_DELAY: 15,
  /** BOSS 追击的敌人 ID（生化危机副本的最终 BOSS — Licker 舔食者） */
  BOSS_ENEMY_ID: 'licker_alpha',
  /** BOSS 削弱上限层数 */
  BOSS_WEAKEN_MAX: 4,
  /** 每层削弱减少的 BOSS 最大生命百分比 */
  BOSS_WEAKEN_PER_LEVEL: 0.1,
}

// ==================== 战斗配置 ====================

/**
 * 副本内战斗相关配置
 * 战斗底层复用 D10 骰子系统（systems/dice.ts）
 */
export const DUNGEON_COMBAT_CONFIG = {
  /** 最大战斗回合数（超过则自动判定逃跑） */
  MAX_ROUNDS: 30,
  /** 逃跑成功率（基础值） */
  FLEE_SUCCESS_RATE: 0.5,
  /** 感染值超过此值时战斗中可能失控 */
  COMBAT_INFECTION_RISK_THRESHOLD: 60,
}

// ==================== 评语/结算配置 ====================

/**
 * 副本评语等级配置
 * 根据任务完成度和全局状态给出评语
 */
export const RATING_CONFIG = {
  /** 各等级评语配置（从高到低） */
  ratings: [
    {
      rating: 'S' as const,
      title: '完美突破',
      description: '所有主线任务完成，支线全清，NPC 全存活，感染值低。主神评价：出色。',
      conditions: {
        min_quests_completed: 10,
        min_main_quests_completed: 7,
        max_infection: 30,
        min_npcs_alive: 2,
      },
      reward_multiplier: 1.5,
    },
    {
      rating: 'A' as const,
      title: '高效撤离',
      description: '主线全部完成，大部分支线完成。主神评价：优秀。',
      conditions: {
        min_quests_completed: 8,
        min_main_quests_completed: 7,
        max_infection: 60,
      },
      reward_multiplier: 1.2,
    },
    {
      rating: 'B' as const,
      title: '标准完成',
      description: '主线全部完成。主神评价：合格。',
      conditions: {
        min_main_quests_completed: 7,
      },
      reward_multiplier: 1.0,
    },
    {
      rating: 'C' as const,
      title: '勉强逃离',
      description: '主线大部分完成，感染严重。主神评价：勉强通过。',
      conditions: {
        min_main_quests_completed: 5,
      },
      reward_multiplier: 0.7,
    },
    {
      rating: 'D' as const,
      title: '惨胜',
      description: '险些失败，勉强活着离开。主神评价：不及格但有进步空间。',
      conditions: {},
      reward_multiplier: 0.5,
    },
  ],
}

// ==================== 地图网格配置 ====================

/**
 * 地图网格渲染配置
 */
export const MAP_GRID_CONFIG = {
  /** 列标签 */
  COL_LABELS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
  /** 行数 */
  ROWS: 7,
  /** 格子尺寸（px） */
  CELL_SIZE: 64,
  /** 格子间距（px） */
  CELL_GAP: 4,
}

// ==================== 感染值影响 ====================

/**
 * 感染值对战斗属性的影响
 */
export const INFECTION_COMBAT_PENALTY = {
  /** 中度感染：攻击检定 -1 */
  mild_penalty: 1,
  /** 重度感染：攻击检定 -2，可能误伤队友 */
  severe_penalty: 2,
  /** 危重感染：随机失控概率 10% */
  critical_rampage_rate: 0.1,
}

// ==================== 技能检定配置 ====================

/**
 * 技能成长配置（用进成长途径）
 * 检定成功时有概率自动提升技能等级
 */
export const SKILL_GROWTH_CONFIG = {
  /** 检定成功时的技能成长基础概率 */
  GROWTH_CHANCE: 0.20,         // 20%基础概率
  /** DC每+1，成长概率追加（高难度检定更容易成长） */
  GROWTH_CHANCE_PER_DC: 0.05,  // 每DC追加5%
  /** 成长概率上限 */
  GROWTH_CHANCE_MAX: 0.50,     // 最多50%
  /** 技能等级上限（与XP升级一致） */
  MAX_LEVEL: 12,
}

/**
 * 默认骰基础骰配置
 * 无技能检定时，按DC档位给予基础骰
 * 模拟"复杂任务有更多尝试空间"
 *
 * ==================== DC 设计指南（重新标定后） ====================
 * 检定公式：DP = max(floor(属性值 / 5), 1) + 技能等级（或基础骰）
 * 每枚 D10 ≈ 30% 成功概率（≥8计成功，10额外加投）
 *
 * DC 1（简单）：新手可过，推荐用于入门检定
 *   - 新手(属性4, 技能1)：DP=1+1=2，期望~0.6成功，约50%通过
 *   - 默认骰：DP=1+2=3，期望~0.9成功，约55%通过
 *
 * DC 2（普通）：早期角色主力检定
 *   - 早期(属性8, 技能2)：DP=1+2=3，期望~0.9成功，约25%通过
 *   - 中期(属性15, 技能3)：DP=3+3=6+1加成，期望~2.8成功，约75%通过
 *
 * DC 3（中等）：中期角色挑战检定
 *   - 中期(属性15, 技能3)：DP=3+3=6+1加成，期望~2.8成功，约45%通过
 *   - 后期(属性25, 技能6)：DP=5+6=11+2加成，期望~5.6成功，约95%通过
 *
 * DC 4（困难）：后期角色主力检定
 *   - 后期(属性25, 技能6)：DP=5+6=11+2加成，期望~5.6成功，约70%通过
 *   - 极限(属性36, 技能12)：DP=7+12=19+4加成，期望~10.3成功，约99%通过
 *
 * DC 5（极难）：极限角色挑战检定
 *   - 极限(属性36, 技能12)：DP=7+12=19+4加成，期望~10.3成功，约70%通过
 *
 * DC 6（超难）：仅限极限角色尝试
 *   - 极限(属性36, 技能12)：DP=7+12=19+4加成，期望~10.3成功，约35%通过
 */
export const DEFAULT_DICE_BASE: Record<number, number> = {
  1: 2,   // DC 1 → 2基础骰
  2: 3,   // DC 2 → 3基础骰
  3: 4,   // DC 3 → 4基础骰
  4: 5,   // DC 4 → 5基础骰
  5: 6,   // DC 5 → 6基础骰
  6: 7,   // DC 6+ → 7基础骰
}

/**
 * 意志力重试配置
 * 检定失败后可花费意志力重试
 */
export const WILLPOWER_RETRY_CONFIG = {
  /** 每次重试消耗的意志力 */
  COST_PER_RETRY: 1,
}

// ==================== 战棋系统配置 ====================

/**
 * 战棋（Tactics）系统配置
 *
 * ==================== 设计原则 ====================
 * 所有战棋相关数值集中在此管理，方便策划自行调参。
 * 涵盖网格大小、移动力、射程、行动规则、阵型、自动播放速度、AI 策略等。
 *
 * ==================== 参数调优指南 ====================
 * - GRID_WIDTH / GRID_HEIGHT：网格越大，战斗越长但策略空间越大
 * - DEFAULT_MOVE_RANGE：移动力越大，接战越快，回合数越少
 * - AUTO_PLAY_INTERVAL_MS：自动模式下回合间隔（毫秒），越小越快
 * - MELEE_RANGE / RANGED_RANGE：射程决定接战距离，影响走位需求
 *
 * ==================== 扩展预留 ====================
 * - MOVE_DIRECTIONS：当前为 '4dir'（上下左右），预留 '8dir' 支持 8 方向移动
 * - AI_TARGET_STRATEGY：当前为 'nearest'（最近敌人），预留 'lowest_hp' 等策略
 * - ENABLE_OBSTACLES：当前为 false（无障碍），预留 true 时启用障碍物系统
 */
export const TACTICS_CONFIG = {
  // ==================== 网格配置 ====================
  /** 网格宽度（列数），默认 6 */
  GRID_WIDTH: 6,
  /** 网格高度（行数），默认 6 */
  GRID_HEIGHT: 6,

  // ==================== 移动力配置 ====================
  /** 默认移动力（每回合可移动的格数），所有单位统一 */
  DEFAULT_MOVE_RANGE: 3,
  /** 移动方向模式：'4dir'=上下左右四方向（预留 '8dir'=含对角线八方向） */
  MOVE_DIRECTIONS: '4dir' as '4dir' | '8dir',

  // ==================== 行动规则 ====================
  /** 每回合可移动次数（默认1次） */
  MOVE_PER_TURN: 1,
  /** 每回合可攻击次数（默认1次） */
  ATTACK_PER_TURN: 1,
  /** 是否允许先攻击后移动（true=移动和攻击顺序自由，false=必须先移动后攻击） */
  ALLOW_ATTACK_BEFORE_MOVE: true,

  // ==================== 射程配置 ====================
  /** 近战默认射程（1=相邻格） */
  MELEE_RANGE: 1,
  /** 远程默认射程 */
  RANGED_RANGE: 3,
  /** 射程判定距离算法：'chebyshev'=切比雪夫距离（含对角线相邻），'manhattan'=曼哈顿距离（仅正交相邻） */
  RANGE_CALCULATION: 'chebyshev' as 'chebyshev' | 'manhattan',

  // ==================== 阵型配置 ====================
  /** 我方默认放置区域（x 坐标范围，网格左侧） */
  PLAYER_ZONE: { x_min: 0, x_max: 1 },
  /** 敌方默认放置区域（x 坐标范围，网格右侧） */
  ENEMY_ZONE: { x_min: 4, x_max: 5 },

  // ==================== 自动播放配置 ====================
  /** 自动模式下每回合间隔（毫秒） */
  AUTO_PLAY_INTERVAL_MS: 400,
  /** 是否允许加速播放 */
  ALLOW_SPEED_UP: true,
  /** 加速模式每回合间隔（毫秒） */
  FAST_PLAY_INTERVAL_MS: 100,
  /** 是否允许逐回合模式（手动逐步推进） */
  ALLOW_STEP_BY_STEP: true,

  // ==================== AI 配置 ====================
  /** AI 目标选择策略：'nearest'=最近敌人（预留扩展：'lowest_hp'=最低血量、'weakest'=最弱等） */
  AI_TARGET_STRATEGY: 'nearest' as 'nearest' | 'lowest_hp' | 'weakest',

  // ==================== 回合上限 ====================
  /** 战棋模式最大回合数（超过则判逃跑，防止死锁；旧版 DUNGEON_COMBAT_CONFIG.MAX_ROUNDS 保留给非战棋路径） */
  MAX_TACTICS_ROUNDS: 50,

  // ==================== 障碍物配置 ====================
  /** 是否启用障碍物（false=仅单位阻挡，true=支持地形障碍） */
  ENABLE_OBSTACLES: false,
}
