/**
 * 能力效果结算器（Ability Effect Resolver）
 *
 * ==================== 功能说明 ====================
 * 统一的能力效果结算入口，根据 CombatAbility 的配置字段（而非 abilityId）
 * 决定如何结算能力效果。
 *
 * 所有能力（普通攻击、近战、AOE、治疗、感染）都走同一套结算入口，
 * 不再通过 abilityId 写死逻辑，而是根据 ability 的字段路由：
 *
 * - hostile=true → 敌对伤害路径（调用 executeAttack，应用 damageMultiplier / flatDamageBonus / infectionBonus）
 * - healAmount>0 && !hostile → 治疗路径（直接恢复 HP，上限 maxHp）
 * - infectionBonus>0 && !hostile → 纯感染路径（增加目标感染值）
 *
 * ==================== 核心函数 ====================
 * - resolveAbilityEffect(context) — 主入口，根据 shape 路由到单体或 AOE
 * - applyAbilityToTarget(...) — 单体能力结算（路由到伤害/治疗/感染）
 * - applyAbilityToArea(...) — AOE 能力结算（遍历范围内目标，逐个调用 applyAbilityToTarget）
 *
 * ==================== 与现有系统的关系 ====================
 * - 伤害结算复用 combat.ts 的 executeAttack（传入 ability 参数）
 * - 感染值修改复用 npc.ts 的 changeNpcInfection
 * - 目标范围计算复用 abilities.ts 的 getUnitsInAoeArea
 * - 不修改现有 executeAttack / stepTacticsTurn 逻辑（向后兼容）
 */

import type {
  DungeonRuntimeState,
  DungeonCombatState,
  CombatAbility,
  GridPosition,
} from '../../types/dungeon-v2'
import type { PlayerCombatContext } from './combat'
import { executeAttack } from './combat'
import { changeNpcInfection, syncAllyHpToNpc } from './npc'
import { collectTacticsUnits, parseUid, playerUid } from './tactics'
import { getUnitsInAoeArea } from './abilities'

// ==================== 结果类型 ====================

/**
 * 能力结算结果
 */
export interface AbilityResolutionResult {
  /** 是否命中（治疗时表示是否成功施放） */
  hit: boolean
  /** 造成的总伤害 */
  damage: number
  /** 恢复的总生命值 */
  healed: number
  /** 是否暴击 */
  isCrit: boolean
  /** 是否击败了敌人 */
  enemyDefeated: boolean
  /** 影响的目标数量 */
  targetsAffected: number
}

/**
 * 能力结算上下文
 */
export interface AbilityResolutionContext {
  state: DungeonRuntimeState
  combat: DungeonCombatState
  playerCtx: PlayerCombatContext
  /** 施法者 uid（如 'player'、'enemy:0'、'ally:0'） */
  actorUid: string
  /** 能力定义 */
  ability: CombatAbility
  /** 单体技能的目标 uid（shape='single' 时必填） */
  targetUid?: string
  /** AOE 技能的目标格子（shape='aoe-diamond' 时必填） */
  targetCell?: GridPosition
  /** 日志推送函数 */
  pushLog: (text: string) => void
}

// ==================== 辅助函数 ====================

/**
 * 获取单位显示名称
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 * @returns 显示名称（玩家返回"你"，敌人/队友返回其名称）
 */
function getUnitName(combat: DungeonCombatState, uid: string): string {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') return '你'
  if (parsed.kind === 'enemy') return combat.enemies[parsed.index]?.name ?? '敌人'
  if (parsed.kind === 'ally') return combat.allies[parsed.index]?.name ?? '队友'
  return '未知'
}

/** 空结果常量 */
const EMPTY_RESULT: AbilityResolutionResult = {
  hit: false,
  damage: 0,
  healed: 0,
  isCrit: false,
  enemyDefeated: false,
  targetsAffected: 0,
}

// ==================== 主入口 ====================

/**
 * 能力效果结算 — 统一入口
 *
 * 根据 ability.shape 路由到单体结算或 AOE 结算。
 * 调用方只需提供 context，无需关心内部路由逻辑。
 *
 * @param ctx 结算上下文
 * @returns 结算结果
 *
 * @example
 * // 单体攻击
 * resolveAbilityEffect({ state, combat, playerCtx, actorUid: 'player', ability, targetUid: 'enemy:0', pushLog })
 * // AOE 攻击
 * resolveAbilityEffect({ state, combat, playerCtx, actorUid: 'player', ability, targetCell: { x: 3, y: 3 }, pushLog })
 */
export function resolveAbilityEffect(ctx: AbilityResolutionContext): AbilityResolutionResult {
  const { ability } = ctx

  // AOE 技能
  if (ability.shape === 'aoe-diamond' && ctx.targetCell) {
    return applyAbilityToArea(
      ctx.state,
      ctx.combat,
      ctx.playerCtx,
      ctx.actorUid,
      ctx.targetCell,
      ability,
      ctx.pushLog,
    )
  }

  // 单体技能
  if (ability.shape === 'single' && ctx.targetUid) {
    return applyAbilityToTarget(
      ctx.state,
      ctx.combat,
      ctx.playerCtx,
      ctx.actorUid,
      ctx.targetUid,
      ability,
      ctx.pushLog,
    )
  }

  // 无有效目标
  ctx.pushLog('没有有效的目标。')
  return { ...EMPTY_RESULT }
}

// ==================== 单体能力结算 ====================

/**
 * 对单个目标结算能力效果
 *
 * ==================== 路由逻辑（基于字段，非 ID）====================
 * 1. healAmount > 0 且 !hostile → 治疗路径
 * 2. hostile=true → 敌对伤害路径（调用 executeAttack，含感染附加）
 * 3. infectionBonus > 0 且 !hostile → 纯感染路径
 * 4. 以上都不满足 → 空结果
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @param actorUid 施法者 uid
 * @param targetUid 目标 uid
 * @param ability 能力定义
 * @param pushLog 日志推送函数
 * @returns 结算结果
 */
export function applyAbilityToTarget(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
  actorUid: string,
  targetUid: string,
  ability: CombatAbility,
  pushLog: (text: string) => void,
): AbilityResolutionResult {
  // ---- 治疗路径 ----
  if (ability.healAmount && ability.healAmount > 0 && !ability.hostile) {
    return resolveHeal(state, combat, actorUid, targetUid, ability, pushLog)
  }

  // ---- 敌对伤害路径 ----
  if (ability.hostile) {
    const result = executeAttack(combat, state, playerCtx, actorUid, targetUid, pushLog, ability)
    return {
      hit: result.hit,
      damage: result.damage,
      healed: 0,
      isCrit: result.isCrit,
      enemyDefeated: result.enemyDefeated,
      targetsAffected: result.hit ? 1 : 0,
    }
  }

  // ---- 纯感染路径（非敌对但有感染效果）----
  if (ability.infectionBonus && ability.infectionBonus > 0) {
    return resolveInfection(state, combat, actorUid, targetUid, ability, pushLog)
  }

  return { ...EMPTY_RESULT }
}

// ==================== AOE 能力结算 ====================

/**
 * 对目标区域结算 AOE 能力效果
 *
 * ==================== 执行流程 ====================
 * 1. 收集战场所有单位
 * 2. 根据 ability.area 计算影响范围内的合法目标
 * 3. 逐个对受影响目标调用 applyAbilityToTarget
 * 4. 汇总伤害/治疗/击败数
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @param actorUid 施法者 uid
 * @param targetCell 目标格子（AOE 中心）
 * @param ability 能力定义
 * @param pushLog 日志推送函数
 * @returns 汇总结算结果
 */
export function applyAbilityToArea(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
  actorUid: string,
  targetCell: GridPosition,
  ability: CombatAbility,
  pushLog: (text: string) => void,
): AbilityResolutionResult {
  // 收集战场所有单位
  const allUnits = collectTacticsUnits(combat)
  const playerUnit = allUnits.find((u) => u.uid === playerUid())
  if (playerUnit) playerUnit.speed = playerCtx.attributes.agility + playerCtx.attributes.composure

  // 计算影响范围内的合法目标
  const actorSide: 'player' | 'enemy' = parseUid(actorUid).kind === 'player' ? 'player' : 'enemy'
  const affectedUnits = getUnitsInAoeArea(targetCell, ability, allUnits, actorSide)

  const actorName = getUnitName(combat, actorUid)
  pushLog(`\n${actorName}使用【${ability.name}】！`)

  // 没有命中任何目标
  if (affectedUnits.length === 0) {
    pushLog('范围内没有命中任何目标。')
    return { ...EMPTY_RESULT }
  }

  // 逐个目标结算
  let totalDamage = 0
  let totalHealed = 0
  let enemiesHit = 0
  let enemiesDefeated = 0
  let targetsAffected = 0

  for (const unit of affectedUnits) {
    const result = applyAbilityToTarget(
      state,
      combat,
      playerCtx,
      actorUid,
      unit.uid,
      ability,
      pushLog,
    )
    totalDamage += result.damage
    totalHealed += result.healed
    if (result.damage > 0) enemiesHit++
    if (result.enemyDefeated) enemiesDefeated++
    if (result.hit || result.healed > 0) targetsAffected++
  }

  // 汇总日志
  if (enemiesHit > 0) {
    pushLog(`共命中 ${enemiesHit} 个目标，造成 ${totalDamage} 点总伤害。`)
  }
  if (totalHealed > 0) {
    pushLog(`共治疗 ${targetsAffected} 个目标，恢复 ${totalHealed} 点生命。`)
  }

  return {
    hit: enemiesHit > 0 || totalHealed > 0,
    damage: totalDamage,
    healed: totalHealed,
    isCrit: false,
    enemyDefeated: enemiesDefeated > 0,
    targetsAffected,
  }
}

// ==================== 治疗结算 ====================

/**
 * 治疗效果结算
 *
 * 对友方目标或自身恢复 HP，治疗量不超过 maxHp。
 * 治疗结果写入战斗日志。
 *
 * @param state 副本运行时状态（用于同步玩家 HP）
 * @param combat 战斗状态
 * @param actorUid 施法者 uid
 * @param targetUid 目标 uid
 * @param ability 能力定义（需包含 healAmount）
 * @param pushLog 日志推送函数
 * @returns 结算结果
 */
function resolveHeal(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  actorUid: string,
  targetUid: string,
  ability: CombatAbility,
  pushLog: (text: string) => void,
): AbilityResolutionResult {
  const healAmount = ability.healAmount ?? 0
  if (healAmount <= 0) return { ...EMPTY_RESULT }

  const target = parseUid(targetUid)
  const actorName = getUnitName(combat, actorUid)
  const targetName = getUnitName(combat, targetUid)

  let actualHeal = 0

  if (target.kind === 'player') {
    const before = combat.player_hp
    combat.player_hp = Math.min(combat.player_max_hp, combat.player_hp + healAmount)
    actualHeal = combat.player_hp - before
    state.player.hp = combat.player_hp
  } else if (target.kind === 'ally') {
    const ally = combat.allies[target.index]
    if (!ally || ally.down) {
      pushLog(`${targetName} 已倒下，无法治疗。`)
      return { ...EMPTY_RESULT }
    }
    const before = ally.hp
    ally.hp = Math.min(ally.max_hp, ally.hp + healAmount)
    actualHeal = ally.hp - before
    // 同步到 NPC
    const npc = state.npcs.find((n) => n.id === ally.npc_id)
    if (npc) syncAllyHpToNpc(npc, ally)
  } else {
    // 敌人不能被治疗
    pushLog(`无法治疗${targetName}。`)
    return { ...EMPTY_RESULT }
  }

  pushLog(`${actorName}使用【${ability.name}】治疗${targetName}，恢复 ${actualHeal} 点生命。`)
  return {
    hit: true,
    damage: 0,
    healed: actualHeal,
    isCrit: false,
    enemyDefeated: false,
    targetsAffected: 1,
  }
}

// ==================== 感染结算 ====================

/**
 * 纯感染效果结算（非敌对能力的感染附加）
 *
 * 对目标增加感染值。目标为玩家时修改 state.player.infection，
 * 目标为队友时修改对应 NPC 的 infection（通过 changeNpcInfection）。
 * 敌人没有感染状态，会写入提示日志。
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param actorUid 施法者 uid
 * @param targetUid 目标 uid
 * @param ability 能力定义（需包含 infectionBonus）
 * @param pushLog 日志推送函数
 * @returns 结算结果
 */
function resolveInfection(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  actorUid: string,
  targetUid: string,
  ability: CombatAbility,
  pushLog: (text: string) => void,
): AbilityResolutionResult {
  const infectionBonus = ability.infectionBonus ?? 0
  if (infectionBonus <= 0) return { ...EMPTY_RESULT }

  const target = parseUid(targetUid)
  const actorName = getUnitName(combat, actorUid)
  const targetName = getUnitName(combat, targetUid)

  if (target.kind === 'player') {
    state.player.infection = Math.min(100, state.player.infection + infectionBonus)
    pushLog(`${actorName}使用【${ability.name}】，感染值 +${infectionBonus}（当前 ${state.player.infection}）`)
    return {
      hit: true,
      damage: 0,
      healed: 0,
      isCrit: false,
      enemyDefeated: false,
      targetsAffected: 1,
    }
  }

  if (target.kind === 'ally') {
    const ally = combat.allies[target.index]
    if (!ally || ally.down) {
      pushLog(`${targetName} 已倒下，无法施加感染。`)
      return { ...EMPTY_RESULT }
    }
    const npc = state.npcs.find((n) => n.id === ally.npc_id)
    if (npc) {
      changeNpcInfection(npc, infectionBonus)
      pushLog(`${actorName}使用【${ability.name}】，${targetName}感染值 +${infectionBonus}（当前 ${npc.infection}）`)
    }
    return {
      hit: true,
      damage: 0,
      healed: 0,
      isCrit: false,
      enemyDefeated: false,
      targetsAffected: 1,
    }
  }

  // 敌人没有感染状态
  pushLog(`${actorName}使用【${ability.name}】，但${targetName}无感染值。`)
  return { ...EMPTY_RESULT }
}
