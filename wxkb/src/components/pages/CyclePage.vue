<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { GAME_MAPS } from '../../data/maps'

const store = useGameStore()

const timeDisplay = computed(() => {
  const s = store.idle.totalSeconds
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const tierColors: Record<string, string> = {
  D: '#8b4513', C: '#4a90d9', B: '#9d4edd', A: '#ff6b35', S: '#ffd700',
}

function toggleIdle() {
  store.idle.isRunning = !store.idle.isRunning
  if (store.idle.isRunning) {
    store.idle.startTime = Date.now() - (store.idle.totalSeconds * 1000)
    store.addLog('挂机已开始', 'success')
  } else {
    store.addLog('挂机已暂停', 'warning')
  }
}
</script>

<template>
  <div class="cycle-page">
    <!-- 离线奖励 -->
    <div class="card-panel" v-if="store.offlineReward.rewardPoints > 0 || store.offlineReward.xp > 0">
      <div class="card-header">
        <span class="card-title">🎁 离线奖励</span>
        <span class="card-badge">可领取</span>
      </div>
      <div class="card-body">
        <div class="offline-info">
          <div class="offline-time">
            离线 {{ store.offlineReward.hours }}小时{{ store.offlineReward.minutes }}分钟
          </div>
          <div class="offline-rewards">
            <div class="reward-item">
              <span class="reward-icon">💎</span>
              <span class="reward-value">+{{ store.offlineReward.rewardPoints }}</span>
            </div>
            <div class="reward-item">
              <span class="reward-icon">⚡</span>
              <span class="reward-value">+{{ store.offlineReward.xp }}</span>
            </div>
          </div>
          <button class="claim-btn" @click="store.claimOfflineReward()">领取奖励</button>
        </div>
      </div>
    </div>

    <!-- 挂机状态 -->
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">🔄 再入轮回</span>
        <span class="running-badge" v-if="store.idle.isRunning">挂机中...</span>
      </div>
      <div class="card-body">
        <div class="orb-section">
          <div class="idle-orb">
            <div class="idle-orb-core"></div>
            <div class="idle-orb-ring ring-1"></div>
            <div class="idle-orb-ring ring-2"></div>
          </div>
          <div class="orb-label">轮 回</div>
        </div>

        <div class="current-map">
          <span class="map-icon">{{ store.currentMap.icon }}</span>
          <span class="map-name">{{ store.currentMap.name }}</span>
          <span class="map-tier" :style="{ color: tierColors[store.currentMap.tier] }">{{ store.currentMap.tier }}级</span>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">已挂机时间</div>
            <div class="stat-value gold">{{ timeDisplay }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">待领取奖赏</div>
            <div class="stat-value jade">
              <span>💎 {{ store.onlineReward.rewardPoints }}</span>
              <span>⚡ {{ store.onlineReward.xp }}</span>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-label">每小时收益</div>
            <div class="stat-value gold">💎{{ store.currentMap.rewardPerHour.rewardPoints }} ⚡{{ store.currentMap.rewardPerHour.xp }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">积累上限</div>
            <div class="stat-value">5小时</div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="action-btn claim" @click="store.claimOfflineReward()"
                  :disabled="store.onlineReward.rewardPoints === 0 && store.onlineReward.xp === 0">
            领取奖励
          </button>
          <button class="action-btn toggle" :class="{ active: store.idle.isRunning }" @click="toggleIdle()">
            {{ store.idle.isRunning ? '暂停挂机' : '开始挂机' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 地图选择 -->
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">🗺️ 选择地图</span>
        <span class="card-badge">{{ store.unlockedMaps.length }}/{{ GAME_MAPS.length }}</span>
      </div>
      <div class="card-body">
        <div class="map-list">
          <div v-for="map in GAME_MAPS" :key="map.id"
               :class="['map-item', { 
                 locked: !store.mapProgress.unlockedMaps.includes(map.id),
                 active: store.idle.currentMapId === map.id 
               }]"
               @click="store.selectMap(map.id)">
            <div class="map-icon-large">{{ map.icon }}</div>
            <div class="map-info">
              <div class="map-name-row">
                <span class="map-name">{{ map.name }}</span>
                <span class="map-tier-badge" :style="{ color: tierColors[map.tier] }">{{ map.tier }}级</span>
              </div>
              <div class="map-desc">{{ map.description }}</div>
              <div class="map-reward">
                每小时: 💎{{ map.rewardPerHour.rewardPoints }} ⚡{{ map.rewardPerHour.xp }}
              </div>
            </div>
            <div class="map-status">
              <span v-if="store.mapProgress.unlockedMaps.includes(map.id)" class="status-unlocked">已解锁</span>
              <span v-else class="status-locked">🔒 {{ map.unlockCondition }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 挂机说明 -->
    <div class="card-panel">
      <div class="card-header"><span class="card-title">📖 挂机规则</span></div>
      <div class="card-body">
        <div class="rules-list">
          <div class="rule-item">
            <span class="rule-icon">✅</span>
            <span>挂机收益固定，只跟选择的地图有关</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">✅</span>
            <span>通关副本可解锁下一张地图</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">✅</span>
            <span>最多累积5小时离线奖励</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">❌</span>
            <span>挂机不产出支线剧情</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cycle-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.offline-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.offline-time {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.offline-rewards {
  display: flex;
  gap: 20px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-icon { font-size: 18px; }

.reward-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-accent-gold);
}

.claim-btn {
  padding: 10px 32px;
  background: rgba(80,160,128,0.15);
  border: 1px solid var(--color-accent-jade);
  border-radius: 6px;
  color: var(--color-accent-jade);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.claim-btn:hover { background: rgba(80,160,128,0.25); }

.running-badge {
  font-size: 11px;
  color: var(--color-accent-jade);
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(80,160,128,0.15);
}

.orb-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

.idle-orb {
  width: 80px;
  height: 80px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.idle-orb-core {
  width: 32px;
  height: 32px;
  background: radial-gradient(circle, #fff 0%, #ffd700 50%, transparent 100%);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(255,215,0,0.6);
  animation: orbPulse 3s ease-in-out infinite;
}

.idle-orb-ring {
  position: absolute;
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 50%;
}

.ring-1 { width: 50px; height: 50px; animation: ringRotate 8s linear infinite; }
.ring-2 { width: 70px; height: 70px; animation: ringRotate 12s linear infinite reverse; }

@keyframes orbPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orb-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent-gold);
  letter-spacing: 4px;
  margin-top: 6px;
}

.current-map {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  margin-bottom: 12px;
}

.map-icon { font-size: 20px; }

.map-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.map-tier {
  font-size: 12px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-box {
  padding: 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  border: 1px solid var(--color-border-secondary);
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-bottom: 3px;
}

.stat-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-value.gold { color: var(--color-accent-gold); }
.stat-value.jade { color: var(--color-accent-jade); display: flex; gap: 8px; justify-content: center; }

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.claim {
  background: rgba(80,160,128,0.15);
  border: 1px solid var(--color-accent-jade);
  color: var(--color-accent-jade);
}

.action-btn.claim:hover:not(:disabled) { background: rgba(80,160,128,0.25); }
.action-btn.claim:disabled { opacity: 0.4; cursor: not-allowed; }

.action-btn.toggle {
  background: rgba(212,168,90,0.1);
  border: 1px solid var(--color-accent-gold);
  color: var(--color-accent-gold);
}

.action-btn.toggle:hover { background: rgba(212,168,90,0.2); }

.map-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.map-item:hover:not(.locked) {
  border-color: var(--color-border);
  background: var(--color-bg-hover);
}

.map-item.active {
  border-color: var(--color-accent-gold);
  background: rgba(212,168,90,0.1);
}

.map-item.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.map-icon-large { font-size: 32px; }

.map-info { flex: 1; }

.map-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.map-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.map-tier-badge { font-size: 11px; }

.map-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.map-reward {
  font-size: 11px;
  color: var(--color-accent-gold);
}

.map-status {
  display: flex;
  align-items: center;
}

.status-unlocked {
  font-size: 11px;
  color: var(--color-accent-jade);
  padding: 4px 8px;
  background: rgba(80,160,128,0.15);
  border-radius: 4px;
}

.status-locked {
  font-size: 10px;
  color: var(--color-text-muted);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.rule-icon { font-size: 14px; }
</style>
