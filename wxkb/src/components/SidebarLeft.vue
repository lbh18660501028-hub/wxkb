<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

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

type AttrKey = 'intelligence' | 'spirit' | 'vitality' | 'reaction' | 'strength' | 'immunity'

interface BasicAttr {
  icon: string
  color: string
  label: string
  key: AttrKey
  desc: string
  base: number
  bonus: number
  effect: string
}

const basicAttrs: BasicAttr[] = [
  { icon: '🧠', color: '#b026ff', label: 'INTELLIGENCE', key: 'intelligence',
    desc: 'Affects skill damage, crit chance and XP gain',
    base: 1, bonus: 0, effect: '+1% Crit per point, boosts spell attack' },
  { icon: '◈', color: '#00f0ff', label: 'SPIRIT', key: 'spirit',
    desc: 'Affects fantasy essence attack and willpower',
    base: 1, bonus: 0, effect: '+2 Fantasy ATK, +1 Fantasy DEF, +1 Willpower' },
  { icon: '❤', color: '#ff0033', label: 'VITALITY', key: 'vitality',
    desc: 'Affects max HP and regeneration rate',
    base: 1, bonus: 0, effect: 'HP = Vitality × 10, +5% Regen' },
  { icon: '⚡', color: '#ffb000', label: 'REACTION', key: 'reaction',
    desc: 'Affects speed, accuracy and evasion',
    base: 1, bonus: 0, effect: '+1 Speed, +1% Hit/Evasion, +1 Tech DEF' },
  { icon: '⬆', color: '#ff6b35', label: 'STRENGTH', key: 'strength',
    desc: 'Affects technology essence attack',
    base: 1, bonus: 0, effect: '+2 Technology ATK per point' },
  { icon: '🛡', color: '#39ff14', label: 'IMMUNITY', key: 'immunity',
    desc: 'Affects status resistance and damage reduction',
    base: 1, bonus: 0, effect: '+1% Anti-Crit/Daze/Reduction/Status' },
]

const specialAttrs = [
  { icon: '❤', color: '#ff0033', label: 'MAX HP', key: 'hpMax',
    desc: 'Maximum HP. Death occurs at zero.',
    base: 10, effect: 'Battle fails when HP reaches zero' },
  { icon: '◈', color: '#00f0ff', label: 'WILLPOWER', key: 'willpower',
    desc: 'Resource for willpower-based skills',
    base: 2, effect: 'Used for Gene Lock and special skills' },
  { icon: '⚡', color: '#ffb000', label: 'SPEED', key: 'speed',
    desc: 'Determines action bar growth in combat',
    base: 7, effect: 'Higher speed = faster actions' },
  { icon: '⚖', color: '#8a99aa', label: 'VOLUME', key: 'volume',
    desc: 'Affects HP, speed and evasion',
    base: 5, effect: 'Smaller volume = higher evasion' },
]

function getSpecialValue(key: string): number | string {
  switch(key) {
    case 'hpMax': return store.getMaxHp()
    case 'willpower': return store.getMaxWillpower()
    case 'speed': return store.getSpeed()
    case 'volume': return 5
    default: return 0
  }
}

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

const advancedAttrs = computed(() => {
  const s = store.getAdvancedCombatStats()
  return [
    { icon: '⚙', color: '#ffb000', label: 'TECH ATK', value: s.technologyAttack || 0, desc: 'Base damage for technology essence attacks', effect: 'Affected by Strength, weapon, melee/firearm skills' },
    { icon: '▣', color: '#39ff14', label: 'TECH DEF', value: s.technologyDefense || 0, desc: 'Defense that reduces technology damage', effect: 'Affected by Reaction, Immunity, armor' },
    { icon: '✦', color: '#00f0ff', label: 'FANTASY ATK', value: s.fantasyAttack || 0, desc: 'Base damage for fantasy essence attacks', effect: 'Affected by Spirit, Intelligence, spell skills' },
    { icon: '◇', color: '#b026ff', label: 'FANTASY DEF', value: s.fantasyDefense || 0, desc: 'Defense that reduces fantasy damage', effect: 'Affected by Spirit, Immunity, magic resist gear' },
    { icon: '◈', color: '#b026ff', label: 'ABNORMAL ATK', value: s.abnormalAttack || 0, desc: 'Base damage for abnormal essence attacks', effect: 'Affected by Spirit, Intelligence, abnormal gear' },
    { icon: '◈', color: '#b026ff', label: 'ABNORMAL DEF', value: s.abnormalDefense || 0, desc: 'Defense that reduces abnormal damage', effect: 'Affected by Intelligence, Spirit, Immunity' },
    { icon: '◆', color: '#ffb000', label: 'CRIT RATE', value: fmtPct(s.critRate), desc: 'Chance to deal critical damage on hit', effect: 'Reduced by target Crit Resist' },
    { icon: '✸', color: '#ff0033', label: 'CRIT DMG', value: fmtPct(s.critDamage), desc: 'Damage multiplier when crit triggers', effect: 'Reduced by target Toughness' },
    { icon: '◎', color: '#39ff14', label: 'ACCURACY', value: fmtPct(s.hit), desc: 'Base probability that attacks will hit', effect: 'Final hit rate = Accuracy - Target Evasion' },
    { icon: '◌', color: '#00f0ff', label: 'EVASION', value: fmtPct(s.evasion), desc: 'Reduces enemy hit chance against you', effect: 'Affected by Reaction, evasion skills, Gene Lock, Volume' },
    { icon: '↩', color: '#b026ff', label: 'COUNTER', value: fmtPct(s.counterRate), desc: 'Chance to counter-attack when hit', effect: 'Counter deals reduced damage' },
    { icon: '↯', color: '#ff0033', label: 'REFLECT', value: fmtPct(s.reflectRate), desc: 'Reflects portion of damage to attacker', effect: 'Still take full damage before reflect' },
    { icon: '⇄', color: '#ffb000', label: 'COMBO', value: fmtPct(s.comboRate), desc: 'Chance for bonus half-damage attack', effect: 'Good for high accuracy or high attack builds' },
    { icon: '▤', color: '#39ff14', label: 'CRIT RES', value: fmtPct(s.critResist), desc: 'Reduces enemy crit chance against you', effect: 'Mainly from Immunity and equipment' },
    { icon: '▰', color: '#39ff14', label: 'SHIELD', value: s.shield, desc: 'Temporary HP that absorbs damage first', effect: 'Shield takes damage before HP' },
    { icon: '▱', color: '#39ff14', label: 'SHIELD REG', value: s.shieldRegen, desc: 'Shield recovered per turn', effect: 'Added to shield pool each turn' },
    { icon: '✦', color: '#ff0033', label: 'STUN', value: fmtPct(s.stunRate), desc: 'Chance to stun target on hit', effect: 'Reduced by target Stun Resist' },
    { icon: '◇', color: '#39ff14', label: 'STUN RES', value: fmtPct(s.stunResist), desc: 'Reduces chance of being stunned', effect: 'Mainly from Immunity and equipment' },
    { icon: '❤', color: '#ff0033', label: 'LIFESTEAL', value: fmtPct(s.lifeSteal), desc: 'HP recovered based on damage dealt', effect: 'No recovery if no damage dealt' },
    { icon: '⬇', color: '#39ff14', label: 'DAMAGE RED', value: fmtPct(s.damageReduction), desc: 'Reduces final normal damage taken', effect: 'True damage ignores normal reduction' },
    { icon: '⌖', color: '#ffb000', label: 'PENETRATE', value: s.penetration, desc: 'Ignores fixed defense when attacking', effect: 'Applied before armor break percentage' },
    { icon: '✂', color: '#ff0033', label: 'ARMOR BREAK', value: fmtPct(s.armorBreak), desc: 'Reduces target defense by percentage', effect: 'More effective against high defense' },
    { icon: '▣', color: '#00f0ff', label: 'BLOCK', value: fmtPct(s.blockRate), desc: 'Chance to reduce damage when hit', effect: 'Reduces damage by ~35% when triggered' },
    { icon: '⬢', color: '#8a99aa', label: 'TOUGHNESS', value: fmtPct(s.toughness), desc: 'Reduces crit damage and final damage', effect: 'Defensive stability attribute' },
    { icon: '✹', color: '#ffb000', label: 'TRUE DMG', value: s.trueDamage, desc: 'Bonus true damage after reduction', effect: 'Only blocked by true defense' },
    { icon: '✺', color: '#00f0ff', label: 'TRUE DEF', value: s.trueDefense, desc: 'Blocks enemy true damage', effect: 'Does not affect normal damage' },
  ]
})

const hoverAttr = ref<AttrTooltip | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

function showTooltip(e: MouseEvent, attr: any, type: 'basic' | 'special' | 'advanced') {
  let tooltip: AttrTooltip

  if (type === 'basic') {
    const key = attr.key as keyof typeof store.attributes
    const val = store.attributes[key]
    tooltip = {
      icon: attr.icon,
      color: attr.color,
      label: attr.label,
      value: val,
      desc: attr.desc,
      base: attr.base,
      bonus: val - attr.base,
      effect: attr.effect,
    }
  } else if (type === 'special') {
    const key = attr.key as string
    let val: number | string = 0
    if (key === 'hpMax') val = store.hpMax
    else if (key === 'willpower') val = store.willpower
    else if (key === 'speed') val = store.speed
    else if (key === 'volume') val = 5
    tooltip = {
      icon: attr.icon,
      color: attr.color,
      label: attr.label,
      value: val,
      desc: attr.desc,
      base: attr.base,
      bonus: (typeof val === 'number' ? val : 0) - attr.base,
      effect: attr.effect,
    }
  } else {
    tooltip = {
      icon: attr.icon,
      color: attr.color,
      label: attr.label,
      value: attr.value,
      desc: attr.desc,
      base: 0,
      bonus: typeof attr.value === 'number' ? attr.value : 0,
      effect: attr.effect,
    }
  }

  hoverAttr.value = tooltip
  tooltipPos.value = { x: e.clientX, y: e.clientY }
}

function hideTooltip() {
  hoverAttr.value = null
}

// Gene Lock state
const geneLockTier = computed(() => store.geneLock.tier)
const geneLockActive = computed(() => store.geneLock.active)
const geneLockActiveTier = computed(() => store.geneLock.activeTier)
const maxGeneTier = 5

// Segmented tick bar for basic attributes
function getTickCount(attrKey: AttrKey): number {
  return store.attributes[attrKey]
}

const tickMax = computed(() => store.attributeCap)
</script>

<template>
  <aside class="sidebar-left">
    <!-- Diagnostic Header -->
    <div class="diag-header">
      <span class="diag-pulse"></span>
      <span class="diag-title">BIOMETRIC SCAN</span>
      <span class="diag-id">ID:{{ store.level.toString().padStart(3, '0') }}</span>
    </div>

    <!-- Basic Attributes -->
    <div class="sb-section">
      <div class="sb-header">
        <span class="sb-title">▸ BASIC ATTRIBUTES</span>
        <span class="sb-badge">{{ store.attributeCap }}MAX</span>
      </div>
      <div class="sb-body">
        <div class="attr-list">
          <div v-for="attr in basicAttrs" :key="attr.key" class="attr-row"
            @mouseenter="showTooltip($event, attr, 'basic')" @mouseleave="hideTooltip">
            <div class="attr-main">
              <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
              <span class="attr-label">{{ attr.label }}</span>
              <span class="attr-value" :style="{ color: attr.color }">{{ store.attributes[attr.key] }}</span>
            </div>
            <!-- Segmented tick bar -->
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

    <!-- Special Attributes -->
    <div class="sb-section">
      <div class="sb-header">
        <span class="sb-title">▸ SPECIAL STATS</span>
      </div>
      <div class="sb-body">
        <div class="attr-grid">
          <div v-for="attr in specialAttrs" :key="attr.label" class="attr-box"
            @mouseenter="showTooltip($event, attr, 'special')" @mouseleave="hideTooltip">
            <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
            <span class="attr-label">{{ attr.label }}</span>
            <span class="attr-value" :style="{ color: attr.color }">{{ getSpecialValue(attr.key) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gene Lock Widget -->
    <div class="sb-section gene-lock-section cracked-pattern eldritch-texture">
      <div class="sb-header gene-lock-header">
        <span class="sb-title gene-lock-title">⬡ GENE LOCK</span>
      </div>
      <div class="gene-lock-body">
        <div class="gene-lock-display" :class="{ unlocked: geneLockTier > 0, active: geneLockActive }">
          <div class="gene-lock-icon">
            <!-- Gnarled antique gene lock SVG -->
            <svg v-if="geneLockTier === 0" viewBox="0 0 24 24" class="gene-lock-svg locked">
              <path d="M7,10 L7,7 C7,4 9,2 12,2 C15,2 17,4 17,7 L17,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5,10 L19,10 L19,20 L5,20 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12,13 L12,17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              <!-- Cracked lines -->
              <path d="M8,12 L10,14 L9,17" fill="none" stroke="rgba(255,0,51,0.4)" stroke-width="0.5"/>
              <path d="M15,11 L14,13 L16,16" fill="none" stroke="rgba(255,0,51,0.3)" stroke-width="0.5"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" class="gene-lock-svg unlocked-svg" :class="{ pulsing: geneLockActive }">
              <path d="M7,10 L7,7 C7,4 9,2 12,2 C15,2 17,4 17,7 L17,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5,10 L19,10 L19,20 L5,20 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12,13 L12,17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              <!-- Energy cracks radiating -->
              <path d="M6,11 L4,8 M18,11 L20,8 M12,9 L12,5" fill="none" stroke="rgba(255,0,51,0.6)" stroke-width="0.6"/>
            </svg>
          </div>
          <div class="gene-lock-info">
            <span class="gene-lock-tier">TIER {{ geneLockTier }}/{{ maxGeneTier }}</span>
            <span class="gene-lock-status" :class="{ active: geneLockActive }">
              {{ geneLockActive ? `◆ ACTIVE T${geneLockActiveTier}` : geneLockTier > 0 ? '○ DORMANT' : '○ LOCKED' }}
            </span>
          </div>
        </div>
        <div class="gene-lock-tiers">
          <div
            v-for="t in maxGeneTier"
            :key="t"
            class="gene-tier-pip"
            :class="{ unlocked: t <= geneLockTier, active: geneLockActive && t === geneLockActiveTier }"
          >{{ t }}</div>
        </div>
      </div>
    </div>

    <!-- Advanced Attributes -->
    <div class="sb-section" style="flex:1;">
      <div class="sb-header">
        <span class="sb-title">▸ 进阶属性</span>
      </div>
      <div class="sb-body">
        <div class="attr-grid">
          <div v-for="attr in advancedAttrs" :key="attr.label" class="attr-box"
            @mouseenter="showTooltip($event, attr, 'advanced')" @mouseleave="hideTooltip">
            <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
            <span class="attr-label">{{ attr.label }}</span>
            <span class="attr-value" :style="{ color: attr.color }">{{ attr.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="hoverAttr" class="attr-tooltip" :style="{ left: tooltipPos.x + 12 + 'px', top: tooltipPos.y + 'px' }">
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
          <span class="tt-row-label">属性值合计</span>
          <span class="tt-row-value">{{ hoverAttr.value }}</span>
        </div>
        <div class="tt-effect">{{ hoverAttr.effect }}</div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.diag-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 240, 255, 0.04);
  border-bottom: 1px solid var(--void-border);
}

.diag-pulse {
  width: 6px;
  height: 6px;
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
  animation: heartbeat 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.diag-title {
  font-family: var(--font-mono);
  font-size: var(--text-header-sm);
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.12em;
  flex: 1;
}

.diag-id {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.sb-section {
  border-bottom: 1px solid var(--void-border);
}

.sb-section:last-child {
  border-bottom: none;
}

.sb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: rgba(0, 240, 255, 0.025);
  border-bottom: 1px solid var(--void-border);
}

.sb-title {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sb-badge {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--neon-green);
  padding: 2px 8px;
  background: rgba(57, 255, 20, 0.06);
  border: 1px solid rgba(57, 255, 20, 0.15);
}

.sb-body {
  padding: 6px 10px;
}

/* === Tick bar === */
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

/* === Attr lists === */
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

.attr-row:hover {
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

.attr-box:hover {
  border-color: var(--void-border-strong);
  background: rgba(0, 240, 255, 0.03);
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
}

.attr-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  min-width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  animation: numberTick 4s ease-in-out infinite;
}

/* === Gene Lock Widget === */
.gene-lock-section {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.gene-lock-svg {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
  filter: drop-shadow(0 0 2px rgba(255,0,51,0.2));
}

.gene-lock-svg.locked {
  color: var(--text-muted);
  opacity: 0.5;
}

.gene-lock-svg.unlocked-svg {
  color: var(--neon-red);
  filter: drop-shadow(0 0 4px rgba(255,0,51,0.4));
}

.gene-lock-svg.pulsing {
  animation: heartbeat 1s ease-in-out infinite;
}

.gene-lock-header {
  background: rgba(255, 0, 51, 0.04);
}

.gene-lock-title {
  color: var(--neon-red);
  text-shadow: 0 0 4px rgba(255, 0, 51, 0.2);
}

.gene-lock-body {
  padding: 8px 12px;
}

.gene-lock-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--void-border);
  transition: all 0.3s;
  clip-path: var(--clip-corner-sm);
}

.gene-lock-display.unlocked {
  border-color: rgba(255, 0, 51, 0.3);
}

.gene-lock-display.active {
  border-color: var(--neon-red);
  box-shadow: 0 0 12px rgba(255, 0, 51, 0.2);
  animation: heartbeat 2s ease-in-out infinite;
}

.gene-lock-icon {
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gene-locked {
  filter: grayscale(1);
  opacity: 0.4;
}

.gene-unlocked.pulsing {
  animation: heartbeat 1s ease-in-out infinite;
  filter: drop-shadow(0 0 6px var(--neon-red));
}

.gene-lock-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.gene-lock-tier {
  font-family: var(--font-mono);
  font-size: var(--text-label-sm);
  font-weight: 700;
  color: var(--neon-red);
  letter-spacing: 0.1em;
}

.gene-lock-status {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

.gene-lock-status.active {
  color: var(--neon-red);
  text-shadow: 0 0 6px rgba(255, 0, 51, 0.4);
  animation: flicker 3s linear infinite;
}

.gene-lock-tiers {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  justify-content: center;
}

.gene-tier-pip {
  width: 28px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--void-border);
  color: var(--text-muted);
  clip-path: var(--clip-corner-sm);
  transition: all 0.3s;
}

.gene-tier-pip.unlocked {
  border-color: var(--neon-red);
  color: var(--neon-red);
  background: rgba(255, 0, 51, 0.06);
}

.gene-tier-pip.active {
  background: var(--neon-red);
  color: #000;
  box-shadow: 0 0 8px var(--neon-red);
  animation: heartbeat 1s ease-in-out infinite;
}

/* === Tooltip === */
.attr-tooltip {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
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
}
</style>
