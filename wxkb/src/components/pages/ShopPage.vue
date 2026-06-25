<script setup lang="ts">
/**
 * 商店页面组件
 * 
 * 功能：
 * 1. 按分类显示物品（消耗品/武器/盔甲/头盔/手套/鞋子/饰品）
 * 2. 支持单个购买和批量购买
 * 3. 显示物品属性加成
 * 4. 消耗品可直接使用
 */
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { shopItems } from '../../data/shop'
import { CATEGORY_INFO, ESSENCE_INFO, TIER_COLORS, formatStats as formatEquipmentStats, type ItemCategory, type ShopItemDef } from '../../types/equipment'

const store = useGameStore()

// 所有分类列表
const categories: ItemCategory[] = ['consumable', 'weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory', 'spell', 'skill']

// 当前选中的分类
const activeCategory = ref<ItemCategory>('consumable')

// 购买模式：single=单个，bulk=批量
const buyMode = ref<'single' | 'bulk'>('single')

// 批量购买数量
const bulkQty = ref(10)

// 当前分类下的物品列表
const filteredItems = computed(() => shopItems.filter(i => i.category === activeCategory.value))

// 获取物品持有数量
function getItemQty(item: ShopItemDef): number {
  return store.inventory[item.id] || 0
}

// 检查是否可以购买
function canBuy(item: ShopItemDef): boolean {
  const qty = buyMode.value === 'bulk' ? bulkQty.value : 1
  return store.rewardPoints >= item.price * qty
}

// 执行购买
function doBuy(item: ShopItemDef) {
  const qty = buyMode.value === 'bulk' ? bulkQty.value : 1
  store.buyItem(item.id, item.price, qty)
}

// 使用消耗品
function useItem(item: ShopItemDef) {
  if (store.useItem(item.id)) {
    // 根据效果类型处理
    if (item.effect?.startsWith('hp+')) {
      const amount = parseInt(item.effect.split('+')[1])
      store.addLog(`使用${item.name}，恢复${amount}点生命值`, 'success')
    } else if (item.effect?.startsWith('mp+')) {
      const amount = parseInt(item.effect.split('+')[1])
      store.addLog(`使用${item.name}，恢复${amount}点MP`, 'success')
    } else if (item.effect === 'cure_poison') {
      store.addLog(`使用${item.name}，解除中毒状态`, 'success')
    } else if (item.effect === 'revive') {
      store.addLog(`使用${item.name}，获得复活效果`, 'success')
    } else if (item.effect?.startsWith('learn_spell:')) {
      const spellId = item.effect.split(':')[1]
      store.learnSpell(spellId)
      store.addLog(`学会了法术：${item.name}`, 'success')
    } else if (item.effect?.startsWith('learn_skill:')) {
      const skillId = item.effect.split(':')[1]
      store.learnSkill(skillId)
      store.addLog(`学会了技能：${item.name}`, 'success')
    } else {
      store.addLog(`使用了${item.name}`, 'success')
    }
  }
}

// 格式化属性显示
function formatStats(stats: NonNullable<ShopItemDef['stats']>): string {
  return formatEquipmentStats(stats)
}
</script>

<template>
  <div class="shop-container">
    <!-- 分类标签栏 -->
    <div class="shop-tabs">
      <button v-for="cat in categories" :key="cat"
        class="shop-tab" :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat">
        {{ CATEGORY_INFO[cat].icon }} {{ CATEGORY_INFO[cat].label }}
      </button>
    </div>

    <!-- 购买模式切换 -->
    <div class="shop-controls">
      <div class="shop-mode">
        <button class="mode-btn" :class="{ active: buyMode === 'single' }" 
          @click="buyMode = 'single'">单个</button>
        <button class="mode-btn" :class="{ active: buyMode === 'bulk' }" 
          @click="buyMode = 'bulk'">批量</button>
        <input v-if="buyMode === 'bulk'" v-model.number="bulkQty" 
          type="number" min="1" max="99" class="bulk-input">
      </div>
      <div class="shop-balance">💎 {{ store.rewardPoints }}</div>
    </div>

    <!-- 物品网格 -->
    <div class="shop-grid">
      <div v-for="item in filteredItems" :key="item.id" class="shop-card">
        <!-- 物品头部：图标和等级 -->
        <div class="sc-header">
          <span class="sc-icon">{{ item.icon }}</span>
          <span class="sc-tier" :style="{ color: TIER_COLORS[item.tier] }">{{ item.tier }}</span>
        </div>
        
        <!-- 物品名称和描述 -->
        <div class="sc-name">{{ item.name }}</div>
        <div class="sc-desc">{{ item.description }}</div>
        
        <!-- 属性加成（装备类物品） -->
        <div v-if="item.stats" class="sc-stats">
          {{ formatStats(item.stats) }}
        </div>

        <div v-if="item.essence" class="sc-effect">
          本质：{{ ESSENCE_INFO[item.essence].label }}
        </div>
        
        <!-- 效果描述（消耗品类物品） -->
        <div v-if="item.effect" class="sc-effect">
          {{ item.effect.startsWith('hp+') ? `恢复${item.effect.split('+')[1]}点HP` :
             item.effect.startsWith('mp+') ? `恢复${item.effect.split('+')[1]}点MP` :
             item.effect === 'cure_poison' ? '解除中毒' :
             item.effect === 'revive' ? '自动复活' : item.effect }}
        </div>
        
        <!-- 底部：价格、持有量、操作按钮 -->
        <div class="sc-footer">
          <div class="sc-info">
            <span class="sc-price">💎 {{ item.price }}</span>
            <span class="sc-owned">持有: {{ getItemQty(item) }}</span>
          </div>
          <div class="sc-actions">
            <button class="buy-btn" :disabled="!canBuy(item)" @click="doBuy(item)">
              {{ buyMode === 'bulk' ? `×${bulkQty}` : '购买' }}
            </button>
            <button v-if="item.effect && getItemQty(item) > 0" class="use-btn" @click="useItem(item)">
              使用
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* 分类标签栏 */
.shop-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.shop-tab {
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

.shop-tab.active {
  background: rgba(255,165,0,0.15);
  border-color: rgba(255,165,0,0.4);
  color: #ffa500;
}

.shop-tab:hover:not(.active) {
  background: rgba(0,0,0,0.3);
}

/* 控制栏：购买模式和余额 */
.shop-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shop-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-btn {
  padding: 6px 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.mode-btn.active {
  background: rgba(255,165,0,0.15);
  border-color: rgba(255,165,0,0.4);
  color: #ffa500;
}

.bulk-input {
  width: 50px;
  padding: 6px 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 12px;
  text-align: center;
  font-family: inherit;
}

.shop-balance {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

/* 物品网格 */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* 物品卡片 */
.shop-card {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
}

.shop-card:hover {
  border-color: rgba(255,165,0,0.3);
  background: rgba(0,0,0,0.25);
}

.sc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sc-icon {
  font-size: 24px;
}

.sc-tier {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  background: rgba(0,0,0,0.3);
  border-radius: 3px;
}

.sc-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.sc-desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

.sc-stats {
  font-size: 11px;
  color: var(--color-accent);
}

.sc-effect {
  font-size: 11px;
  color: #4caf50;
}

.sc-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-secondary);
}

.sc-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.sc-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
}

.sc-owned {
  font-size: 11px;
  color: var(--color-text-muted);
}

.sc-actions {
  display: flex;
  gap: 6px;
}

.buy-btn, .use-btn {
  flex: 1;
  padding: 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.buy-btn {
  background: rgba(255,165,0,0.15);
  border: 1px solid rgba(255,165,0,0.4);
  color: #ffa500;
}

.buy-btn:hover:not(:disabled) {
  background: rgba(255,165,0,0.25);
}

.buy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.use-btn {
  background: rgba(76,175,80,0.15);
  border: 1px solid rgba(76,175,80,0.4);
  color: #4caf50;
}

.use-btn:hover {
  background: rgba(76,175,80,0.25);
}
</style>
