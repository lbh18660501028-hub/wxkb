<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../../stores/game'

const store = useGameStore()
const showUpgradePanel = ref(false)

interface FuncItem {
  icon: string
  label: string
  page: string
  accent: string
}

const funcItems: FuncItem[] = [
  { icon: '🗺', label: '网格副本', page: 'dungeonGrid', accent: 'cyan' },
  { icon: '◈', label: '购买空间', page: 'shop', accent: 'cyan' },
  { icon: '↔', label: '支线兑换', page: 'exchange', accent: 'amber' },
  { icon: '🧬', label: '血统重塑', page: 'bloodline', accent: 'red' },
  { icon: '🦾', label: '义体植入', page: 'cybernetic', accent: 'cyan' },
  { icon: '📐', label: '修真总纲', page: 'cultivation', accent: 'green' },
  { icon: '👁', label: '瞳术修炼', page: 'eyeTech', accent: 'purple' },
  { icon: '⚡', label: '能量拓展', page: 'energy', accent: 'amber' },
  { icon: '🎆', label: '技能修炼', page: 'skills', accent: 'cyan' },
  { icon: '🎯', label: '称号技艺', page: 'title', accent: 'amber' },
  { icon: '👥', label: '轮回小队', page: 'squad', accent: 'green' },
  { icon: '🌌', label: '诸天大观', page: 'multiverse', accent: 'purple' },
]

const basicAttrs = [
  { icon: '💪', color: '#ff6b35', label: '力量', key: 'strength' as const },
  { icon: '⚡', color: '#ffb000', label: '敏捷', key: 'agility' as const },
  { icon: '❤', color: '#ff0033', label: '耐力', key: 'endurance' as const },
  { icon: '🧠', color: '#b026ff', label: '智力', key: 'intelligence' as const },
  { icon: '👁', color: '#00c8ff', label: '感知', key: 'perception' as const },
  { icon: '◈', color: '#00f0ff', label: '决心', key: 'resolve' as const },
  { icon: '✦', color: '#ffd700', label: '风度', key: 'presence' as const },
  { icon: '🎭', color: '#ff3366', label: '操控', key: 'manipulation' as const },
  { icon: '🛡', color: '#39ff14', label: '沉着', key: 'composure' as const },
]

function handleUpgrade(attr: (typeof basicAttrs)[number]) {
  store.upgradeAttribute(attr.key)
}
</script>

<template>
  <div class="home-container">
    <section class="home-hero">
      <div class="hero-atmosphere"></div>
      <div class="hero-ring hero-ring--outer"></div>
      <div class="hero-ring hero-ring--mid"></div>
      <div class="hero-ring hero-ring--inner"></div>
      <div class="hero-particles">
        <span v-for="i in 10" :key="'hero-particle-' + i" class="hero-particle"></span>
      </div>
      <div class="hero-core"></div>
      <div class="hero-scanline"></div>
      <div class="hero-copy">
        <div class="hero-title">主神空间</div>
        <div class="hero-subtitle">LORD GOD / INFINITE HORROR</div>
        <div class="hero-status">
          <span class="status-dot"></span>
          <span>SYSTEM ONLINE / 轮回空间已激活</span>
        </div>
      </div>
    </section>

    <section class="home-func-grid">
      <button class="home-func-box home-upgrade-btn" @click="showUpgradePanel = true">
        <div class="home-func-icon">⬢</div>
        <div class="home-func-label">属性强化</div>
        <div class="func-sublabel">UPGRADE</div>
      </button>

      <button
        v-for="item in funcItems"
        :key="item.page"
        class="home-func-box"
        :class="'accent-' + item.accent"
        @click="store.setPage(item.page as any)"
      >
        <div class="home-func-icon">{{ item.icon }}</div>
        <div class="home-func-label">{{ item.label }}</div>
      </button>
    </section>

    <div v-if="showUpgradePanel" class="upgrade-overlay" @click.self="showUpgradePanel = false">
      <div class="upgrade-panel">
        <div class="panel-header">
          <span class="panel-title-text">属性强化 / ATTRIBUTE UPGRADE</span>
          <button class="panel-close" @click="showUpgradePanel = false">×</button>
        </div>
        <div class="panel-subtitle">向主神许愿，强化你的基础属性</div>
        <div class="panel-reward">
          <span class="reward-label">◈ REWARD POINTS</span>
          <span class="reward-value">{{ Math.floor(store.rewardPoints) }}</span>
        </div>

        <div class="upgrade-grid">
          <div v-for="attr in basicAttrs" :key="attr.key" class="upgrade-card">
            <div class="card-top">
              <span class="card-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
              <span class="card-label">{{ attr.label }}</span>
            </div>
            <div class="card-value" :style="{ color: attr.color }">{{ store.attributes[attr.key] }}</div>
            <div class="card-next">
              <span class="next-arrow">→</span>
              <span class="next-value" :style="{ color: attr.color }">{{ store.attributes[attr.key] + 1 }}</span>
            </div>
            <div class="card-cost">◈ {{ store.getAttributeCost(store.attributes[attr.key]) }}</div>
            <button
              class="upgrade-go"
              :disabled="store.rewardPoints < store.getAttributeCost(store.attributes[attr.key]) || store.attributes[attr.key] >= store.attributeCap"
              @click="handleUpgrade(attr)"
            >
              {{ store.attributes[attr.key] >= store.attributeCap ? 'MAX' : '强化' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 16px 28px;
  min-height: 100%;
}

.home-hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 260px;
  overflow: hidden;
  border: 1px solid var(--void-border);
  background:
    radial-gradient(circle at center, rgba(0, 240, 255, 0.14) 0%, rgba(0, 240, 255, 0.04) 20%, rgba(5, 5, 8, 0.96) 62%),
    linear-gradient(180deg, rgba(8, 14, 18, 0.96), rgba(5, 5, 8, 0.98));
  clip-path: var(--clip-corner);
}

.hero-atmosphere {
  position: absolute;
  inset: -18% -8%;
  background:
    radial-gradient(circle at center, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 28%, transparent 58%),
    radial-gradient(circle at center, rgba(176, 38, 255, 0.06) 0%, transparent 52%);
  filter: blur(10px);
}

.hero-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0, 240, 255, 0.14);
  pointer-events: none;
}

.hero-ring--outer {
  width: 228px;
  height: 228px;
  border-style: dashed;
  animation: heroSpin 28s linear infinite;
}

.hero-ring--mid {
  width: 182px;
  height: 182px;
  border-color: rgba(0, 240, 255, 0.2);
  box-shadow: inset 0 0 18px rgba(0, 240, 255, 0.05);
  animation: heroSpinReverse 18s linear infinite;
}

.hero-ring--inner {
  width: 146px;
  height: 146px;
  border-color: rgba(255, 255, 255, 0.12);
  animation: heroPulseRing 4s ease-in-out infinite;
}

.hero-core {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, rgba(255,255,255,0.92), rgba(0,240,255,0.75) 18%, rgba(0,80,110,0.88) 46%, rgba(0,0,0,0.98) 100%);
  box-shadow:
    0 0 28px rgba(0, 240, 255, 0.3),
    0 0 84px rgba(0, 240, 255, 0.16),
    inset 0 0 18px rgba(255,255,255,0.16);
  animation: corePulse 4s ease-in-out infinite;
  z-index: 2;
}

.hero-particles {
  position: absolute;
  width: 240px;
  height: 240px;
  animation: heroSpin 22s linear infinite;
}

.hero-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  margin-top: -2px;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.88);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.45);
}

.hero-particle:nth-child(1) { transform: rotate(0deg) translateX(108px); }
.hero-particle:nth-child(2) { transform: rotate(36deg) translateX(100px); width: 3px; height: 3px; }
.hero-particle:nth-child(3) { transform: rotate(72deg) translateX(116px); }
.hero-particle:nth-child(4) { transform: rotate(108deg) translateX(96px); background: rgba(176, 38, 255, 0.84); }
.hero-particle:nth-child(5) { transform: rotate(144deg) translateX(112px); }
.hero-particle:nth-child(6) { transform: rotate(180deg) translateX(104px); width: 2px; height: 2px; }
.hero-particle:nth-child(7) { transform: rotate(216deg) translateX(114px); }
.hero-particle:nth-child(8) { transform: rotate(252deg) translateX(98px); background: rgba(255, 176, 0, 0.82); }
.hero-particle:nth-child(9) { transform: rotate(288deg) translateX(110px); }
.hero-particle:nth-child(10) { transform: rotate(324deg) translateX(102px); width: 3px; height: 3px; }

.hero-scanline {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hero-scanline::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.32), transparent);
  animation: heroScan 4.2s linear infinite;
}

.hero-copy {
  position: absolute;
  inset: auto 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  z-index: 3;
}

.hero-title {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 6px;
  text-shadow: 0 0 16px rgba(0, 240, 255, 0.32);
}

.hero-subtitle {
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgba(0, 240, 255, 0.82);
  letter-spacing: 3px;
}

.hero-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--neon-green);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
}

.home-func-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.home-func-box {
  min-height: 118px;
  border: 1px solid var(--void-border);
  background: rgba(10, 12, 16, 0.92);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  clip-path: var(--clip-corner);
}

.home-func-box:hover {
  transform: translateY(-2px);
  border-color: var(--void-border-strong);
}

.home-upgrade-btn,
.accent-cyan:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
}

.accent-red:hover {
  border-color: var(--neon-red);
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.1);
}

.accent-amber:hover {
  border-color: var(--neon-amber);
  box-shadow: 0 0 20px rgba(255, 176, 0, 0.1);
}

.accent-green:hover {
  border-color: var(--neon-green);
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.1);
}

.accent-purple:hover {
  border-color: var(--neon-purple);
  box-shadow: 0 0 20px rgba(176, 38, 255, 0.1);
}

.home-func-icon {
  font-size: 30px;
  line-height: 1;
}

.home-func-label,
.func-sublabel {
  font-family: var(--font-mono);
}

.home-func-label {
  font-size: 13px;
  font-weight: 700;
}

.func-sublabel {
  font-size: 11px;
  color: var(--neon-cyan);
  letter-spacing: 2px;
}

.upgrade-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(4px);
  z-index: 80;
}

.upgrade-panel {
  width: min(980px, 92vw);
  max-height: 84vh;
  overflow-y: auto;
  border: 1px solid var(--void-border-strong);
  background: rgba(8, 8, 12, 0.98);
  padding: 20px;
  box-shadow: 0 0 40px rgba(0, 240, 255, 0.08);
  clip-path: var(--clip-corner);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--void-border);
}

.panel-title-text {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}

.panel-close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--void-border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 16px;
  clip-path: var(--clip-corner-sm);
}

.panel-subtitle {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.panel-reward {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 6px 10px;
  background: rgba(0, 240, 255, 0.04);
  border: 1px solid var(--void-border);
  clip-path: var(--clip-corner-sm);
}

.reward-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.reward-value {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--neon-cyan);
}

.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.upgrade-card {
  border: 1px solid var(--void-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  clip-path: var(--clip-corner-sm);
}

.card-top,
.card-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-icon {
  font-size: 20px;
}

.card-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.card-value,
.next-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
}

.card-cost,
.next-arrow {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}

.card-cost {
  color: var(--neon-amber);
}

.upgrade-go {
  border: 1px solid var(--neon-cyan);
  background: rgba(0, 240, 255, 0.06);
  color: var(--neon-cyan);
  padding: 8px 14px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  clip-path: var(--clip-corner-sm);
}

.upgrade-go:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@keyframes corePulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 28px rgba(0, 240, 255, 0.3),
      0 0 84px rgba(0, 240, 255, 0.16),
      inset 0 0 18px rgba(255,255,255,0.16);
  }
  50% {
    transform: scale(1.04);
    box-shadow:
      0 0 32px rgba(0, 240, 255, 0.38),
      0 0 96px rgba(0, 240, 255, 0.2),
      inset 0 0 20px rgba(255,255,255,0.22);
  }
}

@keyframes heroSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes heroSpinReverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes heroPulseRing {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.04); opacity: 1; }
}

@keyframes heroScan {
  0% { top: 8%; opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { top: 92%; opacity: 0; }
}

@media (max-width: 1024px) {
  .home-func-grid,
  .upgrade-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .home-func-grid,
  .upgrade-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 24px;
    letter-spacing: 4px;
  }
}
</style>
