/**
 * 《生化危机：蜂巢》— 敌人配置
 *
 * ==================== 敌人清单 ====================
 * - infected_worker:     普通感染员工（基础杂兵）
 * - infected_guard:      感染保安（稍强，有护甲）
 * - infected_dog:        感染犬（高速，高感染）
 * - security_drone:      安全无人机（不增加感染，增加警戒）
 * - infected_chef:       感染厨师（餐厅精英）
 * - half_infected:       半成品感染体（休眠室）
 * - licker:              舔食者（I5 精英怪，可选挑战）
 * - corpse_mutant:       尸变体（尸检室）
 * - infected_rats:       感染鼠群（配电室/水泵房杂兵）
 * - mutant_researcher:   变异研究员（J2 隔离舱）
 * - licker_alpha:        暴走舔食者（最终 BOSS，自毁后追击）
 *
 * ==================== 如何新增敌人 ====================
 * 1. 在 ENEMIES 数组中添加新条目
 * 2. 在房间配置的 combat.enemy_ids 中引用敌人 ID
 */

import type { EnemyConfig } from '../../../types/dungeon-v2'

export const ENEMIES: EnemyConfig[] = [
  // ==================== 普通感染员工 ====================
  {
    id: 'infected_worker',
    name: '感染员工',
    hp: 30,
    max_hp: 30,
    attack: 5,
    defense: 1,
    damage: 6,
    armor: 0,
    exp: 15,
    side_plots: { D: 1 },
    infection_on_hit: 5,
    infection_on_bite: 10,
    speed: 4,
    damage_type: 'physical',
    drops: [],
    drop_rate: 0.1,
  },

  // ==================== 感染保安 ====================
  {
    id: 'infected_guard',
    name: '感染保安',
    hp: 45,
    max_hp: 45,
    attack: 8,
    defense: 3,
    damage: 9,
    armor: 2,
    exp: 25,
    side_plots: { D: 1 },
    infection_on_hit: 5,
    infection_on_bite: 10,
    speed: 5,
    damage_type: 'physical',
    drops: ['pistol_ammo', 'blue_card'],
    drop_rate: 0.3,
  },

  // ==================== 感染犬 ====================
  {
    id: 'infected_dog',
    name: '感染犬',
    hp: 25,
    max_hp: 25,
    attack: 10,
    defense: 1,
    damage: 8,
    armor: 0,
    exp: 20,
    side_plots: { D: 1 },
    infection_on_hit: 12,
    infection_on_bite: 15,
    speed: 12,
    damage_type: 'physical',
    drops: [],
    drop_rate: 0.05,
  },

  // ==================== 安全无人机 ====================
  {
    id: 'security_drone',
    name: '安全无人机',
    hp: 40,
    max_hp: 40,
    attack: 8,
    defense: 2,
    damage: 7,
    armor: 1,
    exp: 30,
    side_plots: { D: 1 },
    infection_on_hit: 0,
    infection_on_bite: 0,
    speed: 8,
    damage_type: 'technology',
    drops: [],
    drop_rate: 0,
    skills: [
      {
        id: 'alert_pulse',
        name: '警戒脉冲',
        description: '发出警报信号，提高警戒值。',
        trigger_round: 3,
        effect: {},
      },
    ],
  },

  // ==================== 感染厨师 ====================
  {
    id: 'infected_chef',
    name: '感染厨师',
    hp: 50,
    max_hp: 50,
    attack: 9,
    defense: 2,
    damage: 10,
    armor: 1,
    exp: 30,
    side_plots: { D: 2 },
    infection_on_hit: 8,
    infection_on_bite: 12,
    speed: 5,
    damage_type: 'physical',
    drops: ['wrench'],
    drop_rate: 0.2,
  },

  // ==================== 半感染体（休眠室） ====================
  {
    id: 'half_infected',
    name: '半成品感染体',
    hp: 70,
    max_hp: 70,
    attack: 12,
    defense: 3,
    damage: 12,
    armor: 2,
    exp: 50,
    side_plots: { D: 2 },
    infection_on_hit: 10,
    infection_on_bite: 15,
    speed: 6,
    damage_type: 'abnormal',
    drops: ['mutant_cell_fragment'],
    drop_rate: 0.5,
  },

  // ==================== 舔食者（I5 精英怪，可选挑战） ====================
  {
    id: 'licker',
    name: '舔食者',
    hp: 120,
    max_hp: 120,
    attack: 16,
    defense: 4,
    damage: 16,
    armor: 3,
    exp: 80,
    side_plots: { D: 3, C: 1 },
    infection_on_hit: 15,
    infection_on_bite: 20,
    speed: 10,
    damage_type: 'abnormal',
    drops: ['mutant_cell_fragment'],
    drop_rate: 0.8,
    skills: [
      {
        id: 'tongue_spike',
        name: '舌刺',
        description: '伸出变异的长舌刺穿目标，造成额外伤害并增加感染值。',
        trigger_round: 2,
        effect: {
          damage_multiplier: 1.5,
          infection_bonus: 10,
        },
      },
      {
        id: 'ambush',
        name: '突袭',
        description: '快速扑向目标，必定先手。',
        trigger_round: 4,
        effect: {
          damage_multiplier: 1.3,
        },
      },
      {
        id: 'wall_climb',
        name: '爬墙',
        description: '爬上天花板躲避攻击，提高闪避。',
        trigger_round: 3,
        effect: {},
      },
    ],
  },

  // ==================== 尸变体（尸检室） ====================
  {
    id: 'corpse_mutant',
    name: '尸变体',
    hp: 80,
    max_hp: 80,
    attack: 14,
    defense: 3,
    damage: 13,
    armor: 2,
    exp: 55,
    side_plots: { D: 2 },
    infection_on_hit: 12,
    infection_on_bite: 18,
    speed: 7,
    damage_type: 'abnormal',
    drops: ['yellow_card'],
    drop_rate: 0.5,
  },

  // ==================== 变异研究员（J2 隔离舱） ====================
  {
    id: 'mutant_researcher',
    name: '变异研究员',
    hp: 60,
    max_hp: 60,
    attack: 11,
    defense: 2,
    damage: 11,
    armor: 1,
    exp: 40,
    side_plots: { D: 2 },
    infection_on_hit: 12,
    infection_on_bite: 15,
    speed: 6,
    damage_type: 'abnormal',
    drops: ['damaged_red_card'],
    drop_rate: 0.5,
  },

  // ==================== 感染鼠群 ====================
  {
    id: 'infected_rats',
    name: '感染鼠群',
    hp: 20,
    max_hp: 20,
    attack: 4,
    defense: 0,
    damage: 3,
    armor: 0,
    exp: 8,
    side_plots: { D: 1 },
    infection_on_hit: 3,
    infection_on_bite: 5,
    speed: 15,
    damage_type: 'physical',
    drops: [],
    drop_rate: 0,
  },

  // ==================== 最终 BOSS：暴走舔食者 ====================
  // 基础生命值 180，被削弱后按层数递减（每层 -10%）
  // 削弱来源：I4 控制阀（1层）、F5 培养罐（3层）、液氮罐冷冻（不扣血但首回合无法行动）
  {
    id: 'licker_alpha',
    name: '暴走舔食者',
    hp: 180,
    max_hp: 180,
    attack: 18,
    defense: 5,
    damage: 18,
    armor: 4,
    exp: 150,
    side_plots: { D: 5, C: 2 },
    infection_on_hit: 20,
    infection_on_bite: 25,
    speed: 9,
    damage_type: 'abnormal',
    drops: ['mutant_cell_fragment', 'broken_tactical_badge'],
    drop_rate: 1.0,
    skills: [
      {
        id: 'regenerate',
        name: '培养罐恢复',
        description: '如果培养罐未破坏，每 3 回合恢复 30 点生命值。',
        trigger_round: 3,
        effect: {
          heal: 30,
        },
      },
      {
        id: 'rage_slam',
        name: '狂暴重击',
        description: '全力一击，造成额外伤害。',
        trigger_round: 2,
        effect: {
          damage_multiplier: 1.5,
          infection_bonus: 10,
        },
      },
    ],
  },
]

// ==================== 敌人查找工具 ====================

const ENEMY_MAP: Record<string, EnemyConfig> = {}
for (const enemy of ENEMIES) {
  ENEMY_MAP[enemy.id] = enemy
}

export function getEnemy(id: string): EnemyConfig | undefined {
  return ENEMY_MAP[id]
}
