import {
  COMBAT_CONFIG,
  DAMAGE_TYPE_CONFIG,
  type AdvancedCombatStats,
  type DamageType,
} from '../config/combat'
import { getSkillLevelBonus } from '../data/skills'
import type { StatusEffectType } from '../data/statusEffects'

export interface DiceResult {
  rolls: number[]
  successes: number
  bonusRolls: number[]
  totalSuccesses: number
}

export function rollDice(count: number): DiceResult {
  const rolls: number[] = []
  const bonusRolls: number[] = []
  let successes = 0

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * 10) + 1
    rolls.push(roll)
    if (roll >= 8) successes++
    if (roll === 10) {
      const bonus = Math.floor(Math.random() * 10) + 1
      bonusRolls.push(bonus)
      if (bonus >= 8) successes++
      if (bonus === 10) {
        const bonus2 = Math.floor(Math.random() * 10) + 1
        bonusRolls.push(bonus2)
        if (bonus2 >= 8) successes++
      }
    }
  }

  return {
    rolls,
    successes,
    bonusRolls,
    totalSuccesses: successes,
  }
}

export function getAttrBonus(value: number): number {
  if (value >= 21) return 4
  if (value >= 16) return 3
  if (value >= 11) return 2
  if (value >= 6) return 1
  return 0
}

export function getSkillBonus(level: number): number {
  return getSkillLevelBonus(level)
}

export interface CombatRound {
  playerRolls: DiceResult
  playerDamage: number
  playerHealing: number
  playerHit: boolean
  isCrit: boolean
  playerDamageType: DamageType
  enemyRolls: DiceResult
  enemyDamage: number
  enemyHealing: number
  enemyHit: boolean
  enemyDodgeRolls?: DiceResult
  enemyDodge: boolean
  enemyDamageType: DamageType
  statusEffectsApplied: { type: StatusEffectType; target: 'player' | 'enemy' }[]
  logs: string[]
  /** 先手击杀后跳过了后手的回合 */
  secondAttackSkipped?: boolean
}

type PlayerAttrs = {
  strength: number
  reaction: number
  spirit: number
  intelligence: number
  vitality: number
  immunity: number
}

type PlayerSkills = {
  melee: number
  ranged: number
  dodge: number
}

type LegacyBuffs = Partial<AdvancedCombatStats> & {
  crit?: number
  dodge?: number
  armor?: number
  attack?: number
  weaponAttack?: number
  weaponEssence?: 'technology' | 'fantasy' | 'abnormal'
  attackMode?: 'normal' | 'skill'
  skillCoefficient?: number
  proficiencyBonus?: number
  magicDefense?: number
}

type EnemyInput = Partial<AdvancedCombatStats> & {
  attack: number
  defense: number
  damage: number
  armor: number
  // 旧字段（兼容）
  magicDefense?: number
  physicalAttack?: number
  magicAttack?: number
  physicalDefense?: number
  abnormalAttack?: number
  abnormalDefense?: number
  // 新字段（优先使用）
  technologyAttack?: number
  fantasyAttack?: number
  technologyDefense?: number
  fantasyDefense?: number
}

interface AttackResult {
  damage: number
  healing: number
  hit: boolean
  dodged: boolean
  isCrit: boolean
  statusEffectsApplied: { type: StatusEffectType; target: 'player' | 'enemy' }[]
  logs: string[]
}

const emptyDice: DiceResult = {
  rolls: [],
  successes: 0,
  bonusRolls: [],
  totalSuccesses: 0,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function chance(rate: number): boolean {
  return Math.random() < clamp(rate, 0, 1)
}

function percent(rate: number): string {
  return `${Math.round(clamp(rate, 0, 9.99) * 100)}%`
}

function pick(value: number | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function buildPlayerStats(
  playerAttrs: PlayerAttrs,
  playerSkills: PlayerSkills,
  playerBuffs: LegacyBuffs,
  attackStyle: 'melee' | 'ranged',
): AdvancedCombatStats {
  const attackSkill = attackStyle === 'melee' ? playerSkills.melee : playerSkills.ranged
  const weaponAttack = playerBuffs.weaponAttack || 0
  const skillCoefficient = playerBuffs.attackMode === 'skill' ? Math.max(1, playerBuffs.skillCoefficient || 1) : 1
  const proficiencyBonus = pick(playerBuffs.proficiencyBonus, attackSkill * 2)

  const baseTech = playerBuffs.technologyAttack ?? (8 + playerAttrs.strength * 2)
  const baseFant = playerBuffs.fantasyAttack ?? (6 + playerAttrs.spirit * 3 + playerAttrs.intelligence)
  const baseAbn = playerBuffs.abnormalAttack ?? (6 + playerAttrs.spirit * 2 + playerAttrs.intelligence * 2)

  const techAttack = baseTech * skillCoefficient + weaponAttack + proficiencyBonus
  const fantAttack = baseFant * skillCoefficient + weaponAttack + proficiencyBonus
  const abnAttack = baseAbn * skillCoefficient + weaponAttack + proficiencyBonus

  return {
    technologyAttack: Math.max(0, Math.floor(techAttack)),
    fantasyAttack: Math.max(0, Math.floor(fantAttack)),
    abnormalAttack: Math.max(0, Math.floor(abnAttack)),
    technologyDefense: pick(playerBuffs.technologyDefense, playerAttrs.reaction + Math.floor(playerAttrs.immunity * 0.5)),
    fantasyDefense: pick(playerBuffs.fantasyDefense, playerAttrs.spirit + playerAttrs.immunity),
    abnormalDefense: pick(playerBuffs.abnormalDefense, playerAttrs.intelligence + Math.floor(playerAttrs.spirit * 0.5) + playerAttrs.immunity),
    physicalAttack: 0,
    magicAttack: 0,
    physicalDefense: 0,
    magicDefense: 0,
    critRate: pick(playerBuffs.critRate, playerAttrs.intelligence * 0.01),
    critDamage: pick(playerBuffs.critDamage, COMBAT_CONFIG.CRIT_MULTIPLIER),
    critResist: pick(playerBuffs.critResist, playerAttrs.immunity * 0.01),
    hit: pick(playerBuffs.hit, 0.75 + playerAttrs.reaction * 0.01 + attackSkill * 0.02),
    evasion: pick(playerBuffs.evasion, 0.05 + playerAttrs.reaction * 0.01 + playerSkills.dodge * 0.02),
    counterRate: pick(playerBuffs.counterRate, 0),
    reflectRate: pick(playerBuffs.reflectRate, 0),
    comboRate: pick(playerBuffs.comboRate, 0),
    shield: pick(playerBuffs.shield, 0),
    shieldRegen: pick(playerBuffs.shieldRegen, 0),
    stunRate: pick(playerBuffs.stunRate, 0),
    stunResist: pick(playerBuffs.stunResist, playerAttrs.immunity * 0.01),
    lifeSteal: pick(playerBuffs.lifeSteal, 0),
    damageReduction: pick(playerBuffs.damageReduction, playerAttrs.immunity * 0.01),
    penetration: pick(playerBuffs.penetration, 0),
    armorBreak: pick(playerBuffs.armorBreak, 0),
    blockRate: pick(playerBuffs.blockRate, 0),
    toughness: pick(playerBuffs.toughness, playerAttrs.immunity * 0.01 + playerAttrs.vitality * 0.01),
    trueDamage: pick(playerBuffs.trueDamage, 0),
    trueDefense: pick(playerBuffs.trueDefense, 0),
    speed: pick(playerBuffs.speed, playerAttrs.reaction + playerAttrs.strength + 5),
  }
}

function buildEnemyStats(enemy: EnemyInput): AdvancedCombatStats {
  const defense = enemy.defense || 0
  const armor = enemy.armor || 0
  const attack = enemy.attack || 0
  const damage = enemy.damage || 0

  // 优先读新字段，再读旧字段，最后用默认值
  const techAttack = enemy.technologyAttack ?? enemy.physicalAttack ?? (damage + attack)
  const fantAttack = enemy.fantasyAttack ?? enemy.magicAttack ?? Math.floor(damage * 0.8)
  const abnAttack = enemy.abnormalAttack ?? Math.floor(damage * 0.6)
  const techDefense = enemy.technologyDefense ?? enemy.physicalDefense ?? (armor + defense)
  const fantDefense = enemy.fantasyDefense ?? enemy.magicDefense ?? Math.floor(defense * 0.5)
  const abnDefense = enemy.abnormalDefense ?? Math.floor(defense * 0.3)

  return {
    technologyAttack: techAttack,
    fantasyAttack: fantAttack,
    abnormalAttack: abnAttack,
    technologyDefense: techDefense,
    fantasyDefense: fantDefense,
    abnormalDefense: abnDefense,
    physicalAttack: 0,
    magicAttack: 0,
    physicalDefense: 0,
    magicDefense: 0,
    critRate: pick(enemy.critRate, Math.min(0.35, 0.02 + attack * 0.01)),
    critDamage: pick(enemy.critDamage, 1.35),
    critResist: pick(enemy.critResist, defense * 0.01),
    hit: pick(enemy.hit, Math.min(0.95, 0.62 + attack * 0.01)),
    evasion: pick(enemy.evasion, Math.min(0.55, 0.03 + defense * 0.01)),
    counterRate: pick(enemy.counterRate, 0),
    reflectRate: pick(enemy.reflectRate, 0),
    comboRate: pick(enemy.comboRate, 0),
    shield: pick(enemy.shield, 0),
    shieldRegen: pick(enemy.shieldRegen, 0),
    stunRate: pick(enemy.stunRate, 0),
    stunResist: pick(enemy.stunResist, defense * 0.01),
    lifeSteal: pick(enemy.lifeSteal, 0),
    damageReduction: pick(enemy.damageReduction, Math.min(0.5, defense * 0.01)),
    penetration: pick(enemy.penetration, 0),
    armorBreak: pick(enemy.armorBreak, 0),
    blockRate: pick(enemy.blockRate, Math.min(0.35, defense * 0.01)),
    toughness: pick(enemy.toughness, Math.min(0.35, defense * 0.01)),
    trueDamage: pick(enemy.trueDamage, 0),
    trueDefense: pick(enemy.trueDefense, 0),
    speed: pick(enemy.speed, attack + defense + 5),
  }
}

function getTypedAttack(stats: AdvancedCombatStats, damageType: DamageType): number {
  if (damageType === 'technology' || damageType === 'physical')
    return (stats.technologyAttack ?? 0) || (stats.physicalAttack ?? 0)
  if (damageType === 'fantasy' || damageType === 'magical')
    return (stats.fantasyAttack ?? 0) || (stats.magicAttack ?? 0)
  if (damageType === 'abnormal') return stats.abnormalAttack ?? 0
  // mixed
  const tech = stats.technologyAttack ?? stats.physicalAttack ?? 0
  const fant = stats.fantasyAttack ?? stats.magicAttack ?? 0
  const abn = stats.abnormalAttack ?? 0
  return tech * 0.33 + fant * 0.33 + abn * 0.33
}

function reduceDamagePart(rawDamage: number, defense: number, attacker: AdvancedCombatStats): number {
  const piercedDefense = Math.max(0, defense - attacker.penetration)
  const effectiveDefense = piercedDefense * (1 - clamp(attacker.armorBreak, 0, 0.95))
  return Math.max(0, rawDamage - effectiveDefense)
}

function calculateStrikeDamage(
  attacker: AdvancedCombatStats,
  defender: AdvancedCombatStats,
  damageType: DamageType,
  canCrit: boolean,
  rawMultiplier = 1,
): { damage: number; isCrit: boolean; blocked: boolean; shieldAbsorb: number; truePart: number } {
  const rawDamage = getTypedAttack(attacker, damageType) * rawMultiplier
  let normalDamage = 0

  if (damageType === 'technology' || damageType === 'physical') {
    const def = (defender.technologyDefense ?? 0) || (defender.physicalDefense ?? 0)
    normalDamage = reduceDamagePart(rawDamage, def, attacker)
  } else if (damageType === 'fantasy' || damageType === 'magical') {
    const def = (defender.fantasyDefense ?? 0) || (defender.magicDefense ?? 0)
    normalDamage = reduceDamagePart(rawDamage, def, attacker)
  } else if (damageType === 'abnormal') {
    normalDamage = reduceDamagePart(rawDamage, defender.abnormalDefense ?? 0, attacker)
  } else {
    // mixed: split 1/3 each
    const tech = (defender.technologyDefense ?? 0) || (defender.physicalDefense ?? 0)
    const fant = (defender.fantasyDefense ?? 0) || (defender.magicDefense ?? 0)
    const abn = defender.abnormalDefense ?? 0
    normalDamage =
      reduceDamagePart(rawDamage * 0.33, tech, attacker) +
      reduceDamagePart(rawDamage * 0.33, fant, attacker) +
      reduceDamagePart(rawDamage * 0.33, abn, attacker)
  }

  let isCrit = false
  if (canCrit && chance(attacker.critRate - defender.critResist)) {
    isCrit = true
    const critMultiplier = Math.max(1, attacker.critDamage - defender.toughness)
    normalDamage *= critMultiplier
  }

  let blocked = false
  if (chance(defender.blockRate)) {
    blocked = true
    normalDamage *= 0.65
  }

  normalDamage *= 1 - clamp(defender.damageReduction, 0, 0.9)
  normalDamage *= 1 - clamp(defender.toughness * 0.5, 0, 0.45)

  const truePart = Math.max(0, attacker.trueDamage - defender.trueDefense)
  let totalDamage = normalDamage + truePart

  if (totalDamage > 0 && totalDamage < COMBAT_CONFIG.MIN_DAMAGE) {
    totalDamage = COMBAT_CONFIG.MIN_DAMAGE
  }

  const shieldPool = Math.max(0, defender.shield + defender.shieldRegen)
  const shieldAbsorb = Math.min(totalDamage, shieldPool)
  totalDamage -= shieldAbsorb

  return {
    damage: Math.max(0, Math.floor(totalDamage)),
    isCrit,
    blocked,
    shieldAbsorb: Math.floor(shieldAbsorb),
    truePart: Math.floor(truePart),
  }
}

function resolveAttack(
  attacker: AdvancedCombatStats,
  defender: AdvancedCombatStats,
  damageType: DamageType,
  attackerName: string,
  defenderName: string,
  defenderTarget: 'player' | 'enemy',
  attackLabel = '攻击',
): AttackResult {
  const logs: string[] = []
  const statusEffectsApplied: { type: StatusEffectType; target: 'player' | 'enemy' }[] = []
  const hitChance = clamp(attacker.hit - defender.evasion, 0.05, 0.98)

  logs.push(`${attackerName}发动${attackLabel}（${DAMAGE_TYPE_CONFIG.NAMES[damageType]}），命中率 ${percent(hitChance)}。`)

  if (!chance(hitChance)) {
    logs.push(`${defenderName}闪避了这次攻击。`)
    return { damage: 0, healing: 0, hit: false, dodged: true, isCrit: false, statusEffectsApplied, logs }
  }

  const mainStrike = calculateStrikeDamage(attacker, defender, damageType, true)
  let totalDamage = mainStrike.damage
  let isCrit = mainStrike.isCrit

  if (mainStrike.isCrit) logs.push(`暴击触发，暴击伤害倍率 ${percent(attacker.critDamage)}。`)
  if (mainStrike.blocked) logs.push(`${defenderName}格挡成功，本次伤害降低。`)
  if (mainStrike.truePart > 0) logs.push(`真实伤害追加 ${mainStrike.truePart} 点。`)
  if (mainStrike.shieldAbsorb > 0) logs.push(`${defenderName}护盾抵消 ${mainStrike.shieldAbsorb} 点伤害。`)

  if (totalDamage > 0 && chance(attacker.comboRate)) {
    const comboStrike = calculateStrikeDamage(attacker, defender, damageType, false, 0.5)
    totalDamage += comboStrike.damage
    logs.push(`连击触发，追加 ${comboStrike.damage} 点伤害。`)
  }

  if (totalDamage > 0 && chance(attacker.stunRate - defender.stunResist)) {
    statusEffectsApplied.push({ type: 'stun', target: defenderTarget })
    logs.push(`${defenderName}被眩晕。`)
  }

  const healing = Math.floor(totalDamage * clamp(attacker.lifeSteal, 0, 1))
  if (healing > 0) logs.push(`${attackerName}吸血回复 ${healing} 点生命。`)

  logs.push(`${attackerName}命中，造成 ${totalDamage} 点${DAMAGE_TYPE_CONFIG.NAMES[damageType]}伤害。`)
  return { damage: totalDamage, healing, hit: true, dodged: false, isCrit, statusEffectsApplied, logs }
}

function calculateCounterDamage(attacker: AdvancedCombatStats, defender: AdvancedCombatStats, damageType: DamageType): number {
  const strike = calculateStrikeDamage(attacker, defender, damageType, false, 0.35)
  return strike.damage
}

function createRound(
  playerAttrs: PlayerAttrs,
  playerSkills: PlayerSkills,
  enemy: EnemyInput,
  playerBuffs: LegacyBuffs,
  playerDamageType: DamageType,
  enemyDamageType: DamageType,
  attackStyle: 'melee' | 'ranged',
  playerCurrentHp?: number,
  enemyCurrentHp?: number,
): CombatRound {
  const logs: string[] = []
  const statusEffectsApplied: { type: StatusEffectType; target: 'player' | 'enemy' }[] = []
  const playerStats = buildPlayerStats(playerAttrs, playerSkills, playerBuffs, attackStyle)
  const enemyStats = buildEnemyStats(enemy)
  const playerAttackLabel = playerBuffs.attackMode === 'skill' ? '技能攻击' : '普通攻击'

  // Use weapon essence directly as damage type
  const effectivePlayerDamageType: DamageType = playerBuffs.weaponEssence || playerDamageType

  // Speed-based first strike: faster character attacks first
  const playerSpeed = playerStats.speed
  const enemySpeed = enemyStats.speed
  const playerFirst = playerSpeed >= enemySpeed

  if (playerFirst) {
    logs.push(`你的速度(${playerSpeed})高于敌人(${enemySpeed})，你先手。`)
  } else {
    logs.push(`敌人的速度(${enemySpeed})高于你(${playerSpeed})，敌人先手。`)
  }

  // --- First attacker ---
  const firstAttack = playerFirst
    ? resolveAttack(playerStats, enemyStats, effectivePlayerDamageType, '你', '敌人', 'enemy', playerAttackLabel)
    : resolveAttack(enemyStats, playerStats, enemyDamageType, '敌人', '你', 'player', '普通攻击')

  const firstAttackerIsPlayer = playerFirst
  let playerDamage = firstAttackerIsPlayer ? firstAttack.damage : 0
  let playerHealing = firstAttackerIsPlayer ? firstAttack.healing : 0
  let enemyDamage = firstAttackerIsPlayer ? 0 : firstAttack.damage
  let enemyHealing = firstAttackerIsPlayer ? 0 : firstAttack.healing

  logs.push(...firstAttack.logs)
  statusEffectsApplied.push(...firstAttack.statusEffectsApplied)

  // Reflect from first attack
  if (firstAttack.damage > 0 && firstAttackerIsPlayer) {
    if (enemyStats.reflectRate > 0) {
      const reflected = Math.floor(firstAttack.damage * enemyStats.reflectRate)
      enemyDamage += reflected
      if (reflected > 0) logs.push(`敌人反伤，你受到 ${reflected} 点伤害。`)
    }
    // Counter after being attacked
    if (firstAttack.hit && chance(enemyStats.counterRate)) {
      const counterDamage = calculateCounterDamage(enemyStats, playerStats, enemyDamageType)
      enemyDamage += counterDamage
      logs.push(`敌人反击，造成 ${counterDamage} 点伤害。`)
    }
  } else if (firstAttack.damage > 0 && !firstAttackerIsPlayer) {
    if (playerStats.reflectRate > 0) {
      const reflected = Math.floor(firstAttack.damage * playerStats.reflectRate)
      playerDamage += reflected
      if (reflected > 0) logs.push(`你的反伤造成 ${reflected} 点伤害。`)
    }
    if (firstAttack.hit && chance(playerStats.counterRate)) {
      const counterDamage = calculateCounterDamage(playerStats, enemyStats, effectivePlayerDamageType)
      playerDamage += counterDamage
      logs.push(`你触发反击，追加 ${counterDamage} 点伤害。`)
    }
  }

  // --- Second attacker (skip if first attack killed the target) ---
  let secondAttackSkipped = false
  const firstAttackerDied = (firstAttackerIsPlayer && playerCurrentHp !== undefined && playerDamage >= playerCurrentHp)
    || (!firstAttackerIsPlayer && enemyCurrentHp !== undefined && enemyDamage >= enemyCurrentHp)

  if (!firstAttackerDied) {
    const secondAttack = playerFirst
      ? resolveAttack(enemyStats, playerStats, enemyDamageType, '敌人', '你', 'player', '普通攻击')
      : resolveAttack(playerStats, enemyStats, effectivePlayerDamageType, '你', '敌人', 'enemy', playerAttackLabel)

    const secondAttackerIsPlayer = !playerFirst
    if (secondAttackerIsPlayer) {
      playerDamage += secondAttack.damage
      playerHealing += secondAttack.healing
    } else {
      enemyDamage += secondAttack.damage
      enemyHealing += secondAttack.healing
    }

    logs.push(...secondAttack.logs)
    statusEffectsApplied.push(...secondAttack.statusEffectsApplied)

    // Reflect from second attack
    if (secondAttack.damage > 0 && secondAttackerIsPlayer) {
      if (enemyStats.reflectRate > 0) {
        const reflected = Math.floor(secondAttack.damage * enemyStats.reflectRate)
        enemyDamage += reflected
        if (reflected > 0) logs.push(`敌人反伤，你受到 ${reflected} 点伤害。`)
      }
      if (secondAttack.hit && chance(enemyStats.counterRate)) {
        const counterDamage = calculateCounterDamage(enemyStats, playerStats, enemyDamageType)
        enemyDamage += counterDamage
        logs.push(`敌人反击，造成 ${counterDamage} 点伤害。`)
      }
    } else if (secondAttack.damage > 0 && !secondAttackerIsPlayer) {
      if (playerStats.reflectRate > 0) {
        const reflected = Math.floor(secondAttack.damage * playerStats.reflectRate)
        playerDamage += reflected
        if (reflected > 0) logs.push(`你的反伤造成 ${reflected} 点伤害。`)
      }
      if (secondAttack.hit && chance(playerStats.counterRate)) {
        const counterDamage = calculateCounterDamage(playerStats, enemyStats, effectivePlayerDamageType)
        playerDamage += counterDamage
        logs.push(`你触发反击，追加 ${counterDamage} 点伤害。`)
      }
    }
  } else {
    secondAttackSkipped = true
    const killedName = firstAttackerIsPlayer ? '敌人' : '你'
    logs.push(`${killedName}在先手回合已被击杀，本回合战斗结束。`)
  }

  return {
    playerRolls: emptyDice,
    playerDamage,
    playerHealing,
    playerHit: playerDamage > 0,
    isCrit: playerFirst ? firstAttack.isCrit : false,
    playerDamageType: effectivePlayerDamageType,
    enemyRolls: emptyDice,
    enemyDamage,
    enemyHealing,
    enemyHit: enemyDamage > 0,
    enemyDodgeRolls: emptyDice,
    enemyDodge: false,
    enemyDamageType,
    statusEffectsApplied,
    logs,
    secondAttackSkipped,
  }
}

export function simulateCombatRound(
  playerAttrs: PlayerAttrs,
  playerSkills: PlayerSkills,
  enemy: EnemyInput,
  playerBuffs: LegacyBuffs = { crit: 0, dodge: 0, armor: 0, magicDefense: 0 },
  playerDamageType: DamageType = 'physical',
  enemyDamageType: DamageType = 'physical',
  playerCurrentHp?: number,
  enemyCurrentHp?: number,
): CombatRound {
  return createRound(playerAttrs, playerSkills, enemy, playerBuffs, playerDamageType, enemyDamageType, 'ranged', playerCurrentHp, enemyCurrentHp)
}

export function simulateMeleeCombat(
  playerAttrs: PlayerAttrs,
  playerSkills: PlayerSkills,
  enemy: EnemyInput,
  playerBuffs: LegacyBuffs = { crit: 0, dodge: 0, armor: 0, magicDefense: 0 },
  playerDamageType: DamageType = 'physical',
  enemyDamageType: DamageType = 'physical',
  playerCurrentHp?: number,
  enemyCurrentHp?: number,
): CombatRound {
  return createRound(playerAttrs, playerSkills, enemy, playerBuffs, playerDamageType, enemyDamageType, 'melee', playerCurrentHp, enemyCurrentHp)
}

export function rollSkillCheck(
  attrValue: number,
  skillValue: number,
  dc: number,
): { success: boolean; rolls: number[]; bonusRolls: number[]; total: number; dc: number } {
  const dp = attrValue + skillValue
  const result = rollDice(dp)
  const attrBonus = getAttrBonus(attrValue)
  const skillBonus = getSkillBonus(skillValue)
  const total = result.totalSuccesses + attrBonus + skillBonus

  return {
    success: total >= dc,
    rolls: result.rolls,
    bonusRolls: result.bonusRolls,
    total,
    dc,
  }
}
