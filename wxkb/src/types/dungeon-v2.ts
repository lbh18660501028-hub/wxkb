/**
 * 副本系统 V2 — 类型定义
 *
 * ==================== 设计概述 ====================
 * 现代图形界面 + 走格子 MUD 底层逻辑
 * - 房间采用坐标网格（A1-K7，11列×7行）
 * - 玩家通过点击相邻格子移动，不输入命令
 * - 所有行为通过 UI 按钮完成
 * - 数据与逻辑完全分离，换副本只需换 data/dungeons/xxx/ 目录
 *
 * ==================== 核心设计原则 ====================
 * 1. RoomConfig 等配置接口只描述静态数据，不含运行时状态
 * 2. 运行时状态由 DungeonRuntimeState 统一管理
 * 3. 事件配置独立于房间配置，通过 EventRef 关联
 * 4. 战斗复用现有 D10 骰子系统（systems/dice.ts）
 */

import type { Enemy } from '../data/scenarios'
import type { DamageType } from '../config/combat'

// ==================== 坐标与方向 ====================

/** 房间坐标：列 A-K（1-11），行 1-7 */
type RoomCoord = string

/** 移动方向 */
type Direction = 'north' | 'south' | 'east' | 'west'

// ==================== 房间类型 ====================

/** 房间功能类型 */
type RoomType =
  | 'start'       // 起点
  | 'combat'      // 普通战斗
  | 'elite'       // 精英战斗
  | 'boss'        // Boss战
  | 'medical'     // 医疗室
  | 'lab'         // 实验室
  | 'security'    // 安保室
  | 'utility'     // 功能房（配电、水泵等）
  | 'corridor'    // 走廊
  | 'storage'     // 储物间
  | 'rest'        // 休息点
  | 'exit'        // 撤离点
  | 'locked'      // 锁定房间
  | 'hidden'      // 隐藏房间

/** 地图图标类型 */
type MapIconType =
  | 'npc'         // NPC 头像
  | 'combat'      // 危险图标
  | 'quest_main'  // 蓝色目标
  | 'quest_side'  // 紫色目标
  | 'story'       // 感叹号
  | 'locked'      // 锁图标
  | 'searchable'  // 可搜索
  | 'medical'     // 医疗
  | 'rest'        // 休息
  | 'exit'        // 出口

// ==================== 动作系统 ====================

/** 基础动作类型 */
type ActionType =
  | 'quick_search'    // 快速搜索（1回合）
  | 'deep_search'     // 彻底搜索（2回合）
  | 'inspect'         // 检查
  | 'open_door'       // 开门
  | 'use_item'        // 使用道具
  | 'talk_npc'        // 交谈
  | 'hack'            // 黑客（1回合）
  | 'repair'          // 修复（1-2回合）
  | 'destroy'         // 破坏（1回合）
  | 'sample'          // 取样（1回合）
  | 'rest'            // 休息
  | 'evacuate'        // 撤离

/** 动作消耗回合数 */
type TurnCostMap = Partial<Record<ActionType, number>>

/** 条件动作 — 根据运行时状态动态出现 */
interface ConditionalAction {
  id: string
  label: string
  /** 条件表达式，引擎求值后决定是否显示 */
  condition: ActionCondition
  /** 执行后的效果（无 skill_check 时直接应用） */
  effect: ActionEffect
  /** 消耗回合数（默认1） */
  turn_cost?: number
  /** 技能检定。存在时先检定，根据结果应用 success/failure 效果 */
  skill_check?: SkillCheckConfig
  /** 关联的可互动物体名称（visible_objects 中的值）
   *
   *  设定后，该动作仅当玩家点击了对应的可见物体时才显示在动作区。
   *  不设置时，该动作始终显示（不依赖物体选择）。
   */
  linked_object?: string
}

/** 动作条件 — 支持多种判断 */
interface ActionCondition {
  /** 需要设置的 flag */
  flags_not_set?: string[]
  /** 需要未设置的 flag */
  flags_set?: string[]
  /** 需要拥有的道具 */
  has_item?: string
  /** 需要不拥有的道具 */
  lacks_item?: string
  /** NPC 必须存活 */
  npc_alive?: string
  /** NPC 信任值 >= 此值 */
  npc_trust_gte?: { npc_id: string; value: number }
  /** 全局状态条件 */
  global_flag?: string
  /** 全局状态为 false */
  global_flag_false?: string
}

/** 技能检定配置 — 副本中的骰子检定
 *
 *  当 ConditionalAction 或 EventChoice 携带 skill_check 时，
 *  引擎先执行 D10 骰子检定，根据成功/失败应用不同效果。
 *
 *  ==================== 检定流程 ====================
 *  1. 确定骰池 DP
 *     - 有 skill_id: DP = max(floor(属性值 / 5), 1) + 技能等级
 *     - 无 skill_id（默认骰）: DP = max(floor(属性值 / 5), 1) + 基础骰（按DC档位）
 *  2. rollSkillCheck(dp, skillBonus, dc)
 *  3. 成功 → applyEffect(success_effect) + 技能成长判定
 *  4. 失败 → applyEffect(failure_effect)（如有）或标记不可重试
 */
interface SkillCheckConfig {
  /** 技能ID（如 'hacking'）。不指定时为默认检定（纯属性+基础骰，无技能加成） */
  skill_id?: string
  /** 检定属性。有 skill_id 时默认取技能关联属性；无 skill_id 时必填 */
  attr?: string
  /** 难度等级（需达到的成功数） */
  dc: number
  /** 检定描述（显示给玩家） */
  description: string
  /** 成功时应用的效果 */
  success_effect: ActionEffect
  /** 失败时应用的效果。
   *  不指定时默认效果：标记本动作本次副本不可重试（无其他惩罚） */
  failure_effect?: ActionEffect
  /** 成功日志文本（覆盖 success_effect.log） */
  success_text?: string
  /** 失败日志文本 */
  failure_text?: string
}

/** 动作效果 — 执行后产生的状态变化
 *
 *  支持单值和数组两种形式：
 *  - set_flag / set_flags：设置单个/多个玩家 flag
 *  - set_global / set_globals：设置单个/多个全局 flag
 *  - add_item / add_items：获得单个/多个道具
 *  - complete_objective / complete_objectives：完成单个/多个任务目标
 */
interface ActionEffect {
  hp?: number                    // HP 变化
  infection?: number             // 感染值变化
  security_alert?: number        // 警戒值变化
  set_flag?: string              // 设置单个玩家 flag
  set_flags?: string[]           // 设置多个玩家 flag
  clear_flag?: string            // 清除单个玩家 flag
  clear_flags?: string[]         // 清除多个玩家 flag
  set_global?: string            // 设置单个全局 flag
  set_globals?: string[]         // 设置多个全局 flag
  clear_global?: string          // 清除单个全局 flag
  clear_globals?: string[]       // 清除多个全局 flag
  add_item?: string              // 获得单个道具
  add_items?: string[]           // 获得多个道具
  remove_item?: string           // 消耗单个道具
  remove_items?: string[]        // 消耗多个道具
  npc_trust?: { npc_id: string; value: number }
  /** NPC 恐惧值变化 */
  npc_fear?: { npc_id: string; value: number }
  /** NPC 跟随状态变更 */
  npc_follow?: { npc_id: string; state: NpcFollowState }
  /** NPC HP 治疗 */
  npc_heal?: { npc_id: string; amount: number }
  /** NPC 感染值变化 */
  npc_infection?: { npc_id: string; value: number }
  unlock_exit?: { room: string; direction: Direction }
  start_combat?: boolean         // 触发战斗
  spawn_enemies?: string[]       // 触发战斗前刷出的敌人 ID
  start_quest?: string           // 开始任务
  complete_objective?: string    // 完成单个任务目标
  complete_objectives?: string[] // 完成多个任务目标
  countdown_change?: number      // 自毁倒计时变化
  boss_weaken?: number           // 削弱 Boss 等级
  teleport?: string              // 传送到指定房间
  log?: string                   // 日志文本
}

// ==================== 搜索系统（模块化） ====================

/** 搜索结果条目 — 加权随机池中的单个条目
 *
 *  每个条目包含一个 weight（权重）和一个 effect（效果）。
 *  引擎从池中按权重随机抽取一个条目，应用其 effect。
 */
interface SearchPoolEntry {
  /** 权重（用于加权随机，所有条目权重之和无需归一化） */
  weight: number
  /** 获得此结果时应用的效果 */
  effect: ActionEffect
}

/** 单种搜索类型的配置
 *
 *  对应一种搜索行为（如 quick_search / deep_search）。
 *  搜索流程：
 *  1. 使用 skill_id 对应的技能进行 D10 骰子检定（DC 为 dc）
 *  2. 检定成功 → 从 success_pool 加权随机抽取一个条目并应用效果
 *  3. 检定失败 → 从 failure_pool 加权随机抽取一个条目并应用效果
 *  4. 无论成功失败，警戒值增加 alert_increase
 */
interface SearchTypeConfig {
  /** 技能ID（如 'investigation'）。搜索检定使用的技能 */
  skill_id: string
  /** 难度等级（需达到的成功数） */
  dc: number
  /** 警戒值增加（无论检定成功与否） */
  alert_increase: number
  /** 成功时的奖励池（加权随机选择一个条目） */
  success_pool: SearchPoolEntry[]
  /** 失败时的惩罚池（加权随机选择一个条目） */
  failure_pool: SearchPoolEntry[]
}

/** 副本搜索表 — 每个副本独立配置
 *
 *  ==================== 设计说明 ====================
 *  每个副本在自己的 data/dungeons/xxx/search.ts 中导出一个 SearchTable。
 *  引擎通过 DungeonBundle.search_table 读取，不再依赖全局 SEARCH_CONFIG。
 *
 *  ==================== 如何新增副本搜索表 ====================
 *  1. 在 data/dungeons/xxx/ 下新建 search.ts
 *  2. 导出 SEARCH_TABLE: SearchTable
 *  3. 在 data/dungeons/index.ts 的 bundle 中引用
 *
 *  ==================== 示例 ====================
 *  科技副本：success_pool 可包含弹药、绷带、电子工具等
 *  魔幻副本：success_pool 可包含药水、卷轴、符文等
 *  失败惩罚也各不相同：科技副本可能是警报上升，魔幻副本可能是诅咒
 */
interface SearchTable {
  /** 快速搜索配置（1回合） */
  quick_search: SearchTypeConfig
  /** 彻底搜索配置（2回合） */
  deep_search: SearchTypeConfig
}

// ==================== 警戒值系统（模块化，每副本独立配置） ====================

/** 警戒值阶段 — 单个警戒等级的定义
 *
 *  每个副本在自己的 data/dungeons/xxx/alert.ts 中定义 tiers 数组。
 *  引擎通过 getAlertTier() 查找当前警戒值对应的阶段，
 *  应用该阶段的被动效果（遭遇加成、NPC恐惧、巡逻敌人）。
 *
 *  ==================== 设计原则 ====================
 *  - 阶段数量、名称、阈值范围完全由副本自定义
 *  - 不使用此系统的副本不提供 AlertConfig，警戒值无效果
 *  - 不同副本可复用警戒值但配以完全不同的阶段和效果
 */
interface AlertTier {
  /** 阶段ID（如 'low', 'camera', 'tracking', 'elite', 'protocol'） */
  id: string
  /** 最低警戒值（含） */
  min: number
  /** 最高警戒值（含） */
  max: number
  /** 阶段名称（显示给玩家） */
  name: string
  /** 阶段描述 */
  description: string
  /** 该阶段的显示颜色（CSS颜色值） */
  color: string
  /** 随机遭遇概率额外加成（0-1，叠加到房间基础概率上） */
  encounter_bonus?: number
  /** 该阶段每回合 NPC 恐惧值增加量 */
  npc_fear_per_turn?: number
  /** 该阶段巡逻敌人 ID 列表（加入随机遭遇池） */
  patrol_enemies?: string[]
}

/** 警戒值系统配置 — 每个副本可选启用
 *
 *  ==================== 使用方式 ====================
 *  1. 在 data/dungeons/xxx/ 下新建 alert.ts，导出 ALERT_CONFIG: AlertConfig
 *  2. 在 data/dungeons/index.ts 的 bundle 中引用
 *  3. 引擎通过 DungeonBundle.alert_config 读取，存入 runtime state
 *
 *  ==================== 警戒值达到上限时的处理 ====================
 *  不在此配置中定义，而是通过事件系统的 security_alert_gte 触发器实现。
 *  每个副本可定义自己的"警戒值满"事件（如刷精英敌、直接失败等）。
 */
interface AlertConfig {
  /** 警戒值上限 */
  max: number
  /** 警戒值阶段（从低到高排列，最后一条的 max 应等于 max） */
  tiers: AlertTier[]
}

// ==================== 道具系统 ====================

/** 道具类型 */
type ItemType =
  | 'temporary'    // 临时道具
  | 'permanent'    // 永久道具
  | 'quest'        // 任务道具
  | 'weapon'       // 武器
  | 'medical'      // 医疗物品
  | 'tool'         // 工具
  | 'key'          // 钥匙/权限卡

/** 道具使用目标 */
type UsableTarget =
  | 'self'         // 对自己使用
  | 'npc'          // 对 NPC 使用
  | 'enemy'        // 对敌人使用
  | 'room'         // 对房间使用
  | 'device'       // 对设备使用

/** 道具配置 */
interface ItemConfig {
  id: string
  name: string
  type: ItemType
  temporary: boolean
  stackable: boolean
  description: string
  usable_targets: UsableTarget[]
  use_effect?: ActionEffect
  consume_on_use: boolean
  quest_related: boolean
  keep_after_instance: boolean
  /** 武器属性 */
  weapon_stats?: {
    attack: number
    damage_type: DamageType
    ammo?: string    // 弹药 ID（如果有）
  }
  /** 医疗属性 */
  medical_stats?: {
    heal: number
    infection_cure?: number
  }
}

// ==================== 敌人系统 ====================

/** 敌人配置 — 扩展现有 Enemy 接口 */
interface EnemyConfig {
  id: string
  name: string
  hp: number
  max_hp: number
  attack: number
  defense: number
  damage: number
  armor: number
  exp: number
  side_plots: { D?: number; C?: number; B?: number; A?: number; S?: number }
  /** 感染值：被击中时增加的感染值 */
  infection_on_hit?: number
  /** 被咬伤时增加的感染值 */
  infection_on_bite?: number
  /** 速度（影响先手） */
  speed?: number
  /** 掉落道具 ID 列表 */
  drops?: string[]
  /** 掉落概率（0-1） */
  drop_rate?: number
  /** 特殊技能（旧系统：回合触发型技能） */
  skills?: EnemySkill[]
  /** 能力装配槽（新系统：决定敌人在战棋战斗中可用的技能 ID） */
  abilityLoadout?: AbilityLoadout
  /** 伤害类型 */
  damage_type?: DamageType
  /** 复用现有 Enemy 接口的扩展属性 */
  advanced?: Partial<Enemy>
}

/** 敌人特殊技能 */
interface EnemySkill {
  id: string
  name: string
  description: string
  trigger_round?: number  // 每隔多少回合触发
  effect: {
    damage_multiplier?: number
    infection_bonus?: number
    heal?: number
    stun_target?: boolean
  }
}

/** 战斗配置 — 房间内的战斗设定 */
interface CombatConfig {
  /** 敌人 ID 列表（从 enemies.ts 查找） */
  enemy_ids: string[]
  /** 是否强制战斗（进入即触发） */
  forced: boolean
  /** 是否已清除 */
  repeatable?: boolean
}

/** 随机遭遇配置 */
interface RandomEncounterConfig {
  /** 触发概率（0-1） */
  probability: number
  /** 警戒值越高概率越大 */
  alert_modifier?: number
  /** 可能遭遇的敌人 ID */
  enemy_ids: string[]
  /** 每次进入最多触发一次 */
  once_per_visit?: boolean
}

// ==================== NPC 系统 ====================

/** NPC 角色类型 */
type NpcRole =
| 'calm_analyst'       // 冷静分析型（主神投放的新人）
| 'reckless_charger'   // 冲动莽撞型（主神投放的新人）
| 'selfish_survivor'   // 自私求生型（主神投放的新人）
| 'guide'              // 引导型（资深轮回者，如老关）
| 'movie_alice'        // 电影角色：Alice 艾莉丝
| 'movie_rain'         // 电影角色：Rain Ocampo 小雨
| 'movie_kaplan'       // 电影角色：Kaplan 克普兰
| 'movie_matt'         // 电影角色：Matt Addison 麦特
| 'movie_spence'       // 电影角色：Spence Parks 史班逊
| 'movie_one'          // 电影角色：One 一
| 'movie_jd'           // 电影角色：J.D. Salinas 杰迪

/** NPC 跟随状态 */
type NpcFollowState =
  | 'following'   // 跟随中
  | 'waiting'     // 留守
  | 'left'        // 已离开
  | 'dead'        // 已死亡

/** NPC 感染状态 */
type NpcInfectedState =
  | 'clean'       // 未感染
  | 'mild'        // 轻度感染
  | 'severe'      // 重度感染
  | 'turned'      // 已变异

/** NPC 配置模板（用于随机生成） */
interface NpcTemplate {
  role: NpcRole
  possible_names: string[]
  possible_identities: string[]
  possible_skills: string[]
  possible_hidden_traits: string[]
  base_hp: number
  /** 引导型 NPC 标记（不走随机生成，固定生成） */
  is_guide?: boolean
  /** 引导型 NPC 初始战斗力 */
  combat_power?: number
  /** 电影剧情 NPC 标记（固定生成，不走随机生成流程） */
  is_movie_npc?: boolean
  /** 电影 NPC 初始战斗力 */
  movie_combat_power?: number
}

/** 新人轮回者 NPC 可用交互类型 */
type NpcInteractionType =
  | 'talk'              // 交谈
  | 'request_analysis'  // 请求分析（冷静型）
  | 'request_hack'      // 请求协助黑客（冷静型）
  | 'request_breach'    // 请求破门（冲动型）
  | 'request_cover'     // 请求掩护（冲动型）
  | 'stop_rush'         // 阻止冲动行动（冲动型）
  | 'comfort'           // 安抚（通用）
  | 'confront'          // 质问（自私型）
  | 'search_body'       // 搜身（自私型）
  | 'give_item'         // 给予道具（通用）
  | 'give_weapon'       // 给予武器（冲动型/通用）
  | 'invite_follow'     // 邀请同行（通用）
  | 'dismiss'           // 解散跟随（通用）
  | 'ask_guide'         // 询问指引（引导型）

/** NPC 交互配置 — 单个交互按钮的定义 */
interface NpcInteractionDef {
  type: NpcInteractionType
  label: string
  /** 消耗回合数（0 = 不消耗） */
  turn_cost: number
  /** 所需信任值下限（可选） */
  require_trust_gte?: number
  /** 所需道具（可选） */
  require_item?: string
  /** 是否消耗道具 */
  consume_item?: boolean
  /** 交互效果 */
  effect: ActionEffect
  /** 交互结果文本 */
  result_text?: string
}

/** NPC 运行时数据 */
interface DungeonNpc {
  id: string
  name: string
  role: NpcRole
  identity: string
  hp: number
  max_hp: number
  infection: number
  trust: number            // -100 ~ 100
  fear: number             // 0 ~ 100
  skill: string
  follow_state: NpcFollowState
  current_room: string
  hidden_trait: string
  alive: boolean
  infected_state: NpcInfectedState
  /** 命运标记（单值字符串，标记 NPC 的最终命运走向） */
  fate_flag: string
  /** 是否为新人轮回者（主神投放），false = 副本固定 NPC */
  is_reincarnator: boolean
  /** 引导型 NPC 的战斗力数值（仅 guide 类型使用） */
  combat_power?: number
  /** 默认对话事件 ID（点击 NPC 时触发） */
  defaultDialogueEventId?: string
  /** 按 flag 分支的对话事件映射（优先于 defaultDialogueEventId）
   *
   *  键为 flag 名称，值为对应的 dialogue_event 所在的 DungeonEvent.id。
   *  点击 NPC 时，引擎按此映射的键逐一检查 player.flags / global.custom，
   *  第一个匹配的 key 对应的事件即为要打开的对话。
   */
  dialogueByFlag?: Record<string, string>
}

// ==================== 事件系统 ====================

/** 事件触发类型 */
type EventTriggerType =
  | 'first_enter'         // 首次进入房间
  | 'action_trigger'      // 点击特定按钮
  | 'item_use'            // 使用特定道具
  | 'npc_state'           // NPC 状态达到条件
  | 'global_state'        // 全局状态达到条件
  | 'random_encounter'    // 随机遭遇

/** 事件触发条件 */
interface EventTrigger {
  type: EventTriggerType
  /** 关联房间坐标（first_enter / random_encounter） */
  room?: string
  /** 关联动作 ID（action_trigger） */
  action_id?: string
  /** 关联道具 ID（item_use） */
  item_id?: string
  /** NPC 状态条件（npc_state） */
  npc_id?: string
  npc_trust_gte?: number
  npc_trust_lte?: number
  npc_fear_gte?: number
  npc_infection_gte?: number
  /** 全局状态条件（global_state） */
  global_flag?: string
  global_flag_false?: string
  countdown_lte?: number
  security_alert_gte?: number
  /** 随机遭遇概率（random_encounter） */
  probability?: number
}

/** 事件选项 */
interface EventChoice {
  id: string
  label: string
  /** 选择后需要满足的条件 */
  condition?: ActionCondition
  /** 选择后的效果（无 skill_check 时直接应用） */
  effect: ActionEffect
  /** 选项文本（显示给玩家） */
  result_text?: string
  /** 技能检定。存在时先检定，根据结果应用 success/failure 效果 */
  skill_check?: SkillCheckConfig
}

/** 事件对话行 */
interface DialogueLine {
  speaker?: string
  text: string
  portrait?: string
  emotion?: 'neutral' | 'fear' | 'anger' | 'trust' | 'pain' | 'panic' | 'calm'
}

type DialogueOptionVisibility = 'visible' | 'disabled' | 'hidden'

type CheckOutcomeLevel = 'criticalSuccess' | 'success' | 'costlySuccess' | 'failure'

interface DungeonDialogueEvent {
  id: string
  title: string
  sceneText: string
  speaker?: {
    npcId?: string
    name: string
    portrait?: string
    attitude?: string
  }
  lines?: DialogueLine[]
  options: DialogueOption[]
  tags?: string[]
}

/** 选项生命周期配置 */
interface DialogueOptionUsage {
  /** 消耗模式：repeatable=可重复 / once=选一次 / onceOnSuccess=成功后消耗 / onceOnFailure=失败后消耗 / limited=限定次数 */
  mode?: 'repeatable' | 'once' | 'onceOnSuccess' | 'onceOnFailure' | 'limited'
  /** limited 模式下的最大尝试次数 */
  maxAttempts?: number
  /** 选择后立即消耗 */
  destroyOnSelect?: boolean
  /** 成功后消耗 */
  destroyOnSuccess?: boolean
  /** 失败后消耗 */
  destroyOnFailure?: boolean
  /** 消耗后灰色显示而非隐藏 */
  disableInsteadOfHide?: boolean
  /** 消耗后的提示文本 */
  usedText?: string
}

interface DialogueOption {
  id: string
  label: string
  description?: string
  check?: {
    skillId: string
    attributeId?: string
    dc: number
    modifier?: number
    label?: string
  }
  requirements?: DialogueRequirement[]
  allowCostlySuccess?: boolean
  outcomes: {
    criticalSuccess?: DialogueOutcome
    success?: DialogueOutcome
    costlySuccess?: DialogueOutcome
    failure?: DialogueOutcome
  }
  directOutcome?: DialogueOutcome
  /** 选项生命周期配置 */
  usage?: DialogueOptionUsage
}

interface DialogueRequirement {
  type:
    | 'flag'
    | 'item'
    | 'npc_attitude'
    | 'quest_state'
    | 'skill_level'
    | 'turn'
    | 'alert'
    | 'infection'
  key: string
  operator?: '>=' | '<=' | '>' | '<' | '==' | '!='
  value?: string | number | boolean
  visibleWhenUnmet?: boolean
  unmetText?: string
}

interface DialogueOutcome {
  text: string
  log?: string[]
  effects?: DialogueEffect[]
  nextEventId?: string
  closeAfter?: boolean
}

// ==================== 对话会话系统 ====================

/** 对话历史记录条目 */
interface DialogueHistoryEntry {
  id: string
  type:
    | 'scene'
    | 'npc_line'
    | 'player_choice'
    | 'check_result'
    | 'outcome'
    | 'system_log'
  speaker?: string
  text: string
  timestamp: number
  dice?: {
    dp: number
    dice: number[]
    successes: number
    dc: number
    level: CheckOutcomeLevel
  }
}

/** 选项运行时状态（持久化到 dungeon flags） */
interface DialogueOptionRuntimeState {
  attempts: number
  successes: number
  failures: number
  consumed: boolean
  disabled: boolean
  hidden: boolean
  lastResult?: CheckOutcomeLevel
}

/** 对话会话状态（仅在弹窗打开期间存在） */
interface DialogueSession {
  eventId: string
  source?: {
    roomId?: string
    interactableId?: string
    npcId?: string
  }
  history: DialogueHistoryEntry[]
  optionStates: Record<string, DialogueOptionRuntimeState>
}

interface DialogueEffect {
  type:
    | 'set_flag'
    | 'add_flag'
    | 'remove_flag'
    | 'add_item'
    | 'remove_item'
    | 'modify_alert'
    | 'modify_infection'
    | 'modify_hp'
    | 'modify_mp'
    | 'modify_npc_attitude'
    | 'start_combat'
    | 'unlock_room'
    | 'complete_quest'
    | 'advance_quest'
    | 'add_log'
    | 'trigger_event'
  key?: string
  value?: string | number | boolean
  targetId?: string
}

/** 事件配置 */
interface DungeonEvent {
  id: string
  trigger: EventTrigger
  /** 前置条件（所有条件满足才触发） */
  preconditions?: ActionCondition[]
  /** 是否只触发一次 */
  once: boolean
  /** 事件表现形式 */
  dialogue?: DialogueLine[]
  /** TRPG/CRPG 式对话事件，和旧 dialogue/choices 并存以保持兼容 */
  dialogue_event?: DungeonDialogueEvent
  choices?: EventChoice[]
  /** 无选项时自动执行的效果 */
  auto_effects?: ActionEffect
  /** 事件文本（简短描述） */
  description?: string
}

/** 房间内的事件引用 */
interface EventRef {
  event_id: string
  /** 覆盖触发类型（如果需要） */
  trigger_override?: Partial<EventTrigger>
}

// ==================== 可交互对象系统 ====================

/** 可交互对象类型 */
type InteractableType =
  | 'npc'         // NPC 角色
  | 'terminal'    // 终端 / 控制台
  | 'door'        // 门
  | 'container'   // 容器 / 柜子
  | 'corpse'      // 尸体
  | 'clue'        // 线索 / 痕迹
  | 'trap'        // 陷阱
  | 'anomaly'     // 异常现象
  | 'mechanism'   // 机关
  | 'exit'        // 出口

/** 房间内的可交互对象 — 点击后触发 dialogue_event
 *
 *  ==================== 使用方式 ====================
 *  在 RoomConfig.interactables 数组中配置。
 *  玩家点击对象后，引擎调用 interactWithObject()：
 *  1. 检查 requirements（条件不足则灰显或隐藏）
 *  2. 调用 triggerDungeonDialogue(dialogueEventId)
 *  3. 如果 once=true，触发后设置 triggeredFlag
 *  4. 如果 hideAfterTriggered=true，触发后从列表中隐藏
 *
 *  ==================== 与旧系统的关系 ====================
 *  interactables 是新的对话驱动交互入口，与旧 visible_objects /
 *  conditional_actions 并存。UI 优先展示 interactables，旧系统作为后备。
 */
interface DungeonInteractable {
  /** 唯一标识（在房间内唯一） */
  id: string
  /** 显示名称 */
  name: string
  /** 对象类型 */
  type: InteractableType
  /** 描述文本（可选，用于 tooltip） */
  description?: string
  /** 图标标识（可选） */
  icon?: string

  /** 点击后触发的 dialogue_event 所在的 DungeonEvent.id */
  dialogueEventId?: string

  /** 条件控制 — 不满足时灰显或隐藏 */
  requirements?: DialogueRequirement[]

  /** 是否只触发一次（触发后标记 triggeredFlag） */
  once?: boolean

  /** 触发后是否从列表中隐藏 */
  hideAfterTriggered?: boolean

  /** 触发后设置的 flag 名称（用于记录已处理状态）
   *
   *  如果不指定，引擎自动使用 `interactable_${id}_triggered`。
   */
  triggeredFlag?: string
}

// ==================== 房间配置 ====================

/** 房间进入条件 */
interface RoomRequire {
  /** 需要的道具 */
  item?: string
  /** 需要的全局 flag */
  global_flag?: string
  /** 需要的全局 flag 为 false */
  global_flag_false?: string
  /** 需要的玩家 flag */
  flag?: string
  /** 不满足时的提示文本 */
  fail_text: string
}

/** 房间配置 — 静态数据 */
interface RoomConfig {
  id: string
  name: string
  area: string
  type: RoomType
  desc_first: string
  desc_repeat: string
  exits: Partial<Record<Direction, string>>
  requires: RoomRequire[]
  visible_objects: string[]
  default_actions: ActionType[]
  conditional_actions: ConditionalAction[]
  items: string[]
  npcs: string[]
  events: EventRef[]
  combat: CombatConfig | null
  random_encounter: RandomEncounterConfig | null
  flags_set: string[]
  quest_hooks: string[]
  map_icons: MapIconType[]

  // ---- 可交互对象系统（对话驱动） ----

  /** 进入房间时自动触发一次的对话事件 ID（DungeonEvent.id） */
  enterEventId?: string

  /** 房间内的可交互对象列表（点击后触发 dialogue_event） */
  interactables?: DungeonInteractable[]
}

// ==================== 任务系统 ====================

type QuestType = 'main' | 'side'
type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed'

interface QuestObjective {
  id: string
  description: string
  status: QuestStatus
  /** 触发完成的 action id 或 flag */
  trigger_actions: string[]
}

interface QuestConfig {
  id: string
  type: QuestType
  title: string
  description: string
  status: QuestStatus
  objectives: QuestObjective[]
  reward?: string
}

// ==================== 结局/评语系统 ====================

/** 副本评语等级 */
type DungeonRating = 'S' | 'A' | 'B' | 'C' | 'D'

/** 副本评语配置 */
interface DungeonRatingConfig {
  rating: DungeonRating
  title: string
  description: string
  /** 评分条件 — 基于任务完成度和全局状态 */
  conditions: {
    min_quests_completed?: number
    min_main_quests_completed?: number
    max_infection?: number
    min_npcs_alive?: number
    min_turns_remaining?: number
    require_flags?: string[]
  }
  /** 奖励倍率 */
  reward_multiplier: number
}

// ==================== 副本元信息 ====================

/** 副本配置 — 顶层容器 */
interface DungeonConfig {
  id: string
  name: string
  description: string
  difficulty: string
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  min_level: number
  start_room: string
  exit_room: string
  /** 副本全局配置 */
  config: {
    grid_cols: number        // 地图列数
    grid_rows: number        // 地图行数
    max_turns: number        // 最大回合数
    self_destruct_turns: number  // 自毁倒计时（回合）
    infection_max: number    // 感染值上限
    security_alert_max: number   // 警戒值上限
  }
  rewards: {
    base_reward_points: number
    base_xp: number
    base_side_plots: { D: number; C: number }
  }
}

// ==================== 触发型状态显示 ====================

/** 触发型状态显示 — 仅在特定条件触发后显示的模块化状态条目
 *
 *  用于自毁倒计时、增援倒计时等"触发后才出现"的状态。
 *  引擎通过 addTriggeredStatus / removeTriggeredStatus 管理，
 *  UI 仅渲染 state.global.triggered_statuses 数组中的条目。
 *
 *  ==================== 如何新增触发型状态 ====================
 *  1. 在 ActionEffect 中通过 set_globals 触发引擎逻辑
 *  2. 引擎检测到对应 flag 后调用 addTriggeredStatus() 创建条目
 *  3. 在 advanceTurn 或 applyEffect 中同步更新 value
 *  4. 状态结束时调用 removeTriggeredStatus() 移除条目
 */
interface TriggeredStatus {
  id: string                    // 唯一标识（如 'self_destruct'）
  label: string                 // 显示标签（如 '自毁倒计时'）
  value: number                 // 当前值
  max_value?: number            // 最大值（用于进度显示）
  unit: string                  // 单位（如 '回合'）
  color: string                 // 主色
  priority: number              // 排序优先级（越大越靠前）
  critical_threshold?: number   // 低于此值时显示为紧急色
}

// ==================== 运行时状态 ====================

/** 玩家运行时状态 */
interface DungeonPlayerState {
  hp: number
  max_hp: number
  infection: number
  position: string
  inventory: string[]
  permanent_rewards: string[]
  weapon: string | null
  explored_rooms: string[]
  /** 玩家标记（支持 boolean / number / string，对话选项运行时状态等使用 number） */
  flags: Record<string, boolean | number | string>
  current_quest: string | null
  alive: boolean
  /** 检定失败的动作ID列表（本次副本永久不可重试） */
  failed_actions: string[]
  /** 当前意志力（可消耗用于重试检定） */
  willpower: number
  /** 意志力上限 */
  max_willpower: number
}

/** 全局副本状态 */
interface DungeonGlobalState {
  turn_count: number
  security_alert: number
  power_restored: boolean
  laser_disabled: boolean
  /** 红后是否已处理（关闭/说服/复制/攻击） */
  red_queen_processed: boolean
  self_destruct_started: boolean
  countdown: number
  virus_sample_taken: boolean
  virus_sample_destroyed: boolean
  virus_sample_frozen: boolean
  /** 样本柜已标记（暂不取样，可稍后返回） */
  sample_marked: boolean
  /** Rain 是否被救下并存活至撤离 */
  rain_saved: boolean
  /** Rain 是否处于感染状态 */
  rain_infected: boolean
  /** 是否找到抗病毒原型样本 */
  antivirus_prototype_found: boolean
  /** 是否获得保护伞公司机密档案 */
  company_dossier_obtained: boolean
  /** 是否获得 Lisa Addison 资料 */
  lisa_addison_file_obtained: boolean
  /** Spence 背叛是否被揭穿 */
  spence_exposed: boolean
  boss_weakened_level: number
  /** BOSS 削弱上限层数（生化危机副本为 4） */
  boss_weakened_max: number
  /** I4 生物罐区控制阀是否已破坏 */
  i4_valve_destroyed: boolean
  /** F5 培养室已破坏的培养罐数量 */
  f5_tank_destroyed_count: number
  /** Licker 是否已释放并追击玩家 */
  licker_released: boolean
  /** BOSS 追踪倒计时（自毁启动后延迟回合数，每回合递减，归零时 BOSS 追上玩家）
   *
   *  生化危机副本专属：自毁启动时设为 SELF_DESTRUCT_CONFIG.BOSS_TRACKING_DELAY，
   *  advanceTurn 中递减，归零时设 licker_released = true 触发强制战斗。
   *  其他副本不使用此字段，保持 0。
   */
  boss_tracking_turns: number
  /** 电影 NPC 存活状态 */
  one_survived_laser: boolean
  jd_survived: boolean
  kaplan_alive: boolean
  matt_alive: boolean
  alice_alive: boolean
  evacuated: boolean
  failed: boolean
  ending_type: string | null
  triggered_statuses: TriggeredStatus[]
  /** 副本专属全局状态（键值对，由各副本自行定义和使用）
   *
   *  用于存储非通用的副本全局变量，如 power_restored、laser_disabled 等。
   *  新增副本时在此字段中存储自定义全局状态，无需修改 DungeonGlobalState 接口。
   *  现有字段（power_restored 等）保留向后兼容，后续可逐步迁移到 custom。
   */
  custom: Record<string, boolean | number | string>
}

/** 日志条目 */
interface DungeonLogEntry {
  id: number
  text: string
  type: 'success' | 'warning' | 'danger' | 'info' | 'gold'
  turn: number
}

/** 副本运行时完整状态 */
interface DungeonRuntimeState {
  player: DungeonPlayerState
  global: DungeonGlobalState
  npcs: DungeonNpc[]
  quests: QuestConfig[]
  logs: DungeonLogEntry[]
  combat: DungeonCombatState | null
  pending_event: PendingEvent | null
  completed: boolean
  /** 警戒值系统配置（运行时引用，由 DungeonBundle 注入，不序列化）
   *
   *  为 undefined 时表示该副本不使用警戒值系统，security_alert 仅作为数字存储无实际效果。
   */
  alert_config?: AlertConfig
}

/** 战棋网格坐标 */
interface GridPosition {
  /** X 轴（列），从 0 开始 */
  x: number
  /** Y 轴（行），从 0 开始 */
  y: number
}

/** 战斗中的盟友（NPC 战斗投影） — 跟随玩家的 NPC 作为独立战斗单位参战 */
interface CombatAlly {
  /** 对应的 DungeonNpc.id */
  npc_id: string
  name: string
  hp: number
  max_hp: number
  /** 攻击力（基于 NPC role/skill 简化计算） */
  attack: number
  /** 防御力 */
  defense: number
  /** 伤害值 */
  damage: number
  /** 护甲 */
  armor: number
  /** 速度（影响行动顺序） */
  speed: number
  /** 伤害类型 */
  damage_type: DamageType
  /** 是否已倒下 */
  down: boolean

  // ==================== 战棋字段 ====================
  /** 战棋网格位置（null = 尚未放置到网格上） */
  position: GridPosition | null
  /** 每回合移动力（可移动的格数） */
  move_range: number
  /** 攻击射程（1=近战相邻，>1=远程） */
  attack_range: number
  /** 控制方式：'manual'=玩家手动操作，'auto'=AI 自动托管 */
  control_mode: 'manual' | 'auto'
  /** 本回合是否已移动（每回合开始时重置） */
  has_moved: boolean
  /** 本回合是否已攻击（每回合开始时重置） */
  has_attacked: boolean

  // ==================== 能力来源 ====================
  /** 队友自带的技能 ID 列表 */
  abilityLoadout?: AbilityLoadout
}

/** 战斗运行时状态 */
interface DungeonCombatState {
  enemies: CombatEnemy[]
  current_enemy_index: number
  round: number
  logs: string[]
  player_hp: number
  player_max_hp: number
  player_mp: number
  player_max_mp: number
  /** 参战的盟友 NPC 列表 */
  allies: CombatAlly[]
  over: boolean
  result: 'victory' | 'defeat' | 'fled' | null
  rewards: {
    xp: number
    reward_points: number
    side_plots: { D: number; C: number }
    items: string[]
  }

  // ==================== 战棋字段 ====================
  /** 战棋模式：'auto'=全自动托管，'manual'=玩家手动操作（可随时切换） */
  tactics_mode: 'auto' | 'manual'
  /** 网格宽度（列数） */
  grid_width: number
  /** 网格高度（行数） */
  grid_height: number
  /** 行动顺序列表（单位唯一标识 uid，按速度降序排列） */
  turn_order: string[]
  /** 当前行动单位在 turn_order 中的索引 */
  current_turn_index: number
  /** 当前战棋回合数（每轮所有单位行动完 +1，与 round 字段独立计数） */
  tactics_round: number

  // ---- 玩家战棋状态 ----
  /** 玩家在网格上的位置 */
  player_position: GridPosition | null
  /** 玩家移动力 */
  player_move_range: number
  /** 玩家攻击射程 */
  player_attack_range: number
  /** 玩家本回合是否已移动 */
  player_has_moved: boolean
  /** 玩家本回合是否已攻击 */
  player_has_attacked: boolean

  // ---- 自动播放控制 ----
  /** 自动播放速度（毫秒/回合），由 TACTICS_CONFIG.AUTO_PLAY_INTERVAL_MS 初始化 */
  auto_play_interval_ms: number
  /** 是否加速播放 */
  fast_forward: boolean

  // ---- 手动模式控制 ----
  /** 手动模式下，是否正在等待玩家操作（true=暂停自动推进，等玩家点击移动/攻击/结束回合） */
  waiting_for_player: boolean

  // ---- 玩家能力来源 ----
  /** 玩家的能力装配槽（决定玩家在战斗中可用的技能） */
  player_ability_loadout?: AbilityLoadout
}

/** 战斗中的敌人（运行时副本） */
interface CombatEnemy {
  id: string
  name: string
  hp: number
  max_hp: number
  attack: number
  defense: number
  damage: number
  armor: number
  infection_on_hit: number
  infection_on_bite: number
  speed: number
  skills: EnemySkill[]
  damage_type: DamageType
  exp: number
  side_plots: { D?: number; C?: number }

  // ==================== 战棋字段 ====================
  /** 战棋网格位置（null = 尚未放置到网格上） */
  position: GridPosition | null
  /** 每回合移动力（可移动的格数） */
  move_range: number
  /** 攻击射程（1=近战相邻，>1=远程） */
  attack_range: number
  /** 本回合是否已移动（每回合开始时重置） */
  has_moved: boolean
  /** 本回合是否已攻击（每回合开始时重置） */
  has_attacked: boolean

  // ==================== 能力来源 ====================
  /** 敌人自带的技能 ID 列表（通过 abilityLoadout.innate 挂载） */
  abilityLoadout?: AbilityLoadout
}

/** 待处理事件（等待玩家选择） */
interface PendingEvent {
  event_id: string
  dialogue: DialogueLine[]
  choices: EventChoice[]
  description: string
  dialogue_event?: DungeonDialogueEvent
}

// ==================== 能力来源系统（AbilityLoadout） ====================

/**
 * 能力装配槽 — 描述一个单位从哪些来源获得技能
 *
 * ==================== 来源分类 ====================
 * - innate:    角色基础技能（来自职业/天赋/种族）
 * - weapon:    武器提供的技能（如手枪射击、霰弹枪扫射）
 * - item:      道具提供的技能（如医疗包、手雷）
 * - temporary: 副本临时技能（事件/状态赋予，战斗结束后消失）
 *
 * ==================== 使用方式 ====================
 * 1. 在 EnemyConfig / CombatAlly / DungeonCombatState 上设置 abilityLoadout
 * 2. collectTacticsUnits() 会将 loadout 复制到 TacticsUnit
 * 3. getUnitAbilities() 从 loadout 各来源汇总技能 ID
 * 4. 不在 loadout 中的技能不会出现在 UI（包括测试技能）
 */
interface AbilityLoadout {
  /** 角色基础技能 ID（如 'melee_attack'、'aoe_strike'） */
  innate?: string[]
  /** 武器提供的技能 ID（如 'pistol_shot'） */
  weapon?: string[]
  /** 道具提供的技能 ID（如 'medkit_heal'） */
  item?: string[]
  /** 副本临时技能 ID（事件/状态赋予） */
  temporary?: string[]
}

// ==================== 战斗技能（CombatAbility）系统 ====================

/**
 * 技能目标类型
 *
 * - 'enemy'  — 选敌方单位（单体攻击、单体伤害技能）
 * - 'ally'   — 选友方单位（单体治疗、单体增益）
 * - 'self'   — 对自身释放（自身增益、自身治疗）
 * - 'cell'   — 选格子释放（AOE、投掷物、陷阱）
 */
type TargetType = 'enemy' | 'ally' | 'self' | 'cell'

/**
 * 技能形状
 *
 * - 'single'      — 单体：玩家点选一个合法目标单位
 * - 'aoe-diamond' — 菱形 AOE：玩家点选一个格子，影响曼哈顿距离 ≤ area 的所有格子
 *
 * 预留扩展：'aoe-circle'（真实圆形）、'line'（直线）、'cone'（锥形）等
 */
type AbilityShape = 'single' | 'aoe-diamond'

/**
 * 战斗技能 — 统一抽象所有可执行行动
 *
 * 普通攻击、近战攻击、远程射击、AOE 技能、治疗技能、道具使用
 * 都可以用同一个 CombatAbility 描述，UI 只需一套交互逻辑。
 *
 * ==================== 字段说明 ====================
 * - range：施法者从自身位置向外能选多远（曼哈顿距离）
 * - area：AOE 半径，单体技能为 0
 * - targetType：技能选择目标的类型
 * - shape：技能形状（决定 UI 交互方式：点单位 vs 点格子）
 * - hostile：是否敌对技能（true=对敌方施放，false=对友方/自身施放）
 *
 * ==================== 使用方式 ====================
 * 1. UI 层调用 getUnitAbilities(unit) 获取该单位可用技能列表
 * 2. 玩家选择技能后，UI 调用 getAbilityRangeCells() 计算可作用范围
 * 3. 单体技能：调用 getValidTargetUnitIds() 获取可点目标
 * 4. AOE 技能：hover 时调用 getAoeAreaCells() 预览影响范围
 * 5. 玩家确认后，UI 生成 UseAbilityAction 交由引擎执行
 */
interface CombatAbility {
  /** 技能唯一 ID（如 'basic_attack'、'aoe_strike'） */
  id: string
  /** 显示名称 */
  name: string
  /** 技能描述（可选，用于 tooltip） */
  description?: string
  /** 施法射程：从施法者位置向外的最大曼哈顿距离 */
  range: number
  /** AOE 半径：单体技能为 0，AOE 技能为目标格周围的影响半径 */
  area: number
  /** 目标类型 */
  targetType: TargetType
  /** 技能形状 */
  shape: AbilityShape
  /** 是否敌对技能 */
  hostile: boolean

  // ==================== 效果配置（可选，用于伤害/治疗/感染等结算） ====================

  /** 伤害倍率（1.0=正常攻击伤害，1.5=150%伤害），不填默认 1.0 */
  damageMultiplier?: number
  /** 固定伤害加值（骰子结算后叠加），不填默认 0 */
  flatDamageBonus?: number
  /** 治疗量（用于治疗/友方技能），不填默认 0 */
  healAmount?: number
  /** 额外感染值（命中目标时附加），不填默认 0 */
  infectionBonus?: number
  /** MP 消耗（预留，当前默认 0=不消耗） */
  mpCost?: number
  /** 冷却回合数（预留，0=无冷却） */
  cooldown?: number

  // ==================== 分类与来源（用于扩展系统） ====================

  /** 标签数组，用于分类筛选（如 'system'、'weapon'、'item'、'enemy'、'dungeon'） */
  tags?: string[]
  /** 来源标识（如 'system'、'weapon:pistol'、'item:medkit'、'enemy:licker'） */
  source?: string
}

// ==================== 战斗行动（CombatAction）系统 ====================

/**
 * 移动行动
 *
 * UI 生成此 Action 交由引擎执行单位移动。
 */
interface MoveAction {
  type: 'move'
  /** 行动单位 uid */
  actorId: string
  /** 移动目标格子 */
  targetCell: GridPosition
}

/**
 * 使用技能行动
 *
 * 单体技能：填 targetUnitId（目标单位 uid）
 * AOE / 格子技能：填 targetCell（目标格子坐标）
 * 自身技能：两者都不填（直接对 actor 生效）
 */
interface UseAbilityAction {
  type: 'use_ability'
  /** 行动单位 uid */
  actorId: string
  /** 技能 ID（对应 CombatAbility.id） */
  abilityId: string
  /** 单体技能的目标单位 uid（shape='single' 时使用） */
  targetUnitId?: string
  /** AOE / 格子技能的目标格子（shape='aoe-diamond' 时使用） */
  targetCell?: GridPosition
}

/**
 * 等待行动
 *
 * 单位选择原地等待，不移动不攻击。
 */
interface WaitAction {
  type: 'wait'
  /** 行动单位 uid */
  actorId: string
}

/**
 * 战斗行动 — 所有可执行行动的联合类型
 *
 * UI 只负责生成 Action，然后交给战斗引擎验证和执行。
 * 引擎统一通过 validateAbilityAction() 验证后再应用效果。
 */
type CombatAction = MoveAction | UseAbilityAction | WaitAction

// ==================== UI 输入状态机 ====================

/**
 * 战斗 UI 输入模式 — 清晰的状态机，替代零散 boolean
 *
 * 状态流转：
 * idle → selecting_move_cell → idle（移动完成或取消）
 * idle → selecting_ability_target → idle（单体技能完成或取消）
 * idle → selecting_aoe_cell → idle（AOE 技能完成或取消）
 * idle → confirming_action → idle（确认执行）
 *
 * ==================== 各状态说明 ====================
 * - idle：等待玩家选择行动菜单
 * - selecting_move_cell：已选择"移动"，等待玩家点击可移动格子
 * - selecting_ability_target：已选择单体技能，等待玩家点击目标单位
 * - selecting_aoe_cell：已选择 AOE 技能，等待玩家点击释放格子
 * - confirming_action：行动已生成，等待玩家确认执行（预留）
 */
type CombatInputMode =
  | 'idle'
  | 'selecting_move_cell'
  | 'selecting_ability_target'
  | 'selecting_aoe_cell'
  | 'confirming_action'

// ==================== 导出所有类型 ====================

export type {
  RoomCoord,
  Direction,
  RoomType,
  MapIconType,
  ActionType,
  TurnCostMap,
  ConditionalAction,
  ActionCondition,
  ActionEffect,
  SkillCheckConfig,
  SearchPoolEntry,
  SearchTypeConfig,
  SearchTable,
  AlertTier,
  AlertConfig,
  ItemType,
  UsableTarget,
  ItemConfig,
  EnemyConfig,
  EnemySkill,
  CombatConfig,
  RandomEncounterConfig,
  NpcRole,
  NpcFollowState,
  NpcInfectedState,
  NpcTemplate,
  NpcInteractionType,
  NpcInteractionDef,
  DungeonNpc,
  EventTriggerType,
  EventTrigger,
  EventChoice,
  DialogueLine,
  DialogueOptionVisibility,
  CheckOutcomeLevel,
  DungeonDialogueEvent,
  DialogueOption,
  DialogueOptionUsage,
  DialogueRequirement,
  DialogueOutcome,
  DialogueEffect,
  DialogueHistoryEntry,
  DialogueOptionRuntimeState,
  DialogueSession,
  DungeonEvent,
  EventRef,
  RoomRequire,
  RoomConfig,
  QuestType,
  QuestStatus,
  QuestObjective,
  QuestConfig,
  DungeonRating,
  DungeonRatingConfig,
  DungeonConfig,
  TriggeredStatus,
  DungeonPlayerState,
  DungeonGlobalState,
  DungeonLogEntry,
  DungeonRuntimeState,
  DungeonCombatState,
  CombatEnemy,
  CombatAlly,
  GridPosition,
  PendingEvent,
  // ---- 能力来源系统 ----
  AbilityLoadout,
  // ---- 战斗技能 / 行动系统 ----
  TargetType,
  AbilityShape,
  CombatAbility,
  MoveAction,
  UseAbilityAction,
  WaitAction,
  CombatAction,
  InteractableType,
  DungeonInteractable,
  CombatInputMode,
}
