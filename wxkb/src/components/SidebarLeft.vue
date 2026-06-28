<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import SquadStatus from './SquadStatus.vue'

const store = useGameStore()

type AttrKey = 'strength' | 'agility' | 'endurance' | 'intelligence' | 'perception' | 'resolve' | 'presence' | 'manipulation' | 'composure'
type TooltipType = 'basic' | 'special' | 'advanced'

interface AttrTooltip {
  icon: string
  color: string
  label: string
  value: number | string
  desc: string
  base: number
  bonus: number
  effect: string
}

interface BasicAttr {
  icon: string
  color: string
  label: string
  key: AttrKey
  desc: string
  base: number
  effect: string
}

interface SpecialAttr {
  icon: string
  color: string
  label: string
  key: 'hpMax' | 'willpower' | 'speed' | 'volume'
  desc: string
  base: number
  effect: string
}

interface AdvancedAttr {
  icon: string
  color: string
  label: string
  value: number | string
  desc: string
  effect: string
}

const basicAttrs: BasicAttr[] = [
  // 身体属性
  { icon: '💪', color: '#ff6b35', label: '力量', key: 'strength', desc: '影响科技本质攻击力。', base: 1, effect: '提高近战与科技向输出。' },
  { icon: '⚡', color: '#ffb000', label: '敏捷', key: 'agility', desc: '影响速度、命中与闪避。', base: 1, effect: '更快行动，并提高命中/闪避。' },
  { icon: '❤', color: '#ff0033', label: '耐力', key: 'endurance', desc: '决定生命上限与续航能力。', base: 1, effect: '生命越高，生存能力越强。' },
  // 心智属性
  { icon: '🧠', color: '#b026ff', label: '智力', key: 'intelligence', desc: '影响MP上限与法术成长。', base: 1, effect: '提升法术伤害与MP上限。' },
  { icon: '👁', color: '#00c8ff', label: '感知', key: 'perception', desc: '影响暴击率与察觉能力。', base: 1, effect: '提高暴击触发概率。' },
  { icon: '◈', color: '#00f0ff', label: '决心', key: 'resolve', desc: '影响魔幻伤害与意志力。', base: 1, effect: '提高魔幻攻击与意志力。' },
  // 社交属性
  { icon: '✦', color: '#ffd700', label: '风度', key: 'presence', desc: '影响社交压迫与特异伤害。', base: 1, effect: '提升特异本质攻击力。' },
  { icon: '🎭', color: '#ff3366', label: '操控', key: 'manipulation', desc: '影响交际与特异伤害。', base: 1, effect: '提升特异本质攻击力。' },
  { icon: '🛡', color: '#39ff14', label: '沉着', key: 'composure', desc: '影响抗性、减伤与意志力。', base: 1, effect: '更稳地承受控制与持续伤害。' },
]

const specialAttrs: SpecialAttr[] = [
  { icon: '❤', color: '#ff0033', label: '生命上限', key: 'hpMax', desc: '角色当前最大生命值（100 + 耐力×10）。', base: 110, effect: '生命归零时战斗失败。' },
  { icon: '◈', color: '#00f0ff', label: '意志上限', key: 'willpower', desc: '决心+沉着，用于基因锁等特殊判定。', base: 2, effect: '用于副本重试、主动爆发和特殊判定。' },
  { icon: '⚡', color: '#ffb000', label: '基础速度', key: 'speed', desc: '敏捷+沉着，决定行动节奏与先后。', base: 2, effect: '速度越高，出手越快。' },
  { icon: '⬒', color: '#8a99aa', label: '体型', key: 'volume', desc: '影响承伤与部分闪避表现。', base: 5, effect: '体型越小，通常越灵活。' },
]

function getSpecialValue(key: SpecialAttr['key']): number {
  switch (key) {
    case 'hpMax':
      return store.getMaxHp()
    case 'willpower':
      return store.getMaxWillpower()
    case 'speed':
      return store.getSpeed()
    case 'volume':
      return 5
  }
}

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

const advancedAttrs = computed<AdvancedAttr[]>(() => {
  const s = store.getAdvancedCombatStats()
  return [
    { icon: '⚙', color: '#ffb000', label: '科技攻击', value: s.technologyAttack || 0, desc: '科技/物理本质输出基础值。', effect: '受力量、装备与部分技能影响。' },
    { icon: '🧱', color: '#39ff14', label: '科技防御', value: s.technologyDefense || 0, desc: '抵消科技/物理本质伤害。', effect: '受敏捷、沉着与护甲影响。' },
    { icon: '✦', color: '#00f0ff', label: '幻想攻击', value: s.fantasyAttack || 0, desc: '幻想本质输出基础值。', effect: '受决心、智力与技能影响。' },
    { icon: '◉', color: '#b026ff', label: '幻想防御', value: s.fantasyDefense || 0, desc: '抵消幻想本质伤害。', effect: '受决心、沉着与相关装备影响。' },
    { icon: '☍', color: '#b026ff', label: '异常攻击', value: s.abnormalAttack || 0, desc: '异常/特异本质输出基础值。', effect: '偏向特异装备与异常流玩法。' },
    { icon: '⛨', color: '#b026ff', label: '异常防御', value: s.abnormalDefense || 0, desc: '抵消异常/特异本质伤害。', effect: '更稳定地对抗特殊敌人。' },
    { icon: '✹', color: '#ffb000', label: '暴击', value: fmtPct(s.critRate), desc: '触发暴击的概率。', effect: '会被目标抗暴部分抵消。' },
    { icon: '🩸', color: '#ff0033', label: '暴伤', value: fmtPct(s.critDamage), desc: '暴击后追加的伤害倍率。', effect: '高暴击流的核心收益。' },
    { icon: '◎', color: '#39ff14', label: '命中', value: fmtPct(s.hit), desc: '命中目标的基础概率。', effect: '实际命中会与目标闪避对冲。' },
    { icon: '🜁', color: '#00f0ff', label: '闪避', value: fmtPct(s.evasion), desc: '规避攻击的基础概率。', effect: '高敏捷角色收益更明显。' },
    { icon: '↺', color: '#b026ff', label: '反击', value: fmtPct(s.counterRate), desc: '受击后立刻反打的概率。', effect: '适合站桩持续战。' },
    { icon: '↯', color: '#ff0033', label: '反伤', value: fmtPct(s.reflectRate), desc: '把部分承受伤害返还给敌人。', effect: '自身仍会先承受本次伤害。' },
    { icon: '⫸', color: '#ffb000', label: '连击', value: fmtPct(s.comboRate), desc: '命中后追加追击的概率。', effect: '命中越稳，收益越高。' },
    { icon: '⛶', color: '#39ff14', label: '抗暴', value: fmtPct(s.critResist), desc: '降低敌人对你暴击的概率。', effect: '更稳地吃住爆发。' },
    { icon: '⬒', color: '#39ff14', label: '护盾', value: s.shield, desc: '优先承受伤害的额外生命层。', effect: '在生命之前消耗。' },
    { icon: '⬓', color: '#39ff14', label: '回盾', value: s.shieldRegen, desc: '每回合额外恢复的护盾值。', effect: '长期战价值更高。' },
    { icon: '✺', color: '#ff0033', label: '眩晕', value: fmtPct(s.stunRate), desc: '使目标跳过行动的概率。', effect: '会被目标抗晕抵消。' },
    { icon: '🛡', color: '#39ff14', label: '抗晕', value: fmtPct(s.stunResist), desc: '降低被眩晕的概率。', effect: '提高稳定性。' },
    { icon: '🩹', color: '#ff0033', label: '吸血', value: fmtPct(s.lifeSteal), desc: '按造成伤害恢复生命。', effect: '没打出伤害就没有回复。' },
    { icon: '🧷', color: '#39ff14', label: '减伤', value: fmtPct(s.damageReduction), desc: '按比例减少最终普通伤害。', effect: '真实伤害通常不吃普通减伤。' },
    { icon: '⇢', color: '#ffb000', label: '穿透', value: s.penetration, desc: '无视目标固定防御。', effect: '对高防敌人很有价值。' },
    { icon: '⟡', color: '#ff0033', label: '破甲', value: fmtPct(s.armorBreak), desc: '按比例削弱目标防御。', effect: '越打高甲目标越显著。' },
    { icon: '▣', color: '#00f0ff', label: '格挡', value: fmtPct(s.blockRate), desc: '被命中时降低本次伤害的概率。', effect: '触发后本次伤害明显下降。' },
    { icon: '⬣', color: '#8a99aa', label: '韧性', value: fmtPct(s.toughness), desc: '降低暴伤与部分最终伤害。', effect: '偏防御向的稳定属性。' },
    { icon: '✶', color: '#ffb000', label: '真伤', value: s.trueDamage, desc: '结算后追加的真实伤害。', effect: '通常只受真实防御影响。' },
    { icon: '✢', color: '#00f0ff', label: '真防', value: s.trueDefense, desc: '抵消敌人的真实伤害。', effect: '不影响普通物理/幻想伤害。' },
  ]
})

const mergedAttrs = computed(() => {
  const special = specialAttrs.map(attr => ({
    icon: attr.icon,
    color: attr.color,
    label: attr.label,
    value: getSpecialValue(attr.key),
    tooltipType: 'special' as const,
    raw: attr,
  }))

  const advanced = advancedAttrs.value.map(attr => ({
    icon: attr.icon,
    color: attr.color,
    label: attr.label,
    value: attr.value,
    tooltipType: 'advanced' as const,
    raw: attr,
  }))

  return [...special, ...advanced]
})

const basicExpanded = ref(true)
const advancedExpanded = ref(true)
const hoverAttr = ref<AttrTooltip | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

function toggleBasicSection() {
  basicExpanded.value = !basicExpanded.value
}

function toggleAdvancedSection() {
  advancedExpanded.value = !advancedExpanded.value
}

function showTooltip(e: MouseEvent, attr: BasicAttr | SpecialAttr | AdvancedAttr, type: TooltipType) {
  let tooltip: AttrTooltip

  if (type === 'basic') {
    const basic = attr as BasicAttr
    const key = basic.key as AttrKey
    const val = store.attributes[key]
    tooltip = {
      icon: basic.icon,
      color: basic.color,
      label: basic.label,
      value: val,
      desc: basic.desc,
      base: basic.base,
      bonus: val - basic.base,
      effect: basic.effect,
    }
  } else if (type === 'special') {
    const special = attr as SpecialAttr
    const val = getSpecialValue(special.key)
    tooltip = {
      icon: special.icon,
      color: special.color,
      label: special.label,
      value: val,
      desc: special.desc,
      base: special.base,
      bonus: val - special.base,
      effect: special.effect,
    }
  } else {
    const advanced = attr as AdvancedAttr
    tooltip = {
      icon: advanced.icon,
      color: advanced.color,
      label: advanced.label,
      value: advanced.value,
      desc: advanced.desc,
      base: 0,
      bonus: typeof advanced.value === 'number' ? advanced.value : 0,
      effect: advanced.effect,
    }
  }

  hoverAttr.value = tooltip
  tooltipPos.value = { x: e.clientX, y: e.clientY }
}

function hideTooltip() {
  hoverAttr.value = null
}

function getTickCount(attrKey: AttrKey): number {
  return store.attributes[attrKey]
}

const tickMax = computed(() => store.attributeCap)
</script>

<template>
  <aside class="sidebar-left">
    <SquadStatus embedded :show-broadcast="false" />

    <div class="sb-section">
      <div
        class="sb-header sb-header--interactive"
        role="button"
        tabindex="0"
        :aria-expanded="basicExpanded"
        @click="toggleBasicSection"
        @keydown.enter.prevent="toggleBasicSection"
        @keydown.space.prevent="toggleBasicSection"
      >
        <div class="sb-toggle">
          <span class="sb-title">▸ 基础属性</span>
          <span class="sb-header-meta">
            <span class="sb-badge">{{ store.attributeCap }}MAX</span>
            <span class="sb-chevron">{{ basicExpanded ? '▾' : '▸' }}</span>
          </span>
        </div>
      </div>
      <div v-if="basicExpanded" class="sb-body">
        <div class="attr-list">
          <div
            v-for="attr in basicAttrs"
            :key="attr.key"
            class="attr-row"
            @mouseenter="showTooltip($event, attr, 'basic')"
            @mouseleave="hideTooltip"
          >
            <div class="attr-main">
              <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
              <span class="attr-label">{{ attr.label }}</span>
              <span class="attr-value" :style="{ color: attr.color }">{{ store.attributes[attr.key] }}</span>
            </div>
            <div class="tick-bar">
              <div
                v-for="i in tickMax"
                :key="i"
                class="tick"
                :class="{ filled: i <= getTickCount(attr.key) }"
                :style="{ '--tick-color': attr.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sb-section">
      <div
        class="sb-header sb-header--interactive"
        role="button"
        tabindex="0"
        :aria-expanded="advancedExpanded"
        @click="toggleAdvancedSection"
        @keydown.enter.prevent="toggleAdvancedSection"
        @keydown.space.prevent="toggleAdvancedSection"
      >
        <div class="sb-toggle">
          <span class="sb-title">▸ 进阶属性</span>
          <span class="sb-header-meta">
            <span class="sb-chevron">{{ advancedExpanded ? '▾' : '▸' }}</span>
          </span>
        </div>
      </div>
      <div v-if="advancedExpanded" class="sb-body">
        <div class="attr-grid attr-grid-derived">
          <div
            v-for="attr in mergedAttrs"
            :key="attr.label"
            class="attr-box"
            @mouseenter="showTooltip($event, attr.raw, attr.tooltipType)"
            @mouseleave="hideTooltip"
          >
            <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
            <span class="attr-label">{{ attr.label }}</span>
            <span class="attr-value" :style="{ color: attr.color }">{{ attr.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="hoverAttr"
        class="attr-tooltip"
        :style="{ left: tooltipPos.x + 12 + 'px', top: tooltipPos.y + 'px' }"
      >
        <div class="tt-header">
          <span class="tt-icon" :style="{ color: hoverAttr.color }">{{ hoverAttr.icon }}</span>
          <span class="tt-label">{{ hoverAttr.label }}</span>
          <span class="tt-value" :style="{ color: hoverAttr.color }">{{ hoverAttr.value }}</span>
        </div>
        <div class="tt-desc">{{ hoverAttr.desc }}</div>
        <div class="tt-divider"></div>
        <div class="tt-row">
          <span class="tt-row-label">基础</span>
          <span class="tt-row-value">{{ hoverAttr.base }}</span>
        </div>
        <div class="tt-row" v-if="hoverAttr.bonus > 0">
          <span class="tt-row-label">加成</span>
          <span class="tt-row-value tt-bonus">+{{ hoverAttr.bonus }}</span>
        </div>
        <div class="tt-divider"></div>
        <div class="tt-row">
          <span class="tt-row-label">当前值</span>
          <span class="tt-row-value">{{ hoverAttr.value }}</span>
        </div>
        <div class="tt-effect">{{ hoverAttr.effect }}</div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.sb-section {
  border-bottom: 1px solid var(--void-border);
}

.sb-section:last-of-type {
  border-bottom: none;
}

.sb-header {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  background: rgba(0, 240, 255, 0.025);
  border-bottom: 1px solid var(--void-border);
}

.sb-header--interactive {
  cursor: pointer;
}

.sb-header--interactive:focus-visible {
  outline: 1px solid var(--neon-cyan);
  outline-offset: -1px;
}

.sb-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.sb-header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sb-title {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.08em;
}

.sb-badge {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--neon-green);
  padding: 2px 8px;
  background: rgba(57, 255, 20, 0.06);
  border: 1px solid rgba(57, 255, 20, 0.15);
}

.sb-chevron {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1;
  color: var(--neon-cyan);
}

.sb-body {
  padding: 6px 10px;
}

.tick-bar {
  display: flex;
  gap: 2px;
  margin-top: 3px;
  height: 4px;
}

.tick {
  flex: 1;
  height: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.3s;
}

.tick.filled {
  background: var(--tick-color, var(--neon-cyan));
  box-shadow: 0 0 3px var(--tick-color, rgba(0, 240, 255, 0.4));
}

.attr-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.attr-row {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--void-border);
  transition: all 0.2s;
  clip-path: var(--clip-corner-sm);
}

.attr-row:hover,
.attr-box:hover {
  border-color: var(--void-border-strong);
  background: rgba(0, 240, 255, 0.03);
}

.attr-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.attr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}

.attr-grid-derived {
  grid-template-columns: 1fr 1fr;
}

.attr-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--void-border);
  transition: all 0.2s;
  cursor: default;
  clip-path: var(--clip-corner-sm);
}

.attr-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.attr-label {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--text-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attr-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  min-width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.attr-tooltip {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 280px;
  background: rgba(8, 8, 12, 0.98);
  border: 1px solid var(--void-border-strong);
  padding: 10px 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 12px rgba(0, 240, 255, 0.08);
  pointer-events: none;
  clip-path: var(--clip-corner-sm);
}

.tt-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.tt-icon {
  font-size: 16px;
}

.tt-label {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.tt-value {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
}

.tt-desc {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
  line-height: 1.5;
}

.tt-divider {
  height: 1px;
  background: var(--void-border);
  margin: 6px 0;
}

.tt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.tt-row-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.tt-row-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.tt-bonus {
  color: var(--neon-green);
}

.tt-effect {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--neon-cyan);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--void-border);
  line-height: 1.5;
}
</style>
