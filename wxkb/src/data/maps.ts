export interface GameMap {
  id: number
  name: string
  icon: string
  description: string
  difficulty: string
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  rewardPerHour: {
    rewardPoints: number
    xp: number
  }
  unlockCondition: string
  unlocked: boolean
}

export const GAME_MAPS: GameMap[] = [
  {
    id: 1,
    name: '生化危机',
    icon: '🧟',
    description: '诺瓦生命科技地下实验室发生E-17泄漏，新人轮回者将在这里学习MUD副本基础。',
    difficulty: '教学',
    tier: 'D',
    rewardPerHour: { rewardPoints: 500, xp: 100 },
    unlockCondition: '初始解锁',
    unlocked: true,
  },
  {
    id: 2,
    name: '异形巢穴',
    icon: '👽',
    description: 'LV-426星球上，异形皇后正在孵化她的军团。',
    difficulty: '11-25',
    tier: 'D',
    rewardPerHour: { rewardPoints: 1000, xp: 200 },
    unlockCondition: '通关生化危机',
    unlocked: false,
  },
  {
    id: 3,
    name: '猛鬼街',
    icon: '🔪',
    description: '弗莱迪的梦中世界，恐惧会杀死你。',
    difficulty: '26-40',
    tier: 'C',
    rewardPerHour: { rewardPoints: 2000, xp: 400 },
    unlockCondition: '通关异形巢穴',
    unlocked: false,
  },
  {
    id: 4,
    name: '寂静岭',
    icon: '🌫️',
    description: '表里世界交替，三角头在迷雾中徘徊。',
    difficulty: '41-60',
    tier: 'C',
    rewardPerHour: { rewardPoints: 3500, xp: 700 },
    unlockCondition: '通关猛鬼街',
    unlocked: false,
  },
  {
    id: 5,
    name: '死神来了',
    icon: '💀',
    description: '死神的名单上，下一个就是你。',
    difficulty: '61-100',
    tier: 'B',
    rewardPerHour: { rewardPoints: 6000, xp: 1200 },
    unlockCondition: '通关寂静岭',
    unlocked: false,
  },
  {
    id: 6,
    name: '闪灵',
    icon: '🪓',
    description: '远望酒店的冬天，杰克·托伦斯已经疯了。',
    difficulty: '100+',
    tier: 'B',
    rewardPerHour: { rewardPoints: 10000, xp: 2000 },
    unlockCondition: '通关死神来了',
    unlocked: false,
  },
]
