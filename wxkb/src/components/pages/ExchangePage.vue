<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../../stores/game'

const store = useGameStore()

type Tier = 'D' | 'C' | 'B' | 'A' | 'S'
const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D']
const tierColors: Record<Tier, string> = { D: '#8b8b8b', C: '#4a9eff', B: '#a855f7', A: '#f59e0b', S: '#ef4444' }
const tierValues: Record<Tier, number> = { D: 1, C: 3, B: 9, A: 27, S: 81 }

const exchangeAmount = ref<Record<Tier, number>>({ D: 0, C: 0, B: 0, A: 0, S: 0 })
const mode = ref<'toPoints' | 'toLower'>('toPoints')

function getMaxExchange(tier: Tier): number {
  return store.sidePlots[tier]
}

function setMax(tier: Tier) {
  exchangeAmount.value[tier] = getMaxExchange(tier)
}

function getPointsValue(tier: Tier): number {
  return exchangeAmount.value[tier] * tierValues[tier]
}

function getTotalPoints(): number {
  let total = 0
  for (const t of tiers) {
    total += getPointsValue(t)
  }
  return total
}

function doExchangeToPoints() {
  let total = 0
  for (const t of tiers) {
    const amt = exchangeAmount.value[t]
    if (amt > 0 && amt <= store.sidePlots[t]) {
      total += amt * tierValues[t]
      store.sidePlots[t] -= amt
    }
  }
  if (total > 0) {
    store.rewardPoints += total
    store.addLog(`支线兑换: 获得 💎${total} 奖励点`, 'gold')
    exchangeAmount.value = { D: 0, C: 0, B: 0, A: 0, S: 0 }
  }
}

function doExchangeToLower(fromTier: Tier, toTier: Tier) {
  const fromIdx = tiers.indexOf(fromTier)
  const toIdx = tiers.indexOf(toTier)
  if (fromIdx >= toIdx) return
  
  const ratio = Math.pow(3, toIdx - fromIdx)
  const available = store.sidePlots[fromTier]
  const maxExchange = Math.floor(available / ratio) * ratio
  if (maxExchange <= 0) return
  
  const exchangeCount = maxExchange
  const gained = exchangeCount / ratio
  
  store.sidePlots[fromTier] -= exchangeCount
  store.sidePlots[toTier] += gained
  store.addLog(`支线兑换: ${exchangeCount}个${fromTier}级 → ${gained}个${toTier}级`, 'gold')
}

function canExchangeToLower(): boolean {
  for (const t of tiers) {
    if (t !== 'D' && store.sidePlots[t] >= 3) return true
  }
  return false
}
</script>

<template>
  <div class="exchange-container">
    <!-- 兑换为奖励点 -->
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">💎 兑换为奖励点</span>
      </div>
      <div class="card-body">
        <div class="exchange-info">3:1 比例，高级支线可兑换更多奖励点</div>
        
        <div class="exchange-list">
          <div v-for="tier in tiers" :key="tier" class="exchange-row">
            <div class="er-left">
              <span class="er-tier" :style="{ color: tierColors[tier] }">{{ tier }}级</span>
              <span class="er-hold">持有: {{ store.sidePlots[tier] }}</span>
            </div>
            <div class="er-center">
              <button class="er-btn" @click="setMax(tier)" :disabled="store.sidePlots[tier] === 0">最大</button>
              <input type="number" v-model.number="exchangeAmount[tier]" :min="0" :max="store.sidePlots[tier]" class="er-input">
              <span class="er-equal">=</span>
              <span class="er-points">💎{{ getPointsValue(tier) }}</span>
            </div>
          </div>
        </div>

        <div class="exchange-total" v-if="getTotalPoints() > 0">
          合计: 💎 {{ getTotalPoints() }} 奖励点
        </div>

        <button class="exchange-btn" :disabled="getTotalPoints() === 0" @click="doExchangeToPoints">
          确认兑换
        </button>
      </div>
    </div>

    <!-- 高级兑换低级 -->
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">📋 高级兑换低级</span>
      </div>
      <div class="card-body">
        <div class="exchange-info">3个高级 = 1个低级</div>

        <div class="convert-grid">
          <template v-for="(tier, i) in tiers" :key="tier">
            <div v-if="i < tiers.length - 1" class="convert-row">
              <span class="cv-from" :style="{ color: tierColors[tier] }">{{ tier }}级 ×{{ store.sidePlots[tier] }}</span>
              <span class="cv-arrow">→</span>
              <span class="cv-to" :style="{ color: tierColors[tiers[i+1]] }">{{ tiers[i+1] }}级 ×{{ store.sidePlots[tiers[i+1]] }}</span>
              <button class="cv-btn" 
                :disabled="store.sidePlots[tier] < 3"
                @click="doExchangeToLower(tier, tiers[i+1])">
                3→1
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exchange-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.exchange-info {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  text-align: center;
}

.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.exchange-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  gap: 12px;
}

.er-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.er-tier {
  font-size: 14px;
  font-weight: 700;
}

.er-hold {
  font-size: 12px;
  color: var(--color-text-muted);
}

.er-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.er-btn {
  padding: 4px 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}

.er-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.5);
}

.er-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.er-input {
  width: 60px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 13px;
  text-align: center;
  font-family: inherit;
}

.er-input:focus {
  outline: none;
  border-color: rgba(255,165,0,0.5);
}

.er-equal {
  color: var(--color-text-muted);
  font-size: 14px;
}

.er-points {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  min-width: 60px;
  text-align: right;
}

.exchange-total {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.exchange-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255,165,0,0.2) 0%, rgba(255,100,0,0.15) 100%);
  border: 1px solid rgba(255,165,0,0.4);
  border-radius: 8px;
  color: #ffa500;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.exchange-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(255,165,0,0.3) 0%, rgba(255,100,0,0.25) 100%);
}

.exchange-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.convert-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.convert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  gap: 12px;
}

.cv-from, .cv-to {
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
}

.cv-arrow {
  color: var(--color-text-muted);
  font-size: 16px;
}

.cv-btn {
  padding: 4px 12px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.cv-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.5);
  border-color: rgba(255,165,0,0.3);
}

.cv-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
