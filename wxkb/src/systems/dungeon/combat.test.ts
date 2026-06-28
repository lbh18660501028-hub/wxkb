/**
 * 战棋回合调度（stepTacticsTurn）单元测试
 *
 * ==================== 测试说明 ====================
 * 验证战棋回合调度的核心行为：
 * - 首次调用时全员上网格 + 计算行动顺序
 * - 按速度排序轮流行动
 * - 自动模式下 AI 驱动所有单位
 * - 感染值正常累积
 * - 胜利/失败正确判定
 * - 队友 HP 同步到 NPC
 * - 撤退机制不被破坏
 *
 * ==================== 运行方式 ====================
 * npm test
 */

import { describe, it, expect } from 'vitest'
import { stepTacticsTurn, initCombat, type PlayerCombatContext } from './combat'
import { setUnitPosition, markUnitMoved, markUnitAttacked, type TacticsUnit } from './tactics'
import { EMPTY_ADVANCED_STATS } from '../../config/combat'
import type {
  DungeonRuntimeState,
  DungeonCombatState,
  CombatEnemy,
  CombatAlly,
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
 * 用 initCombat 创建一个完整的战斗状态，然后手动设置位置以简化测试
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

  // 手动替换敌人和队友（绕过 initCombat 的敌人创建逻辑）
  combat.enemies = enemies
  combat.allies = allies
  combat.player_hp = playerHp
  combat.player_max_hp = playerHp

  return { state, combat, playerCtx }
}

// ==================== 测试 ====================

describe('战棋回合调度 stepTacticsTurn', () => {
  it('首次调用：初始化网格，全员上网格', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', speed: 3 }),
    ])

    stepTacticsTurn(state, combat, playerCtx)

    // 网格应被初始化
    expect(combat.turn_order.length).toBeGreaterThan(0)
    expect(combat.tactics_round).toBe(1)
    expect(combat.current_turn_index).toBeGreaterThanOrEqual(0)

    // 玩家应有位置
    expect(combat.player_position).not.toBeNull()

    // 敌人应有位置
    expect(combat.enemies[0].position).not.toBeNull()
  })

  it('按速度排序：速度高的先行动', () => {
    // 敌人速度10 > 玩家速度8 > 敌人速度3
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'fast', name: '快速敌人', speed: 10, hp: 100, max_hp: 100 }),
      makeEnemy({ id: 'slow', name: '慢速敌人', speed: 3, hp: 100, max_hp: 100 }),
    ])

    // 第一次调用：初始化 + 第一个单位行动
    stepTacticsTurn(state, combat, playerCtx)

    // turn_order 应按速度降序：enemy:0(speed=10) → player(speed=8) → enemy:1(speed=3)
    expect(combat.turn_order[0]).toBe('enemy:0')
    expect(combat.turn_order[1]).toBe('player')
    expect(combat.turn_order[2]).toBe('enemy:1')
  })

  it('自动模式：AI 驱动单位移动并攻击', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 50, max_hp: 50, speed: 3 }),
    ])

    // 玩家速度8 > 敌人速度3，玩家先行动
    // 不断调用直到战斗结束或达到一定回合数
    let maxCalls = 200
    while (!combat.over && maxCalls > 0) {
      stepTacticsTurn(state, combat, playerCtx)
      maxCalls--
    }

    // 战斗应该结束（玩家应该能打赢这个弱敌）
    expect(combat.over).toBe(true)
  })

  it('感染值正常累积：敌人攻击玩家时增加感染值', () => {
    // 创建一个带感染攻击的敌人，放在玩家旁边
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        hp: 200, // 高血量确保战斗不会太快结束
        max_hp: 200,
        speed: 10, // 敌人先行动
        infection_on_hit: 5,
        attack: 100, // 超高攻击确保命中
        damage: 10,
      }),
    ])

    const initialInfection = state.player.infection

    // 跳过初始化，手动放置：敌人在玩家旁边（距离1=在攻击射程内）
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 1, y: 0 }
    combat.turn_order = ['enemy:0', 'player']
    combat.tactics_round = 1
    combat.current_turn_index = 0

    // 敌人行动（应该攻击玩家）
    stepTacticsTurn(state, combat, playerCtx)

    // 感染值应该增加（敌人攻击命中时触发感染）
    expect(state.player.infection).toBeGreaterThan(initialInfection)
  })

  it('感染值正常累积：敌人攻击队友时增加队友感染值', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '队友A', hp: 200, max_hp: 200, speed: 1 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        hp: 200,
        max_hp: 200,
        speed: 10,
        infection_on_hit: 5,
        attack: 20,
        damage: 10,
      }),
    ], [ally])

    // 手动放置：敌人紧贴队友
    combat.player_position = { x: 0, y: 0 }
    combat.enemies[0].position = { x: 5, y: 0 } // 远离玩家
    combat.allies[0].position = { x: 4, y: 0 } // 紧贴敌人
    combat.turn_order = ['enemy:0', 'ally:0', 'player']
    combat.tactics_round = 1
    combat.current_turn_index = 0

    const npcBefore = state.npcs.find((n) => n.id === 'a1')!
    const initialInfection = npcBefore.infection

    // 敌人行动
    stepTacticsTurn(state, combat, playerCtx)

    // 队友感染值应该增加（敌人会攻击最近的敌方单位，可能是队友）
    const npcAfter = state.npcs.find((n) => n.id === 'a1')!
    // 敌人可能攻击队友也可能攻击玩家，取决于AI判定谁更近
    // 队友在(4,0)敌人在(5,0)距离1，玩家在(0,0)敌人距离5
    // 所以敌人应该攻击队友
    expect(npcAfter.infection).toBeGreaterThan(initialInfection)
  })

  it('胜利判定：所有敌人被击败时战斗胜利', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 1, max_hp: 1, speed: 1 }),
    ])

    // 不断调用直到战斗结束
    let maxCalls = 100
    while (!combat.over && maxCalls > 0) {
      stepTacticsTurn(state, combat, playerCtx)
      maxCalls--
    }

    expect(combat.over).toBe(true)
    expect(combat.result).toBe('victory')
  })

  it('失败判定：玩家HP归零时战斗失败', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({
        id: 'e1',
        hp: 500,
        max_hp: 500,
        speed: 10,
        attack: 100,
        damage: 30,
        attack_range: 5,
      }),
    ])
    combat.player_hp = 10
    combat.player_max_hp = 100

    let maxCalls = 100
    while (!combat.over && maxCalls > 0) {
      stepTacticsTurn(state, combat, playerCtx)
      maxCalls--
    }

    expect(combat.over).toBe(true)
    expect(combat.result).toBe('defeat')
  })

  it('队友HP同步：战斗结束后队友HP同步回NPC', () => {
    const ally = makeAlly({ npc_id: 'a1', name: '队友A', hp: 30, max_hp: 30, speed: 7 })
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 1, max_hp: 1, speed: 1 }),
    ], [ally])

    let maxCalls = 100
    while (!combat.over && maxCalls > 0) {
      stepTacticsTurn(state, combat, playerCtx)
      maxCalls--
    }

    // 战斗结束后，队友HP应该同步回NPC
    const npc = state.npcs.find((n) => n.id === 'a1')
    expect(npc).toBeDefined()
    expect(npc!.hp).toBe(combat.allies[0].hp)
  })

  it('撤退机制：fleeCombat 不被破坏', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 50, max_hp: 50, speed: 5 }),
    ])

    // 先初始化
    stepTacticsTurn(state, combat, playerCtx)

    // 模拟撤退
    combat.result = 'fled'
    combat.over = true

    // 再调用 stepTacticsTurn 应该直接返回（不报错）
    const result = stepTacticsTurn(state, combat, playerCtx)
    expect(result.combatOver).toBe(true)
  })

  it('多个敌人：全部击败才算胜利', () => {
    const strongPlayer = makePlayerCtx({
      attributes: { strength: 50, agility: 50, endurance: 50, intelligence: 50, perception: 50, resolve: 50, presence: 10, manipulation: 10, composure: 10 },
      weaponAttack: 50,
    })
    const { state, combat } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 5, max_hp: 5, speed: 3, attack_range: 5 }),
      makeEnemy({ id: 'e2', hp: 5, max_hp: 5, speed: 2, attack_range: 5 }),
    ])
    combat.player_attack_range = 5

    let maxCalls = 500
    while (!combat.over && maxCalls > 0) {
      stepTacticsTurn(state, combat, strongPlayer)
      maxCalls--
    }

    expect(combat.over).toBe(true)
    expect(combat.result).toBe('victory')
    expect(combat.enemies.every((e) => e.hp <= 0)).toBe(true)
  })

  it('战斗日志正常生成', () => {
    const { state, combat, playerCtx } = makeCombatState([
      makeEnemy({ id: 'e1', hp: 5, max_hp: 5, speed: 3 }),
    ])

    stepTacticsTurn(state, combat, playerCtx)

    // 应该有日志
    expect(combat.logs.length).toBeGreaterThan(0)
    // 第一条日志应该包含"战棋回合"
    expect(combat.logs[0]).toContain('战棋回合')
  })
})

// ==================== 辅助函数测试 ====================

describe('战棋辅助函数 setUnitPosition / markUnitMoved / markUnitAttacked', () => {
  it('setUnitPosition：设置玩家位置', () => {
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })])
    setUnitPosition(combat, 'player', { x: 2, y: 3 })
    expect(combat.player_position).toEqual({ x: 2, y: 3 })
  })

  it('setUnitPosition：设置敌人位置', () => {
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })])
    setUnitPosition(combat, 'enemy:0', { x: 4, y: 5 })
    expect(combat.enemies[0].position).toEqual({ x: 4, y: 5 })
  })

  it('setUnitPosition：设置队友位置', () => {
    const ally = makeAlly({ npc_id: 'a1' })
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })], [ally])
    setUnitPosition(combat, 'ally:0', { x: 1, y: 1 })
    expect(combat.allies[0].position).toEqual({ x: 1, y: 1 })
  })

  it('markUnitMoved：标记玩家已移动', () => {
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })])
    markUnitMoved(combat, 'player')
    expect(combat.player_has_moved).toBe(true)
  })

  it('markUnitAttacked：标记玩家已攻击', () => {
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })])
    markUnitAttacked(combat, 'player')
    expect(combat.player_has_attacked).toBe(true)
  })

  it('markUnitMoved：标记敌人已移动', () => {
    const { combat } = makeCombatState([makeEnemy({ id: 'e1' })])
    markUnitMoved(combat, 'enemy:0')
    expect(combat.enemies[0].has_moved).toBe(true)
  })
})
