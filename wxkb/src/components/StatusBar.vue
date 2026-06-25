<script setup lang="ts">
import { useGameStore } from '../stores/game'

const store = useGameStore()

const hpPercent = 100
const mpPercent = 100
const geneLockPercent = 0
const geneLockUnlocked = false
</script>

<template>
  <div class="status-bar-row">
    <div class="status-name">
      <span class="status-name-label">{{ store.squadName }}</span>
      <span class="status-name-value">{{ store.name }}</span>
    </div>

    <div class="status-bars-center">
      <div class="status-bar-item">
        <span class="status-bar-icon hp-icon">♥</span>
        <span class="status-bar-name">HP</span>
        <div class="status-bar-track">
          <div class="status-bar-fill hp" :style="{ width: hpPercent + '%' }"></div>
        </div>
        <span class="status-bar-num">{{ store.hpMax }}/{{ store.hpMax }}</span>
      </div>

      <div class="status-bar-item">
        <span class="status-bar-icon mp-icon">♦</span>
        <span class="status-bar-name">MP</span>
        <div class="status-bar-track">
          <div class="status-bar-fill mp" :style="{ width: mpPercent + '%' }"></div>
        </div>
        <span class="status-bar-num">{{ store.willpower }}/{{ store.willpower }}</span>
      </div>

      <div class="status-bar-item">
        <span class="status-bar-icon gene-icon">★</span>
        <span class="status-bar-name">基因锁</span>
        <div class="status-bar-track">
          <div class="status-bar-fill gene" :style="{ width: geneLockPercent + '%' }"></div>
        </div>
        <span class="status-bar-num" v-if="geneLockUnlocked">{{ geneLockPercent }}%</span>
        <span class="status-bar-num" v-else style="color:var(--color-text-muted)">未开启</span>
      </div>
    </div>

    <div class="status-right">
      <span class="status-level">Lv.{{ store.level }}</span>
    </div>
  </div>
</template>
