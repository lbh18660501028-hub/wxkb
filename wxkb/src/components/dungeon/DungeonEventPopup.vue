/**
 * 副本 V2 — 事件 / TRPG 对话弹窗（会话式）
 *
 * 支持两种模式：
 * 1. 会话模式（session 存在）：滚动式对话历史 + 选项生命周期管理
 * 2. 旧版模式（session 不存在）：单次弹窗，兼容旧 EventChoice 事件
 */
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type {
  DialogueOption,
  DialogueSession,
  DungeonDialogueEvent,
  DungeonRuntimeState,
  EventChoice,
  PendingEvent,
} from '../../types/dungeon-v2'
import { checkCondition } from '../../systems/dungeon/events'
import {
  getDialogueOptionState,
  getOptionLifecycleState,
  getSkillLabel,
  type DialogueResolveResult,
} from '../../systems/dungeon/dialogue'

const props = defineProps<{
  event: PendingEvent
  choices: EventChoice[]
  runtimeState: DungeonRuntimeState | null
  character?: unknown
  /** 对话会话（存在时启用会话模式） */
  session?: DialogueSession | null
  /** 当前对话事件（从 session.eventId 查找） */
  currentDialogueEvent?: DungeonDialogueEvent | null
  resolveDialogueOption?: (optionId: string) => DialogueResolveResult | null
}>()

const emit = defineEmits<{
  choose: [choiceId: string]
  dismiss: []
  dialogueComplete: [result: DialogueResolveResult]
  /** 会话模式：选择对话选项 */
  selectOption: [optionId: string]
  /** 会话模式：关闭对话 */
  closeDialogue: []
}>()

// ==================== 旧版模式状态 ====================

const result = ref<DialogueResolveResult | null>(null)

// ==================== 模式判定 ====================

const isSessionMode = computed(() => !!props.session && !!props.currentDialogueEvent)

const dialogueEvent = computed(() => props.currentDialogueEvent ?? props.event.dialogue_event)

const title = computed(() => (
  dialogueEvent.value?.title
  ?? props.event.description
  ?? '事件记录'
))

// ==================== 会话模式：历史滚动 ====================

const historyScroll = ref<HTMLElement | null>(null)

watch(
  () => props.session?.history.length,
  async () => {
    await nextTick()
    if (historyScroll.value) {
      historyScroll.value.scrollTop = historyScroll.value.scrollHeight
    }
  },
)

// ==================== 会话模式：选项状态 ====================

interface OptionDisplay {
  option: DialogueOption
  consumed: boolean
  disabled: boolean
  hidden: boolean
  enabled: boolean
  usedText?: string
  unmetText?: string
  checkBadge: string | null
}

const sessionOptions = computed<OptionDisplay[]>(() => {
  const event = props.currentDialogueEvent
  if (!event || !props.runtimeState) return []

  return event.options
    .map((option) => {
      const lifecycle = getOptionLifecycleState({
        state: props.runtimeState!,
        event,
        option,
      })
      const optionState = getDialogueOptionState({
        state: props.runtimeState!,
        option,
        character: props.character,
      })

      const hidden = lifecycle.hidden || optionState.visibility === 'hidden'
      const enabled = !lifecycle.consumed && !lifecycle.disabled && optionState.enabled

      const checkBadge = option.check
        ? option.check.label ?? `[${getSkillLabel(option.check.skillId)} DC${option.check.dc}]`
        : null

      return {
        option,
        consumed: lifecycle.consumed,
        disabled: lifecycle.disabled || !enabled,
        hidden,
        enabled,
        usedText: lifecycle.usedText,
        unmetText: optionState.unmetText,
        checkBadge,
      }
    })
    .filter((item) => !item.hidden)
})

/** 是否还有可用的选项 */
const hasAvailableOptions = computed(() => sessionOptions.value.some((o) => o.enabled))

// ==================== 旧版模式 ====================

const isDialogueEvent = computed(() => props.event.dialogue_event !== undefined)

const sceneText = computed(() => (
  dialogueEvent.value?.sceneText
  ?? props.event.description
  ?? ''
))

const lines = computed(() => (
  dialogueEvent.value?.lines
  ?? props.event.dialogue
  ?? []
))

const legacyDialogueOptions = computed(() => {
  const event = props.event.dialogue_event
  if (!event || !props.runtimeState) return []

  return event.options
    .map((option) => ({
      option,
      state: getDialogueOptionState({
        state: props.runtimeState!,
        option,
        character: props.character,
      }),
    }))
    .filter((item) => item.state.visibility !== 'hidden')
})

const legacyChoices = computed(() => {
  return props.choices.map((choice) => {
    const enabled = !choice.condition || !props.runtimeState || checkCondition(props.runtimeState, choice.condition)
    return {
      choice,
      enabled,
      unmetText: enabled ? undefined : '条件不满足',
    }
  })
})

watch(
  () => [props.event.event_id, props.event.dialogue_event?.id],
  () => {
    result.value = null
  },
)

function legacyCheckBadge(option: DialogueOption): string | null {
  if (!option.check) return null
  return option.check.label ?? `[${getSkillLabel(option.check.skillId)} DC${option.check.dc}]`
}

function legacyChoiceBadge(choice: EventChoice): string | null {
  if (!choice.skill_check) return null
  const skillId = choice.skill_check.skill_id
  const label = skillId ? getSkillLabel(skillId) : '检定'
  return `[${label} DC${choice.skill_check.dc}]`
}

function outcomeLabel(level: DialogueResolveResult['level']): string {
  const labels: Record<DialogueResolveResult['level'], string> = {
    criticalSuccess: '大成功',
    success: '成功',
    costlySuccess: '代价成功',
    failure: '失败',
  }
  return labels[level]
}

function diceText(value: DialogueResolveResult): string {
  if (!value.check) return ''
  const main = value.check.dice.join(', ') || '无'
  if (value.check.bonusDice.length === 0) return main
  return `${main} / 加骰 ${value.check.bonusDice.join(', ')}`
}

// ==================== 会话模式：操作 ====================

function onSessionOptionClick(opt: OptionDisplay): void {
  if (!opt.enabled) return
  emit('selectOption', opt.option.id)
}

function onSessionClose(): void {
  emit('closeDialogue')
}

// ==================== 旧版模式：操作 ====================

function chooseLegacyDialogueOption(option: DialogueOption, enabled: boolean): void {
  if (!enabled || result.value) return
  const resolved = props.resolveDialogueOption?.(option.id) ?? null
  if (resolved) {
    result.value = resolved
  }
}

function chooseLegacy(choiceId: string, enabled: boolean): void {
  if (!enabled) return
  emit('choose', choiceId)
}

function continueEvent(): void {
  if (result.value) {
    emit('dialogueComplete', result.value)
    return
  }
  emit('dismiss')
}

// ==================== 会话模式：历史条目样式 ====================

function historyEntryClass(entry: DialogueSession['history'][number]): string {
  const base = 'history-entry'
  switch (entry.type) {
    case 'scene':
      return `${base} entry-scene`
    case 'npc_line':
      return `${base} entry-npc`
    case 'player_choice':
      return `${base} entry-player`
    case 'check_result':
      return `${base} entry-check`
    case 'outcome':
      return `${base} entry-outcome`
    case 'system_log':
      return `${base} entry-log`
    default:
      return base
  }
}

function historyEntryLabel(entry: DialogueSession['history'][number]): string {
  switch (entry.type) {
    case 'scene':
      return ''
    case 'npc_line':
      return entry.speaker ?? ''
    case 'player_choice':
      return '▶'
    case 'check_result':
      return '🎲'
    case 'outcome':
      return ''
    case 'system_log':
      return '·'
    default:
      return ''
  }
}

function outcomeLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    criticalSuccess: '大成功',
    success: '成功',
    costlySuccess: '代价成功',
    failure: '失败',
  }
  return labels[level] ?? level
}

function outcomeLevelClass(level: string): string {
  if (level === 'criticalSuccess' || level === 'success') return 'level-success'
  if (level === 'costlySuccess') return 'level-costly'
  return 'level-failure'
}
</script>

<template>
  <!-- ==================== 会话模式 ==================== -->
  <div v-if="isSessionMode" class="event-overlay" @click.self="onSessionClose">
    <div class="event-panel session-panel">
      <!-- 标题栏 -->
      <header class="event-header">
        <div class="event-kicker">DIALOGUE SESSION</div>
        <h2>{{ title }}</h2>
      </header>

      <!-- 说话者信息 -->
      <section v-if="currentDialogueEvent?.speaker" class="speaker-block">
        <div class="portrait">
          <img
            v-if="currentDialogueEvent.speaker.portrait"
            :src="currentDialogueEvent.speaker.portrait"
            :alt="currentDialogueEvent.speaker.name"
          >
          <span v-else>{{ currentDialogueEvent.speaker.name.slice(0, 1) }}</span>
        </div>
        <div class="speaker-meta">
          <div class="speaker-name">{{ currentDialogueEvent.speaker.name }}</div>
          <div v-if="currentDialogueEvent.speaker.attitude" class="speaker-attitude">
            {{ currentDialogueEvent.speaker.attitude }}
          </div>
        </div>
      </section>

      <!-- 滚动式对话历史 -->
      <section ref="historyScroll" class="history-scroll">
        <div
          v-for="entry in session!.history"
          :key="entry.id"
          :class="historyEntryClass(entry)"
        >
          <!-- 场景文本 -->
          <template v-if="entry.type === 'scene'">
            <p class="scene-text">{{ entry.text }}</p>
          </template>

          <!-- NPC 对话行 -->
          <template v-else-if="entry.type === 'npc_line'">
            <div class="entry-speaker">{{ entry.speaker }}</div>
            <div class="entry-text">{{ entry.text }}</div>
          </template>

          <!-- 玩家选择 -->
          <template v-else-if="entry.type === 'player_choice'">
            <div class="entry-label">▶ {{ entry.text }}</div>
          </template>

          <!-- 检定结果 -->
          <template v-else-if="entry.type === 'check_result' && entry.dice">
            <div class="check-result-box">
              <div class="check-row">
                <span class="check-key">检定</span>
                <strong>{{ entry.text }}</strong>
              </div>
              <div class="check-row">
                <span class="check-key">DP</span>
                <strong>{{ entry.dice.dp }}</strong>
              </div>
              <div class="check-row">
                <span class="check-key">骰面</span>
                <strong>{{ entry.dice.dice.join(', ') || '无' }}</strong>
              </div>
              <div class="check-row">
                <span class="check-key">结果</span>
                <strong :class="outcomeLevelClass(entry.dice.level)">
                  {{ outcomeLevelLabel(entry.dice.level) }}
                </strong>
              </div>
            </div>
          </template>

          <!-- 结局文本 -->
          <template v-else-if="entry.type === 'outcome'">
            <p class="outcome-text">{{ entry.text }}</p>
          </template>

          <!-- 系统日志 -->
          <template v-else-if="entry.type === 'system_log'">
            <div class="system-log">{{ entry.text }}</div>
          </template>
        </div>
      </section>

      <!-- 选项列表 -->
      <section v-if="sessionOptions.length > 0" class="choice-list">
        <div class="choice-list-label">
          {{ hasAvailableOptions ? '可选行动' : '所有选项已用尽' }}
        </div>
        <button
          v-for="opt in sessionOptions"
          :key="opt.option.id"
          :class="['choice-btn', { disabled: !opt.enabled, consumed: opt.consumed }]"
          :disabled="!opt.enabled"
          @click="onSessionOptionClick(opt)"
        >
          <span v-if="opt.checkBadge" class="check-badge">{{ opt.checkBadge }}</span>
          <span class="choice-label">{{ opt.option.label }}</span>
          <span v-if="opt.option.description && !opt.consumed" class="choice-desc">{{ opt.option.description }}</span>
          <span v-if="opt.consumed && opt.usedText" class="choice-used">{{ opt.usedText }}</span>
          <span v-if="!opt.consumed && !opt.enabled && opt.unmetText" class="choice-unmet">{{ opt.unmetText }}</span>
        </button>
      </section>

      <!-- 离开按钮 -->
      <footer class="event-footer">
        <button class="leave-btn" @click="onSessionClose">
          离开对话
        </button>
      </footer>
    </div>
  </div>

  <!-- ==================== 旧版模式 ==================== -->
  <div v-else class="event-overlay" @click.self="continueEvent">
    <div class="event-panel">
      <header class="event-header">
        <div class="event-kicker">TRPG EVENT</div>
        <h2>{{ title }}</h2>
      </header>

      <section v-if="sceneText" class="scene-block">
        {{ sceneText }}
      </section>

      <section v-if="dialogueEvent?.speaker" class="speaker-block">
        <div class="portrait">
          <img
            v-if="dialogueEvent.speaker.portrait"
            :src="dialogueEvent.speaker.portrait"
            :alt="dialogueEvent.speaker.name"
          >
          <span v-else>{{ dialogueEvent.speaker.name.slice(0, 1) }}</span>
        </div>
        <div class="speaker-meta">
          <div class="speaker-name">{{ dialogueEvent.speaker.name }}</div>
          <div v-if="dialogueEvent.speaker.attitude" class="speaker-attitude">
            {{ dialogueEvent.speaker.attitude }}
          </div>
        </div>
      </section>

      <section v-if="lines.length > 0" class="dialogue-lines">
        <div
          v-for="(line, idx) in lines"
          :key="idx"
          :class="['dialogue-line', line.emotion ? 'emotion-' + line.emotion : '']"
        >
          <span v-if="line.speaker" class="speaker">{{ line.speaker }}</span>
          <span class="dialogue-text">{{ line.text }}</span>
        </div>
      </section>

      <section v-if="!result" class="choice-list">
        <template v-if="isDialogueEvent">
          <button
            v-for="{ option, state } in legacyDialogueOptions"
            :key="option.id"
            :class="['choice-btn', { disabled: !state.enabled }]"
            :disabled="!state.enabled"
            @click="chooseLegacyDialogueOption(option, state.enabled)"
          >
            <span v-if="legacyCheckBadge(option)" class="check-badge">{{ legacyCheckBadge(option) }}</span>
            <span class="choice-label">{{ option.label }}</span>
            <span v-if="option.description" class="choice-desc">{{ option.description }}</span>
            <span v-if="!state.enabled && state.unmetText" class="choice-unmet">{{ state.unmetText }}</span>
          </button>
        </template>

        <template v-else>
          <button
            v-for="{ choice, enabled, unmetText } in legacyChoices"
            :key="choice.id"
            :class="['choice-btn', { disabled: !enabled }]"
            :disabled="!enabled"
            @click="chooseLegacy(choice.id, enabled)"
          >
            <span v-if="legacyChoiceBadge(choice)" class="check-badge">{{ legacyChoiceBadge(choice) }}</span>
            <span class="choice-label">{{ choice.label }}</span>
            <span v-if="!enabled && unmetText" class="choice-unmet">{{ unmetText }}</span>
          </button>
        </template>
      </section>

      <section v-if="result" class="result-block">
        <div v-if="result.check" class="dice-box">
          <div class="dice-row">
            <span>DP</span>
            <strong>{{ result.check.dp }}</strong>
          </div>
          <div class="dice-row">
            <span>掷骰</span>
            <strong>{{ diceText(result) }}</strong>
          </div>
          <div class="dice-row">
            <span>成功数</span>
            <strong>{{ result.check.successes }} / DC {{ result.check.dc }}</strong>
          </div>
          <div class="dice-row">
            <span>结果</span>
            <strong>{{ outcomeLabel(result.level) }}</strong>
          </div>
        </div>

        <p class="outcome-text">{{ result.outcomeText }}</p>

        <div v-if="result.logs.length > 1" class="result-logs">
          <div
            v-for="(log, idx) in result.logs.slice(1)"
            :key="idx"
            :class="['result-log', 'log-' + log.type]"
          >
            {{ log.text }}
          </div>
        </div>
      </section>

      <footer class="event-footer">
        <button
          v-if="result || (!isDialogueEvent && choices.length === 0)"
          class="continue-btn"
          @click="continueEvent"
        >
          继续
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.event-overlay {
  position: fixed;
  inset: 0;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(4px);
}

.event-panel {
  width: min(680px, 100%);
  max-height: min(86vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #090a12;
  border: 1px solid rgba(0, 200, 255, 0.7);
  border-radius: 8px;
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.16), inset 0 0 30px rgba(0, 200, 255, 0.03);
  color: #d8e8f8;
}

.session-panel {
  max-height: min(90vh, 820px);
}

.event-header {
  flex-shrink: 0;
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.25);
  background: #0d1020;
}

.event-kicker {
  margin-bottom: 4px;
  color: rgba(0, 255, 136, 0.62);
  font: 700 11px/1 'Courier New', monospace;
  letter-spacing: 0;
}

.event-header h2 {
  margin: 0;
  color: #f2fbff;
  font-size: 20px;
  line-height: 1.25;
  letter-spacing: 0;
}

/* ==================== 说话者 ==================== */

.speaker-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(42, 74, 110, 0.42);
  background: rgba(0, 200, 255, 0.05);
}

.portrait {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(0, 200, 255, 0.55);
  border-radius: 6px;
  background: #10182a;
  color: #00e5ff;
  font-weight: 700;
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.speaker-meta {
  min-width: 0;
}

.speaker-name {
  color: #ffd86b;
  font-size: 15px;
  font-weight: 700;
}

.speaker-attitude {
  margin-top: 3px;
  color: #7b9ab8;
  font-size: 12px;
}

/* ==================== 会话模式：历史滚动区 ==================== */

.history-scroll {
  flex: 1 1 auto;
  min-height: 120px;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-scroll::-webkit-scrollbar {
  width: 4px;
}

.history-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.26);
  border-radius: 2px;
}

.history-entry {
  padding-left: 10px;
  border-left: 2px solid transparent;
}

.entry-scene {
  border-left-color: rgba(0, 200, 255, 0.15);
  padding: 8px 12px;
  background: rgba(0, 200, 255, 0.03);
  border-radius: 0 4px 4px 0;
}

.entry-npc {
  border-left-color: rgba(0, 200, 255, 0.3);
}

.entry-player {
  border-left-color: rgba(0, 255, 136, 0.5);
  padding: 6px 12px;
  background: rgba(0, 255, 136, 0.04);
  border-radius: 0 4px 4px 0;
}

.entry-check {
  border-left-color: rgba(255, 215, 0, 0.4);
}

.entry-outcome {
  border-left-color: rgba(0, 200, 255, 0.2);
  padding: 8px 0;
}

.entry-log {
  border-left-color: rgba(123, 154, 184, 0.3);
  opacity: 0.7;
}

.scene-text {
  margin: 0;
  color: #9db8d2;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.entry-speaker {
  color: #ffd86b;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 3px;
}

.entry-text {
  color: #d7d9ef;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.entry-label {
  color: #00ff88;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.check-result-box {
  display: grid;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 4px;
  background: rgba(255, 215, 0, 0.03);
}

.check-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 8px;
  color: #8fb0ca;
  font: 12px/1.4 'Courier New', monospace;
}

.check-row strong {
  color: #dfffea;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.level-success {
  color: #00ff88;
}

.level-costly {
  color: #ffd700;
}

.level-failure {
  color: #ff6b8a;
}

.outcome-text {
  margin: 0;
  color: #f2fbff;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.system-log {
  color: #9db8d2;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* ==================== 选项列表 ==================== */

.choice-list {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 18px 14px;
  border-top: 1px solid rgba(0, 200, 255, 0.25);
  background: #070812;
}

.choice-list-label {
  color: #5a7a9a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.choice-btn {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 8px;
  align-items: center;
  padding: 10px 12px;
  background: #0d1626;
  color: #d8f6ff;
  border: 1px solid rgba(0, 200, 255, 0.33);
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

.choice-btn:hover:not(.disabled) {
  background: #10243a;
  border-color: rgba(0, 220, 255, 0.86);
  box-shadow: 0 0 10px rgba(0, 200, 255, 0.14);
}

.choice-btn.disabled {
  cursor: not-allowed;
  opacity: 0.48;
  filter: grayscale(0.7);
}

.choice-btn.consumed {
  opacity: 0.35;
  filter: grayscale(0.8);
  border-style: dashed;
}

.check-badge {
  grid-column: 1;
  align-self: start;
  color: #00ff88;
  font: 700 12px/1.4 'Courier New', monospace;
  white-space: nowrap;
}

.choice-label {
  grid-column: 2;
  color: #e7f8ff;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.choice-desc,
.choice-unmet,
.choice-used {
  grid-column: 2;
  color: #7694af;
  font-size: 12px;
  line-height: 1.45;
}

.choice-unmet {
  color: #ff8a9f;
}

.choice-used {
  color: #ffd078;
  font-style: italic;
}

/* ==================== 旧版模式样式 ==================== */

.scene-block {
  flex-shrink: 0;
  padding: 14px 18px;
  color: #9db8d2;
  font-size: 14px;
  line-height: 1.7;
  border-bottom: 1px solid rgba(42, 74, 110, 0.55);
  background: #080914;
}

.dialogue-lines {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialogue-lines::-webkit-scrollbar {
  width: 4px;
}

.dialogue-lines::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.26);
  border-radius: 2px;
}

.dialogue-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 10px;
  border-left: 2px solid rgba(0, 200, 255, 0.3);
}

.dialogue-line.emotion-anger,
.dialogue-line.emotion-panic {
  border-left-color: rgba(255, 51, 102, 0.72);
}

.dialogue-line.emotion-trust,
.dialogue-line.emotion-calm {
  border-left-color: rgba(0, 255, 136, 0.72);
}

.speaker {
  color: #ffd86b;
  font-size: 12px;
  font-weight: 700;
}

.dialogue-text {
  color: #d7d9ef;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.result-block {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px;
  border-top: 1px solid rgba(0, 200, 255, 0.25);
  background: #080914;
}

.dice-box {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 255, 136, 0.28);
  border-radius: 6px;
  background: rgba(0, 255, 136, 0.05);
}

.dice-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  color: #8fb0ca;
  font: 12px/1.4 'Courier New', monospace;
}

.dice-row strong {
  color: #dfffea;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.result-logs {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-log {
  color: #9db8d2;
  font-size: 12px;
  line-height: 1.5;
}

.result-log.log-success,
.result-log.log-gold {
  color: #99ffcf;
}

.result-log.log-warning {
  color: #ffd078;
}

.result-log.log-danger {
  color: #ff8a9f;
}

/* ==================== 底部按钮 ==================== */

.event-footer {
  min-height: 48px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  padding: 10px 18px;
  border-top: 1px solid rgba(42, 74, 110, 0.55);
  background: #0d1020;
}

.continue-btn {
  min-width: 96px;
  padding: 9px 18px;
  background: #00c8ff;
  color: #061018;
  border: 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.continue-btn:hover {
  background: #33d8ff;
}

.leave-btn {
  min-width: 96px;
  padding: 9px 18px;
  background: rgba(255, 51, 102, 0.15);
  color: #ff6b8a;
  border: 1px solid rgba(255, 51, 102, 0.4);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.leave-btn:hover {
  background: rgba(255, 51, 102, 0.25);
  border-color: rgba(255, 51, 102, 0.7);
}

@media (max-width: 620px) {
  .event-overlay {
    align-items: flex-end;
    padding: 8px;
  }

  .event-panel {
    max-height: 92vh;
  }

  .event-header,
  .scene-block,
  .speaker-block,
  .history-scroll,
  .dialogue-lines,
  .choice-list,
  .result-block,
  .event-footer {
    padding-left: 12px;
    padding-right: 12px;
  }

  .choice-btn {
    grid-template-columns: 1fr;
  }

  .check-badge,
  .choice-label,
  .choice-desc,
  .choice-unmet,
  .choice-used {
    grid-column: 1;
  }
}
</style>
