<script setup lang="ts">
import { computed } from 'vue'
import type { AttributeKey } from '../../types/game'
import { useGameStore } from '../../stores/game'
import { GAME_MAPS } from '../../data/maps'
import { getProfessionById } from '../../data/characterCreate'

const store = useGameStore()

const TRAINING_RATE_PER_HOUR = 0.2

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

const trainingFacilities: Array<{
  icon: string
  attribute: AttributeKey
  label: string
  facility: string
}> = [
  { icon: '💪', attribute: 'strength', label: '力量', facility: '健身房' },
  { icon: '⚡', attribute: 'agility', label: '敏捷', facility: '敏捷训练场' },
  { icon: '❤', attribute: 'endurance', label: '耐力', facility: '耐力舱' },
  { icon: '📚', attribute: 'intelligence', label: '智力', facility: '知识图书馆' },
  { icon: '👁', attribute: 'perception', label: '感知', facility: '感知训练室' },
  { icon: '◈', attribute: 'resolve', label: '决心', facility: '决心冥想室' },
  { icon: '✦', attribute: 'presence', label: '风度', facility: '风度演武场' },
  { icon: '🎭', attribute: 'manipulation', label: '操控', facility: '操控演说厅' },
  { icon: '🛡', attribute: 'composure', label: '沉着', facility: '沉着适应室' },
]

const trainingRows = computed(() =>
  store.getCharacters().map(char => {
    const assignment = store.getCharacterTrainingAssignment(char.id)
    const facility = trainingFacilities.find(item => item.attribute === assignment) ?? null
    const progress = assignment ? store.getCharacterTrainingProgress(char.id, assignment) : 0
    const remainingHours = assignment ? Math.max(0, (1 - progress) / TRAINING_RATE_PER_HOUR) : 0
    return {
      char,
      profession: getProfessionById(char.professionId)?.name || '未定职业',
      assignment,
      facility,
      progress,
      remainingHours,
    }
  }),
)

const activeTrainingCount = computed(() => trainingRows.value.filter(row => row.assignment).length)

function toggleIdle() {
  store.idle.isRunning = !store.idle.isRunning
  if (store.idle.isRunning) {
    store.idle.startTime = Date.now() - (store.idle.totalSeconds * 1000)
    store.addLog('挂机已开始', 'success')
  } else {
    store.addLog('挂机已暂停', 'warning')
  }
}

function setTraining(charId: string, attr: AttributeKey | null) {
  store.setCharacterTrainingAssignment(charId, attr)
}

function getProgressPct(progress: number): number {
  return Math.max(0, Math.min(100, progress * 100))
}
</script>

<template>
  <div class="cycle-page">
    <div class="card-panel" v-if="store.offlineReward.rewardPoints > 0 || store.offlineReward.xp > 0">
      <div class="card-header">
        <span class="card-title">离线奖励</span>
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

    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">再入轮回</span>
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
            <div class="stat-label">训练中角色</div>
            <div class="stat-value">{{ activeTrainingCount }}/{{ store.getCharacterCount() }}</div>
          </div>
        </div>

        <div class="action-buttons">
          <button
            class="action-btn claim"
            @click="store.claimOfflineReward()"
            :disabled="store.onlineReward.rewardPoints === 0 && store.onlineReward.xp === 0"
          >
            领取奖励
          </button>
          <button class="action-btn toggle" :class="{ active: store.idle.isRunning }" @click="toggleIdle()">
            {{ store.idle.isRunning ? '暂停挂机' : '开始挂机' }}
          </button>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">个人空间训练调度</span>
        <span class="card-badge">{{ activeTrainingCount }}/{{ store.getCharacterCount() }}</span>
      </div>
      <div class="card-body">
        <div class="training-intro">
          <span>挂机运行时，个人空间中的训练设施会同步生效。</span>
          <span>当前训练速率：每名角色每小时 {{ TRAINING_RATE_PER_HOUR }} 点属性进度。</span>
        </div>

        <div class="training-list">
          <div v-for="row in trainingRows" :key="row.char.id" class="training-card">
            <div class="training-head">
              <div class="training-identity">
                <div class="training-name">{{ row.char.name }}</div>
                <div class="training-prof">{{ row.profession }}</div>
              </div>
              <div class="training-state">
                <template v-if="row.facility">
                  <span class="training-facility">{{ row.facility.icon }} {{ row.facility.facility }}</span>
                  <span class="training-progress-text">
                    {{ row.facility.label }} {{ row.char.attributes[row.facility.attribute] }}/{{ store.attributeCap }}
                  </span>
                </template>
                <span v-else class="training-rest">待命中</span>
              </div>
            </div>

            <div class="training-bar">
              <div class="training-bar-fill" :style="{ width: getProgressPct(row.progress) + '%' }"></div>
            </div>

            <div class="training-foot">
              <span v-if="row.assignment" class="training-eta">预计 {{ row.remainingHours.toFixed(1) }} 小时后提升 1 点</span>
              <span v-else class="training-eta">未分配训练</span>
            </div>

            <div class="training-actions">
              <button
                class="training-btn"
                :class="{ active: row.assignment === null }"
                @click="setTraining(row.char.id, null)"
              >
                待命
              </button>
              <button
                v-for="facility in trainingFacilities"
                :key="facility.attribute"
                class="training-btn"
                :class="{ active: row.assignment === facility.attribute }"
                @click="setTraining(row.char.id, facility.attribute)"
              >
                {{ facility.icon }} {{ facility.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">选择地图</span>
        <span class="card-badge">{{ store.unlockedMaps.length }}/{{ GAME_MAPS.length }}</span>
      </div>
      <div class="card-body">
        <div class="map-list">
          <div
            v-for="map in GAME_MAPS"
            :key="map.id"
            :class="['map-item', {
              locked: !store.mapProgress.unlockedMaps.includes(map.id),
              active: store.idle.currentMapId === map.id,
            }]"
            @click="store.selectMap(map.id)"
          >
            <div class="map-icon-large">{{ map.icon }}</div>
            <div class="map-info">
              <div class="map-name-row">
                <span class="map-name">{{ map.name }}</span>
                <span class="map-tier-badge" :style="{ color: tierColors[map.tier] }">{{ map.tier }}级</span>
              </div>
              <div class="map-desc">{{ map.description }}</div>
              <div class="map-reward">每小时: 💎{{ map.rewardPerHour.rewardPoints }} ⚡{{ map.rewardPerHour.xp }}</div>
            </div>
            <div class="map-status">
              <span v-if="store.mapProgress.unlockedMaps.includes(map.id)" class="status-unlocked">已解锁</span>
              <span v-else class="status-locked">🔒 {{ map.unlockCondition }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <div class="card-header"><span class="card-title">挂机规则</span></div>
      <div class="card-body">
        <div class="rules-list">
          <div class="rule-item">
            <span class="rule-icon">01</span>
            <span>挂机地图继续提供奖励点与经验，训练设施则额外提供角色属性成长。</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">02</span>
            <span>通关副本可解锁下一张地图，离线奖励最多累计 5 小时。</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">03</span>
            <span>每名角色同一时刻只能进行一项六维训练，训练进度达到 100% 后自动加点。</span>
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
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
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

.reward-icon {
  font-size: 18px;
}

.reward-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--neon-amber);
}

.claim-btn,
.action-btn,
.training-btn {
  border: 1px solid var(--void-border);
  background: rgba(0, 240, 255, 0.04);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.2s var(--ease-fast);
  clip-path: var(--clip-corner-sm);
}

.claim-btn {
  padding: 10px 32px;
  color: var(--neon-green);
}

.claim-btn:hover,
.action-btn:hover,
.training-btn:hover {
  border-color: var(--void-border-strong);
  color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
}

.running-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--neon-green);
  padding: 2px 8px;
  background: rgba(57, 255, 20, 0.08);
  border: 1px solid rgba(57, 255, 20, 0.16);
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
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
  animation: orbPulse 3s ease-in-out infinite;
}

.idle-orb-ring {
  position: absolute;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.ring-1 {
  width: 50px;
  height: 50px;
  animation: ringRotate 8s linear infinite;
}

.ring-2 {
  width: 70px;
  height: 70px;
  animation: ringRotate 12s linear infinite reverse;
}

@keyframes orbPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orb-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--neon-amber);
  letter-spacing: 4px;
  margin-top: 6px;
}

.current-map {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--void-border);
  clip-path: var(--clip-corner-sm);
  margin-bottom: 12px;
}

.map-icon {
  font-size: 20px;
}

.map-name {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.map-tier {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-box,
.training-card,
.map-item,
.rule-item {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--void-border);
  clip-path: var(--clip-corner-sm);
}

.stat-box {
  padding: 8px;
  text-align: center;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.gold {
  color: var(--neon-amber);
}

.stat-value.jade {
  display: flex;
  justify-content: center;
  gap: 8px;
  color: var(--neon-green);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
}

.action-btn.claim {
  color: var(--neon-green);
}

.action-btn.claim:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.toggle {
  color: var(--neon-amber);
}

.training-intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.training-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.training-card {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.training-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.training-identity,
.training-state {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.training-name {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.training-prof,
.training-progress-text,
.training-eta,
.training-rest {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.training-facility {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--neon-cyan);
}

.training-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.training-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-green), var(--neon-cyan));
  box-shadow: 0 0 6px rgba(57, 255, 20, 0.24);
  transition: width 0.25s ease;
}

.training-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.training-btn {
  min-height: 34px;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.training-btn.active {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
}

.map-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.map-item:hover:not(.locked) {
  border-color: var(--void-border-strong);
  background: rgba(0, 240, 255, 0.04);
}

.map-item.active {
  border-color: var(--neon-amber);
  background: rgba(255, 176, 0, 0.08);
}

.map-item.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.map-icon-large {
  font-size: 32px;
}

.map-info {
  flex: 1;
  min-width: 0;
}

.map-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.map-tier-badge {
  font-family: var(--font-mono);
  font-size: 11px;
}

.map-desc {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
  line-height: 1.5;
}

.map-reward {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--neon-amber);
}

.map-status {
  display: flex;
  align-items: center;
}

.status-unlocked,
.status-locked {
  font-family: var(--font-mono);
  font-size: 11px;
}

.status-unlocked {
  color: var(--neon-green);
}

.status-locked {
  color: var(--text-muted);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.rule-icon {
  color: var(--neon-green);
  flex-shrink: 0;
}

@media (max-width: 980px) {
  .stats-grid,
  .training-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .training-head,
  .map-item {
    flex-direction: column;
  }
}
</style>
