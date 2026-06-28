/**
 * 副本 V2 — TRPG 对话事件 adapter
 *
 * 只在副本局内透传 attributeId 字符串，不依赖属性迁移中的具体类型。
 */

import type {
  CheckOutcomeLevel,
  DialogueEffect,
  DialogueOption,
  DialogueOptionRuntimeState,
  DialogueOptionUsage,
  DialogueOptionVisibility,
  DialogueOutcome,
  DialogueRequirement,
  DungeonDialogueEvent,
  DungeonLogEntry,
  DungeonRuntimeState,
} from '../../types/dungeon-v2'
import { MAX_INFECTION, MAX_SECURITY_ALERT } from '../../config/dungeon-v2'
import { getSkillById, getSkillLevelBonus } from '../../data/skills'
import { getItem } from '../../data/dungeons/biohazard/items'
import { rollSkillCheck } from '../dice'
import { addItem, hasItem, removeItem } from './inventory'
import { changeNpcTrust, findNpcById } from './npc'
import { addLog, completeObjective } from './engine'

export const SKILL_LABELS: Record<string, string> = {
  athletics: '运动',
  investigation: '调查',
  lockpicking: '开锁',
  lore: '学识',
  hacking: '黑客',
  medicine: '医学',
  occult: '神秘',
  animalHandling: '动物沟通',
  empathy: '感受',
  persuasion: '交际',
}

const SKILL_ID_ALIASES: Record<string, string> = {
  knowledge: 'lore',
  mysticism: 'occult',
  animal_handling: 'animalHandling',
  socializing: 'persuasion',
  first_aid: 'medicine',
  intimidation: 'persuasion',
}

const FALLBACK_ATTRIBUTES = [
'intelligence',
'perception',
'resolve',
'strength',
'agility',
'endurance',
'presence',
'manipulation',
'composure',
// 旧属性名（向后兼容）
'reaction',
'spirit',
'vitality',
'immunity',
]

type ComparableValue = string | number | boolean
type DialogueRequirementOperator = '>=' | '<=' | '>' | '<' | '==' | '!='

export interface DialogueCheckResult {
  skillId: string
  skillLabel: string
  attributeId: string
  dp: number
  dice: number[]
  bonusDice: number[]
  skillBonus: number
  successes: number
  dc: number
  level: CheckOutcomeLevel
}

export interface DialogueOptionState {
  visibility: DialogueOptionVisibility
  enabled: boolean
  unmetText?: string
}

export interface DialogueResolveResult {
  optionId: string
  optionLabel: string
  level: CheckOutcomeLevel
  check?: DialogueCheckResult
  outcomeText: string
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  combat_triggered: boolean
  combat_enemy_ids: string[]
  nextEventId?: string
  closeAfter: boolean
  /** 解析后的选项运行时状态（用于 UI 展示和持久化） */
  optionRuntimeState?: DialogueOptionRuntimeState
}

interface DialogueCharacterCompat {
  attributes?: Record<string, number | undefined>
  skills?: Record<string, number | undefined>
  allSkills?: Record<string, number | undefined>
  currentMp?: number
}

interface EffectResult {
  logs: { text: string; type: DungeonLogEntry['type'] }[]
  combat_triggered: boolean
  combat_enemy_ids: string[]
  /** trigger_event 效果指定的后续事件 ID */
  nextEventId?: string
}

function normalizeSkillId(skillId: string): string {
  return SKILL_ID_ALIASES[skillId] ?? skillId
}

export function getSkillLabel(skillId: string): string {
  const normalized = normalizeSkillId(skillId)
  return SKILL_LABELS[normalized] ?? getSkillById(normalized)?.name ?? skillId
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function toDialogueCharacter(value: unknown): DialogueCharacterCompat {
  const record = asRecord(value)
  if (!record) return {}

  const attributes = asRecord(record.attributes)
  const skills = asRecord(record.skills)
  const allSkills = asRecord(record.allSkills)

  return {
    attributes: attributes ? numericRecord(attributes) : undefined,
    skills: skills ? numericRecord(skills) : undefined,
    allSkills: allSkills ? numericRecord(allSkills) : undefined,
    currentMp: typeof record.currentMp === 'number' ? record.currentMp : undefined,
  }
}

function numericRecord(record: Record<string, unknown>): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number') result[key] = value
  }
  return result
}

function getSkillLevel(character: unknown, skillId: string): number {
  const normalized = normalizeSkillId(skillId)
  const compat = toDialogueCharacter(character)
  return compat.skills?.[normalized] ?? compat.allSkills?.[normalized] ?? 0
}

function getAttributeValue(character: unknown, attributeId: string): number {
  const attrs = toDialogueCharacter(character).attributes
  if (!attrs) return 5
  const direct = attrs[attributeId]
  if (typeof direct === 'number') return direct

  for (const fallback of FALLBACK_ATTRIBUTES) {
    const value = attrs[fallback]
    if (typeof value === 'number') return value
  }

  return 5
}

function getDefaultAttributeId(character: unknown, skillId: string): string {
  const normalized = normalizeSkillId(skillId)
  const skill = getSkillById(normalized)
  if (skill?.relatedAttr) return skill.relatedAttr

  const attrs = toDialogueCharacter(character).attributes
  if (attrs) {
    const first = Object.keys(attrs).find((key) => typeof attrs[key] === 'number')
    if (first) return first
  }

  return 'intelligence'
}

export function getCheckOutcomeLevel(
  successCount: number,
  dc: number,
  allowCostlySuccess = false,
): CheckOutcomeLevel {
  if (successCount >= dc + 3) return 'criticalSuccess'
  if (successCount >= dc) return 'success'
  if (successCount === dc - 1 && allowCostlySuccess) return 'costlySuccess'
  return 'failure'
}

export function resolveDialogueCheck(params: {
  character: unknown
  skillId: string
  attributeId?: string
  dc: number
  modifier?: number
  allowCostlySuccess?: boolean
}): DialogueCheckResult {
  const skillId = normalizeSkillId(params.skillId)
  const attributeId = params.attributeId ?? getDefaultAttributeId(params.character, skillId)
  const attrValue = getAttributeValue(params.character, attributeId)
  const skillLevel = getSkillLevel(params.character, skillId)
  const attrDice = Math.max(Math.floor(attrValue / 5), 1)
  const dp = Math.max(1, attrDice + skillLevel + (params.modifier ?? 0))
  const skillBonus = getSkillLevelBonus(skillLevel)
  const result = rollSkillCheck(dp, skillBonus, params.dc)
  const successes = result.total
  const level = getCheckOutcomeLevel(successes, params.dc, params.allowCostlySuccess)

  return {
    skillId,
    skillLabel: getSkillLabel(skillId),
    attributeId,
    dp,
    dice: result.rolls,
    bonusDice: result.bonusRolls,
    skillBonus,
    successes,
    dc: params.dc,
    level,
  }
}

function compareValues(
  actual: ComparableValue | undefined,
  expected: ComparableValue | undefined,
  operator?: DialogueRequirementOperator,
): boolean {
  const op = operator ?? '=='
  if (expected === undefined) return Boolean(actual)

  if (typeof actual === 'number' && typeof expected === 'number') {
    if (op === '>=') return actual >= expected
    if (op === '<=') return actual <= expected
    if (op === '>') return actual > expected
    if (op === '<') return actual < expected
  }

  if (op === '!=') return actual !== expected
  return actual === expected
}

function getRequirementActualValue(
  state: DungeonRuntimeState,
  fallbackValue: string,
  requirementKey: string,
  requirementType: string,
  character?: unknown,
): ComparableValue | undefined {
  switch (requirementType) {
    case 'flag':
      if (requirementKey in state.global) {
        const key = requirementKey as keyof typeof state.global
        const value = state.global[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
      }
      return state.player.flags[requirementKey] ?? state.global.custom[requirementKey]
    case 'item':
      return hasItem(state.player, requirementKey)
    case 'npc_attitude':
      return findNpcById(state.npcs, requirementKey)?.trust
    case 'quest_state':
      return state.quests.find((quest) => quest.id === requirementKey)?.status
    case 'skill_level':
      return getSkillLevel(character, requirementKey)
    case 'turn':
      return state.global.turn_count
    case 'alert':
      return state.global.security_alert
    case 'infection':
      return state.player.infection
    default:
      return fallbackValue
  }
}

export function getDialogueOptionState(params: {
  state: DungeonRuntimeState
  option: DialogueOption
  character?: unknown
}): DialogueOptionState {
  const requirements = params.option.requirements ?? []

  for (const requirement of requirements) {
    const actual = getRequirementActualValue(
      params.state,
      params.option.id,
      requirement.key,
      requirement.type,
      params.character,
    )
    const expected = requirement.value ?? (requirement.type === 'item' ? true : undefined)
    const met = compareValues(actual, expected, requirement.operator)

    if (!met) {
      return {
        visibility: requirement.visibleWhenUnmet ? 'disabled' : 'hidden',
        enabled: false,
        unmetText: requirement.unmetText ?? '条件不满足',
      }
    }
  }

  return { visibility: 'visible', enabled: true }
}

/**
 * 检查可交互对象（Interactable）的条件是否满足
 *
 * 复用与 DialogueOption 相同的条件求值逻辑，
 * 返回可见性状态（visible / disabled / hidden）和 enabled 标记。
 */
export function checkInteractableRequirements(params: {
  state: DungeonRuntimeState
  requirements?: DialogueRequirement[]
  fallbackId?: string
  character?: unknown
}): DialogueOptionState {
  const requirements = params.requirements ?? []
  const fallback = params.fallbackId ?? ''

  for (const requirement of requirements) {
    const actual = getRequirementActualValue(
      params.state,
      fallback,
      requirement.key,
      requirement.type,
      params.character,
    )
    const expected = requirement.value ?? (requirement.type === 'item' ? true : undefined)
    const met = compareValues(actual, expected, requirement.operator)

    if (!met) {
      return {
        visibility: requirement.visibleWhenUnmet ? 'disabled' : 'hidden',
        enabled: false,
        unmetText: requirement.unmetText ?? '条件不满足',
      }
    }
  }

  return { visibility: 'visible', enabled: true }
}

function toNumber(value: string | number | boolean | undefined): number {
  return typeof value === 'number' ? value : 0
}

function toText(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  return String(value)
}

function resolveFlagValue(
  state: DungeonRuntimeState,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (key in state.global && (typeof value === 'boolean' || value === undefined)) {
    const globalKey = key as keyof typeof state.global
    ;(state.global[globalKey] as unknown) = value ?? true
    return
  }

  if (typeof value === 'number' || typeof value === 'string') {
    state.global.custom[key] = value
    return
  }

  state.player.flags[key] = value ?? true
}

export function applyDialogueEffects(
  state: DungeonRuntimeState,
  effects: DialogueEffect[] = [],
): EffectResult {
  const logs: { text: string; type: DungeonLogEntry['type'] }[] = []
  let combatTriggered = false
  const combatEnemyIds: string[] = []
  let nextEventId: string | undefined

  for (const effect of effects) {
    const key = effect.key ?? effect.targetId ?? ''

    switch (effect.type) {
      case 'set_flag':
      case 'add_flag':
        if (key) {
          resolveFlagValue(state, key, effect.value)
          logs.push({ text: `已记录状态：${key}`, type: 'info' })
        }
        break

      case 'remove_flag':
        if (key) {
          if (key in state.global) {
            const globalKey = key as keyof typeof state.global
            ;(state.global[globalKey] as unknown) = false
          }
          state.player.flags[key] = false
          delete state.global.custom[key]
          logs.push({ text: `已移除状态：${key}`, type: 'info' })
        }
        break

      case 'add_item': {
        if (!key) break
        const itemName = addItem(state.player, key)
        logs.push({ text: `获得道具: ${itemName ?? key}`, type: 'success' })
        break
      }

      case 'remove_item': {
        if (!key) break
        const removed = removeItem(state.player, key)
        const itemName = getItem(key)?.name ?? key
        logs.push({ text: removed ? `消耗道具: ${itemName}` : `未找到可消耗道具: ${itemName}`, type: removed ? 'info' : 'warning' })
        break
      }

      case 'modify_alert': {
        const delta = toNumber(effect.value)
        const maxAlert = state.alert_config?.max ?? MAX_SECURITY_ALERT
        state.global.security_alert = Math.max(0, Math.min(maxAlert, state.global.security_alert + delta))
        const sign = delta > 0 ? '+' : ''
        logs.push({ text: `警戒值 ${sign}${delta}（当前: ${state.global.security_alert}）`, type: delta > 0 ? 'warning' : 'success' })
        break
      }

      case 'modify_infection': {
        const delta = toNumber(effect.value)
        state.player.infection = Math.max(0, Math.min(MAX_INFECTION, state.player.infection + delta))
        const sign = delta > 0 ? '+' : ''
        logs.push({ text: `感染值 ${sign}${delta}（当前: ${state.player.infection}）`, type: delta > 0 ? 'warning' : 'success' })
        break
      }

      case 'modify_hp': {
        const delta = toNumber(effect.value)
        state.player.hp = Math.max(0, Math.min(state.player.max_hp, state.player.hp + delta))
        const sign = delta > 0 ? '+' : ''
        logs.push({ text: `HP ${sign}${delta}（当前: ${state.player.hp}/${state.player.max_hp}）`, type: delta > 0 ? 'success' : 'danger' })
        if (state.player.hp <= 0) state.player.alive = false
        break
      }

      case 'modify_mp': {
        const playerWithMp = state.player as typeof state.player & { mp?: number; max_mp?: number }
        if (typeof playerWithMp.mp === 'number') {
          const delta = toNumber(effect.value)
          const maxMp = playerWithMp.max_mp ?? playerWithMp.mp
          playerWithMp.mp = Math.max(0, Math.min(maxMp, playerWithMp.mp + delta))
          const sign = delta > 0 ? '+' : ''
          logs.push({ text: `MP ${sign}${delta}（当前: ${playerWithMp.mp}/${maxMp}）`, type: delta > 0 ? 'success' : 'warning' })
        }
        break
      }

      case 'modify_npc_attitude': {
        if (!effect.targetId) break
        const npc = findNpcById(state.npcs, effect.targetId)
        if (npc && npc.alive) {
          const delta = toNumber(effect.value)
          changeNpcTrust(npc, delta)
          const sign = delta > 0 ? '+' : ''
          logs.push({ text: `${npc.name} 态度 ${sign}${delta}（当前: ${npc.trust}）`, type: delta > 0 ? 'success' : 'warning' })
        }
        break
      }

      case 'start_combat':
        combatTriggered = true
        if (effect.targetId) combatEnemyIds.push(effect.targetId)
        if (effect.key) combatEnemyIds.push(effect.key)
        logs.push({ text: '战斗即将开始。', type: 'danger' })
        break

      case 'unlock_room':
        if (key) {
          state.player.flags[`room_unlocked_${key}`] = true
          logs.push({ text: `路线已解锁: ${key}`, type: 'success' })
        }
        break

      case 'complete_quest': {
        if (!key) break
        const quest = state.quests.find((item) => item.id === key)
        if (quest) {
          quest.status = 'completed'
          for (const objective of quest.objectives) {
            objective.status = 'completed'
          }
          logs.push({ text: `任务完成: ${quest.title}`, type: 'gold' })
        } else {
          completeObjective(state, key)
        }
        break
      }

      case 'advance_quest': {
        if (!key) break
        const quest = state.quests.find((item) => item.id === key)
        if (quest && quest.status === 'locked') {
          quest.status = 'active'
          logs.push({ text: `任务推进: ${quest.title}`, type: 'gold' })
        } else {
          completeObjective(state, key)
        }
        break
      }

      case 'add_log': {
        const text = toText(effect.value) || key
        if (text) logs.push({ text, type: 'info' })
        break
      }

      case 'trigger_event': {
        const targetEventId = toText(effect.value) || key
        if (targetEventId) {
          nextEventId = targetEventId
          logs.push({ text: `触发后续事件: ${targetEventId}`, type: 'info' })
        }
        break
      }
    }
  }

  return { logs, combat_triggered: combatTriggered, combat_enemy_ids: combatEnemyIds, nextEventId }
}

function getDefaultOutcome(level: CheckOutcomeLevel): DialogueOutcome {
  return level === 'failure'
    ? { text: '检定失败。局势没有朝你希望的方向发展。' }
    : { text: '检定成功。你抓住了这次机会。' }
}

function pickOutcome(option: DialogueOption, level: CheckOutcomeLevel): DialogueOutcome {
  if (level === 'criticalSuccess') {
    return option.outcomes.criticalSuccess ?? option.outcomes.success ?? getDefaultOutcome('success')
  }
  if (level === 'costlySuccess') {
    return option.outcomes.costlySuccess ?? option.outcomes.failure ?? getDefaultOutcome('failure')
  }
  if (level === 'success') {
    return option.outcomes.success ?? getDefaultOutcome('success')
  }
  return option.outcomes.failure ?? getDefaultOutcome('failure')
}

function levelLogType(level: CheckOutcomeLevel): DungeonLogEntry['type'] {
  if (level === 'criticalSuccess' || level === 'success') return 'success'
  return 'warning'
}

// ==================== 选项生命周期管理 ====================

/** 构建 flag key 前缀 */
function optionFlagPrefix(eventId: string, optionId: string): string {
  return `dialogue_option:${eventId}:${optionId}`
}

/**
 * 从 dungeon flags 中读取选项运行时状态
 *
 * key 格式：dialogue_option:${eventId}:${optionId}:attempts 等
 */
export function readOptionRuntimeState(
  state: DungeonRuntimeState,
  eventId: string,
  optionId: string,
): DialogueOptionRuntimeState {
  const prefix = optionFlagPrefix(eventId, optionId)
  const flags = state.player.flags
  return {
    attempts: typeof flags[`${prefix}:attempts`] === 'number'
      ? (flags[`${prefix}:attempts`] as unknown as number)
      : 0,
    successes: typeof flags[`${prefix}:successes`] === 'number'
      ? (flags[`${prefix}:successes`] as unknown as number)
      : 0,
    failures: typeof flags[`${prefix}:failures`] === 'number'
      ? (flags[`${prefix}:failures`] as unknown as number)
      : 0,
    consumed: Boolean(flags[`${prefix}:consumed`]),
    disabled: Boolean(flags[`${prefix}:disabled`]),
    hidden: Boolean(flags[`${prefix}:hidden`]),
    lastResult: flags[`${prefix}:lastResult`] as CheckOutcomeLevel | undefined,
  }
}

/** 将选项运行时状态写回 dungeon flags */
export function writeOptionRuntimeState(
  state: DungeonRuntimeState,
  eventId: string,
  optionId: string,
  rt: DialogueOptionRuntimeState,
): void {
  const prefix = optionFlagPrefix(eventId, optionId)
  state.player.flags[`${prefix}:attempts`] = rt.attempts
  state.player.flags[`${prefix}:successes`] = rt.successes
  state.player.flags[`${prefix}:failures`] = rt.failures
  state.player.flags[`${prefix}:consumed`] = rt.consumed
  state.player.flags[`${prefix}:disabled`] = rt.disabled
  state.player.flags[`${prefix}:hidden`] = rt.hidden
  if (rt.lastResult) {
    state.player.flags[`${prefix}:lastResult`] = rt.lastResult
  }
}

/**
 * 根据选项 usage 配置和检定结果，判断选项是否应被消耗
 *
 * 规则：
 * - mode='repeatable' → 不消耗
 * - mode='once' → 选择后消耗
 * - mode='onceOnSuccess' → 成功后消耗
 * - mode='onceOnFailure' → 失败后消耗
 * - mode='limited' → 尝试次数达上限后消耗
 * - destroyOnSelect / destroyOnSuccess / destroyOnFailure 可单独叠加
 */
function shouldConsumeOption(
  usage: DialogueOptionUsage | undefined,
  level: CheckOutcomeLevel,
  attempts: number,
): boolean {
  if (!usage) {
    // 默认行为：有检定 → onceOnSuccess，无检定 → repeatable
    return false
  }

  const mode = usage.mode
  const isSuccess = level === 'success' || level === 'criticalSuccess' || level === 'costlySuccess'
  const isFailure = level === 'failure'

  if (usage.destroyOnSelect) return true
  if (usage.destroyOnSuccess && isSuccess) return true
  if (usage.destroyOnFailure && isFailure) return true

  switch (mode) {
    case 'once':
      return true
    case 'onceOnSuccess':
      return isSuccess
    case 'onceOnFailure':
      return isFailure
    case 'limited':
      return attempts >= (usage.maxAttempts ?? 1)
    case 'repeatable':
    default:
      return false
  }
}

/**
 * 获取选项的默认 usage（无显式配置时）
 *
 * 有检定 → onceOnSuccess
 * 无检定 → repeatable
 */
function getDefaultUsage(option: DialogueOption): DialogueOptionUsage {
  if (option.check) {
    return { mode: 'onceOnSuccess', disableInsteadOfHide: true, usedText: '该选项已使用。' }
  }
  return { mode: 'repeatable' }
}

/**
 * 检查选项是否因生命周期而被消耗/隐藏/禁用
 *
 * 返回值供 UI 决定显示状态。
 */
export function getOptionLifecycleState(params: {
  state: DungeonRuntimeState
  event: DungeonDialogueEvent
  option: DialogueOption
}): { consumed: boolean; hidden: boolean; disabled: boolean; usedText?: string } {
  const rt = readOptionRuntimeState(params.state, params.event.id, params.option.id)
  const usage = params.option.usage ?? getDefaultUsage(params.option)

  if (rt.consumed) {
    if (usage.disableInsteadOfHide) {
      return { consumed: true, hidden: false, disabled: true, usedText: usage.usedText }
    }
    return { consumed: true, hidden: true, disabled: true, usedText: usage.usedText }
  }

  return { consumed: false, hidden: false, disabled: false, usedText: usage.usedText }
}

export function resolveDialogueOption(params: {
  state: DungeonRuntimeState
  event: DungeonDialogueEvent
  optionId: string
  character?: unknown
}): DialogueResolveResult | null {
  const option = params.event.options.find((item) => item.id === params.optionId)
  if (!option) return null

  // ==================== 生命周期检查 ====================
  const usage = option.usage ?? getDefaultUsage(option)
  const rt = readOptionRuntimeState(params.state, params.event.id, option.id)

  // 已消耗 → 不可再选
  if (rt.consumed) {
    return {
      optionId: option.id,
      optionLabel: option.label,
      level: 'failure',
      outcomeText: usage.usedText ?? '该选项已无法再次使用。',
      logs: [{ text: usage.usedText ?? '该选项已无法再次使用。', type: 'warning' }],
      combat_triggered: false,
      combat_enemy_ids: [],
      closeAfter: false,
      optionRuntimeState: rt,
    }
  }

  // 条件检查
  const optionState = getDialogueOptionState({
    state: params.state,
    option,
    character: params.character,
  })

  if (!optionState.enabled) {
    return {
      optionId: option.id,
      optionLabel: option.label,
      level: 'failure',
      outcomeText: optionState.unmetText ?? '条件不满足。',
      logs: [{ text: optionState.unmetText ?? '条件不满足。', type: 'warning' }],
      combat_triggered: false,
      combat_enemy_ids: [],
      closeAfter: false,
      optionRuntimeState: rt,
    }
  }

  // ==================== 执行检定/直接结果 ====================
  let check: DialogueCheckResult | undefined
  let level: CheckOutcomeLevel = 'success'
  let outcome: DialogueOutcome

  if (option.check) {
    check = resolveDialogueCheck({
      character: params.character,
      skillId: option.check.skillId,
      attributeId: option.check.attributeId,
      dc: option.check.dc,
      modifier: option.check.modifier,
      allowCostlySuccess: option.allowCostlySuccess,
    })
    level = check.level
    outcome = pickOutcome(option, level)
  } else {
    outcome = option.directOutcome ?? option.outcomes.success ?? getDefaultOutcome('success')
  }

  const logs: { text: string; type: DungeonLogEntry['type'] }[] = [
    { text: outcome.text, type: levelLogType(level) },
  ]

  for (const line of outcome.log ?? []) {
    logs.push({ text: line, type: 'info' })
  }

  const effectResult = applyDialogueEffects(params.state, outcome.effects)
  logs.push(...effectResult.logs)

  for (const log of logs) {
    addLog(params.state, log.text, log.type)
  }

  // ==================== 更新选项生命周期状态 ====================
  rt.attempts += 1
  rt.lastResult = level
  if (level === 'success' || level === 'criticalSuccess' || level === 'costlySuccess') {
    rt.successes += 1
  } else {
    rt.failures += 1
  }

  const consume = shouldConsumeOption(usage, level, rt.attempts)
  if (consume) {
    rt.consumed = true
    rt.disabled = usage.disableInsteadOfHide ?? false
    rt.hidden = !rt.disabled
  }

  // 持久化到 dungeon flags
  writeOptionRuntimeState(params.state, params.event.id, option.id, rt)

  // ==================== 确定 closeAfter ====================
  // 默认 false（会话式对话不自动关闭）
  // 只有明确 closeAfter: true 或触发战斗才关闭
  const closeAfter = outcome.closeAfter === true || effectResult.combat_triggered

  return {
    optionId: option.id,
    optionLabel: option.label,
    level,
    check,
    outcomeText: outcome.text,
    logs,
    combat_triggered: effectResult.combat_triggered,
    combat_enemy_ids: effectResult.combat_enemy_ids,
    nextEventId: outcome.nextEventId ?? effectResult.nextEventId,
    closeAfter,
    optionRuntimeState: rt,
  }
}
