/**
 * 《生化危机：蜂巢》— 副本元信息
 *
 * ==================== 副本概述 ====================
 * 坐标网格 A1-K7（11列×7行），50 房间
 * 玩家从 B3 地铁站出发，目标抵达 K5 撤离列车
 * 包含：电力恢复、激光走廊、红后处理、T病毒样本决策等核心机制
 *
 * ==================== 如何新增副本 ====================
 * 复制此目录，修改 meta.ts 中的元信息和各数据文件即可
 * 引擎代码无需任何修改
 */

import type { DungeonConfig, DungeonRatingConfig } from '../../../types/dungeon-v2'

export const BIOHAZARD_DUNGEON: DungeonConfig = {
  id: 'biohazard_hive',
  name: '生化危机：蜂巢',
  description:
    '保护伞公司蜂巢地下实验室发生 T 病毒泄漏，整个设施被红后封锁。' +
    '玩家需要探索实验室、恢复电力、通过激光走廊、处理红后、决定 T 病毒样本命运，最终抵达撤离列车。',
  difficulty: '新手教学 / 推荐 Lv.1',
  tier: 'D',
  min_level: 1,
  start_room: 'B3',
  exit_room: 'K5',
  config: {
    grid_cols: 11,
    grid_rows: 7,
    max_turns: 120,
    self_destruct_turns: 50,
    infection_max: 100,
    security_alert_max: 100,
  },
  rewards: {
    base_reward_points: 800,
    base_xp: 300,
    base_side_plots: { D: 8, C: 1 },
  },
}

// ==================== 评语配置 ====================

export const BIOHAZARD_RATINGS: DungeonRatingConfig[] = [
  {
    rating: 'S',
    title: '完美突破',
    description: '所有主线任务完成，大部分支线完成，NPC 存活，感染值低。主神评价：出色。',
    conditions: {
      min_quests_completed: 10,
      min_main_quests_completed: 7,
      max_infection: 30,
      min_npcs_alive: 2,
    },
    reward_multiplier: 1.5,
  },
  {
    rating: 'A',
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
    rating: 'B',
    title: '标准完成',
    description: '主线全部完成。主神评价：合格。',
    conditions: {
      min_main_quests_completed: 7,
    },
    reward_multiplier: 1.0,
  },
  {
    rating: 'C',
    title: '勉强逃离',
    description: '主线大部分完成，感染严重。主神评价：勉强通过。',
    conditions: {
      min_main_quests_completed: 5,
    },
    reward_multiplier: 0.7,
  },
  {
    rating: 'D',
    title: '惨胜',
    description: '险些失败，勉强活着离开。主神评价：不及格但有进步空间。',
    conditions: {},
    reward_multiplier: 0.5,
  },
]
