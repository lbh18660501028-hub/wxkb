/**
 * 副本 V2 - 自动战斗系统
 */

import type {
  DungeonRuntimeState,
  DungeonCombatState,
  CombatEnemy,
  CombatAlly,
  GridPosition,
  CombatAbility,
} from '../../types/dungeon-v2'
import type { Attributes } from '../../types/game'
import { simulateCombatRound } from '../dice'
import type { AdvancedCombatStats, DamageType, EssenceDamageType } from '../../config/combat'
import { getEnemy } from '../../data/dungeons/biohazard/enemies'
import { getItem } from '../../data/dungeons/biohazard/items'
import { DUNGEON_COMBAT_CONFIG, SELF_DESTRUCT_CONFIG, TACTICS_CONFIG } from '../../config/dungeon-v2'
import { changeNpcInfection, npcToCombatAlly, syncAllyHpToNpc } from './npc'
import {
  placeFormation,
  calculateTurnOrder,
  collectTacticsUnits,
  getTacticsUnit,
  resetUnitActions,
  setUnitPosition,
  markUnitMoved,
  markUnitAttacked,
  simpleAIDecide,
  formatPos,
  parseUid,
  playerUid,
  getMovableCells,
  getAttackableTargets,
} from './tactics'
import { getUnitsInAoeArea } from './abilities'

export interface PlayerCombatContext {
  attributes: Attributes
  allSkills: Record<string, number>
  advancedStats: AdvancedCombatStats
  maxHp: number
  maxMp: number
  currentMp: number
  weaponAttack: number
  weaponEssence: EssenceDamageType | null
  attackMode: 'normal' | 'skill'
  skillCoefficient: number
  proficiencyBonus: number
  maxWillpower: number
}

export function createCombatEnemy(enemyId: string, weakenLevel = 0): CombatEnemy | null {
  const config = getEnemy(enemyId)
  if (!config) return null

  let maxHp = config.max_hp
  if (enemyId === SELF_DESTRUCT_CONFIG.BOSS_ENEMY_ID && weakenLevel > 0) {
    const weakenRatio = Math.min(weakenLevel * SELF_DESTRUCT_CONFIG.BOSS_WEAKEN_PER_LEVEL, 0.6)
    maxHp = Math.max(60, Math.floor(maxHp * (1 - weakenRatio)))
  }

  return {
    id: config.id,
    name: config.name,
    hp: maxHp,
    max_hp: maxHp,
    attack: config.attack,
    defense: config.defense,
    damage: config.damage,
    armor: config.armor,
    infection_on_hit: config.infection_on_hit ?? 0,
    infection_on_bite: config.infection_on_bite ?? 0,
    speed: config.speed ?? 5,
    skills: config.skills ?? [],
    abilityLoadout: config.abilityLoadout,
    damage_type: (config.damage_type ?? 'physical') as DamageType,
    exp: config.exp,
    side_plots: config.side_plots,
    // ---- 战棋字段默认值（第二步回合调度改造时会被 placeFormation 覆盖位置） ----
    position: null,
    move_range: TACTICS_CONFIG.DEFAULT_MOVE_RANGE,
    attack_range: TACTICS_CONFIG.MELEE_RANGE,
    has_moved: false,
    has_attacked: false,
  }
}

export function initCombat(
  state: DungeonRuntimeState,
  enemyIds: string[],
  playerCtx: PlayerCombatContext,
): DungeonCombatState {
  const weakenLevel = state.global.boss_weakened_level

  const enemies: CombatEnemy[] = []
  for (const id of enemyIds) {
    const enemy = createCombatEnemy(id, weakenLevel)
    if (enemy) enemies.push(enemy)
  }

  if (state.global.self_destruct_started) {
    for (const enemy of enemies) {
      enemy.speed += SELF_DESTRUCT_CONFIG.ENEMY_SPEED_BONUS
    }
  }

  const allies: CombatAlly[] = []
  for (const npc of state.npcs) {
    if (npc.alive && npc.follow_state === 'following') {
      allies.push(npcToCombatAlly(npc))
    }
  }

  return {
    enemies,
    current_enemy_index: 0,
    round: 0,
    logs: [],
    player_hp: state.player.hp,
    player_max_hp: playerCtx.maxHp,
    player_mp: playerCtx.currentMp,
    player_max_mp: playerCtx.maxMp,
    allies,
    over: false,
    result: null,
    rewards: {
      xp: 0,
      reward_points: 0,
      side_plots: { D: 0, C: 0 },
      items: [],
    },
    // ---- 战棋字段初始值 ----
    // 默认自动模式；第二步改造时由 UI 层切换为 manual
    tactics_mode: 'auto' as const,
    grid_width: TACTICS_CONFIG.GRID_WIDTH,
    grid_height: TACTICS_CONFIG.GRID_HEIGHT,
    // 行动顺序和回合索引在第二步回合调度改造时由 calculateTurnOrder 填充
    turn_order: [],
    current_turn_index: 0,
    tactics_round: 0,
    // 玩家战棋状态：位置在第二步由 placeFormation 填充
    player_position: null,
    player_move_range: TACTICS_CONFIG.DEFAULT_MOVE_RANGE,
    player_attack_range: TACTICS_CONFIG.MELEE_RANGE,
    player_has_moved: false,
    player_has_attacked: false,
    // 自动播放控制
    auto_play_interval_ms: TACTICS_CONFIG.AUTO_PLAY_INTERVAL_MS,
    fast_forward: false,
    // 手动模式控制
    waiting_for_player: false,
  }
}

export interface StepRoundResult {
  combatOver: boolean
  playerDamage: number
  enemyDamage: number
  enemyDefeated: boolean
  isCrit: boolean
  newLogs: string[]
  currentEnemyIndex: number
}

type EnemyTarget =
  | { kind: 'player'; name: string }
  | { kind: 'ally'; ally: CombatAlly; name: string }

function pickEnemyTarget(combat: DungeonCombatState): EnemyTarget {
  const candidates: EnemyTarget[] = [{ kind: 'player', name: '你' }]
  for (const ally of combat.allies) {
    if (!ally.down && ally.hp > 0) {
      candidates.push({ kind: 'ally', ally, name: ally.name })
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function rollEnemyAttackAgainstAlly(enemy: CombatEnemy, ally: CombatAlly): { hit: boolean; damage: number } {
  const hitChance = Math.max(0.2, Math.min(0.95, 0.6 + (enemy.attack - ally.defense) * 0.03 + (enemy.speed - ally.speed) * 0.01))
  if (Math.random() >= hitChance) {
    return { hit: false, damage: 0 }
  }

  const mitigatedDamage = enemy.damage + Math.max(0, enemy.attack - ally.defense) - ally.armor
  return {
    hit: true,
    damage: Math.max(1, Math.floor(mitigatedDamage)),
  }
}

export function stepCombatRound(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
): StepRoundResult {
  const newLogs: string[] = []

  const pushLog = (text: string): void => {
    combat.logs.push(text)
    newLogs.push(text)
  }

  if (combat.over) {
    return {
      combatOver: true,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs: [],
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  if (combat.round >= DUNGEON_COMBAT_CONFIG.MAX_ROUNDS) {
    pushLog(`超过最大回合数 ${DUNGEON_COMBAT_CONFIG.MAX_ROUNDS}，战斗被强制终止。`)
    combat.result = 'fled'
    combat.over = true
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  const enemy = combat.enemies[combat.current_enemy_index]
  if (!enemy) {
    combat.result = 'victory'
    combat.over = true
    return {
      combatOver: true,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  combat.round++
  pushLog(`\n—— 第 ${combat.round} 回合 ——`)
  const enemyTarget = pickEnemyTarget(combat)
  pushLog(`${enemy.name} 锁定了 ${enemyTarget.name}。`)

  const result = simulateCombatRound(
    playerCtx.attributes,
    {
      attack: enemy.attack,
      defense: enemy.defense,
      damage: enemy.damage,
      armor: enemy.armor,
      speed: enemy.speed,
    },
    {
      ...playerCtx.advancedStats,
      weaponAttack: playerCtx.weaponAttack,
      weaponEssence: (playerCtx.weaponEssence ?? undefined) as EssenceDamageType | undefined,
      attackMode: playerCtx.attackMode,
      skillCoefficient: playerCtx.skillCoefficient,
      proficiencyBonus: playerCtx.proficiencyBonus,
    },
    playerCtx.weaponEssence ?? 'physical',
    enemy.damage_type,
    combat.player_hp,
    enemy.hp,
  )

  let playerDamage = 0
  let enemyDamage = 0
  let enemyDefeated = false

  if (result.playerHit) {
    enemy.hp = Math.max(0, enemy.hp - result.playerDamage)
    playerDamage = result.playerDamage
    pushLog(`你攻击 ${enemy.name}，造成 ${result.playerDamage} 点伤害。${result.isCrit ? ' 暴击！' : ''}`)
    pushLog(`${enemy.name} 剩余 HP: ${enemy.hp}/${enemy.max_hp}`)
  } else {
    pushLog(`你对 ${enemy.name} 的攻击落空了。`)
  }

  if (enemyTarget.kind === 'player') {
    if (result.enemyHit) {
      enemyDamage = result.enemyDamage
      combat.player_hp = Math.max(0, combat.player_hp - result.enemyDamage)
      pushLog(`${enemy.name} 攻击了你，造成 ${result.enemyDamage} 点伤害。`)
      pushLog(`你的剩余 HP: ${combat.player_hp}/${combat.player_max_hp}`)
    } else {
      pushLog(`${enemy.name} 的攻击被你躲开了。`)
    }
  } else {
    const targetAlly = enemyTarget.ally
    const allyAttack = rollEnemyAttackAgainstAlly(enemy, targetAlly)

    if (!allyAttack.hit) {
      pushLog(`${enemy.name} 攻击 ${targetAlly.name}，但被闪开了。`)
    } else {
      enemyDamage = allyAttack.damage
      targetAlly.hp = Math.max(0, targetAlly.hp - allyAttack.damage)
      pushLog(`${enemy.name} 攻击 ${targetAlly.name}，造成 ${allyAttack.damage} 点伤害！（剩余 HP: ${targetAlly.hp}/${targetAlly.max_hp}）`)

      if (targetAlly.hp <= 0) {
        targetAlly.down = true
        pushLog(`${targetAlly.name} 倒下了！`)
      }
    }
  }

  if (enemyDamage > 0 && enemy.infection_on_hit > 0) {
    if (enemyTarget.kind === 'player') {
      state.player.infection = Math.min(100, state.player.infection + enemy.infection_on_hit)
      pushLog(`感染值 +${enemy.infection_on_hit}（当前 ${state.player.infection}）`)
    } else {
      const targetAlly = enemyTarget.ally
      const npc = state.npcs.find((n) => n.id === targetAlly.npc_id)
      if (npc) {
        changeNpcInfection(npc, enemy.infection_on_hit)
        pushLog(`${targetAlly.name} 感染值 +${enemy.infection_on_hit}（当前 ${npc.infection}）`)
      }
    }
  }

  if (result.playerHealing > 0) {
    combat.player_hp = Math.min(combat.player_max_hp, combat.player_hp + result.playerHealing)
  }

  const activeAllies = combat.allies.filter((ally) => !ally.down)
  for (const ally of activeAllies) {
    if (enemy.hp <= 0) break

    const allyHit = Math.random() < 0.7
    if (allyHit) {
      const allyDamage = Math.max(1, ally.damage - Math.floor(enemy.armor / 2))
      enemy.hp = Math.max(0, enemy.hp - allyDamage)
      playerDamage += allyDamage
      pushLog(`${ally.name} 攻击 ${enemy.name}，造成 ${allyDamage} 点伤害！（剩余 HP: ${enemy.hp}/${enemy.max_hp}）`)
    } else {
      pushLog(`${ally.name} 的攻击落空了。`)
    }
  }

  if (enemy.hp > 0 && activeAllies.length > 0 && Math.random() < 0.25) {
    const targetAlly = activeAllies[Math.floor(Math.random() * activeAllies.length)]
    const retaliateDamage = Math.max(1, Math.floor(enemy.damage * 0.5) - targetAlly.armor)
    targetAlly.hp = Math.max(0, targetAlly.hp - retaliateDamage)
    pushLog(`${enemy.name} 反击 ${targetAlly.name}，造成 ${retaliateDamage} 点伤害！（剩余 HP: ${targetAlly.hp}/${targetAlly.max_hp}）`)

    if (targetAlly.hp <= 0) {
      targetAlly.down = true
      pushLog(`${targetAlly.name} 倒下了！`)
    }
  }

  state.player.hp = combat.player_hp

  if (combat.player_hp <= 0) {
    pushLog('\n你倒下了……')
    combat.result = 'defeat'
    combat.over = true
    state.player.alive = false
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage,
      enemyDamage,
      enemyDefeated,
      isCrit: result.isCrit,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  if (enemy.hp <= 0) {
    pushLog(`\n击败了 ${enemy.name}！`)
    enemyDefeated = true

    const enemyConfig = getEnemy(enemy.id)
    if (enemyConfig?.drops && enemyConfig.drop_rate && Math.random() < enemyConfig.drop_rate) {
      const dropId = enemyConfig.drops[Math.floor(Math.random() * enemyConfig.drops.length)]
      combat.rewards.items.push(dropId)
      const item = getItem(dropId)
      if (item) {
        pushLog(`掉落道具: ${item.name}`)
      }
    }

    combat.current_enemy_index++

    if (combat.current_enemy_index >= combat.enemies.length) {
      pushLog('\n═══ 战斗胜利！═══')
      combat.result = 'victory'
      combat.over = true
      syncAlliesAfterCombat(state, combat)
    } else {
      const nextEnemy = combat.enemies[combat.current_enemy_index]
      pushLog(`\n下一名敌人：${nextEnemy.name} (HP: ${nextEnemy.hp}/${nextEnemy.max_hp})`)
    }
  }

  return {
    combatOver: combat.over,
    playerDamage,
    enemyDamage,
    enemyDefeated,
    isCrit: result.isCrit,
    newLogs,
    currentEnemyIndex: combat.current_enemy_index,
  }
}

export function syncAlliesAfterCombat(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
): void {
  for (const ally of combat.allies) {
    const npc = state.npcs.find((n) => n.id === ally.npc_id)
    if (npc) {
      syncAllyHpToNpc(npc, ally)
    }
  }
}

export function autoResolveCombat(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
): DungeonCombatState {
  combat.logs.push('═══ 战斗开始 ═══')

  while (!combat.over) {
    stepCombatRound(state, combat, playerCtx)
  }

  return combat
}

export function getCombatSummary(combat: DungeonCombatState): string[] {
  const summary: string[] = []

  if (combat.result === 'victory') {
    summary.push('战斗胜利！')
    if (combat.rewards.items.length > 0) {
      const names = combat.rewards.items.map((id) => getItem(id)?.name ?? id)
      summary.push(`掉落道具: ${names.join(', ')}`)
    }
  } else if (combat.result === 'defeat') {
    summary.push('战斗失败……你倒下了。')
  } else {
    summary.push('战斗结束（已撤退）。')
  }

  return summary
}

// ==================== 战棋回合调度（第二步改造） ====================

/**
 * 战棋模式下的单向攻击执行
 *
 * 与旧版 stepCombatRound 的"双方同时对砍"不同，战棋模式下每次只有一方攻击。
 * 复用相同的伤害公式（simulateCombatRound / rollEnemyAttackAgainstAlly），
 * 但只应用攻击方的结果，防守方的反击留到防守方自己的回合。
 *
 * ==================== ability 参数说明 ====================
 * 当传入 ability 时，会根据其配置字段调整结算：
 * - damageMultiplier：对骰子基础伤害做倍率调整（默认 1.0）
 * - flatDamageBonus：骰子结算后叠加固定伤害加值（默认 0）
 * - infectionBonus：命中时对目标附加感染值（默认 0=不附加）
 * - name：日志中使用技能名称而非通用"攻击"
 *
 * 不传 ability 时，行为与旧版完全一致（向后兼容）。
 *
 * @param combat 战斗状态
 * @param state 副本运行时状态（用于感染值）
 * @param playerCtx 玩家战斗上下文
 * @param attackerUid 攻击方 uid
 * @param targetUid 防守方 uid
 * @param pushLog 日志推送函数
 * @param ability 可选的技能定义（用于伤害倍率/加值/感染/日志）
 * @returns 攻击结果
 */
export function executeAttack(
  combat: DungeonCombatState,
  state: DungeonRuntimeState,
  playerCtx: PlayerCombatContext,
  attackerUid: string,
  targetUid: string,
  pushLog: (text: string) => void,
  ability?: CombatAbility,
): { hit: boolean; damage: number; isCrit: boolean; enemyDefeated: boolean } {
  const attacker = parseUid(attackerUid)
  const target = parseUid(targetUid)

  // ==================== 玩家攻击敌人 ====================
  if (attacker.kind === 'player' && target.kind === 'enemy') {
    const enemy = combat.enemies[target.index]
    if (!enemy || enemy.hp <= 0) return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }

    // 复用 D10 骰子系统，只取玩家攻击部分
    const result = simulateCombatRound(
      playerCtx.attributes,
      {
        attack: enemy.attack,
        defense: enemy.defense,
        damage: enemy.damage,
        armor: enemy.armor,
        speed: enemy.speed,
      },
      {
        ...playerCtx.advancedStats,
        weaponAttack: playerCtx.weaponAttack,
        weaponEssence: (playerCtx.weaponEssence ?? undefined) as EssenceDamageType | undefined,
        attackMode: playerCtx.attackMode,
        skillCoefficient: playerCtx.skillCoefficient,
        proficiencyBonus: playerCtx.proficiencyBonus,
      },
      playerCtx.weaponEssence ?? 'physical',
      enemy.damage_type,
      combat.player_hp,
      enemy.hp,
    )

    // 应用治疗（玩家攻击时可能触发治疗）
    if (result.playerHealing > 0) {
      combat.player_hp = Math.min(combat.player_max_hp, combat.player_hp + result.playerHealing)
    }

    // 根据能力配置计算最终伤害（damageMultiplier + flatDamageBonus）
    let finalDamage = 0
    let enemyDefeated = false
    if (result.playerHit) {
      if (ability) {
        const multiplier = ability.damageMultiplier ?? 1.0
        const flatBonus = ability.flatDamageBonus ?? 0
        finalDamage = Math.floor(result.playerDamage * multiplier) + flatBonus
      } else {
        finalDamage = result.playerDamage
      }
      enemy.hp = Math.max(0, enemy.hp - finalDamage)
      if (ability) {
        pushLog(`你使用【${ability.name}】攻击${enemy.name}，造成 ${finalDamage} 点伤害。${result.isCrit ? ' 暴击！' : ''}`)
      } else {
        pushLog(`你攻击 ${enemy.name}，造成 ${finalDamage} 点伤害。${result.isCrit ? ' 暴击！' : ''}`)
      }
      pushLog(`${enemy.name} 剩余 HP: ${enemy.hp}/${enemy.max_hp}`)
      if (enemy.hp <= 0) {
        pushLog(`击败了 ${enemy.name}！`)
        enemyDefeated = true
        handleEnemyDrop(combat, enemy, pushLog)
      }
      // 能力附加感染值（目标为敌人时无感染状态，跳过）
    } else {
      if (ability) {
        pushLog(`你使用【${ability.name}】攻击${enemy.name}，但落空了。`)
      } else {
        pushLog(`你对 ${enemy.name} 的攻击落空了。`)
      }
    }

    // 更新当前敌人索引（UI 高亮用）
    combat.current_enemy_index = target.index

    return { hit: result.playerHit, damage: finalDamage, isCrit: result.isCrit, enemyDefeated }
  }

  // ==================== 敌人攻击玩家 ====================
  if (attacker.kind === 'enemy' && target.kind === 'player') {
    const enemy = combat.enemies[attacker.index]
    if (!enemy || enemy.hp <= 0) return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }

    // 复用 D10 骰子系统，只取敌人攻击部分
    const result = simulateCombatRound(
      playerCtx.attributes,
      {
        attack: enemy.attack,
        defense: enemy.defense,
        damage: enemy.damage,
        armor: enemy.armor,
        speed: enemy.speed,
      },
      {
        ...playerCtx.advancedStats,
        weaponAttack: playerCtx.weaponAttack,
        weaponEssence: (playerCtx.weaponEssence ?? undefined) as EssenceDamageType | undefined,
        attackMode: playerCtx.attackMode,
        skillCoefficient: playerCtx.skillCoefficient,
        proficiencyBonus: playerCtx.proficiencyBonus,
      },
      playerCtx.weaponEssence ?? 'physical',
      enemy.damage_type,
      combat.player_hp,
      enemy.hp,
    )

    if (result.enemyHit) {
      // 根据能力配置计算最终伤害
      let finalDamage: number
      if (ability) {
        const multiplier = ability.damageMultiplier ?? 1.0
        const flatBonus = ability.flatDamageBonus ?? 0
        finalDamage = Math.floor(result.enemyDamage * multiplier) + flatBonus
      } else {
        finalDamage = result.enemyDamage
      }
      combat.player_hp = Math.max(0, combat.player_hp - finalDamage)
      if (ability) {
        pushLog(`${enemy.name}使用【${ability.name}】攻击你，造成 ${finalDamage} 点伤害。`)
      } else {
        pushLog(`${enemy.name} 攻击了你，造成 ${finalDamage} 点伤害。`)
      }
      pushLog(`你的剩余 HP: ${combat.player_hp}/${combat.player_max_hp}`)

      // 感染值累积 — 敌人基础感染（保持旧机制不变）
      if (enemy.infection_on_hit > 0) {
        state.player.infection = Math.min(100, state.player.infection + enemy.infection_on_hit)
        pushLog(`感染值 +${enemy.infection_on_hit}（当前 ${state.player.infection}）`)
      }
      // 感染值累积 — 能力附加感染
      if (ability?.infectionBonus && ability.infectionBonus > 0) {
        state.player.infection = Math.min(100, state.player.infection + ability.infectionBonus)
        pushLog(`感染值 +${ability.infectionBonus}（当前 ${state.player.infection}）`)
      }

      return { hit: true, damage: finalDamage, isCrit: false, enemyDefeated: false }
    } else {
      if (ability) {
        pushLog(`${enemy.name}使用【${ability.name}】攻击你，但被你躲开了。`)
      } else {
        pushLog(`${enemy.name} 的攻击被你躲开了。`)
      }
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }
  }

  // ==================== 敌人攻击队友 ====================
  if (attacker.kind === 'enemy' && target.kind === 'ally') {
    const enemy = combat.enemies[attacker.index]
    const ally = combat.allies[target.index]
    if (!enemy || enemy.hp <= 0 || !ally || ally.down) {
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }

    // 复用旧的队友受击公式
    const allyAttack = rollEnemyAttackAgainstAlly(enemy, ally)
    if (!allyAttack.hit) {
      if (ability) {
        pushLog(`${enemy.name}使用【${ability.name}】攻击 ${ally.name}，但被闪开了。`)
      } else {
        pushLog(`${enemy.name} 攻击 ${ally.name}，但被闪开了。`)
      }
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }

    // 根据能力配置计算最终伤害
    let finalDamage: number
    if (ability) {
      const multiplier = ability.damageMultiplier ?? 1.0
      const flatBonus = ability.flatDamageBonus ?? 0
      finalDamage = Math.floor(allyAttack.damage * multiplier) + flatBonus
    } else {
      finalDamage = allyAttack.damage
    }
    ally.hp = Math.max(0, ally.hp - finalDamage)
    if (ability) {
      pushLog(`${enemy.name}使用【${ability.name}】攻击 ${ally.name}，造成 ${finalDamage} 点伤害！（剩余 HP: ${ally.hp}/${ally.max_hp}）`)
    } else {
      pushLog(`${enemy.name} 攻击 ${ally.name}，造成 ${finalDamage} 点伤害！（剩余 HP: ${ally.hp}/${ally.max_hp}）`)
    }

    if (ally.hp <= 0) {
      ally.down = true
      pushLog(`${ally.name} 倒下了！`)
    }

    // 队友感染值累积 — 敌人基础感染（保持旧机制不变）
    if (enemy.infection_on_hit > 0) {
      const npc = state.npcs.find((n) => n.id === ally.npc_id)
      if (npc) {
        changeNpcInfection(npc, enemy.infection_on_hit)
        pushLog(`${ally.name} 感染值 +${enemy.infection_on_hit}（当前 ${npc.infection}）`)
      }
    }
    // 队友感染值累积 — 能力附加感染
    if (ability?.infectionBonus && ability.infectionBonus > 0) {
      const npc = state.npcs.find((n) => n.id === ally.npc_id)
      if (npc) {
        changeNpcInfection(npc, ability.infectionBonus)
        pushLog(`${ally.name} 感染值 +${ability.infectionBonus}（当前 ${npc.infection}）`)
      }
    }

    return { hit: true, damage: finalDamage, isCrit: false, enemyDefeated: false }
  }

  // ==================== 队友攻击敌人 ====================
  if (attacker.kind === 'ally' && target.kind === 'enemy') {
    const ally = combat.allies[attacker.index]
    const enemy = combat.enemies[target.index]
    if (!ally || ally.down || !enemy || enemy.hp <= 0) {
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }

    // 复用旧的队友攻击公式
    const allyHit = Math.random() < 0.7
    if (!allyHit) {
      if (ability) {
        pushLog(`${ally.name}使用【${ability.name}】攻击 ${enemy.name}，但落空了。`)
      } else {
        pushLog(`${ally.name} 的攻击落空了。`)
      }
      return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
    }

    // 根据能力配置计算最终伤害
    const baseAllyDamage = Math.max(1, ally.damage - Math.floor(enemy.armor / 2))
    let finalDamage: number
    if (ability) {
      const multiplier = ability.damageMultiplier ?? 1.0
      const flatBonus = ability.flatDamageBonus ?? 0
      finalDamage = Math.floor(baseAllyDamage * multiplier) + flatBonus
    } else {
      finalDamage = baseAllyDamage
    }
    enemy.hp = Math.max(0, enemy.hp - finalDamage)
    if (ability) {
      pushLog(`${ally.name}使用【${ability.name}】攻击 ${enemy.name}，造成 ${finalDamage} 点伤害！（剩余 HP: ${enemy.hp}/${enemy.max_hp}）`)
    } else {
      pushLog(`${ally.name} 攻击 ${enemy.name}，造成 ${finalDamage} 点伤害！（剩余 HP: ${enemy.hp}/${enemy.max_hp}）`)
    }

    let enemyDefeated = false
    if (enemy.hp <= 0) {
      pushLog(`击败了 ${enemy.name}！`)
      enemyDefeated = true
      handleEnemyDrop(combat, enemy, pushLog)
    }
    // 能力附加感染值（目标为敌人时无感染状态，跳过）

    combat.current_enemy_index = target.index
    return { hit: true, damage: finalDamage, isCrit: false, enemyDefeated }
  }

  return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
}

/**
 * 处理敌人掉落道具
 */
function handleEnemyDrop(combat: DungeonCombatState, enemy: CombatEnemy, pushLog: (text: string) => void): void {
  const enemyConfig = getEnemy(enemy.id)
  if (enemyConfig?.drops && enemyConfig.drop_rate && Math.random() < enemyConfig.drop_rate) {
    const dropId = enemyConfig.drops[Math.floor(Math.random() * enemyConfig.drops.length)]
    combat.rewards.items.push(dropId)
    const item = getItem(dropId)
    if (item) {
      pushLog(`掉落道具: ${item.name}`)
    }
  }
}

/**
 * 空回合结果（用于跳过/结束时返回）
 */
function emptyStepResult(combat: DungeonCombatState, newLogs: string[] = []): StepRoundResult {
  return {
    combatOver: combat.over,
    playerDamage: 0,
    enemyDamage: 0,
    enemyDefeated: false,
    isCrit: false,
    newLogs,
    currentEnemyIndex: combat.current_enemy_index,
  }
}

/**
 * 战棋回合调度 — 每次调用执行一个单位的行动
 *
 * ==================== 调度流程 ====================
 * 1. 首次调用：全员上网格（placeFormation）+ 计算行动顺序（calculateTurnOrder）
 * 2. 获取当前行动单位（按 turn_order 顺序，跳过已死亡）
 * 3. 重置该单位本回合行动标记
 * 4. 自动模式：AI 决策并执行（移动+攻击）
 *    手动模式：玩家单位等待玩家操作（预留，当前自动模式 AI 驱动所有单位）
 * 5. 标记单位已完成行动
 * 6. 检查胜负条件
 * 7. 推进到下一个单位；所有单位行动完毕 → tactics_round++
 *
 * ==================== 与旧版区别 ====================
 * - 旧版 stepCombatRound：每回合全员同时对砍（玩家打+敌人打+队友打+反击）
 * - 新版 stepTacticsTurn：每回合一个单位行动（移动+攻击），按速度排序轮流
 * - 伤害公式完全相同，但攻击变为单向（防守方在自己的回合反击）
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @returns 回合结果
 */
export function stepTacticsTurn(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
): StepRoundResult {
  const newLogs: string[] = []
  const pushLog = (text: string): void => {
    combat.logs.push(text)
    newLogs.push(text)
  }

  // 战斗已结束
  if (combat.over) {
    return emptyStepResult(combat)
  }

  // 手动模式下正在等待玩家操作，不继续推进
  if (combat.waiting_for_player) {
    return emptyStepResult(combat)
  }

  const playerSpeed = playerCtx.attributes.agility + playerCtx.attributes.composure

  // ==================== 首次调用：初始化网格 ====================
  if (combat.turn_order.length === 0) {
    placeFormation(combat, playerSpeed)
    combat.turn_order = calculateTurnOrder(combat, playerSpeed)
    combat.tactics_round = 1
    combat.current_turn_index = 0
    pushLog(`\n—— 战棋回合 ${combat.tactics_round} ——`)
  }

  // ==================== 获取当前行动单位（跳过已死亡） ====================
  while (combat.current_turn_index < combat.turn_order.length) {
    const uid = combat.turn_order[combat.current_turn_index]
    const unit = getTacticsUnit(combat, uid, playerSpeed)
    if (unit && unit.alive) break
    combat.current_turn_index++
  }

  // 所有单位已行动完毕，进入新一轮
  if (combat.current_turn_index >= combat.turn_order.length) {
    combat.tactics_round++
    combat.current_turn_index = 0
    combat.turn_order = calculateTurnOrder(combat, playerSpeed)
    pushLog(`\n—— 战棋回合 ${combat.tactics_round} ——`)

    // 检查最大回合数
    if (combat.tactics_round > TACTICS_CONFIG.MAX_TACTICS_ROUNDS) {
      pushLog(`超过最大回合数 ${TACTICS_CONFIG.MAX_TACTICS_ROUNDS}，战斗被强制终止。`)
      combat.result = 'fled'
      combat.over = true
      syncAlliesAfterCombat(state, combat)
      return emptyStepResult(combat, newLogs)
    }
  }

  const uid = combat.turn_order[combat.current_turn_index]

  // 先重置该单位本回合行动标记，再获取快照
  // （否则 unit 中的 has_moved/has_attacked 还是上一轮的 true，AI 会误判为已行动）
  resetUnitActions(combat, uid)

  const unit = getTacticsUnit(combat, uid, playerSpeed)
  if (!unit) {
    combat.current_turn_index++
    return emptyStepResult(combat, newLogs)
  }

  let playerDamage = 0
  let enemyDamage = 0
  let enemyDefeated = false
  let isCrit = false

  // ==================== 执行行动 ====================
  // 自动模式：所有单位由 AI 驱动
  // 手动模式：玩家单位等待手动操作，敌人/队友仍由 AI 驱动
  const isAutoMode = combat.tactics_mode === 'auto'
  const isAIControlled = unit.side === 'enemy' || unit.control_mode === 'auto'

  // ---- 手动模式 + 玩家回合 → 暂停，等待玩家操作 ----
  if (!isAutoMode && !isAIControlled) {
    combat.waiting_for_player = true
    pushLog('轮到你行动了！选择移动或攻击。')
    return {
      combatOver: combat.over,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  if (isAutoMode || isAIControlled) {
    // 收集所有战术单位（供 AI 决策使用）
    const allUnits = collectTacticsUnits(combat)
    // 填充玩家速度（collectTacticsUnits 中玩家速度为 0 占位）
    const playerUnit = allUnits.find((u) => u.uid === playerUid())
    if (playerUnit) playerUnit.speed = playerSpeed

    const decision = simpleAIDecide(unit, allUnits, combat.grid_width, combat.grid_height)

    if (decision.action === 'wait') {
      pushLog(`${unit.name} 等待时机。`)
    } else {
      // 执行移动
      if ((decision.action === 'move' || decision.action === 'move_and_attack') && decision.moveTarget) {
        setUnitPosition(combat, uid, decision.moveTarget)
        markUnitMoved(combat, uid)
        pushLog(`${unit.name} 移动到 ${formatPos(decision.moveTarget)}。`)
      }

      // 执行攻击
      if ((decision.action === 'attack' || decision.action === 'move_and_attack') && decision.attackTargetUid) {
        const attackResult = executeAttack(
          combat,
          state,
          playerCtx,
          uid,
          decision.attackTargetUid,
          pushLog,
        )
        if (attackResult.damage > 0) {
          if (unit.side === 'player') {
            playerDamage = attackResult.damage
            isCrit = attackResult.isCrit
          } else {
            enemyDamage = attackResult.damage
          }
        }
        if (attackResult.enemyDefeated) {
          enemyDefeated = true
        }
        markUnitAttacked(combat, uid)
      }
    }
  }
  // 手动模式（玩家手动操作）— 当前预留，暂不实现
  // 在手动模式下，stepTacticsTurn 会跳过玩家单位，等待 UI 层调用专门的移动/攻击函数

  // 标记单位已完成行动（确保即使 AI 返回 wait 也会推进）
  markUnitMoved(combat, uid)
  markUnitAttacked(combat, uid)

  // 同步玩家 HP 到副本状态（保持旧机制）
  state.player.hp = combat.player_hp

  // ==================== 检查胜负 ====================
  // 玩家阵亡
  if (combat.player_hp <= 0) {
    pushLog('\n你倒下了……')
    combat.result = 'defeat'
    combat.over = true
    state.player.alive = false
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage,
      enemyDamage,
      enemyDefeated,
      isCrit,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  // 所有敌人被击败
  const allEnemiesDead = combat.enemies.length > 0 && combat.enemies.every((e) => e.hp <= 0)
  if (allEnemiesDead) {
    pushLog('\n═══ 战斗胜利！═══')
    combat.result = 'victory'
    combat.over = true
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage,
      enemyDamage,
      enemyDefeated,
      isCrit,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  // ==================== 推进到下一个单位 ====================
  combat.current_turn_index++

  return {
    combatOver: combat.over,
    playerDamage,
    enemyDamage,
    enemyDefeated,
    isCrit,
    newLogs,
    currentEnemyIndex: combat.current_enemy_index,
  }
}

// ==================== 手动模式 API（第三步改造） ====================

/**
 * 手动模式：获取玩家当前可移动的格子列表
 *
 * @param combat 战斗状态
 * @param playerSpeed 玩家速度
 * @returns 可移动格子坐标数组（空数组 = 已移动过 或 不在等待状态）
 */
export function getPlayerMovableCells(
  combat: DungeonCombatState,
  playerSpeed: number,
): GridPosition[] {
  if (!combat.waiting_for_player || combat.player_has_moved) return []

  const unit = getTacticsUnit(combat, playerUid(), playerSpeed)
  if (!unit) return []

  const allUnits = collectTacticsUnits(combat)
  const playerUnit = allUnits.find((u) => u.uid === playerUid())
  if (playerUnit) playerUnit.speed = playerSpeed

  return getMovableCells(unit, allUnits, combat.grid_width, combat.grid_height)
}

/**
 * 手动模式：获取玩家当前可攻击的敌方单位列表
 *
 * @param combat 战斗状态
 * @param playerSpeed 玩家速度
 * @returns 可攻击目标数组（每个含 uid / name / position），空数组 = 无目标 或 已攻击过
 */
export function getPlayerAttackTargets(
  combat: DungeonCombatState,
  playerSpeed: number,
): { uid: string; name: string; position: GridPosition | null }[] {
  if (!combat.waiting_for_player || combat.player_has_attacked) return []

  const unit = getTacticsUnit(combat, playerUid(), playerSpeed)
  if (!unit) return []

  const allUnits = collectTacticsUnits(combat)
  const playerUnit = allUnits.find((u) => u.uid === playerUid())
  if (playerUnit) playerUnit.speed = playerSpeed

  return getAttackableTargets(unit, allUnits).map((t) => ({
    uid: t.uid,
    name: t.name,
    position: t.position,
  }))
}

/**
 * 手动模式：玩家移动到指定格子
 *
 * @param combat 战斗状态
 * @param pos 目标格子坐标
 */
export function executePlayerMove(
  combat: DungeonCombatState,
  pos: GridPosition,
): void {
  if (!combat.waiting_for_player) return
  if (combat.player_has_moved) return

  setUnitPosition(combat, playerUid(), pos)
  markUnitMoved(combat, playerUid())
  combat.logs.push(`你移动到 ${formatPos(pos)}。`)
}

/**
 * 手动模式：玩家攻击指定目标
 *
 * @param state 副本运行时状态（用于感染值）
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @param targetUid 目标 uid（如 'enemy:0'）
 * @returns 攻击结果
 */
export function executePlayerAttack(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
  targetUid: string,
  ability?: CombatAbility,
): { hit: boolean; damage: number; isCrit: boolean; enemyDefeated: boolean } {
  if (!combat.waiting_for_player) return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }
  if (combat.player_has_attacked) return { hit: false, damage: 0, isCrit: false, enemyDefeated: false }

  const pushLog = (text: string): void => {
    combat.logs.push(text)
  }

  const result = executeAttack(combat, state, playerCtx, playerUid(), targetUid, pushLog, ability)
  markUnitAttacked(combat, playerUid())
  return result
}

/**
 * 手动模式：玩家释放 AOE 技能
 *
 * 以 targetCell 为中心，根据 ability.area 计算影响范围，
 * 对范围内的所有敌方单位执行攻击结算。
 *
 * ==================== 执行流程 ====================
 * 1. 收集战场所有单位，筛选 AOE 影响范围内的敌方单位
 * 2. 逐个对受影响敌人调用 executeAttack（复用 D10 骰子结算）
 * 3. 标记玩家已攻击
 * 4. 检查胜负
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @param targetCell 玩家点选的释放格子
 * @param ability AOE 技能定义
 * @returns 命中数、总伤害、击败数
 */
export function executePlayerAoeAttack(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  playerCtx: PlayerCombatContext,
  targetCell: GridPosition,
  ability: CombatAbility,
): { totalDamage: number; enemiesHit: number; enemiesDefeated: number } {
  const emptyResult = { totalDamage: 0, enemiesHit: 0, enemiesDefeated: 0 }
  if (!combat.waiting_for_player) return emptyResult
  if (combat.player_has_attacked) return emptyResult

  const pushLog = (text: string): void => {
    combat.logs.push(text)
  }

  pushLog(`\n你释放了【${ability.name}】！`)

  // 收集战场所有单位，计算 AOE 影响范围内的敌方单位
  const allUnits = collectTacticsUnits(combat)
  const playerUnit = allUnits.find((u) => u.uid === playerUid())
  if (playerUnit) playerUnit.speed = playerCtx.attributes.agility + playerCtx.attributes.composure

  const affectedUnits = getUnitsInAoeArea(targetCell, ability, allUnits, 'player')

  let totalDamage = 0
  let enemiesHit = 0
  let enemiesDefeated = 0

  for (const unit of affectedUnits) {
    // 目前只处理敌方单位
    if (unit.side !== 'enemy') continue
    const result = executeAttack(combat, state, playerCtx, playerUid(), unit.uid, pushLog, ability)
    if (result.hit) {
      enemiesHit++
      totalDamage += result.damage
    }
    if (result.enemyDefeated) {
      enemiesDefeated++
    }
  }

  if (enemiesHit === 0) {
    pushLog('范围内没有命中任何敌人。')
  } else {
    pushLog(`共命中 ${enemiesHit} 个敌人，造成 ${totalDamage} 点总伤害。`)
  }

  // 标记玩家已攻击
  markUnitAttacked(combat, playerUid())

  // 同步玩家 HP
  state.player.hp = combat.player_hp

  // 检查胜负
  const allEnemiesDead = combat.enemies.length > 0 && combat.enemies.every((e) => e.hp <= 0)
  if (allEnemiesDead) {
    pushLog('\n═══ 战斗胜利！═══')
    combat.result = 'victory'
    combat.over = true
    syncAlliesAfterCombat(state, combat)
  }

  return { totalDamage, enemiesHit, enemiesDefeated }
}

/**
 * 手动模式：玩家结束本回合行动
 *
 * 清除等待标记，检查胜负，推进到下一个单位。
 * 这是从"等待玩家操作"状态回到"自动推进"状态的唯一出口。
 *
 * @param state 副本运行时状态
 * @param combat 战斗状态
 * @param playerCtx 玩家战斗上下文
 * @returns 回合结果
 */
export function endPlayerTurn(
  state: DungeonRuntimeState,
  combat: DungeonCombatState,
  _playerCtx: PlayerCombatContext,
): StepRoundResult {
  const newLogs: string[] = []

  combat.waiting_for_player = false

  // 标记玩家已完成行动（即使什么都没做也算结束）
  markUnitMoved(combat, playerUid())
  markUnitAttacked(combat, playerUid())

  // 同步玩家 HP
  state.player.hp = combat.player_hp

  // ==================== 检查胜负 ====================
  if (combat.player_hp <= 0) {
    combat.logs.push('\n你倒下了……')
    combat.result = 'defeat'
    combat.over = true
    state.player.alive = false
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  const allEnemiesDead = combat.enemies.length > 0 && combat.enemies.every((e) => e.hp <= 0)
  if (allEnemiesDead) {
    combat.logs.push('\n═══ 战斗胜利！═══')
    combat.result = 'victory'
    combat.over = true
    syncAlliesAfterCombat(state, combat)
    return {
      combatOver: true,
      playerDamage: 0,
      enemyDamage: 0,
      enemyDefeated: false,
      isCrit: false,
      newLogs,
      currentEnemyIndex: combat.current_enemy_index,
    }
  }

  // 推进到下一个单位
  combat.current_turn_index++

  return {
    combatOver: combat.over,
    playerDamage: 0,
    enemyDamage: 0,
    enemyDefeated: false,
    isCrit: false,
    newLogs,
    currentEnemyIndex: combat.current_enemy_index,
  }
}
