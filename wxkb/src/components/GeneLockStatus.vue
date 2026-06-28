<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const geneLockTier = computed(() => store.geneLock.tier)
const geneLockActive = computed(() => store.geneLock.active)
const geneLockActiveTier = computed(() => store.geneLock.activeTier)
const maxGeneTier = 5
</script>

<template>
  <section class="gene-lock-panel cracked-pattern eldritch-texture">
    <div class="gene-lock-header">
      <span class="gene-lock-title">🧬 基因锁 / GENE LOCK</span>
    </div>

    <div class="gene-lock-body">
      <div class="gene-lock-display" :class="{ unlocked: geneLockTier > 0, active: geneLockActive }">
        <div class="gene-lock-icon">
          <svg v-if="geneLockTier === 0" viewBox="0 0 24 24" class="gene-lock-svg locked">
            <path d="M7,10 L7,7 C7,4 9,2 12,2 C15,2 17,4 17,7 L17,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M5,10 L19,10 L19,20 L5,20 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12,13 L12,17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
            <path d="M8,12 L10,14 L9,17" fill="none" stroke="rgba(255,0,51,0.4)" stroke-width="0.5"/>
            <path d="M15,11 L14,13 L16,16" fill="none" stroke="rgba(255,0,51,0.3)" stroke-width="0.5"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" class="gene-lock-svg unlocked-svg" :class="{ pulsing: geneLockActive }">
            <path d="M7,10 L7,7 C7,4 9,2 12,2 C15,2 17,4 17,7 L17,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M5,10 L19,10 L19,20 L5,20 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12,13 L12,17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
            <path d="M6,11 L4,8 M18,11 L20,8 M12,9 L12,5" fill="none" stroke="rgba(255,0,51,0.6)" stroke-width="0.6"/>
          </svg>
        </div>

        <div class="gene-lock-info">
          <span class="gene-lock-tier">TIER {{ geneLockTier }}/{{ maxGeneTier }}</span>
          <span class="gene-lock-status" :class="{ active: geneLockActive }">
            {{ geneLockActive ? `◈ ACTIVE T${geneLockActiveTier}` : geneLockTier > 0 ? '◈ DORMANT' : '◈ LOCKED' }}
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
  </section>
</template>

<style scoped>
.gene-lock-panel {
  flex: 0 0 auto;
  position: relative;
  overflow: hidden;
  background: rgba(10, 10, 14, 0.95);
  border-bottom: 1px solid var(--void-border);
}

.gene-lock-header {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  background: rgba(255, 0, 51, 0.04);
  border-bottom: 1px solid var(--void-border);
}

.gene-lock-title {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--neon-red);
  letter-spacing: 0.08em;
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

.gene-lock-svg {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
  filter: drop-shadow(0 0 2px rgba(255, 0, 51, 0.2));
}

.gene-lock-svg.unlocked-svg {
  color: var(--neon-red);
  filter: drop-shadow(0 0 4px rgba(255, 0, 51, 0.4));
}

.gene-lock-svg.pulsing {
  animation: heartbeat 1s ease-in-out infinite;
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
</style>
