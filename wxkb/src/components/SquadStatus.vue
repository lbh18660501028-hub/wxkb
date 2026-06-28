<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/game'
import { PROFESSIONS, getProfessionById } from '../data/characterCreate'

const store = useGameStore()
const props = withDefaults(defineProps<{ embedded?: boolean; showVitals?: boolean; showBroadcast?: boolean }>(), {
  embedded: false,
  showVitals: true,
  showBroadcast: true,
})

const selectedId = ref<string>('char_main')

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

/** 缁熶竴瑙掕壊鍒楄〃 鈥?涓昏鍜岄槦鍙嬩娇鐢ㄥ悓涓€鏁版嵁婧?*/
const allMembers = computed<SquadMember[]>(() => {
  return store.getCharacters().map((char, index) => {
    const stats = store.getCharacterCombatStats(index)
    return {
      id: char.id,
      name: char.name,
      professionId: char.professionId,
      gender: char.gender || 'male',
      hp: stats.hpMax,
      hpMax: stats.hpMax,
      mp: char.currentMp,
      mpMax: stats.mpMax,
      attack: stats.attack,
      techAttack: stats.techAttack,
      fantAttack: stats.fantAttack,
      abnAttack: stats.abnAttack,
      speed: store.getCharacterSpeed(index),
    }
  })
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

function selectMember(id: string) {
  selectedId.value = id
}

function getPortraitStyle(member: SquadMember): { objectPosition: string; transform: string } {
  const portraitFocus: Record<string, { x: number; y: number; scale: number }> = {
    captain: { x: 52, y: 8, scale: 3.08 },
    smoker: { x: 50, y: 7, scale: 3 },
    colonel: { x: 51, y: 8, scale: 3.06 },
    prophet: { x: 51, y: 6, scale: 3.14 },
    assassin: { x: 50, y: 6, scale: 3.24 },
    writer: { x: 51, y: 6, scale: 3.12 },
    killer: { x: 52, y: 7, scale: 3.02 },
    bow: { x: 52, y: 7, scale: 3.02 },
    medic: { x: 50, y: 6, scale: 3.18 },
    cannon: { x: 52, y: 8, scale: 2.94 },
    wolf: { x: 51, y: 7, scale: 3.04 },
    archaeologist: { x: 50, y: 6, scale: 3.16 },
    ranger: { x: 50, y: 6, scale: 3.16 },
  }

  const focus = portraitFocus[member.professionId] ?? { x: 51, y: 7, scale: 3.08 }
  return {
    objectPosition: `${focus.x}% ${focus.y}%`,
    transform: `scale(${focus.scale})`,
  }
}

// === Lord God Broadcast Terminal ===
const broadcastLog = computed(() => {
  // Use the last 40 entries from the game logs
  return store.logs.slice(-40)
})

// Auto-scroll broadcast to bottom
const broadcastTerminalRef = ref<HTMLDivElement | null>(null)

function scrollBroadcastToBottom(): void {
  nextTick(() => {
    if (broadcastTerminalRef.value) {
      broadcastTerminalRef.value.scrollTop = broadcastTerminalRef.value.scrollHeight
    }
  })
}

watch(
  () => [
    broadcastLog.value.length,
    broadcastLog.value[broadcastLog.value.length - 1]?.timestamp ?? null,
  ],
  () => {
    scrollBroadcastToBottom()
  },
  { flush: 'post', immediate: true },
)

// Simulated broadcast messages for atmosphere
const ambientBroadcasts = [
  { text: '[SYSTEM]: dimensional anchor stable', type: 'info' },
  { text: '[WARNING]: Alpha squad entered biohazard sector', type: 'danger' },
  { text: '[BROADCAST]: new reincarnation instance opened', type: 'gold' },
]

let ambientTimer: ReturnType<typeof setInterval> | null = null
const showAmbient = ref(false)

watch(showAmbient, () => {
  scrollBroadcastToBottom()
}, { flush: 'post' })

onMounted(() => {
  ambientTimer = setInterval(() => {
    showAmbient.value = !showAmbient.value
  }, 8000)
})

onUnmounted(() => {
  if (ambientTimer) clearInterval(ambientTimer)
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<template>
  <aside
    class="squad-status"
    :class="{
      embedded: props.embedded,
      'broadcast-only': !props.showVitals && props.showBroadcast,
      'vitals-only': props.showVitals && !props.showBroadcast,
    }"
  >
    <!-- Squad Vitals Header -->
    <div v-if="props.showVitals" class="squad-header">
      <span class="squad-pulse"></span>
      <span class="squad-title">小队生命体征</span>
      <span class="squad-count">{{ allMembers.length }}/4</span>
    </div>

    <!-- Squad Member Cards -->
    <div v-if="props.showVitals" class="squad-list">
      <div
        v-for="member in allMembers"
        :key="member.id"
        class="member-card"
        :class="{ active: selectedId === member.id }"
        @click="selectMember(member.id)"
      >
        <div class="member-portrait">
          <img :src="getPortrait(member)" :alt="member.name" class="portrait-img" :style="getPortraitStyle(member)" />
          <div class="portrait-ecg" :class="{ active: selectedId === member.id }">
            <span class="ecg-dot"></span>
            <svg viewBox="0 0 64 12" class="ecg-line" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 7 H10 L14 7 L17 4 L20 10 L24 2 L28 8 L34 7 H64" />
            </svg>
          </div>
          <div class="portrait-frame" :class="{ glow: selectedId === member.id }"></div>
        </div>

        <div class="member-body">
          <div class="member-header">
            <span class="member-class">{{ getProfIcon(member) }} {{ getProfName(member) }}</span>
            <span class="member-name">{{ member.name }}</span>
          </div>

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
        </div>
      </div>

      <div v-for="n in (4 - allMembers.length)" :key="'empty-' + n" class="member-card empty-slot">
        <div class="member-portrait empty-portrait">
          <span class="empty-icon">+</span>
        </div>
        <div class="member-body">
          <span class="empty-text">空位</span>
        </div>
      </div>
    </div>

    <!-- Lord God Broadcast Terminal -->
    <div v-if="props.showBroadcast" class="broadcast-section">
      <div class="broadcast-header">
        <span class="broadcast-dot"></span>
        <span class="broadcast-title">◈ 主神广播</span>
        <span class="broadcast-rate">{{ broadcastLog.length }}PKTS</span>
      </div>
      <div ref="broadcastTerminalRef" class="broadcast-terminal refresh-flicker">
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
            <span class="broadcast-time">{{ formatTime(log.timestamp) }}</span>
            <span class="broadcast-text">{{ log.text }}</span>
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
  width: 256px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.squad-status.embedded {
  width: 100%;
  height: auto;
  min-height: 0;
  border-top: 1px solid var(--void-border);
  background: rgba(8, 10, 14, 0.92);
}

.squad-status.broadcast-only {
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 14, 0.95);
}

.squad-status.vitals-only .broadcast-section {
  display: none;
}

.squad-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  background: rgba(0, 240, 255, 0.035);
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
  font-size: 12px;
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.08em;
  flex: 1;
}

.squad-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding: 1px 5px;
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
  gap: 1px;
  padding: 2px 4px 4px;
}

.squad-list::-webkit-scrollbar { width: 2px; }
.squad-list::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.15); }

.member-card {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 72px;
  padding: 5px;
  background: rgba(0, 0, 0, 0.38);
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
  background: rgba(0, 240, 255, 0.045);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.07);
}

.member-card.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
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
  width: 66px;
  height: 66px;
  flex-shrink: 0;
  overflow: hidden;
  clip-path: var(--clip-corner-sm);
  background: rgba(0, 0, 0, 0.45);
}

.portrait-ecg {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  height: 12px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 3px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.2));
  border: 1px solid rgba(57, 255, 20, 0.16);
  border-radius: 2px;
  z-index: 2;
  overflow: hidden;
}

.portrait-ecg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(57, 255, 20, 0.12), transparent);
  transform: translateX(-100%);
  animation: ecgSweep 2.4s linear infinite;
}

.portrait-ecg.active {
  border-color: rgba(57, 255, 20, 0.28);
  box-shadow: 0 0 8px rgba(57, 255, 20, 0.14);
}

.ecg-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--neon-green);
  box-shadow: 0 0 5px rgba(57, 255, 20, 0.75);
  flex-shrink: 0;
  animation: ecgBlink 1.2s ease-in-out infinite;
}

.ecg-line {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.ecg-line path {
  fill: none;
  stroke: rgba(57, 255, 20, 0.9);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(57, 255, 20, 0.45));
  stroke-dasharray: 70;
  stroke-dashoffset: 70;
  animation: ecgPulse 1.8s linear infinite;
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: contrast(1.14) brightness(0.88);
  transform-origin: center top;
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
  box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.16), 0 0 8px rgba(0, 240, 255, 0.14);
}

.empty-portrait {
  width: 66px;
  height: 66px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.2);
  clip-path: var(--clip-corner-sm);
}

.empty-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.15);
}

.member-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.member-header {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.member-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.member-class {
  font-family: var(--font-mono);
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}

.empty-text {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  padding-top: 17px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.bar-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  width: 16px;
  text-align: right;
  flex-shrink: 0;
}

.hp-label { color: var(--neon-red); }
.mp-label { color: var(--neon-cyan); }

.bar-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.03);
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 100%, 0 100%);
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
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 50px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* === Broadcast Terminal === */
.broadcast-section {
  flex: 1;
  border-top: 1px solid var(--void-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.squad-status.embedded .broadcast-section {
  flex: 0 0 auto;
}

.squad-status.broadcast-only .broadcast-section {
  flex: 1;
  border-top: none;
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

.squad-status.embedded .broadcast-terminal {
  height: 168px;
  flex: 0 0 auto;
}

.squad-status.broadcast-only .broadcast-terminal {
  height: auto;
  flex: 1;
}

/* Terminal scanline 鈥?sweeping refresh effect */
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

@keyframes ecgPulse {
  0% { stroke-dashoffset: 70; opacity: 0.5; }
  30% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0.9; }
}

@keyframes ecgSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes ecgBlink {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
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

