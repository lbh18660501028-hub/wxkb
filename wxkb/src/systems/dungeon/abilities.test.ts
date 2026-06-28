/**
 * 战斗技能系统（abilities.ts）单元测试
 *
 * ==================== 测试说明 ====================
 * 验证 CombatAbility 系统的核心函数：
 * - 范围计算（getAbilityRangeCells / getAoeAreaCells）
 * - 射程判定（isCellInRange / isCellInAoeArea）
 * - 合法目标筛选（getValidTargetUnitIds / getUnitsInAoeArea）
 * - 行动验证（validateAbilityAction）
 * - 内置技能定义（getUnitAbilities / getAbility）
 *
 * ==================== 运行方式 ====================
 * 在 wxkb 目录下执行：npm test
 */

import { describe, it, expect } from 'vitest'
import {
  getAbility,
  getUnitAbilities,
  findAbility,
  getAbilityRangeCells,
  getAoeAreaCells,
  isCellInRange,
  isCellInAoeArea,
  getValidTargetUnitIds,
  getUnitsInAoeArea,
  validateAbilityAction,
  getAbilityAvailability,
  DEFAULT_PLAYER_LOADOUT,
} from './abilities'
import type { CombatAbility, UseAbilityAction, DungeonCombatState, AbilityLoadout } from '../../types/dungeon-v2'
import type { TacticsUnit } from './tactics'

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

/**
 * 创建一个测试用单体敌方技能
 */
function makeSingleEnemyAbility(overrides: Partial<CombatAbility> = {}): CombatAbility {
  return {
    id: 'test_single',
    name: '测试单体技能',
    range: 2,
    area: 0,
    targetType: 'enemy',
    shape: 'single',
    hostile: true,
    ...overrides,
  }
}

/**
 * 创建一个测试用 AOE 敌方技能
 */
function makeAoeAbility(overrides: Partial<CombatAbility> = {}): CombatAbility {
  return {
    id: 'test_aoe',
    name: '测试AOE技能',
    range: 3,
    area: 1,
    targetType: 'enemy',
    shape: 'aoe-diamond',
    hostile: true,
    ...overrides,
  }
}

// ==================== 1. 内置技能定义 ====================

describe('内置技能定义', () => {
  it('getAbility：能查到近战攻击', () => {
    const ability = getAbility('melee_attack')
    expect(ability).not.toBeNull()
    expect(ability!.id).toBe('melee_attack')
    expect(ability!.name).toBe('近战攻击')
    expect(ability!.range).toBe(1)
    expect(ability!.shape).toBe('single')
    expect(ability!.hostile).toBe(true)
  })

  it('getAbility：能查到范围打击技能', () => {
    const ability = getAbility('aoe_strike')
    expect(ability).not.toBeNull()
    expect(ability!.id).toBe('aoe_strike')
    expect(ability!.name).toBe('范围打击')
    expect(ability!.range).toBe(3)
    expect(ability!.area).toBe(1)
    expect(ability!.shape).toBe('aoe-diamond')
  })

  it('getAbility：basic_attack 不在静态注册表中（需通过 getUnitAbilities 获取）', () => {
    const ability = getAbility('basic_attack')
    expect(ability).toBeNull()
  })

  it('getAbility：不存在的 ID 返回 null', () => {
    expect(getAbility('nonexistent')).toBeNull()
  })
})

// ==================== 2. 动态技能生成 ====================

describe('getUnitAbilities 动态技能生成', () => {
  it('普通攻击的射程跟随单位 attack_range', () => {
    const meleeUnit = makeUnit({ uid: 'player', attack_range: 1 })
    const rangedUnit = makeUnit({ uid: 'player', attack_range: 3 })

    const meleeAbilities = getUnitAbilities(meleeUnit)
    const rangedAbilities = getUnitAbilities(rangedUnit)

    const meleeBasic = findAbility(meleeAbilities, 'basic_attack')!
    const rangedBasic = findAbility(rangedAbilities, 'basic_attack')!

    expect(meleeBasic.range).toBe(1)
    expect(rangedBasic.range).toBe(3)
  })

  it('无 loadout 的单位只有 basic_attack', () => {
    const unit = makeUnit({ uid: 'player' })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).not.toContain('melee_attack')
    expect(ids).not.toContain('aoe_strike')
    expect(ids).not.toContain('test_heal')
    expect(ids).not.toContain('test_infect')
  })

  it('有 DEFAULT_PLAYER_LOADOUT 的单位包含 basic_attack、melee_attack、aoe_strike', () => {
    const unit = makeUnit({ uid: 'player', abilityLoadout: DEFAULT_PLAYER_LOADOUT })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('melee_attack')
    expect(ids).toContain('aoe_strike')
  })

  it('findAbility：能从列表中找到指定技能', () => {
    const unit = makeUnit({ uid: 'player', abilityLoadout: DEFAULT_PLAYER_LOADOUT })
    const abilities = getUnitAbilities(unit)
    const basic = findAbility(abilities, 'basic_attack')

    expect(basic).not.toBeNull()
    expect(basic!.id).toBe('basic_attack')
  })

  it('findAbility：找不到时返回 null', () => {
    const unit = makeUnit({ uid: 'player', abilityLoadout: DEFAULT_PLAYER_LOADOUT })
    const abilities = getUnitAbilities(unit)
    expect(findAbility(abilities, 'nonexistent')).toBeNull()
  })
})

// ==================== 2b. 能力来源系统（AbilityLoadout）====================

describe('getUnitAbilities 能力来源系统', () => {
  it('单位没有额外技能时，仍然有基础攻击', () => {
    const unit = makeUnit({ uid: 'player' })
    const abilities = getUnitAbilities(unit)
    expect(abilities.length).toBe(1)
    expect(abilities[0].id).toBe('basic_attack')
  })

  it('单位挂载 innate 技能后，getUnitAbilities 返回该技能', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: { innate: ['melee_attack'] },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('melee_attack')
  })

  it('单位挂载武器技能后，返回武器技能', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: { weapon: ['aoe_strike'] },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('aoe_strike')
  })

  it('单位挂载道具技能后，返回道具技能', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: { item: ['test_heal'] },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('test_heal')
  })

  it('单位挂载临时技能后，返回临时技能', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: { temporary: ['test_infect'] },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('test_infect')
  })

  it('重复 abilityId 不会导致 UI 出现重复技能', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: {
        innate: ['melee_attack', 'melee_attack'],
        weapon: ['melee_attack', 'aoe_strike'],
        item: ['aoe_strike'],
      },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    // basic_attack + melee_attack + aoe_strike = 3（不重复）
    expect(ids).toEqual(['basic_attack', 'melee_attack', 'aoe_strike'])
  })

  it('不存在的 abilityId 不会导致崩溃', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: { innate: ['melee_attack', 'nonexistent_skill', 'another_fake'] },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    // 只保留存在的技能
    expect(ids).toContain('basic_attack')
    expect(ids).toContain('melee_attack')
    expect(ids).not.toContain('nonexistent_skill')
    expect(ids).not.toContain('another_fake')
  })

  it('test_heal、test_infect 不会默认出现在普通单位技能列表', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: DEFAULT_PLAYER_LOADOUT,
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).not.toContain('test_heal')
    expect(ids).not.toContain('test_infect')
  })

  it('敌人单位可以拥有敌人专属技能', () => {
    const enemyUnit = makeUnit({
      uid: 'enemy:0',
      side: 'enemy',
      abilityLoadout: { innate: ['melee_attack'] },
    })
    const abilities = getUnitAbilities(enemyUnit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toContain('basic_attack')
    expect(ids).toContain('melee_attack')
  })

  it('多来源汇总：innate + weapon + item + temporary 全部出现', () => {
    const unit = makeUnit({
      uid: 'player',
      abilityLoadout: {
        innate: ['melee_attack'],
        weapon: ['aoe_strike'],
        item: ['test_heal'],
        temporary: ['test_infect'],
      },
    })
    const abilities = getUnitAbilities(unit)
    const ids = abilities.map((a) => a.id)

    expect(ids).toEqual(['basic_attack', 'melee_attack', 'aoe_strike', 'test_heal', 'test_infect'])
  })
})

// ==================== 2c. 技能可用性判断 ====================

describe('getAbilityAvailability 技能可用性判断', () => {
  it('存活单位有合法目标时技能可用', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, attack_range: 2 })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 0 } })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const result = getAbilityAvailability(player, ability, [player, enemy])
    expect(result.available).toBe(true)
  })

  it('单位已倒下时技能不可用', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, alive: false })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const result = getAbilityAvailability(player, ability, [player])
    expect(result.available).toBe(false)
    expect(result.reason).toContain('倒下')
  })

  it('单位已攻击时技能不可用', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, has_attacked: true })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const result = getAbilityAvailability(player, ability, [player])
    expect(result.available).toBe(false)
    expect(result.reason).toContain('已攻击')
  })

  it('范围内无合法目标时技能不可用', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, attack_range: 1 })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 5, y: 5 } })
    const ability = makeSingleEnemyAbility({ range: 1 })

    const result = getAbilityAvailability(player, ability, [player, enemy])
    expect(result.available).toBe(false)
    expect(result.reason).toContain('无合法目标')
  })

  it('自身技能总是可用（不需要目标）', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const selfAbility = makeSingleEnemyAbility({ range: 0, targetType: 'self' })

    const result = getAbilityAvailability(player, selfAbility, [player])
    expect(result.available).toBe(true)
  })

  it('AOE 技能总是可用（只要有格子可释放）', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const aoeAbility = makeAoeAbility({ range: 3, area: 1 })

    const result = getAbilityAvailability(player, aoeAbility, [player])
    expect(result.available).toBe(true)
  })
})

// ==================== 3. 范围计算 ====================

describe('getAbilityRangeCells 技能射程范围', () => {
  it('range=0 时只返回自身格子', () => {
    const ability = makeSingleEnemyAbility({ range: 0 })
    const cells = getAbilityRangeCells({ x: 2, y: 2 }, ability, 6, 6)
    expect(cells).toEqual([{ x: 2, y: 2 }])
  })

  it('range=1 时返回自身 + 上下左右共 5 格', () => {
    const ability = makeSingleEnemyAbility({ range: 1 })
    const cells = getAbilityRangeCells({ x: 3, y: 3 }, ability, 6, 6)
    expect(cells.length).toBe(5)
    // 检查关键格子都在
    const keys = cells.map((c) => `${c.x},${c.y}`)
    expect(keys).toContain('3,3') // 自身
    expect(keys).toContain('3,2') // 上
    expect(keys).toContain('3,4') // 下
    expect(keys).toContain('2,3') // 左
    expect(keys).toContain('4,3') // 右
  })

  it('range=2 时返回菱形 13 格', () => {
    const ability = makeSingleEnemyAbility({ range: 2 })
    const cells = getAbilityRangeCells({ x: 3, y: 3 }, ability, 6, 6)
    // 菱形：1 + 4 + 8 = 13
    expect(cells.length).toBe(13)
  })

  it('range=3 时返回菱形 23 格（6x6 网格从 (3,3) 出发，2 格越界）', () => {
    const ability = makeSingleEnemyAbility({ range: 3 })
    const cells = getAbilityRangeCells({ x: 3, y: 3 }, ability, 6, 6)
    // 完整菱形：1 + 4 + 8 + 12 = 25
    // 但 6x6 网格 (0-5) 中 (6,3) 和 (3,6) 越界，所以 25 - 2 = 23
    expect(cells.length).toBe(23)
  })

  it('网格边界裁剪：角落单位不会返回越界格子', () => {
    const ability = makeSingleEnemyAbility({ range: 3 })
    const cells = getAbilityRangeCells({ x: 0, y: 0 }, ability, 6, 6)
    // 所有格子都应该在 0-5 范围内
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(6)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(6)
    }
  })
})

describe('getAoeAreaCells AOE 影响范围', () => {
  it('area=0 时只返回中心格', () => {
    const ability = makeAoeAbility({ area: 0 })
    const cells = getAoeAreaCells({ x: 3, y: 3 }, ability, 6, 6)
    expect(cells).toEqual([{ x: 3, y: 3 }])
  })

  it('area=1 时返回中心 + 上下左右共 5 格', () => {
    const ability = makeAoeAbility({ area: 1 })
    const cells = getAoeAreaCells({ x: 3, y: 3 }, ability, 6, 6)
    expect(cells.length).toBe(5)
    const keys = cells.map((c) => `${c.x},${c.y}`)
    expect(keys).toContain('3,3')
    expect(keys).toContain('3,2')
    expect(keys).toContain('3,4')
    expect(keys).toContain('2,3')
    expect(keys).toContain('4,3')
  })

  it('area=2 时返回菱形 13 格', () => {
    const ability = makeAoeAbility({ area: 2 })
    const cells = getAoeAreaCells({ x: 3, y: 3 }, ability, 6, 6)
    expect(cells.length).toBe(13)
  })

  it('网格边界裁剪：角落不会返回越界格子', () => {
    const ability = makeAoeAbility({ area: 2 })
    const cells = getAoeAreaCells({ x: 0, y: 0 }, ability, 6, 6)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(6)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(6)
    }
  })
})

// ==================== 4. 射程判定 ====================

describe('isCellInRange 射程判定', () => {
  const ability = makeSingleEnemyAbility({ range: 2 })

  it('自身位置在射程内（距离 0）', () => {
    expect(isCellInRange({ x: 3, y: 3 }, { x: 3, y: 3 }, ability)).toBe(true)
  })

  it('距离 1 在射程内', () => {
    expect(isCellInRange({ x: 3, y: 3 }, { x: 4, y: 3 }, ability)).toBe(true)
    expect(isCellInRange({ x: 3, y: 3 }, { x: 3, y: 2 }, ability)).toBe(true)
  })

  it('距离 2 在射程内', () => {
    expect(isCellInRange({ x: 3, y: 3 }, { x: 5, y: 3 }, ability)).toBe(true)
    expect(isCellInRange({ x: 3, y: 3 }, { x: 4, y: 4 }, ability)).toBe(true) // 曼哈顿距离 2
  })

  it('距离 3 在射程外', () => {
    expect(isCellInRange({ x: 3, y: 3 }, { x: 6, y: 3 }, ability)).toBe(false)
    expect(isCellInRange({ x: 3, y: 3 }, { x: 5, y: 5 }, ability)).toBe(false) // 曼哈顿距离 4
  })
})

describe('isCellInAoeArea AOE 影响判定', () => {
  const ability = makeAoeAbility({ area: 1 })

  it('中心格在影响范围内', () => {
    expect(isCellInAoeArea({ x: 3, y: 3 }, { x: 3, y: 3 }, ability)).toBe(true)
  })

  it('相邻格在影响范围内', () => {
    expect(isCellInAoeArea({ x: 3, y: 3 }, { x: 4, y: 3 }, ability)).toBe(true)
    expect(isCellInAoeArea({ x: 3, y: 3 }, { x: 2, y: 3 }, ability)).toBe(true)
  })

  it('距离 2 在影响范围外', () => {
    expect(isCellInAoeArea({ x: 3, y: 3 }, { x: 5, y: 3 }, ability)).toBe(false)
    expect(isCellInAoeArea({ x: 3, y: 3 }, { x: 4, y: 4 }, ability)).toBe(false)
  })
})

// ==================== 5. 合法目标筛选 ====================

describe('getValidTargetUnitIds 单体技能合法目标', () => {
  it('射程内的敌方单位可被选中', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, attack_range: 2 })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 0 } })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const ids = getValidTargetUnitIds(player, ability, [player, enemy])
    expect(ids).toEqual(['enemy:0'])
  })

  it('射程外的敌方单位不可被选中', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 }, attack_range: 1 })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 3, y: 0 } })
    const ability = makeSingleEnemyAbility({ range: 1 })

    const ids = getValidTargetUnitIds(player, ability, [player, enemy])
    expect(ids).toEqual([])
  })

  it('同阵营单位不能被敌方技能选中', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const ally = makeUnit({ uid: 'ally:0', side: 'player', position: { x: 1, y: 0 } })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const ids = getValidTargetUnitIds(player, ability, [player, ally])
    expect(ids).toEqual([])
  })

  it('友方技能只能选同阵营单位', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const ally = makeUnit({ uid: 'ally:0', side: 'player', position: { x: 1, y: 0 } })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 1 } })
    const healAbility = makeSingleEnemyAbility({ range: 2, targetType: 'ally', hostile: false })

    const ids = getValidTargetUnitIds(player, healAbility, [player, ally, enemy])
    expect(ids).toEqual(['ally:0'])
  })

  it('多个合法目标全部返回', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 2, y: 2 }, attack_range: 2 })
    const enemy1 = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 3, y: 2 } }) // 距离 1
    const enemy2 = makeUnit({ uid: 'enemy:1', side: 'enemy', position: { x: 2, y: 3 } }) // 距离 1
    const enemy3 = makeUnit({ uid: 'enemy:2', side: 'enemy', position: { x: 5, y: 5 } }) // 距离 6
    const ability = makeSingleEnemyAbility({ range: 2 })

    const ids = getValidTargetUnitIds(player, ability, [player, enemy1, enemy2, enemy3])
    expect(ids).toContain('enemy:0')
    expect(ids).toContain('enemy:1')
    expect(ids).not.toContain('enemy:2')
    expect(ids.length).toBe(2)
  })

  it('自身技能返回空数组（不需要选目标）', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const selfAbility = makeSingleEnemyAbility({ range: 0, targetType: 'self' })

    const ids = getValidTargetUnitIds(player, selfAbility, [player])
    expect(ids).toEqual([])
  })

  it('AOE 技能返回空数组（不走单体目标逻辑）', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const aoeAbility = makeAoeAbility()

    const ids = getValidTargetUnitIds(player, aoeAbility, [player])
    expect(ids).toEqual([])
  })

  it('施法者自身不在合法目标列表中', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const ability = makeSingleEnemyAbility({ range: 2 })

    const ids = getValidTargetUnitIds(player, ability, [player])
    expect(ids).not.toContain('player')
  })
})

describe('getUnitsInAoeArea AOE 影响单位', () => {
  it('返回 AOE 范围内的敌方单位', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const enemy1 = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 3, y: 3 } })
    const enemy2 = makeUnit({ uid: 'enemy:1', side: 'enemy', position: { x: 4, y: 3 } }) // 距离 1
    const enemy3 = makeUnit({ uid: 'enemy:2', side: 'enemy', position: { x: 5, y: 5 } }) // 距离 4
    const ability = makeAoeAbility({ area: 1 })

    const units = getUnitsInAoeArea({ x: 3, y: 3 }, ability, [player, enemy1, enemy2, enemy3], 'player')
    const uids = units.map((u) => u.uid)

    expect(uids).toContain('enemy:0') // 中心格
    expect(uids).toContain('enemy:1') // 相邻格
    expect(uids).not.toContain('enemy:2') // 超出范围
    expect(uids).not.toContain('player') // 友方不被敌方技能影响
  })

  it('area=0 时只影响中心格上的单位', () => {
    const enemy1 = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 3, y: 3 } })
    const enemy2 = makeUnit({ uid: 'enemy:1', side: 'enemy', position: { x: 4, y: 3 } })
    const ability = makeAoeAbility({ area: 0 })

    const units = getUnitsInAoeArea({ x: 3, y: 3 }, ability, [enemy1, enemy2], 'player')
    expect(units.length).toBe(1)
    expect(units[0].uid).toBe('enemy:0')
  })

  it('不返回死亡单位', () => {
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 3, y: 3 }, alive: false })
    const ability = makeAoeAbility({ area: 1 })

    const units = getUnitsInAoeArea({ x: 3, y: 3 }, ability, [enemy], 'player')
    expect(units).toEqual([])
  })

  it('cell 类型技能影响范围内所有单位（不分敌我）', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 3, y: 3 } })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 4, y: 3 } })
    const cellAbility = makeAoeAbility({ area: 1, targetType: 'cell' })

    const units = getUnitsInAoeArea({ x: 3, y: 3 }, cellAbility, [player, enemy], 'player')
    const uids = units.map((u) => u.uid)
    expect(uids).toContain('player')
    expect(uids).toContain('enemy:0')
  })
})

// ==================== 6. 行动验证 ====================

describe('validateAbilityAction 行动验证', () => {
  it('合法的单体攻击行动通过验证', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 2,
    })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 0 } })
    const combat = makeCombat({
      turn_order: ['player', 'enemy:0'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player, enemy])
    expect(result.valid).toBe(true)
  })

  it('不轮到该单位行动时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 2,
    })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 0 } })
    const combat = makeCombat({
      turn_order: ['player', 'enemy:0'],
      current_turn_index: 1, // 当前是 enemy:0 的回合
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player, enemy])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('回合')
  })

  it('技能不存在时验证失败', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'nonexistent_skill',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('不存在')
  })

  it('已攻击过的单位验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 2,
      has_attacked: true,
    })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 1, y: 0 } })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player, enemy])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('已攻击')
  })

  it('单体技能未指定目标时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 2,
    })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      // 没有 targetUnitId
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('目标')
  })

  it('目标在射程外时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      attack_range: 1,
    })
    const enemy = makeUnit({ uid: 'enemy:0', side: 'enemy', position: { x: 5, y: 5 } })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player, enemy])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('射程')
  })

  it('合法的 AOE 技能行动通过验证', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      abilityLoadout: { innate: ['aoe_strike'] },
    })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'aoe_strike',
      targetCell: { x: 2, y: 0 }, // 曼哈顿距离 2 ≤ range 3
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(true)
  })

  it('AOE 技能未指定目标格子时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      abilityLoadout: { innate: ['aoe_strike'] },
    })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'aoe_strike',
      // 没有 targetCell
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('格子')
  })

  it('AOE 技能目标格超出网格范围时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      abilityLoadout: { innate: ['aoe_strike'] },
    })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
      grid_width: 6,
      grid_height: 6,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'aoe_strike',
      targetCell: { x: 10, y: 10 },
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('网格')
  })

  it('AOE 技能目标格超出射程时验证失败', () => {
    const player = makeUnit({
      uid: 'player',
      side: 'player',
      position: { x: 0, y: 0 },
      abilityLoadout: { innate: ['aoe_strike'] },
    })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
      grid_width: 6,
      grid_height: 6,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'aoe_strike', // range=3
      targetCell: { x: 5, y: 5 }, // 曼哈顿距离 10 > 3
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('射程')
  })

  it('行动顺序未初始化时验证失败', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: { x: 0, y: 0 } })
    const combat = makeCombat({ turn_order: [] }) // 空的行动顺序
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('初始化')
  })

  it('单位未放置在网格上时验证失败', () => {
    const player = makeUnit({ uid: 'player', side: 'player', position: null })
    const combat = makeCombat({
      turn_order: ['player'],
      current_turn_index: 0,
    })
    const action: UseAbilityAction = {
      type: 'use_ability',
      actorId: 'player',
      abilityId: 'basic_attack',
      targetUnitId: 'enemy:0',
    }

    const result = validateAbilityAction(action, combat, player, [player])
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.reason).toContain('网格')
  })
})

// ==================== 7. 内置技能数值验证 ====================

describe('内置技能数值验证', () => {
  it('近战攻击：射程 1、无 AOE、单体敌方', () => {
    const ability = getAbility('melee_attack')!
    expect(ability.range).toBe(1)
    expect(ability.area).toBe(0)
    expect(ability.targetType).toBe('enemy')
    expect(ability.shape).toBe('single')
    expect(ability.hostile).toBe(true)
  })

  it('内置技能包含 tags 和 source 分类字段', () => {
    const melee = getAbility('melee_attack')!
    const aoe = getAbility('aoe_strike')!
    expect(melee.tags).toContain('system')
    expect(melee.tags).toContain('basic')
    expect(melee.source).toBe('system')
    expect(aoe.tags).toContain('system')
    expect(aoe.tags).toContain('aoe')
    expect(aoe.source).toBe('system')
  })

  it('内置技能包含 damageMultiplier 效果字段', () => {
    const melee = getAbility('melee_attack')!
    const aoe = getAbility('aoe_strike')!
    expect(melee.damageMultiplier).toBe(1.0)
    expect(aoe.damageMultiplier).toBe(1.0)
  })

  it('范围打击：射程 3、AOE 半径 1、菱形敌方', () => {
    const ability = getAbility('aoe_strike')!
    expect(ability.range).toBe(3)
    expect(ability.area).toBe(1)
    expect(ability.targetType).toBe('enemy')
    expect(ability.shape).toBe('aoe-diamond')
    expect(ability.hostile).toBe(true)
  })

  it('普通攻击：射程跟随单位', () => {
    const unit1 = makeUnit({ uid: 'player', attack_range: 1 })
    const unit2 = makeUnit({ uid: 'player', attack_range: 5 })

    const basic1 = findAbility(getUnitAbilities(unit1), 'basic_attack')!
    const basic2 = findAbility(getUnitAbilities(unit2), 'basic_attack')!

    expect(basic1.range).toBe(1)
    expect(basic2.range).toBe(5)
    expect(basic1.area).toBe(0)
    expect(basic1.shape).toBe('single')
    expect(basic1.targetType).toBe('enemy')
    expect(basic1.tags).toContain('system')
    expect(basic1.source).toBe('system')
  })
})
