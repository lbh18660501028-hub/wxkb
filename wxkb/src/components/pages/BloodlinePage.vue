<script setup lang="ts">
/**
 * 血统系统页面
 * 
 * 功能：
 * 1. 显示当前装备的血统
 * 2. 浏览所有可用血统
 * 3. 按分类筛选血统
 * 4. 装备/卸下血统
 * 5. 显示血统属性加成和特性
 */
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { bloodlines, getBloodlineById, type BloodlineConfig, type BloodlineCategory } from '../../data/bloodline'

const store = useGameStore()

// 当前选中的分类
const selectedCategory = ref<BloodlineCategory | 'all'>('all')

// 分类列表
const categories: { id: BloodlineCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'human', label: '人类', icon: '👤' },
  { id: 'nonhuman', label: '非人类', icon: '🐺' },
  { id: 'dark', label: '黑暗', icon: '🌑' },
  { id: 'light', label: '光明', icon: '☀️' },
]

// 筛选后的血统列表
const filteredBloodlines = computed(() => {
  if (selectedCategory.value === 'all') return bloodlines
  return bloodlines.filter(b => b.category === selectedCategory.value)
})

// 当前装备的血统
const currentBloodline = computed(() => {
  if (!store.equippedBloodline) return null
  return getBloodlineById(store.equippedBloodline)
})

// 等级颜色
const tierColors: Record<string, string> = {
  D: '#8b8b8b', C: '#4a9eff', B: '#a855f7', A: '#f59e0b', S: '#ef4444',
  DD: '#5a9eff', CC: '#7a6fff', BB: '#c070ff', AA: '#ffb020',
}

// 装备血统
function doEquip(bloodline: BloodlineConfig) {
  store.equipBloodline(bloodline.id)
}

// 卸下血统
function doUnequip() {
  store.unequipBloodline()
}

// 格式化属性显示
function formatStats(stats: BloodlineConfig['stats']): string {
  const parts: string[] = []
  if (stats.strength) parts.push(`肌肉+${stats.strength}`)
  if (stats.reaction) parts.push(`反应+${stats.reaction}`)
  if (stats.intelligence) parts.push(`智力+${stats.intelligence}`)
  if (stats.vitality) parts.push(`活力+${stats.vitality}`)
  if (stats.spirit) parts.push(`精神+${stats.spirit}`)
  if (stats.immunity) parts.push(`免疫+${stats.immunity}`)
  return parts.join(' ')
}
</script>

<template>
  <div class="blood-container">
    <!-- 当前血统 -->
    <div class="current-bloodline">
      <div class="cb-title">🩸 当前血统</div>
      <div v-if="currentBloodline" class="cb-info">
        <div class="cb-header">
          <span class="cb-name">{{ currentBloodline.name }}</span>
          <span class="cb-tier" :style="{ color: tierColors[currentBloodline.tier] }">
            {{ currentBloodline.tier }}级
          </span>
        </div>
        <div class="cb-stats">{{ formatStats(currentBloodline.stats) }}</div>
        <div class="cb-traits">
          <div v-for="trait in currentBloodline.traits" :key="trait.name" class="cb-trait">
            <span class="trait-name">{{ trait.name }}:</span>
            <span class="trait-desc">{{ trait.description }}</span>
          </div>
        </div>
        <button class="unequip-btn" @click="doUnequip">卸下血统</button>
      </div>
      <div v-else class="cb-empty">未装备血统</div>
    </div>

    <!-- 分类筛选 -->
    <div class="blood-tabs">
      <button v-for="cat in categories" :key="cat.id"
        class="blood-tab" :class="{ active: selectedCategory === cat.id }"
        @click="selectedCategory = cat.id">
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- 血统列表 -->
    <div class="blood-grid">
      <div v-for="bloodline in filteredBloodlines" :key="bloodline.id" 
        class="blood-card"
        :class="{ equipped: store.equippedBloodline === bloodline.id }">
        
        <!-- 头部 -->
        <div class="bc-header">
          <span class="bc-name">{{ bloodline.name }}</span>
          <span class="bc-tier" :style="{ color: tierColors[bloodline.tier] }">
            {{ bloodline.tier }}
          </span>
        </div>
        
        <!-- 分类和价格 -->
        <div class="bc-meta">
          <span class="bc-category">{{ bloodline.category }}</span>
          <span class="bc-price">💎 {{ bloodline.price }}</span>
        </div>
        
        <!-- 属性加成 -->
        <div class="bc-stats">{{ formatStats(bloodline.stats) }}</div>
        
        <!-- 特性 -->
        <div class="bc-traits">
          <div v-for="trait in bloodline.traits" :key="trait.name" class="bc-trait">
            <span class="trait-icon">✦</span>
            <span class="trait-name">{{ trait.name }}</span>
          </div>
        </div>
        
        <!-- 描述 -->
        <div class="bc-desc">{{ bloodline.description }}</div>
        
        <!-- 操作按钮 -->
        <button v-if="store.equippedBloodline === bloodline.id" 
          class="equipped-badge">
          已装备
        </button>
        <button v-else class="equip-btn" @click="doEquip(bloodline)">
          装备
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blood-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* 当前血统 */
.current-bloodline {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 16px;
}

.cb-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.cb-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cb-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cb-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.cb-tier {
  font-size: 14px;
  font-weight: 700;
}

.cb-stats {
  font-size: 13px;
  color: var(--color-accent);
}

.cb-traits {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cb-trait {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.trait-name {
  font-weight: 600;
  color: var(--color-text);
}

.trait-desc {
  color: var(--color-text-muted);
}

.unequip-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(220,50,50,0.1);
  border: 1px solid rgba(220,50,50,0.3);
  border-radius: 4px;
  color: #dc3232;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  align-self: flex-start;
}

.unequip-btn:hover {
  background: rgba(220,50,50,0.2);
}

.cb-empty {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* 分类标签 */
.blood-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.blood-tab {
  padding: 8px 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.blood-tab.active {
  background: rgba(255,165,0,0.15);
  border-color: rgba(255,165,0,0.4);
  color: #ffa500;
}

.blood-tab:hover:not(.active) {
  background: rgba(0,0,0,0.3);
}

/* 血统网格 */
.blood-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.blood-card {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
}

.blood-card:hover {
  border-color: rgba(255,165,0,0.3);
}

.blood-card.equipped {
  border-color: rgba(76,175,80,0.5);
  background: rgba(76,175,80,0.05);
}

/* 头部 */
.bc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bc-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.bc-tier {
  font-size: 12px;
  font-weight: 700;
}

/* 元信息 */
.bc-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-muted);
}

.bc-price {
  color: var(--color-accent);
}

/* 属性 */
.bc-stats {
  font-size: 12px;
  color: var(--color-accent);
}

/* 特性 */
.bc-traits {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bc-trait {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.trait-icon {
  color: var(--color-accent);
}

.trait-name {
  font-weight: 500;
}

/* 描述 */
.bc-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* 按钮 */
.equip-btn {
  margin-top: auto;
  padding: 6px;
  background: rgba(76,175,80,0.15);
  border: 1px solid rgba(76,175,80,0.4);
  border-radius: 4px;
  color: #4caf50;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.equip-btn:hover {
  background: rgba(76,175,80,0.25);
}

.equipped-badge {
  margin-top: auto;
  padding: 6px;
  background: rgba(76,175,80,0.2);
  border: 1px solid rgba(76,175,80,0.5);
  border-radius: 4px;
  color: #4caf50;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}
</style>
