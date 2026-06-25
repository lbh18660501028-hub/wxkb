<script setup lang="ts">
/**
 * 装备管理页面
 * 
 * 功能：
 * 1. 显示6个装备槽位（武器/盔甲/头盔/手套/鞋子/饰品）
 * 2. 可以从背包中选择物品装备到对应槽位
 * 3. 可以卸下已装备的物品
 * 4. 显示装备提供的属性加成总览
 * 5. 显示可装备的物品列表（按槽位筛选）
 */
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { getItemById, getItemsByCategory, shopItems } from '../../data/shop'
import { SLOT_NAMES, TIER_COLORS, CATEGORY_INFO, ESSENCE_INFO, formatStats as formatEquipmentStats, type EquipmentSlot, type ItemCategory } from '../../types/equipment'

const store = useGameStore()

// 当前选中的槽位（用于显示可装备物品列表）
const selectedSlot = ref<EquipmentSlot | null>(null)

// 6个装备槽位配置
const slots: EquipmentSlot[] = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory']

// 槽位对应的分类
const slotToCategory: Record<EquipmentSlot, ItemCategory> = {
  weapon: 'weapon',
  armor: 'armor',
  helmet: 'helmet',
  gloves: 'gloves',
  boots: 'boots',
  accessory: 'accessory',
}

// 获取槽位中已装备的物品
function getEquippedItem(slot: EquipmentSlot) {
  const itemId = store.equippedItems[slot]
  if (!itemId) return null
  return getItemById(itemId)
}

// 获取槽位中已装备的物品ID
function getEquippedItemId(slot: EquipmentSlot): string | null {
  return store.equippedItems[slot] || null
}

// 获取当前分类下可装备的物品（在背包中且未装备）
const availableItems = computed(() => {
  if (!selectedSlot.value) return []
  const category = slotToCategory[selectedSlot.value]
  return shopItems.filter(item => 
    item.category === category && 
    (store.inventory[item.id] || 0) > 0
  )
})

// 装备物品
function doEquip(itemId: string) {
  if (!selectedSlot.value) return
  store.equipItem(itemId, selectedSlot.value)
}

// 卸下装备
function doUnequip(slot: EquipmentSlot) {
  store.unequipItem(slot)
}

// 选择槽位
function selectSlot(slot: EquipmentSlot) {
  selectedSlot.value = selectedSlot.value === slot ? null : slot
}

// 计算装备总属性
const totalStats = computed(() => store.getEquipmentStats())

const totalStatsText = computed(() => formatEquipmentStats(totalStats.value))
</script>

<template>
  <div class="equip-container">
    <!-- 装备槽位区域 -->
    <div class="equip-slots">
      <div v-for="slot in slots" :key="slot" 
        class="equip-slot" 
        :class="{ active: selectedSlot === slot, occupied: getEquippedItem(slot) }"
        @click="selectSlot(slot)">
        
        <!-- 槽位标签 -->
        <div class="slot-label">{{ SLOT_NAMES[slot] }}</div>
        
        <!-- 槽位内容 -->
        <div class="slot-content">
          <template v-if="getEquippedItem(slot)">
            <span class="slot-icon">{{ getEquippedItem(slot)!.icon }}</span>
            <span class="slot-name">{{ getEquippedItem(slot)!.name }}</span>
            <span class="slot-tier" :style="{ color: TIER_COLORS[getEquippedItem(slot)!.tier] }">
              {{ getEquippedItem(slot)!.tier }}
            </span>
            <span v-if="getEquippedItem(slot)!.essence" class="slot-tier">
              {{ ESSENCE_INFO[getEquippedItem(slot)!.essence!].label }}
            </span>
          </template>
          <template v-else>
            <span class="slot-empty">空</span>
          </template>
        </div>
        
        <!-- 卸下按钮 -->
        <button v-if="getEquippedItem(slot)" class="unequip-btn" @click.stop="doUnequip(slot)">
          卸下
        </button>
      </div>
    </div>

    <!-- 属性总览 -->
    <div class="equip-stats">
      <div class="stats-title">📊 装备属性总览</div>
      <div class="stats-grid">
        <span v-if="totalStatsText" class="stat-item">{{ totalStatsText }}</span>
        <span v-else class="stat-empty">
          暂无装备属性加成
        </span>
      </div>
    </div>

    <!-- 可装备物品列表 -->
    <div v-if="selectedSlot" class="equip-available">
      <div class="available-title">
        📦 可装备物品 ({{ SLOT_NAMES[selectedSlot] }})
      </div>
      
      <div v-if="availableItems.length === 0" class="available-empty">
        背包中没有可装备的{{ SLOT_NAMES[selectedSlot] }}
      </div>
      
      <div v-else class="available-grid">
        <div v-for="item in availableItems" :key="item.id" class="available-item">
          <span class="ai-icon">{{ item.icon }}</span>
          <div class="ai-info">
            <span class="ai-name">{{ item.name }}</span>
            <span class="ai-tier" :style="{ color: TIER_COLORS[item.tier] }">{{ item.tier }}</span>
            <span v-if="item.essence" class="ai-qty">本质: {{ ESSENCE_INFO[item.essence].label }}</span>
            <span class="ai-qty">×{{ store.inventory[item.id] || 0 }}</span>
          </div>
          <button class="equip-btn" @click="doEquip(item.id)">装备</button>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div v-if="!selectedSlot" class="equip-hint">
      点击上方装备槽位查看可装备物品
    </div>
  </div>
</template>

<style scoped>
.equip-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* 装备槽位区域 */
.equip-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.equip-slot {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.equip-slot:hover {
  border-color: rgba(255,165,0,0.3);
}

.equip-slot.active {
  border-color: rgba(255,165,0,0.6);
  background: rgba(255,165,0,0.1);
}

.equip-slot.occupied {
  border-color: rgba(76,175,80,0.4);
}

.slot-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.slot-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.slot-icon {
  font-size: 24px;
}

.slot-name {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
  flex: 1;
}

.slot-tier {
  font-size: 11px;
  font-weight: 700;
}

.slot-empty {
  font-size: 13px;
  color: var(--color-text-muted);
}

.unequip-btn {
  margin-top: 8px;
  width: 100%;
  padding: 4px;
  background: rgba(220,50,50,0.1);
  border: 1px solid rgba(220,50,50,0.3);
  border-radius: 4px;
  color: #dc3232;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}

.unequip-btn:hover {
  background: rgba(220,50,50,0.2);
}

/* 属性总览 */
.equip-stats {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 12px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-item {
  font-size: 13px;
  color: var(--color-accent);
}

.stat-empty {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 可装备物品列表 */
.equip-available {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 12px;
}

.available-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.available-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 20px;
}

.available-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.available-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
}

.ai-icon {
  font-size: 20px;
}

.ai-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-name {
  font-size: 13px;
  color: var(--color-text);
}

.ai-tier {
  font-size: 11px;
  font-weight: 700;
}

.ai-qty {
  font-size: 11px;
  color: var(--color-text-muted);
}

.equip-btn {
  padding: 4px 12px;
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

/* 提示信息 */
.equip-hint {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 20px;
}
</style>
