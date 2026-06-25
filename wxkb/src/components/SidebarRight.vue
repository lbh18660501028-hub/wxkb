<script setup lang="ts">
import { useGameStore } from '../stores/game'

const store = useGameStore()

function clearLogs() {
  store.logs.splice(0, store.logs.length)
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}
</script>

<template>
  <aside class="sidebar-right">
    <div class="log-panel">
      <div class="log-header">
        <span class="log-title">📋 游戏日志</span>
        <button class="log-clear" @click="clearLogs">清空</button>
      </div>
      <div class="log-list">
        <div
          v-for="(log, idx) in store.logs"
          :key="idx"
          class="log-entry"
          :class="log.type"
        >
          <span class="log-time">[{{ formatTime(log.timestamp) }}]</span>
          <span class="log-text">{{ log.text }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-right {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0 15px;
}

.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  border: 1px solid var(--color-border-secondary);
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(212,168,90,0.05);
  border-bottom: 1px solid var(--color-border-secondary);
}

.log-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent-gold);
}

.log-clear {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  color: var(--color-text-muted);
  font-size: 10px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.log-clear:hover {
  border-color: rgba(212,168,90,0.3);
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.log-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.log-list::-webkit-scrollbar {
  width: 4px;
}

.log-list::-webkit-scrollbar-thumb {
  background: var(--color-accent-gold);
  border-radius: 2px;
}

.log-entry {
  display: flex;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 2px;
  font-size: 11px;
  line-height: 1.5;
  transition: background 0.2s;
}

.log-entry:hover {
  background: rgba(255,255,255,0.03);
}

.log-time {
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.log-text {
  color: var(--color-text-secondary);
}

.log-entry.gold .log-text {
  color: var(--color-accent-gold-light);
  font-weight: 700;
}

.log-entry.success .log-text {
  color: var(--color-accent-jade);
}

.log-entry.warning .log-text {
  color: var(--color-accent-gold);
}

.log-entry.danger .log-text {
  color: var(--color-danger);
}

.log-entry.info .log-text {
  color: var(--color-accent-blue);
}
</style>
