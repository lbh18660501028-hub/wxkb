/**
 * 副本 V2 — 战斗技能系统（CombatAbility Engine）
 *
 * ==================== 功能说明 ====================
 * 统一抽象所有战斗行动（普通攻击、近战、远程、AOE、治疗、道具），
 * 提供范围计算、目标筛选、行动验证等纯函数。
 *
 * 本模块是"UI ↔ 引擎"之间的桥梁：
 * - UI 层调用本模块的函数计算可作用范围、合法目标
 * - UI 层生成 UseAbilityAction 交由本模块验证
 * - 验证通过后交由 combat.ts 执行实际伤害结算
 *
 * ==================== 数据来源 ====================
 * 技能定义从 data/abilities.ts 的注册表加载（数据与逻辑分离）。
 * 本模块不硬编码任何技能常量，只负责查询和计算。
 *
 * ==================== 设计原则 ====================
 * - 本模块不依赖 Vue 响应式，纯函数式操作
 * - 本模块不修改任何战斗状态，只提供计算和查询
 * - 范围计算使用曼哈顿距离（用户需求第九节）
 * - 手动模式和自动模式共用同一套技能抽象
 *
 * ==================== 与现有系统的关系 ====================
 * - 技能数据在 data/abilities.ts（BUILTIN_ABILITIES / ABILITY_REGISTRY）
 * - 复用 tactics.ts 的 manhattanDistance / isInBounds / TacticsUnit
 * - 复用 types/dungeon-v2.ts 的 CombatAbility / CombatAction / GridPosition
 * - 不修改现有 executeAttack / stepTacticsTurn 逻辑
 */

import type {
  CombatAbility,
  UseAbilityAction,
  GridPosition,
  DungeonCombatState,
  AbilityLoadout,
} from '../../types/dungeon-v2'
import type { TacticsUnit } from './tactics'
import { manhattanDistance, isInBounds } from './tactics'
import { getAbilityById } from '../../data/abilities'

// ==================== 默认能力装配 ====================

/**
 * 玩家默认能力装配槽
 *
 * 玩家在没有任何额外武器/道具时默认拥有的技能。
 * 包含近战攻击和范围打击作为基础战斗选项。
 * 如果 composable 层设置了自定义 player_ability_loadout，则覆盖此默认值。
 */
export const DEFAULT_PLAYER_LOADOUT: AbilityLoadout = {
  innate: ['melee_attack', 'aoe_strike'],
}

/**
 * 无能力装配的空槽（用于无额外技能的单位）
 */
export const EMPTY_LOADOUT: AbilityLoadout = {}

// ==================== 技能查询 ====================

/**
 * 根据 ID 查找技能
 *
 * 优先从数据注册表查找静态技能。
 * 注意：'basic_attack' 不在注册表中，需通过 getUnitAbilities 获取。
 *
 * @param abilityId 技能 ID
 * @returns 技能定义，找不到返回 null
 *
 * @example getAbility('melee_attack') → 近战攻击技能
 * @example getAbility('basic_attack') → null（需通过 getUnitAbilities 获取）
 */
export function getAbility(abilityId: string): CombatAbility | null {
  return getAbilityById(abilityId) ?? null
}

// ==================== 动态技能生成 ====================

/**
 * 生成基础攻击技能（射程随单位变化）
 *
 * basic_attack 的射程 = 单位的 attack_range，
 * 其他属性固定：单体、敌方、敌对。
 */
function createBasicAttack(attackRange: number): CombatAbility {
  return {
    id: 'basic_attack',
    name: '普通攻击',
    description: `射程 ${attackRange} 的普通攻击`,
    range: attackRange,
    area: 0,
    targetType: 'enemy',
    shape: 'single',
    hostile: true,
    damageMultiplier: 1.0,
    tags: ['system', 'basic'],
    source: 'system',
  }
}

/**
 * 获取一个单位可用的所有技能列表
 *
 * ==================== 技能组成（多来源汇总）====================
 * 1. 基础攻击（basic_attack）— 射程 = 单位 attack_range，动态生成（始终拥有）
 * 2. innate 技能 — 角色基础技能（来自职业/天赋/种族）
 * 3. weapon 技能 — 武器提供的技能
 * 4. item 技能 — 道具提供的技能
 * 5. temporary 技能 — 副本临时技能
 *
 * ==================== 路由规则 ====================
 * - 技能 ID 从 unit.abilityLoadout 各来源收集
 * - 每个 ID 通过 getAbilityById 从注册表查找 CombatAbility
 * - 不存在的 ID 跳过并输出 console.warn（不崩溃）
 * - 同一 ID 去重（避免重复显示）
 * - basic_attack 始终添加（即使 loadout 为空）
 * - test_heal/test_infect 不会出现在默认 loadout 中（需显式挂载）
 *
 * ==================== 向后兼容 ====================
 * - 如果 unit.abilityLoadout 为 undefined，使用空 loadout（只有 basic_attack）
 * - 玩家默认 loadout 由 composable 层设置（DEFAULT_PLAYER_LOADOUT）
 *
 * @param unit 战术单位
 * @returns 该单位可用的所有技能数组（已去重）
 */
export function getUnitAbilities(unit: TacticsUnit): CombatAbility[] {
  const abilities: CombatAbility[] = []
  const seenIds = new Set<string>()

  // 1. 基础攻击（射程 = 单位攻击射程，动态生成，始终拥有）
  abilities.push(createBasicAttack(unit.attack_range))
  seenIds.add('basic_attack')

  // 2. 从 abilityLoadout 各来源汇总技能 ID
  const loadout = unit.abilityLoadout ?? EMPTY_LOADOUT
  const allSourceIds: string[] = [
    ...(loadout.innate ?? []),
    ...(loadout.weapon ?? []),
    ...(loadout.item ?? []),
    ...(loadout.temporary ?? []),
  ]

  for (const id of allSourceIds) {
    // 去重：同一 ID 只添加一次
    if (seenIds.has(id)) continue

    const ability = getAbilityById(id)
    if (ability) {
      abilities.push(ability)
      seenIds.add(id)
    } else {
      // 不存在的 abilityId 跳过并输出开发警告
      console.warn(`[abilities] 技能 ID "${id}" 不在注册表中，已跳过。请检查 abilityLoadout 配置。`)
    }
  }

  return abilities
}

/**
 * 从技能列表中查找指定 ID 的技能
 *
 * @param abilities 技能列表
 * @param abilityId 技能 ID
 * @returns 技能定义，找不到返回 null
 */
export function findAbility(
  abilities: CombatAbility[],
  abilityId: string,
): CombatAbility | null {
  return abilities.find((a) => a.id === abilityId) ?? null
}

// ==================== 范围计算函数 ====================

/**
 * 计算技能从施法者位置出发的可作用范围
 *
 * 返回施法者自身位置周围、曼哈顿距离 ≤ ability.range 的所有合法格子。
 * 用于 UI 显示"红色可施放范围"。
 *
 * ==================== 计算规则 ====================
 * - 使用曼哈顿距离（|dx| + |dy| ≤ range）
 * - 不考虑障碍物、地形、视线遮挡
 * - 包含施法者自身所在格子（距离 0 ≤ range）
 *
 * @param origin 施法者位置
 * @param ability 技能定义
 * @param width 网格宽度
 * @param height 网格高度
 * @returns 可作用范围内的所有格子坐标数组
 *
 * @example range=1 时，返回自身 + 上下左右共 5 格（6x6 网格中央）
 * @example range=2 时，返回菱形 13 格
 */
export function getAbilityRangeCells(
  origin: GridPosition,
  ability: CombatAbility,
  width: number,
  height: number,
): GridPosition[] {
  const cells: GridPosition[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (manhattanDistance(origin, { x, y }) <= ability.range) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

/**
 * 计算 AOE 技能的影响范围
 *
 * 以目标格为中心，返回曼哈顿距离 ≤ ability.area 的所有格子。
 * 用于 UI 显示"橙色 AOE 预览范围"。
 *
 * ==================== 计算规则 ====================
 * - 使用曼哈顿距离（菱形范围）
 * - area=0 时只返回中心格自身
 * - area=1 时返回中心 + 上下左右共 5 格
 *
 * @param center 目标格（玩家点选的释放格）
 * @param ability 技能定义
 * @param width 网格宽度
 * @param height 网格高度
 * @returns AOE 影响范围内的所有格子坐标数组
 */
export function getAoeAreaCells(
  center: GridPosition,
  ability: CombatAbility,
  width: number,
  height: number,
): GridPosition[] {
  const cells: GridPosition[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (manhattanDistance(center, { x, y }) <= ability.area) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

/**
 * 检查一个格子是否在技能射程内
 *
 * @param origin 施法者位置
 * @param cell 待检查格子
 * @param ability 技能定义
 * @returns true=在射程内
 */
export function isCellInRange(
  origin: GridPosition,
  cell: GridPosition,
  ability: CombatAbility,
): boolean {
  return manhattanDistance(origin, cell) <= ability.range
}

/**
 * 检查一个格子是否在 AOE 影响范围内
 *
 * @param center AOE 中心格
 * @param cell 待检查格子
 * @param ability 技能定义
 * @returns true=在影响范围内
 */
export function isCellInAoeArea(
  center: GridPosition,
  cell: GridPosition,
  ability: CombatAbility,
): boolean {
  return manhattanDistance(center, cell) <= ability.area
}

// ==================== 合法目标计算 ====================

/**
 * 获取单体技能在当前范围内的合法目标单位 uid 列表
 *
 * 仅用于 shape='single' 的技能。
 * 根据技能的 targetType 筛选合法目标：
 * - 'enemy'：射程内的敌方单位
 * - 'ally'：射程内的友方单位（不含自身）
 * - 'self'：返回空数组（自身技能不需要选目标）
 * - 'cell'：返回空数组（格子技能不需要选单位）
 *
 * @param actor 施法者单位
 * @param ability 技能定义
 * @param allUnits 战场上所有单位
 * @returns 合法目标单位 uid 数组
 */
export function getValidTargetUnitIds(
  actor: TacticsUnit,
  ability: CombatAbility,
  allUnits: TacticsUnit[],
): string[] {
  if (ability.shape !== 'single') return []
  if (!actor.position || !actor.alive) return []
  const originPos: GridPosition = actor.position

  // 自身技能和格子技能不需要选目标单位
  if (ability.targetType === 'self' || ability.targetType === 'cell') {
    return []
  }

  return allUnits
    .filter((unit) => {
      // 基础过滤：存活、有位置、不是施法者自身
      if (!unit.alive || !unit.position) return false
      const targetPos: GridPosition = unit.position
      if (unit.uid === actor.uid) return false

      // 射程检查
      if (!isCellInRange(originPos, targetPos, ability)) return false

      // 目标类型筛选
      if (ability.targetType === 'enemy') {
        return unit.side !== actor.side
      }
      if (ability.targetType === 'ally') {
        return unit.side === actor.side
      }

      return false
    })
    .map((unit) => unit.uid)
}

/**
 * 获取 AOE 影响范围内的所有合法单位
 *
 * 用于 AOE 技能结算时，确定哪些单位会受到效果。
 * 根据技能的 targetType 筛选：
 * - 'enemy'：影响范围内的敌方单位
 * - 'ally'：影响范围内的友方单位
 * - 'cell'：影响范围内的所有单位（不分敌我）
 *
 * @param center AOE 中心格
 * @param ability 技能定义
 * @param allUnits 战场上所有单位
 * @param actorSide 施法者阵营（用于判断敌我）
 * @returns 受影响的单位数组
 */
export function getUnitsInAoeArea(
  center: GridPosition,
  ability: CombatAbility,
  allUnits: TacticsUnit[],
  actorSide: 'player' | 'enemy',
): TacticsUnit[] {
  return allUnits.filter((unit) => {
    if (!unit.alive || !unit.position) return false
    if (!isCellInAoeArea(center, unit.position, ability)) return false

    // 根据目标类型筛选
    if (ability.targetType === 'enemy') {
      return unit.side !== actorSide
    }
    if (ability.targetType === 'ally') {
      return unit.side === actorSide
    }
    // 'cell' 类型影响所有单位
    return true
  })
}

// ==================== 行动验证 ====================

/**
 * 行动验证结果
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * 验证一个 UseAbilityAction 是否合法
 *
 * ==================== 验证步骤（用户需求第七节）====================
 * 1. 当前是否轮到 actor 行动
 * 2. ability 是否存在
 * 3. ability 是否可用（单位是否已攻击）
 * 4. 目标是否在 range 内
 * 5. 单体技能是否点中了合法目标
 * 6. AOE 技能是否点中了合法格子
 *
 * 注意：第 7 步"结算后写入日志"属于执行阶段，不在验证范围内。
 *
 * @param action 待验证的行动
 * @param combat 战斗状态
 * @param actor 行动单位
 * @param allUnits 战场上所有单位
 * @returns 验证结果
 */
export function validateAbilityAction(
  action: UseAbilityAction,
  combat: DungeonCombatState,
  actor: TacticsUnit,
  allUnits: TacticsUnit[],
): ValidationResult {
  // 1. 检查是否轮到 actor 行动
  if (combat.turn_order.length === 0) {
    return { valid: false, reason: '行动顺序尚未初始化' }
  }
  const currentUid = combat.turn_order[combat.current_turn_index]
  if (currentUid !== action.actorId) {
    return { valid: false, reason: '当前不是该单位的回合' }
  }

  // 2. 检查 ability 是否存在
  const abilities = getUnitAbilities(actor)
  const ability = findAbility(abilities, action.abilityId)
  if (!ability) {
    return { valid: false, reason: `技能 ${action.abilityId} 不存在` }
  }

  // 3. 检查单位是否已攻击
  if (actor.has_attacked) {
    return { valid: false, reason: '本回合已攻击，无法再次使用技能' }
  }

  // 检查单位是否在网格上
  if (!actor.position) {
    return { valid: false, reason: '单位未放置在网格上' }
  }

  // 4-6. 根据技能形状检查目标
  switch (ability.shape) {
    case 'single': {
      // 5. 单体技能：检查是否指定了合法目标
      if (ability.targetType === 'self') {
        // 自身技能不需要目标，直接通过
        break
      }
      if (!action.targetUnitId) {
        return { valid: false, reason: '单体技能需要指定目标单位' }
      }
      const validIds = getValidTargetUnitIds(actor, ability, allUnits)
      if (!validIds.includes(action.targetUnitId)) {
        return { valid: false, reason: '目标不在射程内或不是合法目标' }
      }
      break
    }
    case 'aoe-diamond': {
      // 6. AOE 技能：检查是否指定了合法格子
      if (!action.targetCell) {
        return { valid: false, reason: 'AOE 技能需要指定目标格子' }
      }
      if (!isInBounds(action.targetCell, combat.grid_width, combat.grid_height)) {
        return { valid: false, reason: '目标格子超出网格范围' }
      }
      if (!isCellInRange(actor.position, action.targetCell, ability)) {
        return { valid: false, reason: '目标格子不在射程内' }
      }
      break
    }
  }

  return { valid: true }
}

// ==================== 技能可用性判断 ====================

/** 技能可用性检查结果 */
interface AbilityAvailability {
  /** 是否可用 */
  available: boolean
  /** 不可用时的原因（UI 显示用） */
  reason: string
}

/**
 * 判断一个技能当前是否可用
 *
 * ==================== 当前检查规则 ====================
 * 1. 单位是否存活
 * 2. 单位是否已攻击（每回合只能攻击一次）
 * 3. 是否有合法目标（根据技能形状和目标类型）
 * 4. 测试技能（source === 'debug'）不默认可用
 *
 * ==================== 预留字段（暂不实现）====================
 * - mpCost：MP 不足时禁用（当前仅预留，不检查）
 * - cooldown：冷却中时禁用（当前仅预留，不检查）
 * - item 技能数量：道具消耗（当前仅预留，不检查）
 *
 * @param unit 使用技能的单位
 * @param ability 技能定义
 * @param allUnits 战场上所有单位（用于检查目标可用性）
 * @returns { available, reason }
 */
export function getAbilityAvailability(
  unit: TacticsUnit,
  ability: CombatAbility,
  allUnits: TacticsUnit[],
): AbilityAvailability {
  // 1. 单位是否存活
  if (!unit.alive) {
    return { available: false, reason: '单位已倒下' }
  }

  // 2. 是否已攻击
  if (unit.has_attacked) {
    return { available: false, reason: '本回合已攻击' }
  }

  // 3. 测试技能不默认可用（仅通过显式 loadout 挂载时才可用）
  //    注意：测试技能如果出现在 getUnitAbilities 返回列表中，说明已被显式挂载，
  //    此处不做额外拦截——getUnitAbilities 已经过滤了未挂载的技能。

  // 4. 检查合法目标
  if (ability.shape === 'single') {
    if (ability.targetType === 'self') {
      // 自身技能总是有目标
      return { available: true, reason: '' }
    }
    const validIds = getValidTargetUnitIds(unit, ability, allUnits)
    if (validIds.length === 0) {
      return { available: false, reason: '范围内无合法目标' }
    }
  } else if (ability.shape === 'aoe-diamond') {
    // AOE 技能只要有格子可释放即可
    // 当前阶段不做精确的"AOE 范围内是否有目标"检查（释放到空格子也允许）
  }

  return { available: true, reason: '' }
}
