<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { PROFESSIONS, getProfessionById } from '../data/characterCreate'

const store = useGameStore()

const selectedId = ref<string>('player')

interface SquadMember {
  id: string
  name: string
  professionId: string
  gender: string
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  attack: number
  techAttack: number
  fantAttack: number
  abnAttack: number
  speed: number
}

const playerMember = computed<SquadMember>(() => {
  const combat = store.getAdvancedCombatStats()
  return {
    id: 'player',
    name: store.name || '轮回者',
    professionId: store.characterCreation.professionId,
    gender: store.characterCreation.gender || 'male',
    hp: store.getMaxHp(),
    hpMax: store.getMaxHp(),
    mp: store.currentMp,
    mpMax: store.getMaxMp(),
    attack: (combat.technologyAttack || 0) + (combat.fantasyAttack || 0) + (combat.abnormalAttack || 0),
    techAttack: combat.technologyAttack || 0,
    fantAttack: combat.fantasyAttack || 0,
    abnAttack: combat.abnormalAttack || 0,
    speed: store.getSpeed(),
  }
})

const companionMembers = computed<SquadMember[]>(() => {
  return store.getCompanions().map(c => {
    const stats = store.getCompanionCombatStats(c)
    return {
      id: c.id,
      name: c.name,
      professionId: c.professionId,
      gender: 'male',
      hp: stats.hpMax,
      hpMax: stats.hpMax,
      mp: 0,
      mpMax: 0,
      attack: stats.attack,
      techAttack: stats.techAttack,
      fantAttack: stats.fantAttack,
      abnAttack: stats.abnAttack,
      speed: 0,
    }
  })
})

const allMembers = computed<SquadMember[]>(() => [playerMember.value, ...companionMembers.value])

const selectedMember = computed(() => {
  return allMembers.value.find(m => m.id === selectedId.value) || playerMember.value
})

function getPortrait(member: SquadMember): string {
  if (!member.professionId) return '/character/1-1.png'
  const idx = PROFESSIONS.findIndex(p => p.id === member.professionId) + 1
  const g = member.gender === 'female' ? '2' : '1'
  return `/character/${idx}-${g}.png`
}

function getProfIcon(member: SquadMember): string {
  return getProfessionById(member.professionId)?.icon || '?'
}

function getProfName(member: SquadMember): string {
  return getProfessionById(member.professionId)?.name || '未知'
}

function getProfPosition(member: SquadMember): string {
  return getProfessionById(member.professionId)?.position || ''
}

function selectMember(id: string) {
  selectedId.value = id
}

const squadBonus = computed(() => {
  try {
    return (store as any).getSquadBonus ? (store as any).getSquadBonus() : null
  } catch {
    return null
  }
})

// === Lord God Broadcast Terminal ===
const broadcastLog = computed(() => {
  // Use the last 40 entries from the game logs
  return store.logs.slice(-40).reverse()
})

// Simulated broadcast messages for atmosphere
const ambientBroadcasts = [
  { text: '[SYSTEM]: Lord God dimension stabilized.', type: 'info' },
  { text: '[WARNING]: Team Alpha entered Resident Evil zone.', type: 'danger' },
  { text: '[BROADCAST]: New cycle available for entry.', type: 'gold' },
]

// Generate realistic log messages with timestamps
function generateLogMessage(log: { type: string; message: string; timestamp: number }): string {
  const time = formatTime(log.timestamp)
  const typeUpper = log.type.toUpperCase()

  // Map log types to English descriptions
  const typeMap: Record<string, string> = {
    'combat': 'COMBAT',
    'loot': 'LOOT',
    'level': 'LEVEL UP',
    'system': 'SYSTEM',
    'error': 'ERROR',
    'info': 'INFO',
    'warning': 'WARNING',
    'quest': 'QUEST',
    'trade': 'TRADE',
    'dungeon': 'DUNGEON',
    'skill': 'SKILL',
    'bloodline': 'BLOODLINE',
    'equipment': 'EQUIPMENT',
  }

  const logType = typeMap[log.type] || typeUpper

  // Translate common Chinese messages to English
  let message = log.message
    .replace(/获得/g, 'Acquired ')
    .replace(/经验值/g, 'XP')
    .replace(/奖励点/g, 'Reward Points')
    .replace(/等级提升/g, 'Level Up!')
    .replace(/进入/g, 'Entered ')
    .replace(/副本/g, 'Dungeon')
    .replace(/战斗/g, 'Combat')
    .replace(/胜利/g, 'Victory')
    .replace(/失败/g, 'Defeat')
    .replace(/击杀/g, 'Killed ')
    .replace(/发现/g, 'Discovered ')
    .replace(/装备/g, 'Equipment')
    .replace(/技能/g, 'Skill')
    .replace(/血统/g, 'Bloodline')
    .replace(/基因锁/g, 'Gene Lock')
    .replace(/队友/g, 'Teammate')
    .replace(/加入/g, 'joined')
    .replace(/离开/g, 'left')
    .replace(/死亡/g, 'died')
    .replace(/复活/g, 'revived')
    .replace(/完成任务/g, 'Completed quest')
    .replace(/接受任务/g, 'Accepted quest')
    .replace(/出售/g, 'Sold ')
    .replace(/购买/g, 'Purchased ')
    .replace(/金币/g, 'Gold')

  return `[${time}] ${logType}: ${message}`
}

let ambientTimer: ReturnType<typeof setInterval> | null = null
const showAmbient = ref(false)

// ECG wave path — more complex, multi-beat pattern
const ecgPath = 'M0,20 L20,20 L22,18 L24,22 L26,20 L40,20 L42,10 L44,30 L46,5 L48,35 L50,20 L65,20 L67,18 L69,22 L71,20 L85,20 L87,10 L89,30 L91,5 L93,35 L95,20 L110,20 L112,18 L114,22 L116,20 L130,20 L132,10 L134,30 L136,5 L138,35 L140,20 L155,20 L157,18 L159,22 L161,20 L175,20 L177,10 L179,30 L181,5 L183,35 L185,20 L200,20 L202,18 L204,22 L206,20 L220,20'

// Simulated heart rate — fluctuates over time
const heartRate = ref(72)
let hrTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ambientTimer = setInterval(() => {
    showAmbient.value = !showAmbient.value
  }, 8000)
  // Simulate heart rate fluctuation
  hrTimer = setInterval(() => {
    heartRate.value = 68 + Math.floor(Math.random() * 12)
  }, 2000)
})

onUnmounted(() => {
  if (ambientTimer) clearInterval(ambientTimer)
  if (hrTimer) clearInterval(hrTimer)
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<template>
  <aside class="squad-status">
    <!-- Squad Vitals Header -->
    <div class="squad-header">
      <span class="squad-pulse"></span>
      <span class="squad-title">SQUAD VITALS</span>
      <span class="squad-count">{{ allMembers.length }}/4</span>
    </div>

    <div v-if="squadBonus" class="squad-bonus-banner">
      <span class="bonus-icon">✦</span>
      <span class="bonus-text">{{ squadBonus }}</span>
    </div>

    <!-- Squad Member Cards (ICU style) -->
    <div class="squad-list">
      <div
        v-for="member in allMembers"
        :key="member.id"
        class="member-card"
        :class="{ active: selectedId === member.id }"
        @click="selectMember(member.id)"
      >
        <div class="member-portrait">
          <img :src="getPortrait(member)" :alt="member.name" class="portrait-img" />
          <div class="portrait-frame" :class="{ glow: selectedId === member.id }"></div>
          <!-- ECG wave overlay — active ICU monitor -->
          <div class="ecg-monitor">
            <svg class="ecg-overlay" viewBox="0 0 220 40" preserveAspectRatio="none">
              <path :d="ecgPath" class="ecg-line" :class="{ active: selectedId === member.id }" />
            </svg>
            <!-- HR readout -->
            <span class="ecg-hr" :class="{ active: selectedId === member.id }">
              {{ selectedId === member.id ? heartRate : 70 + (member.id.charCodeAt(0) % 10) }} BPM
            </span>
          </div>
        </div>

        <div class="member-body">
          <div class="member-header">
            <span class="member-name">{{ member.name }}</span>
            <span class="member-class">{{ getProfIcon(member) }} {{ getProfName(member) }}</span>
          </div>

          <div class="member-role">{{ getProfPosition(member) }}</div>

          <div class="bar-group">
            <div class="bar-row">
              <span class="bar-label hp-label">HP</span>
              <div class="bar-track">
                <div class="bar-fill hp-fill" :style="{ width: (member.hp / member.hpMax * 100) + '%' }"></div>
              </div>
              <span class="bar-num">{{ member.hp }}/{{ member.hpMax }}</span>
            </div>

            <div v-if="member.mpMax > 0" class="bar-row">
              <span class="bar-label mp-label">MP</span>
              <div class="bar-track">
                <div class="bar-fill mp-fill" :style="{ width: (member.mp / member.mpMax * 100) + '%' }"></div>
              </div>
              <span class="bar-num">{{ member.mp }}/{{ member.mpMax }}</span>
            </div>
          </div>

          <div class="stat-row">
            <span class="stat-chip tech" v-if="member.techAttack">⚙ {{ member.techAttack }}</span>
            <span class="stat-chip fant" v-if="member.fantAttack">✦ {{ member.fantAttack }}</span>
            <span class="stat-chip abn" v-if="member.abnAttack">◈ {{ member.abnAttack }}</span>
          </div>
        </div>
      </div>

      <div v-for="n in (4 - allMembers.length)" :key="'empty-' + n" class="member-card empty-slot">
        <div class="member-portrait empty-portrait">
          <span class="empty-icon">+</span>
        </div>
        <div class="member-body">
          <span class="empty-text">SLOT EMPTY · RECRUIT</span>
        </div>
      </div>
    </div>

    <!-- Lord God Broadcast Terminal -->
    <div class="broadcast-section">
      <div class="broadcast-header">
        <span class="broadcast-dot"></span>
        <span class="broadcast-title">◈ LORD GOD BROADCAST</span>
        <span class="broadcast-rate">{{ broadcastLog.length }}PKTS</span>
      </div>
      <div class="broadcast-terminal refresh-flicker">
        <!-- Terminal scanline -->
        <div class="terminal-scanline"></div>
        <!-- Ambient broadcast -->
        <div v-if="showAmbient && broadcastLog.length < 5" class="broadcast-ambient">
          <div
            v-for="(msg, i) in ambientBroadcasts"
            :key="'ambient-' + i"
            class="broadcast-entry"
            :class="msg.type"
          >{{ msg.text }}</div>
        </div>
        <!-- Real game logs -->
        <div v-else class="broadcast-stream">
          <div
            v-for="(log, i) in broadcastLog"
            :key="log.timestamp + '-' + i"
            class="broadcast-entry"
            :class="log.type"
          >
            <span class="broadcast-text">{{ generateLogMessage(log) }}</span>
          </div>
          <div v-if="broadcastLog.length === 0" class="broadcast-empty">
            [AWAITING DATA...]
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.squad-status {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.squad-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 240, 255, 0.04);
  border-bottom: 1px solid var(--void-border);
}

.squad-pulse {
  width: 6px;
  height: 6px;
  background: var(--neon-red);
  box-shadow: 0 0 6px var(--neon-red);
  animation: heartbeat 1.2s ease-in-out infinite;
  flex-shrink: 0;
}

.squad-title {
  font-family: var(--font-mono);
  font-size: var(--text-header-sm);
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.12em;
  flex: 1;
}

.squad-count {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--void-border);
}

.squad-bonus-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 8px 4px;
  padding: 4px 8px;
  background: rgba(255, 176, 0, 0.04);
  border: 1px solid rgba(255, 176, 0, 0.12);
  clip-path: var(--clip-corner-sm);
}

.bonus-icon {
  color: var(--neon-amber);
  font-size: 16px;
  filter: var(--glow-amber);
}

.bonus-text {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: rgba(255, 176, 0, 0.8);
  line-height: 1.4;
}

.squad-list {
  flex: 0 0 auto;
  overflow-y: visible;
  display: grid;
  grid-template-rows: repeat(4, auto);
  gap: 4px;
  padding: 4px 6px;
}

.squad-list::-webkit-scrollbar { width: 2px; }
.squad-list::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.15); }

.member-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--void-border);
  cursor: pointer;
  transition: all 0.2s var(--ease-fast);
  -webkit-tap-highlight-color: transparent;
  position: relative;
  clip-path: var(--clip-corner-sm);
}

.member-card:hover {
  background: rgba(0, 240, 255, 0.03);
  border-color: var(--void-border-strong);
}

.member-card.active {
  border-color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.04);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.08);
}

.member-card.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--neon-cyan);
  box-shadow: 0 0 6px var(--neon-cyan);
}

.empty-slot {
  opacity: 0.3;
  cursor: default;
  border-style: dashed;
}

.empty-slot:hover { background: rgba(0, 0, 0, 0.3); border-color: var(--void-border); }

.member-portrait {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.portrait-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  display: block;
  filter: contrast(1.1) brightness(0.85);
}

.portrait-frame {
  position: absolute;
  inset: 0;
  border: 1px solid var(--void-border);
  pointer-events: none;
  transition: all 0.3s;
  clip-path: var(--clip-corner-sm);
}

.portrait-frame.glow {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

/* ECG wave overlay — ICU monitor style */
.ecg-monitor {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
}

.ecg-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.ecg-line {
  fill: none;
  stroke: var(--neon-green);
  stroke-width: 1.2;
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  opacity: 0.3;
  transition: opacity 0.3s;
}

.ecg-line.active {
  opacity: 1;
  animation: ecgScroll 2.5s linear infinite;
  filter: drop-shadow(0 0 3px var(--neon-green)) drop-shadow(0 0 6px rgba(57,255,20,0.3));
}

@keyframes ecgScroll {
  0% { stroke-dashoffset: 400; }
  100% { stroke-dashoffset: 0; }
}

/* HR readout */
.ecg-hr {
  position: absolute;
  top: 0;
  right: 2px;
  font-family: var(--font-mono);
  font-size: 7px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.3s;
}

.ecg-hr.active {
  opacity: 0.8;
  color: var(--neon-green);
  text-shadow: 0 0 3px rgba(57,255,20,0.3);
}

.empty-portrait {
  width: 56px;
  height: 56px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.2);
  clip-path: var(--clip-corner-sm);
}

.empty-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.15);
}

.member-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.member-name {
  font-family: var(--font-mono);
  font-size: var(--text-label-sm);
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-class {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--text-muted);
  white-space: nowrap;
}

.member-role {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 2px;
}

.empty-text {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  padding-top: 18px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bar-label {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  font-weight: 700;
  width: 22px;
  text-align: right;
  flex-shrink: 0;
}

.hp-label { color: var(--neon-red); }
.mp-label { color: var(--neon-cyan); }

.bar-track {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  position: relative;
}

.hp-fill { background: linear-gradient(90deg, var(--neon-red), #ff4466); box-shadow: 0 0 3px rgba(255,0,51,0.3); }
.mp-fill { background: linear-gradient(90deg, var(--neon-cyan), #44ddff); box-shadow: 0 0 3px rgba(0,240,255,0.3); }

.bar-num {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}

.stat-chip {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-muted);
  border: 1px solid var(--void-border);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  clip-path: var(--clip-corner-sm);
}

.stat-chip.tech { color: var(--neon-amber); border-color: rgba(255, 176, 0, 0.12); }
.stat-chip.fant { color: var(--neon-cyan); border-color: rgba(0, 240, 255, 0.12); }
.stat-chip.abn { color: var(--neon-purple); border-color: rgba(176, 38, 255, 0.12); }

/* === Broadcast Terminal === */
.broadcast-section {
  flex: 1;
  border-top: 1px solid var(--void-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.broadcast-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(57, 255, 20, 0.03);
  border-bottom: 1px solid var(--void-border);
}

.broadcast-dot {
  width: 5px;
  height: 5px;
  background: var(--neon-green);
  box-shadow: 0 0 4px var(--neon-green);
  animation: heartbeat 2s ease-in-out infinite;
  flex-shrink: 0;
}

.broadcast-title {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--neon-green);
  letter-spacing: 0.1em;
  text-shadow: 0 0 6px rgba(57, 255, 20, 0.3);
  flex: 1;
}

.broadcast-rate {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--text-muted);
  opacity: 0.6;
}

.broadcast-terminal {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  font-family: var(--font-mono);
  position: relative;
}

/* Terminal scanline — sweeping refresh effect */
.terminal-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(57,255,20,0.4), transparent);
  animation: terminalScan 3s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes terminalScan {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.broadcast-terminal::-webkit-scrollbar { width: 2px; }
.broadcast-terminal::-webkit-scrollbar-thumb { background: rgba(57, 255, 20, 0.15); }

.broadcast-stream,
.broadcast-ambient {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.broadcast-entry {
  font-size: var(--text-body-sm);
  line-height: 1.6;
  color: var(--text-secondary);
  display: flex;
  gap: 4px;
  animation: terminalStream 0.4s ease;
}

@keyframes terminalStream {
  0% { opacity: 0; transform: translateY(2px); filter: blur(1px); }
  50% { opacity: 0.7; filter: blur(0.5px); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0); }
}

.broadcast-time {
  color: var(--text-muted);
  flex-shrink: 0;
  opacity: 0.6;
}

.broadcast-text {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.broadcast-entry.success .broadcast-text { color: var(--neon-green); text-shadow: 0 0 2px rgba(57,255,20,0.15); }
.broadcast-entry.warning .broadcast-text { color: var(--neon-amber); }
.broadcast-entry.danger .broadcast-text { color: var(--neon-red); text-shadow: 0 0 2px rgba(255,0,51,0.15); }
.broadcast-entry.info .broadcast-text { color: var(--neon-cyan); }
.broadcast-entry.gold .broadcast-text { color: var(--neon-amber); font-weight: 700; }

.broadcast-empty {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  text-align: center;
  padding: 8px;
  animation: flicker 2s ease-in-out infinite;
}
</style>
