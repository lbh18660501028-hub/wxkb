<script setup lang="ts">
import { useGameStore } from '../stores/game'
import type { PageId } from '../types/game'

const store = useGameStore()

interface NavItem {
  id: PageId
  icon: string
  label: string
}

const primaryItems: NavItem[] = [
  { id: 'home', icon: '◉', label: 'LORD SPACE' },
  { id: 'personal', icon: '◈', label: 'PERSONAL' },
]

const secondaryItems: NavItem[] = [
  { id: 'cycle', icon: '↻', label: 'REINCARNATE' },
  { id: 'dungeon', icon: '⚔', label: 'DUNGEON' },
  { id: 'guide', icon: '▣', label: 'GUIDE' },
  { id: 'settings', icon: '⚙', label: 'SETTINGS' },
]

const sidePlotTiers = ['D', 'C', 'B', 'A', 'S'] as const
</script>

<template>
  <nav class="nav-bar">
    <div class="nav-wrapper">
      <!-- Title with bracket accent -->
      <div class="game-title">
        <span class="title-bracket">[</span>
        <span class="title-main">◉ INFINITE HORROR</span>
        <span class="title-bracket">]</span>
      </div>

      <!-- Nav items -->
      <div class="nav-items">
        <div
          v-for="item in primaryItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: store.currentPage === item.id }"
          @click="store.setPage(item.id)"
        >
          <span class="nav-item-icon">{{ item.icon }}</span>
          <span class="nav-item-label">{{ item.label }}</span>
        </div>
        <div class="nav-separator"></div>
        <div
          v-for="item in secondaryItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: store.currentPage === item.id }"
          @click="store.setPage(item.id)"
        >
          <span class="nav-item-icon">{{ item.icon }}</span>
          <span class="nav-item-label">{{ item.label }}</span>
        </div>
      </div>

      <!-- Currency readouts -->
      <div class="nav-right">
        <!-- Reward Points -->
        <div class="currency-display currency-rp refresh-flicker">
          <span class="icon">◆</span>
          <div class="currency-readout">
            <span class="label">RP</span>
            <span class="value tick-num">{{ store.rewardPoints.toLocaleString() }}</span>
            <div class="micro-bar">
              <div class="micro-bar-fill rp"></div>
            </div>
          </div>
        </div>

        <!-- Side Plots -->
        <div class="currency-display currency-sp">
          <span class="icon">▤</span>
          <div class="currency-readout">
            <span class="label">SIDE PLOT</span>
            <div class="sp-tiers">
              <span
                v-for="tier in sidePlotTiers"
                :key="tier"
                class="sp-tier"
                :class="{ active: store.sidePlots[tier] > 0 }"
              >{{ tier }}:{{ store.sidePlots[tier] }}</span>
            </div>
          </div>
        </div>

        <!-- XP -->
        <div class="currency-display currency-xp refresh-flicker">
          <span class="icon">⚡</span>
          <div class="currency-readout">
            <span class="label">XP LV.{{ store.level }}</span>
            <span class="value xp-val tick-num">{{ store.xp }}/{{ store.xpMax }}</span>
            <div class="micro-bar xp-track">
              <div class="micro-bar-fill xp" :style="{ width: Math.min(100, (store.xp / store.xpMax) * 100) + '%' }"></div>
              <!-- Shimmer effect on XP bar -->
              <div class="xp-shimmer"></div>
            </div>
          </div>
        </div>

        <button class="sign-in-btn">▣ SIGN IN</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.title-bracket {
  color: var(--neon-cyan);
  opacity: 0.5;
  font-weight: 400;
}

.title-main {
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}

.currency-readout {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.currency-rp .icon { color: var(--neon-cyan); }
.currency-sp .icon { color: var(--neon-purple); filter: drop-shadow(0 0 4px rgba(176,38,255,0.4)); }
.currency-xp .icon { color: var(--neon-amber); }

.sp-tiers {
  display: flex;
  gap: 3px;
}

.sp-tier {
  font-size: var(--text-small);
  color: var(--text-muted);
  font-weight: 600;
  transition: color 0.2s;
}

.sp-tier.active {
  color: var(--neon-purple);
  text-shadow: 0 0 4px rgba(176, 38, 255, 0.3);
}

.xp-val {
  color: var(--neon-amber) !important;
  text-shadow: 0 0 4px rgba(255, 176, 0, 0.3) !important;
}

.micro-bar {
  width: 60px;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.micro-bar-fill {
  height: 100%;
  transition: width 0.6s ease;
}

.micro-bar-fill.rp {
  width: 100%;
  background: var(--neon-cyan);
  box-shadow: 0 0 4px var(--neon-cyan);
  animation: dataLoad 3s ease-in-out infinite;
}

.micro-bar-fill.xp {
  background: var(--neon-amber);
  box-shadow: 0 0 4px var(--neon-amber);
}

/* XP tracker with shimmer */
.xp-track {
  position: relative;
  overflow: hidden;
}

.xp-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,176,0,0.4), transparent);
  animation: shimmer 2.5s linear infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 200%; }
}

@keyframes dataLoad {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>
