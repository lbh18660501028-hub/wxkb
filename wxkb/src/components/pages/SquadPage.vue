<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { PROFESSIONS, getProfessionById } from '../../data/characterCreate'
import { getItemById, shopItems } from '../../data/shop'
import { COMPANION_CONFIG, getRecruitCost } from '../../data/companion'
import { SLOT_NAMES, TIER_COLORS, formatStats as formatEquipmentStats, type EquipmentSlot } from '../../types/equipment'
import type { Companion, Attributes } from '../../types/game'

const store = useGameStore()

const showRecruitPanel = ref(false)
const recruitName = ref('')
const recruitProfession = ref('')
const selectedCompanion = ref<string | null>(null)
const selectedSlot = ref<EquipmentSlot | null>(null)

const companions = computed(() => store.getCompanions())
const recruitCost = computed(() => getRecruitCost(companions.value.length))
const canRecruit = computed(() => store.canRecruitCompanion())

const slots: EquipmentSlot[] = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory']

const selectedCompanionData = computed(() => {
  if (!selectedCompanion.value) return null
  return companions.value.find(c => c.id === selectedCompanion.value) || null
})

const companionCombatStats = computed(() => {
  if (!selectedCompanionData.value) return null
  return store.getCompanionCombatStats(selectedCompanionData.value)
})

const availableItems = computed(() => {
  if (!selectedSlot.value || !selectedCompanionData.value) return []
  const categoryMap: Record<string, string> = {
    weapon: 'weapon', armor: 'armor', helmet: 'helmet',
    gloves: 'gloves', boots: 'boots', accessory: 'accessory',
  }
  const category = categoryMap[selectedSlot.value]
  return shopItems.filter(item =>
    item.category === category &&
    (store.inventory[item.id] || 0) > 0
  )
})

function doRecruit() {
  if (!recruitName.value.trim() || !recruitProfession.value) return
  const success = store.recruitCompanion(recruitName.value.trim(), recruitProfession.value, 'male')
  if (success) {
    showRecruitPanel.value = false
    recruitName.value = ''
    recruitProfession.value = ''
  }
}

function doRemove(id: string) {
  store.removeCompanion(id)
  if (selectedCompanion.value === id) selectedCompanion.value = null
}

function selectCompanion(id: string) {
  selectedCompanion.value = selectedCompanion.value === id ? null : id
  selectedSlot.value = null
}

function selectSlot(slot: EquipmentSlot) {
  selectedSlot.value = selectedSlot.value === slot ? null : slot
}

function doEquip(itemId: string) {
  if (!selectedCompanion.value || !selectedSlot.value) return
  store.equipCompanionItem(selectedCompanion.value, itemId, selectedSlot.value)
}

function doUnequip(slot: EquipmentSlot) {
  if (!selectedCompanion.value) return
  store.unequipCompanionItem(selectedCompanion.value, slot)
}

function doUpgradeAttr(attr: keyof Attributes) {
  if (!selectedCompanion.value) return
  store.upgradeCompanionAttribute(selectedCompanion.value, attr)
}

const attrDefs = [
  { key: 'intelligence' as const, label: '智力', icon: '🧠', color: '#9d4edd' },
  { key: 'spirit' as const, label: '精神力', icon: '💎', color: '#5080b0' },
  { key: 'vitality' as const, label: '细胞活力', icon: '❤', color: '#c04040' },
  { key: 'reaction' as const, label: '神经反应', icon: '⚡', color: '#d4a85a' },
  { key: 'strength' as const, label: '肌肉强度', icon: '💪', color: '#ff6b35' },
  { key: 'immunity' as const, label: '免疫强度', icon: '🛡', color: '#50a080' },
]
</script>

<template>
  <div class="companion-page">
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">👥 轮回小队</span>
        <span class="card-subtitle">{{ companions.length }}/{{ COMPANION_CONFIG.MAX_COMPANIONS }}</span>
      </div>
      <div class="card-body">
        <!-- 招募按钮 -->
        <button
          v-if="companions.length < COMPANION_CONFIG.MAX_COMPANIONS"
          class="recruit-btn"
          :disabled="!canRecruit"
          @click="showRecruitPanel = !showRecruitPanel"
        >
          <span class="recruit-icon">➕</span>
          <span>向主神请求新队友</span>
          <span class="recruit-cost">💎{{ recruitCost }}</span>
        </button>
        <div v-else class="max-reached">队友数量已达上限</div>

        <!-- 招募面板 -->
        <div v-if="showRecruitPanel" class="recruit-panel">
          <div class="recruit-field">
            <label>队友名称</label>
            <input v-model="recruitName" placeholder="输入名字" maxlength="8" />
          </div>
          <div class="recruit-field">
            <label>选择职业</label>
            <div class="profession-grid">
              <button
                v-for="prof in PROFESSIONS"
                :key="prof.id"
                class="prof-btn"
                :class="{ selected: recruitProfession === prof.id }"
                @click="recruitProfession = prof.id"
              >
                <span class="prof-icon">{{ prof.icon }}</span>
                <span class="prof-name">{{ prof.name }}</span>
                <span class="prof-pos">{{ prof.position }}</span>
              </button>
            </div>
          </div>
          <div class="recruit-actions">
            <button class="btn-cancel" @click="showRecruitPanel = false">取消</button>
            <button
              class="btn-confirm"
              :disabled="!recruitName.trim() || !recruitProfession || !canRecruit"
              @click="doRecruit"
            >
              确认招募 💎{{ recruitCost }}
            </button>
          </div>
        </div>

        <!-- 队友列表 -->
        <div class="companion-list">
          <div
            v-for="companion in companions"
            :key="companion.id"
            class="companion-card"
            :class="{ selected: selectedCompanion === companion.id }"
            @click="selectCompanion(companion.id)"
          >
            <div class="companion-header">
              <span class="companion-icon">{{ getProfessionById(companion.professionId)?.icon || '?' }}</span>
              <div class="companion-info">
                <span class="companion-name">{{ companion.name }}</span>
                <span class="companion-class">{{ getProfessionById(companion.professionId)?.name || '未知' }}</span>
              </div>
              <button class="btn-remove" @click.stop="doRemove(companion.id)" title="离队">✕</button>
            </div>
            <div class="companion-stats-row">
              <span>⚔️{{ store.getCompanionCombatStats(companion).attack }}</span>
              <span>❤{{ store.getCompanionCombatStats(companion).hpMax }}</span>
            </div>
          </div>

          <div v-if="companions.length === 0" class="empty-hint">
            <div class="empty-icon">👥</div>
            <div class="empty-text">还没有队友</div>
            <div class="empty-sub">点击上方按钮向主神请求</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 队友详情面板 -->
    <div v-if="selectedCompanionData" class="card-panel detail-panel">
      <div class="card-header">
        <span class="card-title">
          {{ getProfessionById(selectedCompanionData.professionId)?.icon }}
          {{ selectedCompanionData.name }} - {{ getProfessionById(selectedCompanionData.professionId)?.name }}
        </span>
      </div>
      <div class="card-body">
        <!-- 属性 -->
        <div class="attr-section">
          <div class="section-title">基础属性</div>
          <div class="attr-grid">
            <div v-for="attr in attrDefs" :key="attr.key" class="attr-row">
              <span class="attr-icon" :style="{ color: attr.color }">{{ attr.icon }}</span>
              <span class="attr-label">{{ attr.label }}</span>
              <span class="attr-value">{{ selectedCompanionData.attributes[attr.key] }}</span>
              <button class="btn-upgrade-sm" @click="doUpgradeAttr(attr.key)">
                升级 💎{{ store.getAttributeCost(selectedCompanionData.attributes[attr.key]) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 战斗属性 -->
        <div v-if="companionCombatStats" class="combat-section">
          <div class="section-title">战斗属性</div>
          <div class="combat-grid">
            <div class="combat-stat">
              <span class="combat-label">总攻击力</span>
              <span class="combat-value gold">{{ companionCombatStats.attack }}</span>
            </div>
            <div class="combat-stat">
              <span class="combat-label">最大HP</span>
              <span class="combat-value">{{ companionCombatStats.hpMax }}</span>
            </div>
            <div class="combat-stat">
              <span class="combat-label">科技攻击</span>
              <span class="combat-value">{{ companionCombatStats.techAttack }}</span>
            </div>
            <div class="combat-stat">
              <span class="combat-label">魔幻攻击</span>
              <span class="combat-value">{{ companionCombatStats.fantAttack }}</span>
            </div>
            <div class="combat-stat">
              <span class="combat-label">特异攻击</span>
              <span class="combat-value">{{ companionCombatStats.abnAttack }}</span>
            </div>
          </div>
        </div>

        <!-- 装备 -->
        <div class="equip-section">
          <div class="section-title">装备</div>
          <div class="equip-slots">
            <div
              v-for="slot in slots"
              :key="slot"
              class="equip-slot"
              :class="{ active: selectedSlot === slot, occupied: selectedCompanionData.equippedItems[slot] }"
              @click="selectSlot(slot)"
            >
              <div class="slot-label">{{ SLOT_NAMES[slot] }}</div>
              <div class="slot-content">
                <template v-if="selectedCompanionData.equippedItems[slot]">
                  <span class="slot-icon">{{ getItemById(selectedCompanionData.equippedItems[slot])?.icon || '?' }}</span>
                  <span class="slot-name">{{ getItemById(selectedCompanionData.equippedItems[slot])?.name || '?' }}</span>
                  <button class="btn-unequip" @click.stop="doUnequip(slot)">卸下</button>
                </template>
                <template v-else>
                  <span class="slot-empty">空</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 可装备物品列表 -->
          <div v-if="selectedSlot && availableItems.length > 0" class="available-items">
            <div class="section-title">可装备物品</div>
            <div
              v-for="item in availableItems"
              :key="item.id"
              class="available-item"
              @click="doEquip(item.id)"
            >
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-tier" :style="{ color: TIER_COLORS[item.tier] }">{{ item.tier }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.companion-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.card-panel {
  background: var(--color-bg-card, rgba(15, 15, 25, 0.95));
  border: 1px solid var(--color-border, rgba(255, 215, 0, 0.15));
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border, rgba(255, 215, 0, 0.1));
  background: rgba(255, 215, 0, 0.03);
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent-gold-light, #ffd700);
}

.card-subtitle {
  font-size: 11px;
  color: var(--color-text-muted, #888);
}

.card-body {
  padding: 12px;
}

.recruit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(255, 215, 0, 0.06));
  border: 1px solid rgba(255, 215, 0, 0.25);
  border-radius: 6px;
  color: var(--color-accent-gold-light, #ffd700);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 10px;
}
.recruit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
  border-color: rgba(255, 215, 0, 0.4);
}
.recruit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.recruit-icon { font-size: 16px; }
.recruit-cost { margin-left: auto; color: var(--color-accent-gold, #ffd700); }

.max-reached {
  text-align: center;
  padding: 10px;
  font-size: 11px;
  color: var(--color-text-muted, #888);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  margin-bottom: 10px;
}

.recruit-panel {
  background: rgba(255, 215, 0, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}
.recruit-field {
  margin-bottom: 10px;
}
.recruit-field label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted, #aaa);
  margin-bottom: 4px;
}
.recruit-field input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.recruit-field input:focus {
  border-color: rgba(255, 215, 0, 0.5);
}

.profession-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 6px;
}
.prof-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: #ccc;
  font-size: 10px;
}
.prof-btn:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.06);
}
.prof-btn.selected {
  border-color: rgba(255, 215, 0, 0.6);
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}
.prof-icon { font-size: 18px; margin-bottom: 2px; }
.prof-name { font-weight: 600; }
.prof-pos { font-size: 8px; color: #888; }

.recruit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.btn-cancel, .btn-confirm {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #ccc;
  transition: all 0.2s;
}
.btn-confirm {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
  border-color: rgba(255, 215, 0, 0.3);
  color: #ffd700;
}
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

.companion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.companion-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.companion-card:hover {
  border-color: rgba(255, 215, 0, 0.2);
}
.companion-card.selected {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.05);
}

.companion-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.companion-icon { font-size: 22px; }
.companion-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.companion-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent-gold-light, #ffd700);
}
.companion-class {
  font-size: 10px;
  color: var(--color-text-muted, #888);
}
.btn-remove {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(220, 50, 50, 0.15);
  border: 1px solid rgba(220, 50, 50, 0.3);
  color: #e74c3c;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-remove:hover {
  background: rgba(220, 50, 50, 0.3);
}

.companion-stats-row {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 11px;
  color: #aaa;
}

.empty-hint {
  text-align: center;
  padding: 20px;
}
.empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.3; }
.empty-text { font-size: 12px; color: var(--color-text-muted, #888); margin-bottom: 4px; }
.empty-sub { font-size: 10px; color: #666; }

.detail-panel .card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent-gold-light, #ffd700);
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.attr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}
.attr-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}
.attr-icon { font-size: 14px; }
.attr-label { color: #aaa; flex: 1; }
.attr-value { font-weight: 700; color: #fff; margin-right: 4px; }
.btn-upgrade-sm {
  padding: 2px 6px;
  font-size: 9px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 3px;
  color: #ffd700;
  cursor: pointer;
  white-space: nowrap;
}
.btn-upgrade-sm:hover {
  background: rgba(255, 215, 0, 0.2);
}

.combat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.combat-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}
.combat-label { font-size: 9px; color: #888; }
.combat-value { font-size: 13px; font-weight: 700; color: #fff; }
.combat-value.gold { color: #ffd700; }

.equip-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.equip-slot {
  padding: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 50px;
}
.equip-slot:hover { border-color: rgba(255, 215, 0, 0.2); }
.equip-slot.active { border-color: rgba(255, 215, 0, 0.5); background: rgba(255, 215, 0, 0.05); }
.equip-slot.occupied { border-color: rgba(100, 200, 100, 0.3); }

.slot-label {
  font-size: 9px;
  color: #888;
  margin-bottom: 4px;
}
.slot-content {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.slot-icon { font-size: 16px; }
.slot-name { font-size: 10px; color: #ccc; flex: 1; }
.slot-empty { font-size: 10px; color: #555; }
.btn-unequip {
  padding: 1px 5px;
  font-size: 8px;
  background: rgba(220, 50, 50, 0.15);
  border: 1px solid rgba(220, 50, 50, 0.3);
  border-radius: 3px;
  color: #e74c3c;
  cursor: pointer;
}

.available-items {
  margin-top: 8px;
}
.available-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}
.available-item:hover {
  border-color: rgba(100, 200, 100, 0.3);
  background: rgba(100, 200, 100, 0.05);
}
.item-icon { font-size: 16px; }
.item-name { font-size: 11px; color: #ccc; flex: 1; }
.item-tier { font-size: 10px; font-weight: 700; }
</style>
