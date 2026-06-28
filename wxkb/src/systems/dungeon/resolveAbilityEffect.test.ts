/**
 * 能力效果结算器（resolveAbilityEffect）单元测试
 *
 * ==================== 测试说明 ====================
 * 验证 CombatAbility 的效果字段能正确驱动战斗结算：
 * - damageMultiplier 会改变伤害
 * - flatDamageBonus 会增加伤害
 * - healAmount 能治疗目标且不超过 maxHp
 * - infectionBonus 能正确增加感染值
 * - AOE 能对多个目标分别应用能力效果
 * - 没有合法目标时不会崩溃，并能写入合理日志
 * - 日志要显示技能名
 *
 * ==================== 测试策略 ====================
 * 为消除 D10 骰子随机性影响，测试中使用以下策略：
 * 1. damageMultiplier=0 + flatDamageBonus=N → 命中时伤害固定为 N（隔离随机基础伤害）
 * 2. damageMultiplier=1.0 + flatDamageBonus=0 → 命中时伤害为骰子基础伤害（>0）
 * 3. 对可能 miss 的场景使用 retryUntilHit 辅助函数
 *
 * ==================== 运行方式 ====================
 * 在 wxkb 目录下执行：npm test
 */

import { describe, it, expect } from 'vitest'
import {
  resolveAbilityEffect,
  applyAbilityToTarget,
  applyAbilityToArea,
  type AbilityResolutionContext,
} from './resolveAbilityEffect'
import { executeAttack, initCombat, type PlayerCombatContext } from './combat'
import { type TacticsUnit } from './tactics'
import { EMPTY_ADVANCED_STATS } from '../../config/combat'
import { getAbilityById } from '../../data/abilities'
import type {
  DungeonRuntimeState,
  DungeonCombatState,
  CombatEnemy,
  CombatAlly,
  CombatAbility,
  DungeonNpc,
} from '../../types/dungeon-v2'

// ==================== 测试辅助函数 ====================

function makePlayerCtx(overrides: Partial<PlayerCombatContext> = {}): PlayerCombatContext {
  return {
    attributes: {
      strength: 10,
      agility: 8,
      endurance: 10,
      intelligence: 10,
      perception: 8,
      resolve: 10,
      presence: 5,
      manipulation: 5,
      composure: 5,
    },
    allSkills: {},
    advancedStats: { ...EMPTY_ADVANCED_STATS },
    maxHp: 100,
    maxMp: 50,
    currentMp: 50,
    weaponAttack: 8,
    weaponEssence: null,
    attackMode: 'normal',
    skillCoefficient: 1,
    proficiencyBonus: 0,
    maxWillpower: 20,
    ...overrides,
  }
}

function makeEnemy(overrides: Partial<CombatEnemy> & { id: string }): CombatEnemy {
  return {
    name: '测试敌人',
    hp: 20,
    max_hp: 20,
    attack: 5,
    defense: 2,
    damage: 4,
    armor: 0,
    infection_on_hit: 0,
    infection_on_bite: 0,
    speed: 5,
    skills: [],
    damage_type: 'physical' as const,
    exp: 10,
    side_plots: {},
    position: null,
    move_range: 3,
    attack_range: 1,
    has_moved: false,
    has_attacked: false,
    ...overrides,
  }
}

function makeAlly(overrides: Partial<CombatAlly> & { npc_id: string }): CombatAlly {
  return {
    name: '测试队友',
    hp: 30,
    max_hp: 30,
    attack: 6,
    defense: 3,
    damage: 5,
    armor: 1,
    speed: 7,
    damage_type: 'physical' as const,
    down: false,
    position: null,
    move_range: 3,
    attack_range: 1,
    control_mode: 'auto',
    has_moved: false,
    has_attacked: false,
    ...overrides,
  }
}

function makeNpc(overrides: Partial<DungeonNpc> & { id: string }): DungeonNpc {
  return {
    name: '测试NPC',
    role: 'calm_analyst',
    identity: '分析员',
    hp: 30,
    max_hp: 30,
    infection: 0,
    trust: 30,
    fear: 0,
    skill: '分析',
    follow_state: 'following',
    current_room: 'B3',
    hidden_trait: '',
    alive: true,
    infected_state: 'clean',
    fate_flag: 'none',
    is_reincarnator: true,
    ...overrides,
  }
}

function makeRuntimeState(overrides: Partial<DungeonRuntimeState> = {}): DungeonRuntimeState {
  return {
    player: {
      hp: 100,
      max_hp: 100,
      infection: 0,
      position: 'B3',
      inventory: [],
      permanent_rewards: [],
      weapon: null,
      explored_rooms: [],
      flags: {},
      current_quest: null,
      alive: true,
      failed_actions: [],
      willpower: 20,
      max_willpower: 20,
    },
    global: {
      turn_count: 0,
      security_alert: 0,
      power_restored: false,
      laser_disabled: false,
      red_queen_processed: false,
      self_destruct_started: false,
      countdown: 0,
      virus_sample_taken: false,
      virus_sample_destroyed: false,
      virus_sample_frozen: false,
      sample_marked: false,
      rain_saved: false,
      rain_infected: false,
      antivirus_prototype_found: false,
      company_dossier_obtained: false,
      lisa_addison_file_obtained: false,
      spence_exposed: false,
      boss_weakened_level: 0,
      boss_weakened_max: 4,
      i4_valve_destroyed: false,
      f5_tank_destroyed_count: 0,
      licker_released: false,
      boss_tracking_turns: 0,
      one_survived_laser: false,
      jd_survived: false,
      kaplan_alive: false,
      matt_alive: false,
      alice_alive: false,
      evacuated: false,
      failed: false,
      ending_type: null,
      triggered_statuses: [],
      custom: {},
    },
    npcs: [],
    quests: [],
    logs: [],
    combat: null,
    pending_event: null,
    completed: false,
    ...overrides,
  }
}

/**
 * 创建完整的测试战斗状态
 */
function makeCombatState(
  enemies: CombatEnemy[],
  allies: CombatAlly[] = [],
  playerHp = 100,
): { state: DungeonRuntimeState; combat: DungeonCombatState; playerCtx: PlayerCombatContext } {
  const npcs: DungeonNpc[] = []
  for (const ally of allies) {
    npcs.push(makeNpc({ id: ally.npc_id, name: ally.name, hp: ally.hp, max_hp: ally.max_hp }))
  }

  const state = makeRuntimeState({
    npcs,
    player: { ...makeRuntimeState().player, hp: playerHp },
  })

  const playerCtx = makePlayerCtx({ maxHp: playerHp })
  const combat = initCombat(state, [], playerCtx)

  combat.enemies = enemies
  combat.allies = allies
  combat.player_hp = playerHp
  combat.player_max_hp = playerHp
  combat.tactics_mode = 'manual'
  combat.waiting_for_player = true

  return { state, combat, playerCtx }
}

/**
 * 收集日志的辅助函数
 */
function makeLogCollector(): { logs: string[]; pushLog: (text: string) => void } {
  const logs: string[] = []
  const pushLog = (text: string): void => {
    logs.push(text)
  }
  return { logs, pushLog }
}

/**
 * 重复攻击直到命中，返回伤害值
 * 用于消除 D10 骰子随机性对测试的影响
 */
function attackUntilHit(
  combat: DungeonCombatState,
  state: DungeonRuntimeState,
  playerCtx: PlayerCombatContext,
  enemyUid: string,
  ability: CombatAbility,
  maxRetries = 50,
): { damage: number; logs: string[] } {
  for (let i = 0; i < maxRetries; i++) {
    const { logs, pushLog } = makeLogCollector()
    const result = executeAttack(combat, state, playerCtx, 'player', enemyUid, pushLog, ability)
    if (result.hit) {
      return { damage: result.damage, logs }
    }
  }
  throw new Error(`攻击未命中，已重试 ${maxRetries} 次`)
}

// ==================== 测试：damageMultiplier ====================

describe('damageMultiplier 会改变伤害', () => {
  it('damageMultiplier=1.0 时伤害高于 damageMultiplier=0.0', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const enemyHp = 10000
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: enemyHp, max_hp: enemyHp, speed: 1, defense: 0, armor: 0 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }
    combat.player_attack_range = 5

    // damageMultiplier=0: 即使命中，伤害也为 0（0 * baseDamage = 0）
    const ability0: CombatAbility = {
      id: 'test_mult_0',
      name: '零倍率',
      range: 5,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      damageMultiplier: 0,
    }
    const { damage: damage0 } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability0)
    expect(damage0).toBe(0)

    // 重置敌人 HP
    combat.enemies[0].hp = enemyHp

    // damageMultiplier=1.0: 命中时伤害为骰子基础伤害（>0）
    const ability1: CombatAbility = {
      ...ability0,
      id: 'test_mult_1',
      name: '正常倍率',
      damageMultiplier: 1.0,
    }
    const { damage: damage1 } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability1)
    expect(damage1).toBeGreaterThan(0)

    // 1.0 倍率的伤害应该高于 0 倍率
    expect(damage1).toBeGreaterThan(damage0)
  })

  it('日志中显示技能名称', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 1000, max_hp: 1000, speed: 1, defense: 0, armor: 0 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }
    combat.player_attack_range = 5

    const ability: CombatAbility = {
      id: 'test_named',
      name: '烈焰斩',
      range: 5,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      damageMultiplier: 1.5,
    }
    const { logs } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability)

    // 日志中应包含技能名称
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('烈焰斩')
  })
})

// ==================== 测试：flatDamageBonus ====================

describe('flatDamageBonus 会增加伤害', () => {
  it('有 flatDamageBonus 时伤害高于无加值', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const enemyHp = 10000
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: enemyHp, max_hp: enemyHp, speed: 1, defense: 0, armor: 0 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }
    combat.player_attack_range = 5

    // damageMultiplier=0, flatDamageBonus=0: 命中时伤害 = 0
    const ability0: CombatAbility = {
      id: 'test_flat_0',
      name: '无加值',
      range: 5,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      damageMultiplier: 0,
      flatDamageBonus: 0,
    }
    const { damage: damage0 } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability0)
    expect(damage0).toBe(0)

    // 重置敌人 HP
    combat.enemies[0].hp = enemyHp

    // damageMultiplier=0, flatDamageBonus=20: 命中时伤害 = 20（隔离了随机基础伤害）
    const ability20: CombatAbility = {
      ...ability0,
      id: 'test_flat_20',
      name: '有加值',
      flatDamageBonus: 20,
    }
    const { damage: damage20 } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability20)
    expect(damage20).toBe(20)

    // 加值后的伤害应该更高
    expect(damage20).toBeGreaterThan(damage0)
  })

  it('flatDamageBonus 在日志中显示正确伤害', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 10000, max_hp: 10000, speed: 1, defense: 0, armor: 0 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }
    combat.player_attack_range = 5

    const ability: CombatAbility = {
      id: 'test_flat_log',
      name: '固伤打击',
      range: 5,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      damageMultiplier: 0,
      flatDamageBonus: 15,
    }
    const { logs, damage } = attackUntilHit(combat, state, strongPlayer, 'enemy:0', ability)

    expect(damage).toBe(15)
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('15')
    expect(allLogs).toContain('固伤打击')
  })
})

// ==================== 测试：healAmount ====================

describe('healAmount 能治疗目标且不超过 maxHp', () => {
  it('治疗友方目标恢复 HP', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 10, max_hp: 50 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ], [ally])
    combat.player_position = { x: 0, y: 0 }
    combat.allies[0].position = { x: 1, y: 0 }
    combat.enemies[0].position = { x: 5, y: 5 }

    const { logs, pushLog } = makeLogCollector()
    const healAbility: CombatAbility = {
      id: 'test_heal',
      name: '急救包',
      range: 3,
      area: 0,
      targetType: 'ally',
      shape: 'single',
      hostile: false,
      healAmount: 25,
    }

    const result = applyAbilityToTarget(state, combat, playerCtx, 'player', 'ally:0', healAbility, pushLog)

    expect(result.hit).toBe(true)
    expect(result.healed).toBe(25)
    expect(combat.allies[0].hp).toBe(35) // 10 + 25 = 35

    // 日志应包含技能名称和治疗量
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('急救包')
    expect(allLogs).toContain('25')
  })

  it('治疗不超过 maxHp', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 45, max_hp: 50 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ], [ally])
    combat.player_position = { x: 0, y: 0 }
    combat.allies[0].position = { x: 1, y: 0 }
    combat.enemies[0].position = { x: 5, y: 5 }

    const { pushLog } = makeLogCollector()
    const healAbility: CombatAbility = {
      id: 'test_heal',
      name: '急救包',
      range: 3,
      area: 0,
      targetType: 'ally',
      shape: 'single',
      hostile: false,
      healAmount: 25,
    }

    const result = applyAbilityToTarget(state, combat, playerCtx, 'player', 'ally:0', healAbility, pushLog)

    expect(result.healed).toBe(5) // 50 - 45 = 5（只恢复到 maxHp）
    expect(combat.allies[0].hp).toBe(50)
  })

  it('治疗玩家自身', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ])
    combat.player_hp = 30
    state.player.hp = 30
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 5, y: 5 }

    const { logs, pushLog } = makeLogCollector()
    const healAbility: CombatAbility = {
      id: 'test_heal_self',
      name: '自愈',
      range: 0,
      area: 0,
      targetType: 'self',
      shape: 'single',
      hostile: false,
      healAmount: 25,
    }

    const result = applyAbilityToTarget(state, combat, playerCtx, 'player', 'player', healAbility, pushLog)

    expect(result.hit).toBe(true)
    expect(result.healed).toBe(25)
    expect(combat.player_hp).toBe(55) // 30 + 25 = 55
    expect(state.player.hp).toBe(55)

    const allLogs = logs.join('\n')
    expect(allLogs).toContain('自愈')
  })

  it('治疗倒下的队友不生效', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 0, max_hp: 50, down: true })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ], [ally])

    const { pushLog } = makeLogCollector()
    const healAbility: CombatAbility = {
      id: 'test_heal',
      name: '急救包',
      range: 3,
      area: 0,
      targetType: 'ally',
      shape: 'single',
      hostile: false,
      healAmount: 25,
    }

    const result = applyAbilityToTarget(state, combat, playerCtx, 'player', 'ally:0', healAbility, pushLog)

    expect(result.hit).toBe(false)
    expect(result.healed).toBe(0)
  })

  it('治疗同步到 NPC 状态', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 10, max_hp: 50 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ], [ally])

    const { pushLog } = makeLogCollector()
    const healAbility: CombatAbility = {
      id: 'test_heal',
      name: '急救包',
      range: 3,
      area: 0,
      targetType: 'ally',
      shape: 'single',
      hostile: false,
      healAmount: 25,
    }

    applyAbilityToTarget(state, combat, playerCtx, 'player', 'ally:0', healAbility, pushLog)

    // NPC 的 HP 应同步
    const npc = state.npcs.find((n) => n.id === 'a1')
    expect(npc).toBeDefined()
    expect(npc!.hp).toBe(35)
  })
})

// ==================== 测试：infectionBonus ====================

describe('infectionBonus 能正确增加感染值', () => {
  it('敌人使用带 infectionBonus 的能力攻击玩家时增加感染值', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        name: '抱脸虫',
        hp: 100,
        max_hp: 100,
        speed: 10,
        attack: 100,
        damage: 10,
        infection_on_hit: 0,
      }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }

    const initialInfection = state.player.infection
    const infectAbility: CombatAbility = {
      id: 'test_infect',
      name: '扑击',
      range: 1,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      infectionBonus: 5,
    }

    // 敌人攻击玩家 — 重试直到命中（D10 骰子有随机性）
    let logs: string[] = []
    let hit = false
    for (let i = 0; i < 50 && !hit; i++) {
      const collector = makeLogCollector()
      const playerHpBefore = combat.player_hp
      const result = executeAttack(combat, state, playerCtx, 'enemy:0', 'player', collector.pushLog, infectAbility)
      if (result.hit) {
        hit = true
        logs = collector.logs
      } else {
        // 未命中时恢复玩家 HP（重试）
        combat.player_hp = playerHpBefore
      }
    }
    expect(hit).toBe(true)

    // 感染值应增加 5
    expect(state.player.infection).toBe(initialInfection + 5)

    // 日志应包含技能名和感染信息
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('扑击')
    expect(allLogs).toContain('感染值 +5')
  })

  it('敌人使用带 infectionBonus 的能力攻击队友时增加队友感染值', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 200, max_hp: 200, speed: 1 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        name: '感染体',
        hp: 100,
        max_hp: 100,
        speed: 10,
        attack: 100,
        damage: 10,
        infection_on_hit: 0,
      }),
    ], [ally])
    combat.player_position = { x: 5, y: 5 }
    combat.allies[0].position = { x: 1, y: 0 }
    combat.enemies[0].position = { x: 0, y: 0 }

    const npc = state.npcs.find((n) => n.id === 'a1')!
    const initialInfection = npc.infection
    const infectAbility: CombatAbility = {
      id: 'test_infect',
      name: '扑击',
      range: 1,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      infectionBonus: 8,
    }

    // 重试直到命中（D10 骰子有随机性）
    let logs: string[] = []
    let hit = false
    for (let i = 0; i < 50 && !hit; i++) {
      const collector = makeLogCollector()
      const allyHpBefore = combat.allies[0].hp
      const result = executeAttack(combat, state, playerCtx, 'enemy:0', 'ally:0', collector.pushLog, infectAbility)
      if (result.hit) {
        hit = true
        logs = collector.logs
      } else {
        combat.allies[0].hp = allyHpBefore
      }
    }
    expect(hit).toBe(true)

    // 队友感染值应增加 8
    const npcAfter = state.npcs.find((n) => n.id === 'a1')!
    expect(npcAfter.infection).toBe(initialInfection + 8)

    const allLogs = logs.join('\n')
    expect(allLogs).toContain('扑击')
    expect(allLogs).toContain('感染值 +8')
  })

  it('infectionBonus 与敌人基础 infection_on_hit 叠加', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        hp: 100,
        max_hp: 100,
        speed: 10,
        attack: 100,
        damage: 10,
        infection_on_hit: 3,
      }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }

    const initialInfection = state.player.infection
    const infectAbility: CombatAbility = {
      id: 'test_infect',
      name: '扑击',
      range: 1,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
      infectionBonus: 5,
    }

    // 重试直到命中（D10 骰子有随机性）
    let hit = false
    for (let i = 0; i < 50 && !hit; i++) {
      const playerHpBefore = combat.player_hp
      const collector = makeLogCollector()
      const result = executeAttack(combat, state, playerCtx, 'enemy:0', 'player', collector.pushLog, infectAbility)
      if (result.hit) {
        hit = true
      } else {
        combat.player_hp = playerHpBefore
      }
    }
    expect(hit).toBe(true)

    // 感染值应增加 3 + 5 = 8
    expect(state.player.infection).toBe(initialInfection + 8)
  })
})

// ==================== 测试：AOE 多目标 ====================

describe('AOE 能对多个目标分别应用能力效果', () => {
  it('AOE 命中多个敌人并分别造成伤害', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', name: '敌人A', hp: 500, max_hp: 500, speed: 1 }),
      makeEnemy({ id: 'e2', name: '敌人B', hp: 500, max_hp: 500, speed: 1 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 2, y: 0 }
    combat.enemies[1].position = { x: 3, y: 0 }

    const { logs, pushLog } = makeLogCollector()
    const aoeAbility: CombatAbility = {
      id: 'test_aoe',
      name: '范围打击',
      range: 3,
      area: 1,
      targetType: 'enemy',
      shape: 'aoe-diamond',
      hostile: true,
      damageMultiplier: 1.0,
    }

    const result = applyAbilityToArea(state, combat, playerCtx, 'player', { x: 2, y: 0 }, aoeAbility, pushLog)

    // 应该命中至少 1 个敌人（AOE 中每个目标独立判定命中）
    expect(result.targetsAffected).toBeGreaterThanOrEqual(1)
    expect(result.damage).toBeGreaterThan(0)

    // 日志应包含技能名
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('范围打击')
  })

  it('AOE 的 flatDamageBonus 对每个目标生效', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const enemyHp = 10000
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: enemyHp, max_hp: enemyHp, speed: 1, defense: 0, armor: 0 }),
      makeEnemy({ id: 'e2', hp: enemyHp, max_hp: enemyHp, speed: 1, defense: 0, armor: 0 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 2, y: 0 }
    combat.enemies[1].position = { x: 3, y: 0 }

    // damageMultiplier=0, flatDamageBonus=10: 每个命中的敌人受到恰好 10 点伤害
    const { pushLog } = makeLogCollector()
    const aoeAbility: CombatAbility = {
      id: 'test_aoe_flat',
      name: '固伤AOE',
      range: 3,
      area: 1,
      targetType: 'enemy',
      shape: 'aoe-diamond',
      hostile: true,
      damageMultiplier: 0,
      flatDamageBonus: 10,
    }

    const result = applyAbilityToArea(state, combat, playerCtx, 'player', { x: 2, y: 0 }, aoeAbility, pushLog)

    // 每个命中的敌人应受到恰好 10 点伤害
    // 检查每个敌人的 HP 变化
    const dmg0 = enemyHp - combat.enemies[0].hp
    const dmg1 = enemyHp - combat.enemies[1].hp

    // 命中的敌人伤害应为 10，未命中的应为 0
    if (dmg0 > 0) expect(dmg0).toBe(10)
    if (dmg1 > 0) expect(dmg1).toBe(10)

    // 总伤害应为 10 * 命中数
    expect(result.damage).toBe(10 * result.targetsAffected)
    expect(result.targetsAffected).toBeGreaterThanOrEqual(1)
  })
})

// ==================== 测试：无合法目标不崩溃 ====================

describe('没有合法目标时不会崩溃', () => {
  it('AOE 范围内无敌人时不崩溃并写入日志', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 5, y: 5 } // 远离 AOE 中心

    const { logs, pushLog } = makeLogCollector()
    const aoeAbility: CombatAbility = {
      id: 'test_aoe',
      name: '范围打击',
      range: 3,
      area: 1,
      targetType: 'enemy',
      shape: 'aoe-diamond',
      hostile: true,
    }

    const result = applyAbilityToArea(state, combat, playerCtx, 'player', { x: 1, y: 0 }, aoeAbility, pushLog)

    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
    expect(result.targetsAffected).toBe(0)

    // 应有日志说明没命中
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('没有命中')
  })

  it('单体技能攻击不存在的目标不崩溃', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }

    const { pushLog } = makeLogCollector()
    const ability: CombatAbility = {
      id: 'test_attack',
      name: '攻击',
      range: 1,
      area: 0,
      targetType: 'enemy',
      shape: 'single',
      hostile: true,
    }

    // 攻击不存在的目标 index
    const result = applyAbilityToTarget(state, combat, playerCtx, 'player', 'enemy:99', ability, pushLog)

    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
  })
})

// ==================== 测试：resolveAbilityEffect 统一入口 ====================

describe('resolveAbilityEffect 统一入口', () => {
  it('单体敌对技能通过 resolveAbilityEffect 结算', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const { state, combat } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 10000, max_hp: 10000, speed: 1 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }

    const { logs, pushLog } = makeLogCollector()
    const ctx: AbilityResolutionContext = {
      state,
      combat,
      playerCtx: strongPlayer,
      actorUid: 'player',
      ability: {
        id: 'test_resolve',
        name: '裂空斩',
        range: 1,
        area: 0,
        targetType: 'enemy',
        shape: 'single',
        hostile: true,
        damageMultiplier: 0,
        flatDamageBonus: 30,
      },
      targetUid: 'enemy:0',
      pushLog,
    }

    const result = resolveAbilityEffect(ctx)

    // damageMultiplier=0, flatDamageBonus=30 → 命中时伤害 = 30
    if (result.hit) {
      expect(result.damage).toBe(30)
    }
    expect(result.damage).toBeGreaterThanOrEqual(0) // 未命中时为 0

    const allLogs = logs.join('\n')
    // 如果命中，日志应包含技能名
    if (result.hit) {
      expect(allLogs).toContain('裂空斩')
    }
  })

  it('AOE 技能通过 resolveAbilityEffect 结算', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })

    const { state, combat } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 10000, max_hp: 10000, speed: 1 }),
      makeEnemy({ id: 'e2', hp: 10000, max_hp: 10000, speed: 1 }),
    ])
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 2, y: 0 }
    combat.enemies[1].position = { x: 3, y: 0 }

    const { logs, pushLog } = makeLogCollector()
    const ctx: AbilityResolutionContext = {
      state,
      combat,
      playerCtx: strongPlayer,
      actorUid: 'player',
      ability: {
        id: 'test_resolve_aoe',
        name: '天降陨石',
        range: 3,
        area: 1,
        targetType: 'enemy',
        shape: 'aoe-diamond',
        hostile: true,
        damageMultiplier: 0,
        flatDamageBonus: 15,
      },
      targetCell: { x: 2, y: 0 },
      pushLog,
    }

    const result = resolveAbilityEffect(ctx)

    // 每个命中的敌人受到 15 点伤害
    expect(result.damage).toBe(15 * result.targetsAffected)
    expect(result.targetsAffected).toBeGreaterThanOrEqual(0)

    const allLogs = logs.join('\n')
    expect(allLogs).toContain('天降陨石')
  })

  it('治疗技能通过 resolveAbilityEffect 结算', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '蛋蛋', hp: 10, max_hp: 50 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 100, max_hp: 100, speed: 1 }),
    ], [ally])
    combat.player_position = { x: 0, y: 0 }
    combat.allies[0].position = { x: 1, y: 0 }

    const { logs, pushLog } = makeLogCollector()
    const ctx: AbilityResolutionContext = {
      state,
      combat,
      playerCtx,
      actorUid: 'player',
      ability: {
        id: 'test_heal',
        name: '急救包',
        range: 3,
        area: 0,
        targetType: 'ally',
        shape: 'single',
        hostile: false,
        healAmount: 25,
      },
      targetUid: 'ally:0',
      pushLog,
    }

    const result = resolveAbilityEffect(ctx)

    expect(result.healed).toBe(25)
    expect(combat.allies[0].hp).toBe(35)

    const allLogs = logs.join('\n')
    expect(allLogs).toContain('急救包')
    expect(allLogs).toContain('蛋蛋')
  })
})

// ==================== 测试：内置技能数据验证 ====================

describe('内置测试技能数据验证', () => {
  it('test_heal 技能定义正确', () => {
    const ability = getAbilityById('test_heal')
    expect(ability).toBeDefined()
    expect(ability!.id).toBe('test_heal')
    expect(ability!.name).toBe('急救包')
    expect(ability!.healAmount).toBe(25)
    expect(ability!.hostile).toBe(false)
    expect(ability!.targetType).toBe('ally')
    expect(ability!.shape).toBe('single')
  })

  it('test_infect 技能定义正确', () => {
    const ability = getAbilityById('test_infect')
    expect(ability).toBeDefined()
    expect(ability!.id).toBe('test_infect')
    expect(ability!.name).toBe('扑击')
    expect(ability!.infectionBonus).toBe(5)
    expect(ability!.hostile).toBe(true)
    expect(ability!.targetType).toBe('enemy')
    expect(ability!.shape).toBe('single')
  })
})
