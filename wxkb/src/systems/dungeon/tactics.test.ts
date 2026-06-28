/**
 * 战棋规则模块（tactics.ts）单元测试
 *
 * ==================== 测试说明 ====================
 * 这个文件用"断言"的方式验证 tactics.ts 里的每个核心函数算得对不对。
 * 每个测试用例模拟一个场景，检查函数返回值是否等于预期值。
 * 如果全部通过，说明规则内核的数学计算是正确的。
 *
 * ==================== 运行方式 ====================
 * 在 wxkb 目录下执行：npm test
 * 看到所有测试项前面是 ✓ 或绿色的 ✓ 就是通过了。
 * 如果有红色的 ✗ 或 ×，说明有测试失败，会显示哪一行出错了。
 */

import { describe, it, expect } from 'vitest'
import {
  // 距离计算
  chebyshevDistance,
  manhattanDistance,
  getRangeDistance,
  // 射程判定
  isInRange,
  // 坐标工具
  cellKey,
  parseCellKey,
  isInBounds,
  isSamePos,
  // 占据判定
  getOccupiedCells,
  // 寻路
  findPath,
  // 可移动格
  getMovableCells,
  // 可攻击目标
  getAttackableTargets,
  // 阵型放置
  placeFormation,
  // 行动顺序
  calculateTurnOrder,
  // 回合状态
  resetUnitActions,
  isUnitDone,
  // 最简 AI
  simpleAIDecide,
  // 单位标识
  playerUid,
  enemyUid,
  allyUid,
  parseUid,
  // 文字渲染
  renderGridText,
  // 工具
  formatPos,
  // 类型
  type TacticsUnit,
} from './tactics'
import type { DungeonCombatState, CombatEnemy, CombatAlly, GridPosition } from '../../types/dungeon-v2'

// ==================== 测试辅助函数 ====================

/**
 * 创建一个最小的 TacticsUnit（战术单位）用于测试
 */
function makeUnit(overrides: Partial<TacticsUnit> & { uid: string }): TacticsUnit {
  return {
    name: '测试单位',
    side: 'player',
    position: null,
    move_range: 3,
    attack_range: 1,
    has_moved: false,
    has_attacked: false,
    control_mode: 'auto',
    hp: 100,
    max_hp: 100,
    speed: 5,
    alive: true,
    ...overrides,
  }
}

/**
 * 创建一个最小的 CombatEnemy（敌人）用于测试
 */
function makeEnemy(overrides: Partial<CombatEnemy> & { id: string }): CombatEnemy {
  return {
    name: '测试敌人',
    hp: 30,
    max_hp: 30,
    attack: 5,
    defense: 1,
    damage: 6,
    armor: 0,
    infection_on_hit: 0,
    infection_on_bite: 0,
    speed: 5,
    skills: [],
    damage_type: 'physical',
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

/**
 * 创建一个最小的 CombatAlly（队友）用于测试
 */
function makeAlly(overrides: Partial<CombatAlly> & { npc_id: string }): CombatAlly {
  return {
    name: '测试队友',
    hp: 50,
    max_hp: 50,
    attack: 5,
    defense: 2,
    damage: 4,
    armor: 1,
    speed: 6,
    damage_type: 'physical',
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

/**
 * 创建一个最小的 DungeonCombatState（战斗状态）用于测试
 */
function makeCombat(overrides: Partial<DungeonCombatState> = {}): DungeonCombatState {
  return {
    enemies: [],
    current_enemy_index: 0,
    round: 0,
    logs: [],
    player_hp: 100,
    player_max_hp: 100,
    player_mp: 50,
    player_max_mp: 50,
    allies: [],
    over: false,
    result: null,
    rewards: { xp: 0, reward_points: 0, side_plots: { D: 0, C: 0 }, items: [] },
    tactics_mode: 'auto',
    grid_width: 6,
    grid_height: 6,
    turn_order: [],
    current_turn_index: 0,
    tactics_round: 0,
    player_position: null,
    player_move_range: 3,
    player_attack_range: 1,
    player_has_moved: false,
    player_has_attacked: false,
    auto_play_interval_ms: 400,
    fast_forward: false,
    waiting_for_player: false,
    ...overrides,
  }
}

// ==================== 1. 距离计算 ====================

describe('距离计算', () => {
  it('切比雪夫距离：同一位置距离为0', () => {
    expect(chebyshevDistance({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(0)
  })

  it('切比雪夫距离：水平方向', () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
  })

  it('切比雪夫距离：对角线方向（国王走法，斜对角算1格）', () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1)
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(2)
  })

  it('切比雪夫距离：取最大轴差', () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3)
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 1, y: 5 })).toBe(5)
  })

  it('曼哈顿距离：同一位置距离为0', () => {
    expect(manhattanDistance({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(0)
  })

  it('曼哈顿距离：水平方向', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
  })

  it('曼哈顿距离：对角线方向（不能斜走，需走两步）', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2)
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(4)
  })

  it('getRangeDistance：默认配置应返回切比雪夫距离', () => {
    // 默认 RANGE_CALCULATION = 'chebyshev'
    expect(getRangeDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1)
  })
})

// ==================== 2. 射程判定 ====================

describe('射程判定 isInRange', () => {
  it('目标在射程内（相邻，射程1）', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 1, y: 0 }, 1)).toBe(true)
    expect(isInRange({ x: 0, y: 0 }, { x: 0, y: 1 }, 1)).toBe(true)
    expect(isInRange({ x: 0, y: 0 }, { x: 1, y: 1 }, 1)).toBe(true) // 对角线相邻也算
  })

  it('目标在射程外（距离2，射程1）', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 2, y: 0 }, 1)).toBe(false)
    expect(isInRange({ x: 0, y: 0 }, { x: 2, y: 2 }, 1)).toBe(false)
  })

  it('远程射程3：距离3的目标在射程内', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 3, y: 0 }, 3)).toBe(true)
    expect(isInRange({ x: 0, y: 0 }, { x: 2, y: 2 }, 3)).toBe(true)
  })

  it('远程射程3：距离4的目标在射程外', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 4, y: 0 }, 3)).toBe(false)
  })

  it('同一位置算射程内（距离0 ≤ 任何射程）', () => {
    expect(isInRange({ x: 2, y: 2 }, { x: 2, y: 2 }, 1)).toBe(true)
  })
})

// ==================== 3. 坐标工具 ====================

describe('坐标工具', () => {
  it('cellKey：坐标转键', () => {
    expect(cellKey({ x: 3, y: 2 })).toBe('3,2')
    expect(cellKey({ x: 0, y: 0 })).toBe('0,0')
  })

  it('parseCellKey：键转坐标', () => {
    expect(parseCellKey('3,2')).toEqual({ x: 3, y: 2 })
    expect(parseCellKey('0,0')).toEqual({ x: 0, y: 0 })
  })

  it('isInBounds：网格内为true', () => {
    expect(isInBounds({ x: 0, y: 0 }, 6, 6)).toBe(true)
    expect(isInBounds({ x: 5, y: 5 }, 6, 6)).toBe(true)
  })

  it('isInBounds：网格外为false', () => {
    expect(isInBounds({ x: 6, y: 0 }, 6, 6)).toBe(false)
    expect(isInBounds({ x: 0, y: 6 }, 6, 6)).toBe(false)
    expect(isInBounds({ x: -1, y: 0 }, 6, 6)).toBe(false)
  })

  it('isSamePos：相同坐标为true', () => {
    expect(isSamePos({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(true)
  })

  it('isSamePos：不同坐标为false', () => {
    expect(isSamePos({ x: 2, y: 3 }, { x: 2, y: 4 })).toBe(false)
    expect(isSamePos({ x: 2, y: 3 }, { x: 3, y: 3 })).toBe(false)
  })
})

// ==================== 4. 占据判定 ====================

describe('占据判定 getOccupiedCells', () => {
  it('返回所有存活单位占据的格子', () => {
    const units: TacticsUnit[] = [
      makeUnit({ uid: 'player', position: { x: 0, y: 0 } }),
      makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 5, y: 3 } }),
    ]
    const occupied = getOccupiedCells(units)
    expect(occupied.has('0,0')).toBe(true)
    expect(occupied.has('5,3')).toBe(true)
    expect(occupied.size).toBe(2)
  })

  it('排除指定单位（自己不阻挡自己）', () => {
    const units: TacticsUnit[] = [
      makeUnit({ uid: 'player', position: { x: 0, y: 0 } }),
      makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 5, y: 3 } }),
    ]
    const occupied = getOccupiedCells(units, 'player')
    expect(occupied.has('0,0')).toBe(false)
    expect(occupied.has('5,3')).toBe(true)
  })

  it('不统计死亡单位', () => {
    const units: TacticsUnit[] = [
      makeUnit({ uid: 'player', position: { x: 0, y: 0 } }),
      makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 5, y: 3 }, alive: false }),
    ]
    const occupied = getOccupiedCells(units)
    expect(occupied.has('0,0')).toBe(true)
    expect(occupied.has('5,3')).toBe(false)
    expect(occupied.size).toBe(1)
  })
})

// ==================== 5. 寻路算法 ====================

describe('寻路 findPath', () => {
  it('起点等于终点，返回空路径', () => {
    const path = findPath({ x: 2, y: 2 }, { x: 2, y: 2 }, 6, 6, new Set())
    expect(path).toEqual([])
  })

  it('相邻格子，路径长度为1', () => {
    const path = findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, 6, 6, new Set())
    expect(path).not.toBeNull()
    expect(path!.length).toBe(1)
    expect(path![0]).toEqual({ x: 1, y: 0 })
  })

  it('直线距离3，路径长度为3', () => {
    const path = findPath({ x: 0, y: 0 }, { x: 3, y: 0 }, 6, 6, new Set())
    expect(path).not.toBeNull()
    expect(path!.length).toBe(3)
  })

  it('绕过被占据的格子', () => {
    // (1,0) 被占据，需要绕路
    const occupied = new Set<string>(['1,0'])
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, 6, 6, occupied)
    expect(path).not.toBeNull()
    // 应该走 (0,0)→(0,1)→(1,1)→(2,1)→(2,0) 或类似绕路
    expect(path!.length).toBeGreaterThanOrEqual(3)
    // 终点正确
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 })
  })

  it('终点出界，返回null', () => {
    const path = findPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 6, 6, new Set())
    expect(path).toBeNull()
  })
})

// ==================== 6. 可移动格列表 ====================

describe('可移动格 getMovableCells', () => {
  it('移动力3的空旷网格，应返回多个可达格子', () => {
    const unit = makeUnit({
      uid: 'player',
      position: { x: 2, y: 2 },
      move_range: 3,
    })
    const cells = getMovableCells(unit, [unit], 6, 6)
    expect(cells.length).toBeGreaterThan(0)
    // 4方向BFS，从(2,2)出发3步可达所有曼哈顿距离≤3的格子
    // 距离1: 4格, 距离2: 8格, 距离3: 10格（6x6网格边界裁掉了2格）
    // 总计: 4 + 8 + 10 = 22
    expect(cells.length).toBe(22)
  })

  it('已移动过的单位不能移动', () => {
    const unit = makeUnit({
      uid: 'player',
      position: { x: 2, y: 2 },
      move_range: 3,
      has_moved: true,
    })
    const cells = getMovableCells(unit, [unit], 6, 6)
    expect(cells).toEqual([])
  })

  it('未放置的单位不能移动', () => {
    const unit = makeUnit({
      uid: 'player',
      position: null,
      move_range: 3,
    })
    const cells = getMovableCells(unit, [unit], 6, 6)
    expect(cells).toEqual([])
  })

  it('不能走到被其他单位占据的格子', () => {
    const player = makeUnit({
      uid: 'player',
      position: { x: 0, y: 0 },
      move_range: 1,
    })
    const blocker = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 1, y: 0 },
    })
    const cells = getMovableCells(player, [player, blocker], 6, 6)
    // 右边(1,0)被占了，只能走上(0,1)和下(0,-1→出界)
    // 4方向：上(0,-1)出界, 下(0,1)可走, 左(-1,0)出界, 右(1,0)被占
    expect(cells.length).toBe(1)
    expect(cells[0]).toEqual({ x: 0, y: 1 })
  })
})

// ==================== 7. 可攻击目标列表 ====================

describe('可攻击目标 getAttackableTargets', () => {
  it('射程内的敌方单位可被攻击', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 1,
    })
    const enemy = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 1, y: 0 },
    })
    const targets = getAttackableTargets(player, [player, enemy])
    expect(targets.length).toBe(1)
    expect(targets[0].uid).toBe('enemy:0')
  })

  it('射程外的敌方单位不可被攻击', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 1,
    })
    const enemy = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 3, y: 0 },
    })
    const targets = getAttackableTargets(player, [player, enemy])
    expect(targets.length).toBe(0)
  })

  it('同阵营单位不能被攻击', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 1,
    })
    const ally = makeUnit({
      uid: 'ally:0',
      side: 'player',
      position: { x: 1, y: 0 },
    })
    const targets = getAttackableTargets(player, [player, ally])
    expect(targets.length).toBe(0)
  })

  it('已攻击过的单位不能再次攻击', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 1,
      has_attacked: true,
    })
    const enemy = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 1, y: 0 },
    })
    const targets = getAttackableTargets(player, [player, enemy])
    expect(targets.length).toBe(0)
  })

  it('多个目标按距离从近到远排序', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 2, y: 2 },
      attack_range: 3,
    })
    const enemyNear = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 3, y: 2 }, // 距离1
    })
    const enemyFar = makeUnit({
      uid: 'enemy:1',
      side: 'enemy',
      position: { x: 5, y: 2 }, // 距离3
    })
    const targets = getAttackableTargets(player, [player, enemyNear, enemyFar])
    expect(targets.length).toBe(2)
    expect(targets[0].uid).toBe('enemy:0') // 近的排前面
    expect(targets[1].uid).toBe('enemy:1') // 远的排后面
  })
})

// ==================== 8. 阵型放置 ====================

describe('阵型放置 placeFormation', () => {
  it('玩家和队友放在左侧，敌人放在右侧', () => {
    const combat = makeCombat({
      enemies: [makeEnemy({ id: 'e1', hp: 30 })],
      allies: [makeAlly({ npc_id: 'a1' })],
    })
    placeFormation(combat, 10)

    // 玩家应该在左侧（x=0 或 x=1）
    expect(combat.player_position).not.toBeNull()
    expect(combat.player_position!.x).toBeLessThanOrEqual(1)

    // 队友应该在左侧
    expect(combat.allies[0].position).not.toBeNull()
    expect(combat.allies[0].position!.x).toBeLessThanOrEqual(1)

    // 敌人应该在右侧（x=4 或 x=5）
    expect(combat.enemies[0].position).not.toBeNull()
    expect(combat.enemies[0].position!.x).toBeGreaterThanOrEqual(4)
  })

  it('多个敌人均匀分布在右侧区域', () => {
    const combat = makeCombat({
      enemies: [
        makeEnemy({ id: 'e1' }),
        makeEnemy({ id: 'e2' }),
        makeEnemy({ id: 'e3' }),
      ],
    })
    placeFormation(combat, 10)

    // 三个敌人应该都被放置
    for (const enemy of combat.enemies) {
      expect(enemy.position).not.toBeNull()
      expect(enemy.position!.x).toBeGreaterThanOrEqual(4)
    }

    // 不应该有两个敌人站在同一个格子
    const positions = combat.enemies.map((e) => cellKey(e.position!))
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(3)
  })

  it('玩家和队友不站在同一个格子', () => {
    const combat = makeCombat({
      allies: [makeAlly({ npc_id: 'a1' }), makeAlly({ npc_id: 'a2' })],
    })
    placeFormation(combat, 10)

    expect(combat.player_position).not.toBeNull()
    for (const ally of combat.allies) {
      expect(ally.position).not.toBeNull()
      expect(isSamePos(ally.position!, combat.player_position!)).toBe(false)
    }
  })
})

// ==================== 9. 行动顺序计算 ====================

describe('行动顺序 calculateTurnOrder', () => {
  it('按速度降序排列', () => {
    const combat = makeCombat({
      enemies: [
        makeEnemy({ id: 'e1', speed: 3 }),
        makeEnemy({ id: 'e2', speed: 8 }),
      ],
    })
    // 玩家速度10
    const order = calculateTurnOrder(combat, 10)

    // 速度10 > 速度8 > 速度3
    expect(order).toEqual(['player', 'enemy:1', 'enemy:0'])
  })

  it('速度相同时按uid字母序排列（保证稳定）', () => {
    const combat = makeCombat({
      enemies: [
        makeEnemy({ id: 'e1', speed: 5 }),
      ],
      allies: [
        makeAlly({ npc_id: 'a1', speed: 5 }),
      ],
    })
    const order = calculateTurnOrder(combat, 5)
    // 三者速度都是5，按字母序: ally:0 < enemy:0 < player
    expect(order).toEqual(['ally:0', 'enemy:0', 'player'])
  })

  it('不包含已死亡的单位', () => {
    const combat = makeCombat({
      enemies: [
        makeEnemy({ id: 'e1', speed: 10, hp: 0 }), // 已死
        makeEnemy({ id: 'e2', speed: 5 }),
      ],
    })
    const order = calculateTurnOrder(combat, 8)
    // 只有 player 和 enemy:1（enemy:0 死了不在序列中）
    expect(order).toEqual(['player', 'enemy:1'])
  })
})

// ==================== 10. 回合状态管理 ====================

describe('回合状态管理', () => {
  it('resetUnitActions：重置玩家的行动标记', () => {
    const combat = makeCombat({
      player_has_moved: true,
      player_has_attacked: true,
    })
    resetUnitActions(combat, 'player')
    expect(combat.player_has_moved).toBe(false)
    expect(combat.player_has_attacked).toBe(false)
  })

  it('resetUnitActions：重置敌人的行动标记', () => {
    const combat = makeCombat({
      enemies: [makeEnemy({ id: 'e1', has_moved: true, has_attacked: true })],
    })
    resetUnitActions(combat, 'enemy:0')
    expect(combat.enemies[0].has_moved).toBe(false)
    expect(combat.enemies[0].has_attacked).toBe(false)
  })

  it('isUnitDone：移动和攻击都用完才算done', () => {
    const combat = makeCombat({
      player_has_moved: true,
      player_has_attacked: true,
    })
    expect(isUnitDone(combat, 'player')).toBe(true)
  })

  it('isUnitDone：只移动了不算done', () => {
    const combat = makeCombat({
      player_has_moved: true,
      player_has_attacked: false,
    })
    expect(isUnitDone(combat, 'player')).toBe(false)
  })
})

// ==================== 11. 最简 AI 决策 ====================

describe('最简AI simpleAIDecide', () => {
  it('敌人在射程内 → 直接攻击', () => {
    const aiUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 3, y: 3 },
      attack_range: 1,
    })
    const target = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 3, y: 2 }, // 相邻，距离1
    })
    const decision = simpleAIDecide(aiUnit, [aiUnit, target], 6, 6)
    expect(decision.action).toBe('attack')
    expect(decision.attackTargetUid).toBe('player')
  })

  it('敌人在射程外 → 朝敌人移动', () => {
    const aiUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 0, y: 0 },
      attack_range: 1,
      move_range: 3,
    })
    const target = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 5, y: 5 }, // 很远
    })
    const decision = simpleAIDecide(aiUnit, [aiUnit, target], 6, 6)
    // 应该移动（move 或 move_and_attack）
    expect(decision.action === 'move' || decision.action === 'move_and_attack').toBe(true)
    expect(decision.moveTarget).toBeDefined()
  })

  it('移动后能进入射程 → move_and_attack', () => {
    const aiUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 0, y: 0 },
      attack_range: 1,
      move_range: 3,
    })
    const target = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 3, y: 0 }, // 距离3，移动力3走过去后距离0→在射程内
    })
    const decision = simpleAIDecide(aiUnit, [aiUnit, target], 6, 6)
    expect(decision.action).toBe('move_and_attack')
    expect(decision.attackTargetUid).toBe('player')
  })

  it('没有敌人 → 等待', () => {
    const aiUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 0, y: 0 },
    })
    const decision = simpleAIDecide(aiUnit, [aiUnit], 6, 6)
    expect(decision.action).toBe('wait')
  })

  it('已移动过且射程外 → 等待', () => {
    const aiUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      position: { x: 0, y: 0 },
      attack_range: 1,
      move_range: 3,
      has_moved: true,
    })
    const target = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 5, y: 5 },
    })
    const decision = simpleAIDecide(aiUnit, [aiUnit, target], 6, 6)
    expect(decision.action).toBe('wait')
  })
})

// ==================== 12. 单位标识工具 ====================

describe('单位标识工具', () => {
  it('playerUid 返回 "player"', () => {
    expect(playerUid()).toBe('player')
  })

  it('enemyUid 返回 "enemy:N"', () => {
    expect(enemyUid(0)).toBe('enemy:0')
    expect(enemyUid(3)).toBe('enemy:3')
  })

  it('allyUid 返回 "ally:N"', () => {
    expect(allyUid(0)).toBe('ally:0')
    expect(allyUid(2)).toBe('ally:2')
  })

  it('parseUid 正确解析玩家', () => {
    expect(parseUid('player')).toEqual({ kind: 'player' })
  })

  it('parseUid 正确解析敌人', () => {
    expect(parseUid('enemy:0')).toEqual({ kind: 'enemy', index: 0 })
    expect(parseUid('enemy:5')).toEqual({ kind: 'enemy', index: 5 })
  })

  it('parseUid 正确解析队友', () => {
    expect(parseUid('ally:0')).toEqual({ kind: 'ally', index: 0 })
    expect(parseUid('ally:3')).toEqual({ kind: 'ally', index: 3 })
  })
})

// ==================== 13. 战场文字渲染 ====================

describe('战场文字渲染 renderGridText', () => {
  it('空战场只有空格和坐标标尺', () => {
    const combat = makeCombat()
    const lines = renderGridText(combat)
    // 6x6 网格：1行标尺 + 1行分隔线 + 6行网格 = 8行
    expect(lines.length).toBe(8)
    // 标尺行包含 0-5
    expect(lines[0]).toContain('0')
    expect(lines[0]).toContain('5')
  })

  it('正确显示玩家、敌人、队友位置', () => {
    const combat = makeCombat({
      player_position: { x: 0, y: 0 },
      enemies: [makeEnemy({ id: 'e1', position: { x: 5, y: 5 } })],
      allies: [makeAlly({ npc_id: 'a1', position: { x: 1, y: 0 } })],
    })
    const lines = renderGridText(combat)

    // 第一行（y=0）应该包含 '你' 和 '友'
    const row0 = lines[2] // lines[0]=标尺, lines[1]=分隔线, lines[2]=y=0行
    expect(row0).toContain('你')
    expect(row0).toContain('友')

    // 最后一行（y=5）应该包含 '敌'
    const row5 = lines[7]
    expect(row5).toContain('敌')
  })
})

// ==================== 14. 工具函数 ====================

describe('工具函数', () => {
  it('formatPos 格式化坐标', () => {
    expect(formatPos({ x: 3, y: 2 })).toBe('(3,2)')
    expect(formatPos({ x: 0, y: 0 })).toBe('(0,0)')
  })
})
