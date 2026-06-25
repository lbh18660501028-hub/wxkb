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
  { icon: '⚔', label: 'DUNGEON RAID', page: 'dungeon', accent: 'red' },
  { icon: '◆', label: 'ITEM SHOP', page: 'shop', accent: 'cyan' },
  { icon: '↻', label: 'EXCHANGE', page: 'exchange', accent: 'amber' },
  { icon: '🩸', label: 'BLOODLINE', page: 'bloodline', accent: 'red' },
  { icon: '🦾', label: 'CYBERNETICS', page: 'cybernetic', accent: 'cyan' },
  { icon: '📜', label: 'CULTIVATION', page: 'cultivation', accent: 'green' },
  { icon: '👁', label: 'EYE TECH', page: 'eyeTech', accent: 'purple' },
  { icon: '⚡', label: 'ENERGY CORE', page: 'energy', accent: 'amber' },
  { icon: '🎯', label: 'SKILL TRAIN', page: 'skills', accent: 'cyan' },
  { icon: '🏅', label: 'TITLES', page: 'title', accent: 'amber' },
  { icon: '👥', label: 'SQUAD', page: 'squad', accent: 'green' },
  { icon: '🌌', label: 'MULTIVERSE', page: 'multiverse', accent: 'purple' },
]

const basicAttrs = [
  { icon: '🧠', color: '#b026ff', label: '智力', key: 'intelligence' as const },
  { icon: '◈', color: '#00f0ff', label: '精神力', key: 'spirit' as const },
  { icon: '❤', color: '#ff0033', label: '细胞活力', key: 'vitality' as const },
  { icon: '⚡', color: '#ffb000', label: '神经反应', key: 'reaction' as const },
  { icon: '⬆', color: '#ff6b35', label: '肌肉强度', key: 'strength' as const },
  { icon: '🛡', color: '#39ff14', label: '免疫强度', key: 'immunity' as const },
]

function handleUpgrade(attr: (typeof basicAttrs)[number]) {
  store.upgradeAttribute(attr.key)
}

// Check if upgrade is available for a given function card
function isUpgradeAvailable(page: string): boolean {
  if (page === 'bloodline') return store.rewardPoints >= 500
  if (page === 'cybernetic') return store.rewardPoints >= 300
  if (page === 'eyeTech') return store.rewardPoints >= 200
  if (page === 'energy') return store.rewardPoints >= 100
  if (page === 'skills') return store.rewardPoints >= 50
  if (page === 'geneLock') return (store as any).geneLockTier < 5 && store.rewardPoints >= 1000
  return false
}
</script>

<template>
  <div class="home-container">
    <!-- Lord God Core -->
    <div class="home-god-orb-section">
      <!-- Outer atmospheric glow -->
      <div class="god-atmosphere"></div>

      <!-- The Core Sphere -->
      <div class="home-god-orb">
        <!-- Rotating outer ring with tech ticks -->
        <div class="orb-tech-ring">
          <svg viewBox="0 0 200 200" class="tech-ring-svg">
            <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(0,240,255,0.1)" stroke-width="0.5" stroke-dasharray="2 4" />
          </svg>
        </div>

        <!-- Rotating runic ring -->
        <div class="orb-runic-ring">
          <svg viewBox="0 0 200 200" class="runic-ring-svg">
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,240,255,0.15)" stroke-width="0.8" stroke-dasharray="8 3 2 3" />
          </svg>
        </div>

        <!-- Inner rotating ring -->
        <div class="orb-inner-ring">
          <svg viewBox="0 0 200 200" class="inner-ring-svg">
            <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(0,240,255,0.2)" stroke-width="0.5" stroke-dasharray="1 2" />
          </svg>
        </div>

        <!-- Halo layers -->
        <div class="orb-halo halo-outer"></div>
        <div class="orb-halo halo-mid"></div>
        <div class="orb-halo halo-inner"></div>

        <!-- The core itself - ominous 3D sphere -->
        <div class="orb-core">
          <div class="orb-core-surface"></div>
          <div class="orb-core-inner"></div>
          <!-- Plasma filaments -->
          <div class="orb-plasma">
            <svg viewBox="0 0 80 80" class="plasma-svg">
              <path d="M40,10 Q20,25 35,40 Q50,55 25,70" fill="none" stroke="rgba(0,240,255,0.4)" stroke-width="0.5" stroke-linecap="round">
                <animate attributeName="d" dur="4s" repeatCount="indefinite"
                  values="M40,10 Q20,25 35,40 Q50,55 25,70;M40,10 Q55,25 30,40 Q15,55 40,70;M40,10 Q20,25 35,40 Q50,55 25,70" />
                <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.3;0.6;0.3" />
              </path>
              <path d="M40,10 Q60,25 45,40 Q30,55 55,70" fill="none" stroke="rgba(176,38,255,0.3)" stroke-width="0.4" stroke-linecap="round">
                <animate attributeName="d" dur="5s" repeatCount="indefinite"
                  values="M40,10 Q60,25 45,40 Q30,55 55,70;M40,10 Q25,25 50,40 Q65,55 35,70;M40,10 Q60,25 45,40 Q30,55 55,70" />
                <animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.2;0.5;0.2" />
              </path>
              <path d="M10,40 Q25,20 40,35 Q55,50 70,40" fill="none" stroke="rgba(255,0,51,0.2)" stroke-width="0.3" stroke-linecap="round">
                <animate attributeName="d" dur="6s" repeatCount="indefinite"
                  values="M10,40 Q25,20 40,35 Q55,50 70,40;M10,40 Q25,55 40,40 Q55,25 70,40;M10,40 Q25,20 40,35 Q55,50 70,40" />
                <animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="0.15;0.35;0.15" />
              </path>
            </svg>
          </div>
          <!-- Ominous central darkness -->
          <div class="orb-core-void"></div>
          <div class="orb-core-eye"></div>
        </div>

        <!-- Orbiting particles — 12 particles for denser field -->
        <div class="orb-particles">
          <div
            v-for="i in 12"
            :key="i"
            class="orb-particle"
            :style="{
              '--delay': `${i * 0.4}s`,
              '--angle': `${i * 30}deg`,
              '--orbit': `${65 + (i % 3) * 8}px`
            }"
          ></div>
        </div>

        <!-- Scan line effect -->
        <div class="orb-scanline"></div>
      </div>

      <div class="home-god-label">LORD GOD</div>
      <div class="home-god-subtitle">INFINITE HORROR</div>
      <div class="home-god-status">
        <span class="status-dot"></span>
        <span class="status-text">SYSTEM ONLINE · REINCARNATION SPACE ACTIVE</span>
      </div>
    </div>

    <!-- Function Grid -->
    <div class="home-func-grid">
      <!-- Attribute Upgrade Button -->
      <button class="home-func-box home-upgrade-btn" @click="showUpgradePanel = true">
        <div class="func-corner tl"></div>
        <div class="func-corner tr"></div>
        <div class="func-corner bl"></div>
        <div class="func-corner br"></div>
        <div class="home-func-icon">⬆</div>
        <div class="home-func-label">ATTRIBUTE</div>
        <div class="func-sublabel">ENHANCE</div>
      </button>

      <!-- Function cards -->
      <button
        v-for="item in funcItems"
        :key="item.page"
        class="home-func-box glitch-hover"
        :class="[
          'accent-' + item.accent,
          { 'upgrade-available': isUpgradeAvailable(item.page) }
        ]"
        @click="store.setPage(item.page as any)"
      >
        <div class="func-corner tl"></div>
        <div class="func-corner tr"></div>
        <div class="func-corner bl"></div>
        <div class="func-corner br"></div>
        <div class="home-func-icon">{{ item.icon }}</div>
        <div class="home-func-label">{{ item.label }}</div>
        <!-- Glitch overlay on hover -->
        <div class="card-glitch-overlay"></div>
      </button>
    </div>

    <!-- Upgrade Panel Modal -->
    <div v-if="showUpgradePanel" class="upgrade-overlay" @click.self="showUpgradePanel = false">
      <div class="upgrade-panel">
        <div class="panel-header">
          <span class="panel-icon">⬆</span>
          <span class="panel-title-text">属性强化 · ATTRIBUTE UPGRADE</span>
          <button class="panel-close" @click="showUpgradePanel = false">✕</button>
        </div>
        <div class="panel-subtitle">向主神许愿，强化你的属性</div>
        <div class="panel-reward">
          <span class="reward-label">◆ REWARD POINTS</span>
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
            <div class="card-cost">◆ {{ store.getAttributeCost(store.attributes[attr.key]) }}</div>
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
  align-items: center;
  padding: 20px 16px 32px;
  gap: 20px;
  min-height: 100%;
}

/* === Lord God Core === */
.home-god-orb-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 20px 0;
}

.god-atmosphere {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(0,240,255,0.06) 0%, rgba(0,0,0,0) 60%);
  pointer-events: none;
}

.home-god-orb {
  width: 200px;
  height: 200px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tech ring - outermost */
.orb-tech-ring {
  position: absolute;
  inset: 0;
  animation: ringRotate 60s linear infinite;
}

.tech-ring-svg {
  width: 100%;
  height: 100%;
}

/* Runic ring */
.orb-runic-ring {
  position: absolute;
  inset: 0;
  animation: ringRotateRev 40s linear infinite;
}

.runic-ring-svg {
  width: 100%;
  height: 100%;
}

/* Inner ring */
.orb-inner-ring {
  position: absolute;
  inset: 0;
  animation: ringRotate 30s linear infinite;
}

.inner-ring-svg {
  width: 100%;
  height: 100%;
}

/* Halos */
.orb-halo {
  position: absolute;
  border-radius: 50%;
  animation: haloPulse 4s ease-in-out infinite;
  pointer-events: none;
}

.halo-outer {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(0,240,255,0.02) 50%, transparent 70%);
}

.halo-mid {
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(0,240,255,0.12) 0%, rgba(0,240,255,0.04) 50%, transparent 70%);
  animation-delay: 0.5s;
}

.halo-inner {
  width: 110px;
  height: 110px;
  background: radial-gradient(circle, rgba(0,240,255,0.15) 0%, rgba(0,240,255,0.06) 50%, transparent 70%);
  animation-delay: 1s;
}

/* The Core - ominous 3D sphere */
.orb-core {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  position: relative;
  z-index: 3;
  animation: coreBreath 4s ease-in-out infinite;
}

/* Plasma filaments SVG */
.orb-plasma {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.plasma-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 2px rgba(0,240,255,0.3));
}

/* Ominous central darkness — a void at the core */
.orb-core-void {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 40%, rgba(10,5,15,0.7) 70%, transparent 100%);
  z-index: 5;
  animation: voidPulse 5s ease-in-out infinite;
}

@keyframes voidPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
}

.orb-core-surface {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9) 0%, rgba(0,240,255,0.7) 15%, rgba(0,100,130,0.8) 40%, rgba(0,20,30,0.95) 70%, rgba(0,0,0,1) 100%);
  box-shadow:
    inset 0 0 20px rgba(0,0,0,0.6),
    inset 0 0 40px rgba(0,240,255,0.1);
}

.orb-core-inner {
  position: absolute;
  inset: 15px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(0,240,255,0.2) 30%, transparent 60%);
  animation: coreInnerPulse 2s ease-in-out infinite alternate;
}

/* Ominous eye in center */
.orb-core-eye {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,240,255,0.8) 0%, rgba(0,240,255,0.3) 50%, transparent 70%);
  box-shadow: 0 0 15px rgba(0,240,255,0.5);
  animation: eyePulse 3s ease-in-out infinite;
}

/* Particles */
.orb-particles {
  position: absolute;
  inset: 0;
  animation: ringRotate 20s linear infinite;
  pointer-events: none;
}

.orb-particle {
  position: absolute;
  width: 3px;
  height: 3px;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  background: var(--neon-cyan);
  box-shadow: 0 0 6px var(--neon-cyan), 0 0 10px rgba(0,240,255,0.3);
  animation: particleFloat 3s ease-in-out infinite;
  animation-delay: var(--delay);
  transform: rotate(var(--angle)) translateX(var(--orbit, 70px));
}

/* Smaller secondary particle variant */
.orb-particle:nth-child(3n) {
  width: 2px;
  height: 2px;
  opacity: 0.6;
}
.orb-particle:nth-child(4n) {
  background: var(--neon-purple);
  box-shadow: 0 0 5px var(--neon-purple);
}

/* Scan line */
.orb-scanline {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
}

.orb-scanline::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.4), transparent);
  animation: scanOrb 3s linear infinite;
}

.home-god-label {
  font-family: var(--font-mono);
  font-size: var(--text-display-lg);
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 16px;
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(0, 240, 255, 0.3);
  z-index: 2;
}

.home-god-subtitle {
  font-family: var(--font-mono);
  color: var(--neon-cyan);
  font-size: var(--text-label);
  font-weight: 600;
  letter-spacing: 8px;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
  z-index: 2;
  margin-top: 4px;
}

.home-god-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  z-index: 2;
}

.status-dot {
  width: 5px;
  height: 5px;
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
  animation: heartbeat 2s ease-in-out infinite;
}

.status-text {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--neon-green);
  letter-spacing: 0.08em;
  text-shadow: 0 0 6px rgba(57, 255, 20, 0.3);
}

/* === Function Grid === */
.home-func-grid {
  width: min(960px, 100%);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.home-func-box {
  min-height: 140px;
  border: 1px solid var(--void-border);
  background: rgba(13, 13, 17, 0.85);
  backdrop-filter: blur(8px);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.2s;
  font-family: var(--font-sans);
  position: relative;
  clip-path: var(--clip-corner);
  overflow: hidden;
}

.home-func-box::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,240,255,0.02) 0%, transparent 50%);
  pointer-events: none;
  transition: opacity 0.3s;
}

.home-func-box:hover {
  transform: translateY(-3px);
  border-color: var(--neon-cyan);
  background: rgba(13, 13, 17, 0.95);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1), inset 0 0 20px rgba(0, 240, 255, 0.02);
}

.home-func-box:hover::before {
  background: linear-gradient(135deg, rgba(0,240,255,0.06) 0%, transparent 50%);
}

/* Glitch effect on hover */
.home-func-box:hover .home-func-icon {
  animation: glitch 0.3s ease;
}

/* Corner brackets */
.func-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--neon-cyan);
  opacity: 0.3;
  transition: opacity 0.3s;
  pointer-events: none;
}

.func-corner.tl { top: 3px; left: 3px; border-top: 1px solid; border-left: 1px solid; }
.func-corner.tr { top: 3px; right: 3px; border-top: 1px solid; border-right: 1px solid; }
.func-corner.bl { bottom: 3px; left: 3px; border-bottom: 1px solid; border-left: 1px solid; }
.func-corner.br { bottom: 3px; right: 3px; border-bottom: 1px solid; border-right: 1px solid; }

.home-func-box:hover .func-corner {
  opacity: 1;
}

/* Accent colors */
.home-func-box.accent-red:hover { border-color: var(--neon-red); box-shadow: 0 0 20px rgba(255,0,51,0.1); }
.home-func-box.accent-red:hover .func-corner { border-color: var(--neon-red); }

.home-func-box.accent-green:hover { border-color: var(--neon-green); box-shadow: 0 0 20px rgba(57,255,20,0.1); }
.home-func-box.accent-green:hover .func-corner { border-color: var(--neon-green); }

.home-func-box.accent-amber:hover { border-color: var(--neon-amber); box-shadow: 0 0 20px rgba(255,176,0,0.1); }
.home-func-box.accent-amber:hover .func-corner { border-color: var(--neon-amber); }

.home-func-box.accent-purple:hover { border-color: var(--neon-purple); box-shadow: 0 0 20px rgba(176,38,255,0.1); }
.home-func-box.accent-purple:hover .func-corner { border-color: var(--neon-purple); }

.home-upgrade-btn {
  border-color: rgba(0, 240, 255, 0.3);
  background: rgba(0, 240, 255, 0.04);
}

.home-func-icon {
  font-size: 36px;
  filter: var(--glow-cyan);
  z-index: 1;
}

.home-func-label {
  font-family: var(--font-mono);
  font-size: var(--text-label-sm);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.06em;
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
  z-index: 1;
}

.func-sublabel {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--neon-cyan);
  letter-spacing: 0.15em;
  z-index: 1;
}

/* === Upgrade Panel === */
.upgrade-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
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

.panel-icon {
  color: var(--neon-cyan);
  font-size: 18px;
  margin-right: 8px;
  filter: var(--glow-cyan);
}

.panel-title-text {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
  flex: 1;
}

.panel-close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--void-border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 14px;
  transition: all 0.2s;
  clip-path: var(--clip-corner-sm);
}

.panel-close:hover {
  border-color: var(--neon-red);
  color: var(--neon-red);
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
  letter-spacing: 0.05em;
}

.reward-value {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--neon-cyan);
  text-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
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
  transition: border-color 0.2s;
}

.upgrade-card:hover {
  border-color: var(--void-border-strong);
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

.card-cost {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--neon-amber);
}

.next-arrow {
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.card-value,
.next-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
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
  letter-spacing: 0.06em;
  text-transform: uppercase;
  clip-path: var(--clip-corner-sm);
  transition: all 0.2s;
}

.upgrade-go:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.12);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

.upgrade-go:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Glitch overlay for cards on hover */
.card-glitch-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  background:
    linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.06) 50%, transparent 100%),
    repeating-linear-gradient(0deg, transparent 0px, rgba(0,240,255,0.03) 1px, transparent 2px, transparent 3px);
  mix-blend-mode: screen;
}

.home-func-box:hover .card-glitch-overlay {
  opacity: 1;
  animation: glitchHover 0.35s ease;
}

/* === Animations === */
@keyframes coreBreath {
  0%, 100% {
    box-shadow: 0 0 40px rgba(0,240,255,0.3), 0 0 80px rgba(0,240,255,0.15), inset 0 0 30px rgba(0,240,255,0.2);
  }
  50% {
    box-shadow: 0 0 60px rgba(0,240,255,0.5), 0 0 120px rgba(0,240,255,0.25), inset 0 0 40px rgba(0,240,255,0.3);
  }
}

@keyframes coreInnerPulse {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

@keyframes eyePulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes haloPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.9; }
}

@keyframes particleFloat {
  0%, 100% { opacity: 0.3; transform: rotate(var(--angle)) translateX(var(--orbit, 70px)); }
  50% { opacity: 1; transform: rotate(var(--angle)) translateX(calc(var(--orbit, 70px) + 8px)); }
}

@keyframes scanOrb {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* === Responsive === */
@media (max-width: 1024px) {
  .home-func-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .upgrade-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .home-func-grid,
  .upgrade-grid {
    grid-template-columns: 1fr;
  }

  .home-god-orb {
    width: 160px;
    height: 160px;
  }
}
</style>
