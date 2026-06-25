<script setup lang="ts">
/**
 * 基因锁页面
 * 
 * 功能：
 * 1. 显示5阶基因锁状态
 * 2. 显示每阶的被动效果和主动效果
 * 3. 可以尝试解锁下一阶
 * 4. 可以激活/解除主动效果
 * 5. 显示熟练度进度
 */
import { computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { GENE_LOCK_TIERS, calculateUnlockChance } from '../../data/geneLock'

const store = useGameStore()

// 获取当前基因锁状态
const geneLock = computed(() => store.geneLock)

// 获取每阶的状态
function getTierStatus(tier: number) {
  const config = GENE_LOCK_TIERS[tier - 1]
  const isUnlocked = geneLock.value.tier >= tier
  const isActive = geneLock.value.active && geneLock.value.activeTier === tier
  const proficiency = geneLock.value.proficiency[tier - 1] || 0
  const maxProficiency = config.maxProficiency
  const progress = maxProficiency > 0 ? (proficiency / maxProficiency) * 100 : 0
  
  // 计算解锁概率
  const hpPercent = store.hpMax > 0 ? 70 : 100 // 简化处理
  const unlockChance = calculateUnlockChance(tier, hpPercent, 100, proficiency)
  
  return {
    config,
    isUnlocked,
    isActive,
    proficiency,
    maxProficiency,
    progress,
    unlockChance,
    canUnlock: tier === geneLock.value.tier + 1, // 只能解锁下一阶
    canActivate: isUnlocked && !geneLock.value.active,
  }
}

// 尝试解锁
function tryUnlock(tier: number) {
  store.tryUnlockGeneLock(tier)
}

// 激活
function activate(tier: number) {
  store.activateGeneLock(tier)
}

// 解除
function deactivate() {
  store.deactivateGeneLock()
}
</script>

<template>
  <div class="gene-container">
    <!-- 基因锁概览 -->
    <div class="gene-overview">
      <div class="go-title">🧬 基因锁系统</div>
      <div class="go-desc">基因锁 = 被动效果（永久） + 主动效果（消耗意志力）</div>
      <div class="go-status">
        <span>当前阶位: 第{{ geneLock.tier }}阶</span>
        <span v-if="geneLock.active" class="go-active">
          激活中: 第{{ geneLock.activeTier }}阶
        </span>
      </div>
    </div>

    <!-- 5阶基因锁列表 -->
    <div class="gene-tiers">
      <div v-for="tier in 5" :key="tier" 
        class="gene-tier"
        :class="{ 
          unlocked: getTierStatus(tier).isUnlocked,
          active: getTierStatus(tier).isActive,
          locked: !getTierStatus(tier).isUnlocked && tier > geneLock.tier + 1
        }">
        
        <!-- 阶位头部 -->
        <div class="gt-header">
          <span class="gt-num">{{ tier }}</span>
          <span class="gt-name">{{ getTierStatus(tier).config.name }}</span>
          <span v-if="getTierStatus(tier).isActive" class="gt-badge active">激活中</span>
          <span v-else-if="getTierStatus(tier).isUnlocked" class="gt-badge unlocked">已解锁</span>
          <span v-else class="gt-badge locked">未解锁</span>
        </div>

        <!-- 描述 -->
        <div class="gt-desc">{{ getTierStatus(tier).config.description }}</div>

        <!-- 效果 -->
        <div class="gt-effects">
          <div class="gt-effect">
            <span class="ge-label">被动:</span>
            <span class="ge-value">全属性+{{ getTierStatus(tier).config.passive.allStats }}</span>
          </div>
          <div class="gt-effect">
            <span class="ge-label">主动:</span>
            <span class="ge-value">
              全属性+{{ getTierStatus(tier).config.active.allStats }},
              暴击+{{ getTierStatus(tier).config.active.crit * 100 }}%,
              闪避+{{ getTierStatus(tier).config.active.dodge * 100 }}%
            </span>
          </div>
          <div class="gt-effect">
            <span class="ge-label">消耗:</span>
            <span class="ge-value">{{ getTierStatus(tier).config.active.costPerTurn }}意志/回合</span>
          </div>
        </div>

        <!-- 熟练度 -->
        <div class="gt-proficiency">
          <div class="gp-label">
            熟练度: {{ getTierStatus(tier).proficiency }} / {{ getTierStatus(tier).maxProficiency }}
          </div>
          <div class="gp-bar">
            <div class="gp-fill" :style="{ width: getTierStatus(tier).progress + '%' }"></div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="gt-actions">
          <!-- 解锁按钮 -->
          <button v-if="getTierStatus(tier).canUnlock && !getTierStatus(tier).isUnlocked" 
            class="unlock-btn"
            @click="tryUnlock(tier)">
            尝试解锁 (概率: {{ (getTierStatus(tier).unlockChance * 100).toFixed(1) }}%)
          </button>
          
          <!-- 激活按钮 -->
          <button v-if="getTierStatus(tier).isUnlocked && !getTierStatus(tier).isActive && !geneLock.active"
            class="activate-btn"
            @click="activate(tier)">
            激活
          </button>
          
          <!-- 解除按钮 -->
          <button v-if="getTierStatus(tier).isActive"
            class="deactivate-btn"
            @click="deactivate">
            解除
          </button>
          
          <!-- 已激活其他阶位 -->
          <span v-if="geneLock.active && !getTierStatus(tier).isActive && getTierStatus(tier).isUnlocked" 
            class="gt-hint">
            已激活其他阶位
          </span>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="gene-hint">
      <p>💡 基因锁被动效果在解锁后永久生效</p>
      <p>💡 主动效果需要手动激活，每回合消耗意志力</p>
      <p>💡 低HP时解锁概率更高（一阶）</p>
    </div>
  </div>
</template>

<style scoped>
.gene-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* 概览区域 */
.gene-overview {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 16px;
}

.go-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.go-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.go-status {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--color-text);
}

.go-active {
  color: #4caf50;
  font-weight: 600;
}

/* 基因锁列表 */
.gene-tiers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gene-tier {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.gene-tier.unlocked {
  border-color: rgba(76,175,80,0.4);
}

.gene-tier.active {
  border-color: rgba(255,165,0,0.6);
  background: rgba(255,165,0,0.1);
}

.gene-tier.locked {
  opacity: 0.6;
}

/* 阶位头部 */
.gt-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.gt-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.gene-tier.unlocked .gt-num {
  background: rgba(76,175,80,0.3);
  color: #4caf50;
}

.gene-tier.active .gt-num {
  background: rgba(255,165,0,0.3);
  color: #ffa500;
}

.gt-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.gt-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.gt-badge.active {
  background: rgba(255,165,0,0.2);
  color: #ffa500;
}

.gt-badge.unlocked {
  background: rgba(76,175,80,0.2);
  color: #4caf50;
}

.gt-badge.locked {
  background: rgba(0,0,0,0.3);
  color: var(--color-text-muted);
}

/* 描述 */
.gt-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

/* 效果 */
.gt-effects {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.gt-effect {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.ge-label {
  color: var(--color-text-muted);
  min-width: 36px;
}

.ge-value {
  color: var(--color-accent);
}

/* 熟练度 */
.gt-proficiency {
  margin-bottom: 12px;
}

.gp-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.gp-bar {
  height: 6px;
  background: rgba(0,0,0,0.3);
  border-radius: 3px;
  overflow: hidden;
}

.gp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 3px;
  transition: width 0.3s;
}

/* 操作按钮 */
.gt-actions {
  display: flex;
  gap: 8px;
}

.unlock-btn, .activate-btn, .deactivate-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.unlock-btn {
  background: rgba(156,39,176,0.15);
  border: 1px solid rgba(156,39,176,0.4);
  color: #9c27b0;
}

.unlock-btn:hover {
  background: rgba(156,39,176,0.25);
}

.activate-btn {
  background: rgba(76,175,80,0.15);
  border: 1px solid rgba(76,175,80,0.4);
  color: #4caf50;
}

.activate-btn:hover {
  background: rgba(76,175,80,0.25);
}

.deactivate-btn {
  background: rgba(220,50,50,0.15);
  border: 1px solid rgba(220,50,50,0.4);
  color: #dc3232;
}

.deactivate-btn:hover {
  background: rgba(220,50,50,0.25);
}

.gt-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 提示信息 */
.gene-hint {
  background: rgba(0,0,0,0.1);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.8;
}
</style>
