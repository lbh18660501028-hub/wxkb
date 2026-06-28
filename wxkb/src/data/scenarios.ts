export interface ScenarioNode {
  id: number
  name: string
  type: 'skill_check' | 'combat' | 'elite' | 'story' | 'chest' | 'rest' | 'boss' | 'reward'
  description: string
  skillCheck?: {
    skill: string
    attr: string
    dc: number
    successText: string
    failText: string
    successReward?: { sidePlots?: { D?: number; C?: number }; xp?: number; rewardPoints?: number }
  }
  enemies?: Enemy[]
  storyChoices?: {
    text: string
    effect: string
    nextNode?: number
  }[]
  chestReward?: { sidePlots?: { D?: number; C?: number }; xp?: number; rewardPoints?: number }
}

export interface Enemy {
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  damage: number
  armor: number
  exp: number
  sidePlots: { D?: number; C?: number; B?: number; A?: number; S?: number }
  // 三本质属性（可选，不填则根据基础属性自动计算）
  technologyAttack?: number
  fantasyAttack?: number
  abnormalAttack?: number
  technologyDefense?: number
  fantasyDefense?: number
  abnormalDefense?: number
  speed?: number
  critRate?: number
  critDamage?: number
  critResist?: number
  hit?: number
  evasion?: number
  counterRate?: number
  reflectRate?: number
  comboRate?: number
  shield?: number
  shieldRegen?: number
  stunRate?: number
  stunResist?: number
  lifeSteal?: number
  damageReduction?: number
  penetration?: number
  armorBreak?: number
  blockRate?: number
  toughness?: number
  trueDamage?: number
  trueDefense?: number
}

export interface ScenarioData {
  id: string
  name: string
  description: string
  difficulty: string
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  minLevel: number
  nodes: ScenarioNode[]
  rewards: {
    sidePlots: { D: number; C: number; B?: number; A?: number; S?: number }
    xp: number
    rewardPoints: number
  }
}

export const scenarios: ScenarioData[] = [
  {
    id: 'zombie_siege',
    name: '丧尸围城',
    description: '一座废弃医院，丧尸横行。你需要找到出口并拯救幸存者。',
    difficulty: '1-10',
    tier: 'D',
    minLevel: 1,
    nodes: [
      {
        id: 1,
        name: '废弃大门',
        type: 'skill_check',
        description: '医院大门紧锁，铁链缠绕。你需要想办法进去。',
        skillCheck: {
          skill: '枪械',
          attr: 'agility',
          dc: 2,
          successText: '你精准射击门锁，铁链断裂，大门缓缓打开。',
          failText: '射击偏了，巨大的声响惊动了附近的丧尸！你不得不硬闯。',
          successReward: { rewardPoints: 50 }
        }
      },
      {
        id: 2,
        name: '大厅',
        type: 'combat',
        description: '你刚进入大厅，三只丧尸就向你扑来！',
        enemies: [
          { name: '普通丧尸', hp: 15, maxHp: 15, attack: 3, defense: 1, damage: 5, armor: 0, exp: 20, sidePlots: { D: 2 } },
          { name: '普通丧尸', hp: 15, maxHp: 15, attack: 3, defense: 1, damage: 5, armor: 0, exp: 20, sidePlots: { D: 2 } },
          { name: '普通丧尸', hp: 15, maxHp: 15, attack: 3, defense: 1, damage: 5, armor: 0, exp: 20, sidePlots: { D: 2 } },
        ]
      },
      {
        id: 3,
        name: '走廊',
        type: 'skill_check',
        description: '走廊尽头有一扇电子门，旁边有一台损坏的控制台。',
        skillCheck: {
          skill: '学识',
          attr: 'intelligence',
          dc: 2,
          successText: '你成功黑入电子锁，门开了。里面有一箱弹药！',
          failText: '黑入失败，你只好用蛮力砸开门。弹药箱被震坏了。',
          successReward: { rewardPoints: 100, xp: 30 }
        }
      },
      {
        id: 4,
        name: '手术室',
        type: 'elite',
        description: '一只变异丧尸挡在手术室门口，它比普通丧尸强壮得多！',
        enemies: [
          { name: '变异丧尸', hp: 40, maxHp: 40, attack: 6, defense: 3, damage: 10, armor: 2, exp: 80, sidePlots: { D: 8, C: 1 } },
        ]
      },
      {
        id: 5,
        name: '药品库',
        type: 'chest',
        description: '你发现了一个药品库，里面有丰富的医疗物资。',
        chestReward: { rewardPoints: 150, xp: 50, sidePlots: { D: 5 } }
      },
      {
        id: 6,
        name: '逃生出口',
        type: 'reward',
        description: '你找到了逃生出口！阳光照进来的那一刻，你感到了前所未有的轻松。',
      }
    ],
    rewards: {
      sidePlots: { D: 20, C: 2 },
      xp: 150,
      rewardPoints: 600
    }
  },
  {
    id: 'alien_nest',
    name: '异形巢穴',
    description: '一艘失踪的太空船，异形生物在船内筑巢。你必须潜入并摧毁巢穴。',
    difficulty: '11-25',
    tier: 'C',
    minLevel: 5,
    nodes: [
      {
        id: 1,
        name: ' docking bay',
        type: 'skill_check',
        description: '太空船的对接舱门被异形分泌物封住了。',
        skillCheck: {
          skill: '求生',
          attr: 'endurance',
          dc: 3,
          successText: '你用火焰喷射器烧开了分泌物，成功进入。',
          failText: '你强行撬开舱门，但惊动了巢穴中的异形。',
          successReward: { rewardPoints: 100 }
        }
      },
      {
        id: 2,
        name: '通风管道',
        type: 'combat',
        description: '通风管道中潜伏着数只异形幼体！',
        enemies: [
          { name: '异形幼体', hp: 20, maxHp: 20, attack: 5, defense: 2, damage: 8, armor: 0, exp: 40, sidePlots: { D: 4 } },
          { name: '异形幼体', hp: 20, maxHp: 20, attack: 5, defense: 2, damage: 8, armor: 0, exp: 40, sidePlots: { D: 4 } },
        ]
      },
      {
        id: 3,
        name: '实验室',
        type: 'skill_check',
        description: '实验室里有一台电脑，可能存储着异形的弱点信息。',
        skillCheck: {
          skill: '学识',
          attr: 'intelligence',
          dc: 3,
          successText: '你找到了异形的弱点——它们对极端温度敏感！',
          failText: '电脑需要密码，你无法破解。',
          successReward: { xp: 50, rewardPoints: 100 }
        }
      },
      {
        id: 4,
        name: '巢穴核心',
        type: 'elite',
        description: '异形女王盘踞在巢穴核心，它比任何异形都要强大！',
        enemies: [
          { name: '异形女王', hp: 80, maxHp: 80, attack: 10, defense: 5, damage: 15, armor: 3, exp: 200, sidePlots: { D: 15, C: 3 } },
        ]
      },
      {
        id: 5,
        name: '逃生舱',
        type: 'reward',
        description: '你成功启动逃生舱，逃离了即将爆炸的太空船。',
      }
    ],
    rewards: {
      sidePlots: { D: 40, C: 5 },
      xp: 400,
      rewardPoints: 1500
    }
  },
  {
    id: 'nightmare',
    name: '猛鬼街',
    description: '弗莱迪的噩梦世界，只有在梦中才能击败他。',
    difficulty: '26-40',
    tier: 'B',
    minLevel: 10,
    nodes: [
      {
        id: 1,
        name: '梦境入口',
        type: 'skill_check',
        description: '你需要主动进入梦境，但弗莱迪会在梦中追杀你。',
        skillCheck: {
          skill: '冥想',
          attr: 'resolve',
          dc: 4,
          successText: '你平稳地进入梦境，保持了清醒的意识。',
          failText: '你被弗莱迪拉入深层梦境，失去了先机。',
          successReward: { rewardPoints: 150 }
        }
      },
      {
        id: 2,
        name: '噩梦街道',
        type: 'combat',
        description: '弗莱迪的爪牙从阴影中涌出！',
        enemies: [
          { name: '噩梦爪牙', hp: 30, maxHp: 30, attack: 7, defense: 3, damage: 12, armor: 1, exp: 60, sidePlots: { D: 6 } },
          { name: '噩梦爪牙', hp: 30, maxHp: 30, attack: 7, defense: 3, damage: 12, armor: 1, exp: 60, sidePlots: { D: 6 } },
        ]
      },
      {
        id: 3,
        name: '弗莱迪的工厂',
        type: 'elite',
        description: '弗莱迪在噩梦工厂中等待着你，他的力量在梦境中成倍增长！',
        enemies: [
          { name: '弗莱迪', hp: 120, maxHp: 120, attack: 15, defense: 8, damage: 20, armor: 2, exp: 500, sidePlots: { D: 30, C: 5 } },
        ]
      },
      {
        id: 4,
        name: '觉醒',
        type: 'reward',
        description: '你击败了弗莱迪，从噩梦中醒来。阳光温暖地照在脸上。',
      }
    ],
    rewards: {
      sidePlots: { D: 60, C: 8 },
      xp: 800,
      rewardPoints: 3000
    }
  },
  {
    id: 'silent_hill',
    name: '寂静岭',
    description: '浓雾弥漫的小镇，表里世界交替。你需要找到真相并逃离。',
    difficulty: '41-60',
    tier: 'A',
    minLevel: 15,
    nodes: [
      {
        id: 1,
        name: '浓雾小镇',
        type: 'skill_check',
        description: '浓雾中能见度极低，你需要小心导航。',
        skillCheck: {
          skill: '调查',
          attr: 'resolve',
          dc: 5,
          successText: '你凭借直觉找到了正确的方向。',
          failText: '你在浓雾中迷失了方向，被迫绕路。',
          successReward: { rewardPoints: 200 }
        }
      },
      {
        id: 2,
        name: '里世界',
        type: 'combat',
        description: '世界扭曲变形，怪物从铁锈色的墙壁中爬出！',
        enemies: [
          { name: '三角头', hp: 60, maxHp: 60, attack: 12, defense: 6, damage: 18, armor: 4, exp: 120, sidePlots: { D: 12 } },
          { name: '护士', hp: 40, maxHp: 40, attack: 8, defense: 4, damage: 14, armor: 2, exp: 80, sidePlots: { D: 8 } },
        ]
      },
      {
        id: 3,
        name: '阿蕾莎的房间',
        type: 'elite',
        description: '阿蕾莎的怨念化为最强大的怪物！',
        enemies: [
          { name: '阿蕾莎', hp: 150, maxHp: 150, attack: 18, defense: 10, damage: 25, armor: 5, exp: 600, sidePlots: { D: 40, C: 8 } },
        ]
      },
      {
        id: 4,
        name: '逃离寂静岭',
        type: 'reward',
        description: '浓雾散去，你终于看到了离开小镇的公路。',
      }
    ],
    rewards: {
      sidePlots: { D: 80, C: 12 },
      xp: 1500,
      rewardPoints: 5000
    }
  },
  {
    id: 'final_destination',
    name: '死神来了',
    description: '死神设计了一系列意外来收割你。你必须识破并避开每一个陷阱。',
    difficulty: '61-100',
    tier: 'A',
    minLevel: 20,
    nodes: [
      {
        id: 1,
        name: '机场',
        type: 'skill_check',
        description: '你预感到飞机将会爆炸，必须立刻离开！',
        skillCheck: {
          skill: '求生',
          attr: 'resolve',
          dc: 6,
          successText: '你成功说服了几个人一起下飞机。',
          failText: '没人相信你，你只能独自逃离。',
          successReward: { rewardPoints: 300 }
        }
      },
      {
        id: 2,
        name: '高速公路',
        type: 'combat',
        description: '死神设计了一场连环车祸！',
        enemies: [
          { name: '失控卡车', hp: 80, maxHp: 80, attack: 15, defense: 8, damage: 25, armor: 6, exp: 150, sidePlots: { D: 15 } },
          { name: '翻倒的油罐车', hp: 100, maxHp: 100, attack: 20, defense: 10, damage: 30, armor: 8, exp: 200, sidePlots: { D: 20 } },
        ]
      },
      {
        id: 3,
        name: '医院',
        type: 'elite',
        description: '死神在医院设下了最终陷阱！',
        enemies: [
          { name: '死神的化身', hp: 200, maxHp: 200, attack: 25, defense: 12, damage: 35, armor: 8, exp: 800, sidePlots: { D: 50, C: 10 } },
        ]
      },
      {
        id: 4,
        name: '逃脱死亡',
        type: 'reward',
        description: '你打破了死神的设计，暂时安全了。但你知道，这只是暂时的……',
      }
    ],
    rewards: {
      sidePlots: { D: 120, C: 18 },
      xp: 3000,
      rewardPoints: 8000
    }
  },
  {
    id: 'the_shining',
    name: '闪灵',
    description: '远望酒店的冬季看守者，邪恶力量正在侵蚀你的心智。',
    difficulty: '100+',
    tier: 'S',
    minLevel: 30,
    nodes: [
      {
        id: 1,
        name: '酒店大堂',
        type: 'skill_check',
        description: '酒店大堂金碧辉煌，但空气中弥漫着诡异的气息。',
        skillCheck: {
          skill: '神秘学',
          attr: 'resolve',
          dc: 8,
          successText: '你感知到了酒店中强大的邪恶力量，做好了准备。',
          failText: '你没有察觉到异常，酒店的幻象开始侵蚀你的心智。',
          successReward: { rewardPoints: 500 }
        }
      },
      {
        id: 2,
        name: '237号房间',
        type: 'combat',
        description: '237号房间里有一个女人，她向你伸出手……',
        enemies: [
          { name: '幻影女人', hp: 100, maxHp: 100, attack: 18, defense: 10, damage: 28, armor: 5, exp: 250, sidePlots: { D: 25 } },
        ]
      },
      {
        id: 3,
        name: '血色走廊',
        type: 'combat',
        description: '电梯门打开，血水如潮水般涌出！',
        enemies: [
          { name: '血潮', hp: 120, maxHp: 120, attack: 22, defense: 12, damage: 32, armor: 6, exp: 300, sidePlots: { D: 30, C: 3 } },
        ]
      },
      {
        id: 4,
        name: 'Jack的追杀',
        type: 'elite',
        description: 'Jack已经被酒店完全控制，拿着斧头向你走来！',
        enemies: [
          { name: 'Jack Torrance', hp: 250, maxHp: 250, attack: 30, defense: 15, damage: 40, armor: 10, exp: 1000, sidePlots: { D: 60, C: 12 } },
        ]
      },
      {
        id: 5,
        name: '迷宫',
        type: 'skill_check',
        description: '你需要在积雪的迷宫中找到出路，同时躲避Jack的追杀。',
        skillCheck: {
          skill: '求生',
          attr: 'intelligence',
          dc: 8,
          successText: '你利用智慧设下陷阱，成功摆脱了Jack。',
          failText: '你在迷宫中迷失，险些被Jack抓住。',
          successReward: { xp: 500, rewardPoints: 800 }
        }
      },
      {
        id: 6,
        name: '逃离酒店',
        type: 'reward',
        description: '酒店在爆炸中化为灰烬，你终于自由了。',
      }
    ],
    rewards: {
      sidePlots: { D: 200, C: 20 },
      xp: 5000,
      rewardPoints: 15000
    }
  }
]

export function getScenarioById(id: string): ScenarioData | undefined {
  return scenarios.find(s => s.id === id)
}

export function getAvailableScenarios(level: number): ScenarioData[] {
  return scenarios.filter(s => level >= s.minLevel)
}
