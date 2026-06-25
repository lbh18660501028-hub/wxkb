<template>
  <div class="char-create">
    <div class="char-create-header">
      <h1>角色创建</h1>
      <div class="step-indicator">
        <span :class="{ active: step === 1, done: step === 2 }">1. 选择职业</span>
        <span class="arrow">→</span>
        <span :class="{ active: step === 2 }">2. 缺陷与天赋</span>
      </div>
    </div>

    <!-- 名字和性别 -->
    <div class="name-bar">
      <label>角色名:</label>
      <input v-model="characterName" type="text" placeholder="输入角色名" maxlength="12" />
      <div class="gender-select">
        <button :class="{ active: gender === 'male' }" @click="gender = 'male'">♂ 男</button>
        <button :class="{ active: gender === 'female' }" @click="gender = 'female'">♀ 女</button>
      </div>
    </div>

    <div class="char-create-body">
      <!-- 左侧：属性面板 -->
      <div class="panel attribute-panel">
        <div class="panel-title">属性</div>
        <div class="attr-group">
          <div class="attr-row" v-for="attr in attributeList" :key="attr.key">
            <span class="attr-name">{{ attr.name }}</span>
            <span class="attr-value">{{ attr.base }}</span>
            <span v-if="attr.bonus > 0" class="attr-bonus">+{{ attr.bonus }}</span>
            <span class="attr-total">= {{ attr.total }}</span>
          </div>
        </div>
        <div class="panel-title" style="margin-top: 12px;">衍生属性</div>
        <div class="attr-group">
          <div class="attr-row">
            <span class="attr-name">生命值</span>
            <span class="attr-total">{{ derivedStats.hp }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">MP上限</span>
            <span class="attr-total">{{ derivedStats.mp }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">速度</span>
            <span class="attr-total">{{ derivedStats.speed }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">命中(D级)</span>
            <span class="attr-total">{{ derivedStats.hitRateLow }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">命中(C级)</span>
            <span class="attr-total">{{ derivedStats.hitRateMid }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">命中(B级)</span>
            <span class="attr-total">{{ derivedStats.hitRateHigh }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">闪避(D级)</span>
            <span class="attr-total">{{ derivedStats.dodgeRateLow }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">闪避(C级)</span>
            <span class="attr-total">{{ derivedStats.dodgeRateMid }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">暴击率</span>
            <span class="attr-total">{{ derivedStats.critRate }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">经验获取</span>
            <span class="attr-total">{{ derivedStats.xpGain }}%</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">HP回复</span>
            <span class="attr-total">{{ derivedStats.hpRegen }}/回合</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">先攻</span>
            <span class="attr-total">{{ derivedStats.initiative }}</span>
          </div>
          <div class="attr-row">
            <span class="attr-name">双持伤害</span>
            <span class="attr-total">{{ derivedStats.dualWieldDamage }}%</span>
          </div>
        </div>
      </div>

      <!-- 中间区域 -->
      <div class="panel main-panel">
        <!-- 步骤1：职业选择 -->
        <template v-if="step === 1">
          <div class="step1-content">
            <!-- 职业列表（纵向） -->
            <div class="profession-list">
              <button
                v-for="prof in professions"
                :key="prof.id"
                class="profession-card"
                :class="{ active: selectedProfession === prof.id }"
                @click="selectedProfession = prof.id"
              >
                <span class="prof-icon">{{ prof.icon }}</span>
                <span class="prof-name">{{ prof.name }}</span>
              </button>
            </div>

            <!-- 职业详情 -->
            <div v-if="currentProfession" class="profession-detail">
              <div class="detail-header">
                <span class="detail-icon">{{ currentProfession.icon }}</span>
                <div>
                  <div class="detail-name">{{ currentProfession.name }}</div>
                  <div class="detail-pos">定位: {{ currentProfession.position }}</div>
                </div>
              </div>
              <div class="detail-desc">{{ currentProfession.description }}</div>
              <div class="detail-passives">
                <div class="passive-title">武器被动</div>
                <div class="passive-item">
                  <span class="passive-name">{{ currentProfession.weaponPassive.name }}</span>
                  <span class="passive-desc">{{ currentProfession.weaponPassive.description }}</span>
                </div>
              </div>
              <div class="detail-bonus">
                <div class="bonus-title">属性加成</div>
                <div class="bonus-list">
                  <span v-for="bonus in attributeBonusList" :key="bonus.key" class="bonus-tag">
                    {{ bonus.name }} +{{ bonus.value }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 步骤2：缺陷与天赋 -->
        <template v-if="step === 2">
          <div class="flaw-talent-section">
            <div class="section-block">
              <div class="section-title">可选缺陷 <span class="hint">（选择获得天赋点数）</span></div>
              <div class="item-list">
                <button
                  v-for="flaw in flaws"
                  :key="flaw.id"
                  class="item-row"
                  :class="{ selected: selectedFlaws.includes(flaw.id) }"
                  @click="toggleFlaw(flaw.id)"
                >
                  <span class="item-check">{{ selectedFlaws.includes(flaw.id) ? '☑' : '☐' }}</span>
                  <span class="item-name">{{ flaw.name }}</span>
                  <span class="item-points">+{{ flaw.points }}点</span>
                  <span class="item-desc">{{ flaw.description }}</span>
                </button>
              </div>
            </div>
            <div class="section-block">
              <div class="section-title">可选天赋 <span class="hint">（消耗天赋点数）</span></div>
              <div class="item-list">
                <button
                  v-for="talent in talents"
                  :key="talent.id"
                  class="item-row"
                  :class="{
                    selected: selectedTalents.includes(talent.id),
                    disabled: !canSelectTalent(talent.id)
                  }"
                  @click="toggleTalent(talent.id)"
                >
                  <span class="item-check">{{ selectedTalents.includes(talent.id) ? '☑' : '☐' }}</span>
                  <span class="item-name">{{ talent.name }}</span>
                  <span class="item-points">-{{ talent.cost }}点</span>
                  <span class="item-desc">{{ talent.description }}</span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧：形象 + 已选 -->
      <div class="panel right-panel">
        <div class="char-image-box">
          <img :src="characterImage" alt="角色形象" class="char-image" />
        </div>

        <div v-if="step === 2" class="selected-summary">
          <div class="summary-title">已选缺陷</div>
          <div v-if="selectedFlaws.length === 0" class="summary-empty">未选择</div>
          <div v-for="id in selectedFlaws" :key="id" class="summary-item flaw">
            <span>{{ getFlawName(id) }}</span>
            <span class="summary-point">+{{ getFlawPoints(id) }}点</span>
          </div>

          <div class="summary-title" style="margin-top: 12px;">已选天赋</div>
          <div v-if="selectedTalents.length === 0" class="summary-empty">未选择</div>
          <div v-for="id in selectedTalents" :key="id" class="summary-item talent">
            <span>{{ getTalentName(id) }}</span>
            <span class="summary-point">-{{ getTalentCost(id) }}点</span>
          </div>

          <div class="points-summary">
            <div>天赋点数: <strong>{{ talentPoints }}</strong> / {{ maxTalentPoints }}</div>
            <div>已消耗: <strong>{{ usedTalentPoints }}</strong></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="char-create-footer">
      <button v-if="step === 2" class="btn-back" @click="step = 1">← 上一步</button>
      <div v-else></div>
      <button v-if="step === 1" class="btn-next" :disabled="!selectedProfession" @click="step = 2">
        下一步 →
      </button>
      <button v-if="step === 2" class="btn-finish" :disabled="!canFinish" @click="finishCreation">
        完成创建
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PROFESSIONS,
  FLAWS,
  TALENTS,
  getProfessionById,
  getFlawById,
  getTalentById,
} from '../data/characterCreate'
import {
  calculateHitRate,
  calculateDodgeRate,
  calculateCritRate,
  calculateHitRatesByEnemyTier,
  probabilityToPercent,
} from '../utils/diceProbability'

const emit = defineEmits<{
  (e: 'complete', data: {
    name: string
    gender: string
    professionId: string
    selectedFlaws: string[]
    selectedTalents: string[]
  }): void
}>()

// ==================== 状态 ====================

const step = ref(1)
const characterName = ref('')
const gender = ref<'male' | 'female'>('male')
const selectedProfession = ref('')
const selectedFlaws = ref<string[]>([])
const selectedTalents = ref<string[]>([])

// ==================== 计算属性 ====================

const professions = computed(() => PROFESSIONS)
const flaws = computed(() => FLAWS)
const talents = computed(() => TALENTS)

const currentProfession = computed(() => {
  if (!selectedProfession.value) return null
  return getProfessionById(selectedProfession.value)
})

const attributeBonusList = computed(() => {
  if (!currentProfession.value) return []
  const bonus = currentProfession.value.attributeBonus
  return Object.entries(bonus).map(([key, value]) => ({
    key,
    name: getAttrName(key),
    value: value || 0,
  }))
})

// 基础属性（全为1）
const baseAttributes = {
  strength: 1,
  vitality: 1,
  intelligence: 1,
  spirit: 1,
  reaction: 1,
  immunity: 1,
}

// 计算职业属性加成
const professionBonus = computed(() => {
  if (!currentProfession.value) return {}
  return currentProfession.value.attributeBonus
})

// 计算缺陷/天赋的属性修正
const flawTalentModifiers = computed(() => {
  const mods: Record<string, number> = {
    hitRate: 0,
    dodgeRate: 0,
    critRate: 0,
    maxHpPercent: 0,
    attackPercent: 0,
    xpGain: 0,
    hpRegen: 0,
    initiative: 0,
    dualWieldDamage: 0,
    lastStandHeal: 0,
    darkHitPenalty: 0,
  }

  // 应用缺陷效果
  selectedFlaws.value.forEach(id => {
    const flaw = getFlawById(id)
    if (flaw) {
      flaw.effects.forEach(e => {
        if (mods[e.type] !== undefined) {
          mods[e.type] += e.value
        }
      })
    }
  })

  // 应用天赋效果
  selectedTalents.value.forEach(id => {
    const talent = getTalentById(id)
    if (talent) {
      talent.effects.forEach(e => {
        if (mods[e.type] !== undefined) {
          mods[e.type] += e.value
        }
      })
    }
  })

  return mods
})

// 属性列表（用于显示）
const attributeList = computed(() => {
  const keys = ['strength', 'vitality', 'intelligence', 'spirit', 'reaction', 'immunity'] as const
  const mods = flawTalentModifiers.value

  return keys.map(key => {
    const base = baseAttributes[key]
    const bonus = professionBonus.value[key] || 0
    let total = base + bonus

    // 缺陷/天赋可能影响特定属性
    // 例如：旧伤减少细胞活力（通过maxHpPercent间接影响）
    // 这里主要显示基础+职业加成，缺陷/天赋效果在衍生属性中体现

    return {
      key,
      name: getAttrName(key),
      base,
      bonus,
      total,
    }
  })
})

// 衍生属性（包含缺陷/天赋修正）
const derivedStats = computed(() => {
  const attrs = attributeList.value
  const mods = flawTalentModifiers.value

  const str = attrs.find(a => a.key === 'strength')?.total || 1
  const vit = attrs.find(a => a.key === 'vitality')?.total || 1
  const int_ = attrs.find(a => a.key === 'intelligence')?.total || 1
  const spr = attrs.find(a => a.key === 'spirit')?.total || 1
  const rec = attrs.find(a => a.key === 'reaction')?.total || 1

  let hp = 100 + vit * 10
  const mp = int_ * 10
  const speed = str + rec + 5

  // 应用缺陷/天赋修正
  if (mods.maxHpPercent !== 0) {
    hp = Math.floor(hp * (1 + mods.maxHpPercent / 100))
  }

  // 骰池概率计算（基于不同等级敌人）
  const playerAttackDP = rec // 初始无技能，只有反应
  const playerDodgeDP = rec

  // 对D级丧尸（无防御）
  const hitRateLow = calculateHitRate(playerAttackDP, 0)
  const dodgeRateLow = calculateDodgeRate(playerDodgeDP, 1, mods.dodgeRate / 100)
  
  // 对C级变异丧尸（防御3，攻击3）
  const hitRateMid = calculateHitRate(playerAttackDP, 3)
  const dodgeRateMid = calculateDodgeRate(playerDodgeDP, 3, mods.dodgeRate / 100)
  
  // 对B级舔舐者（防御6，攻击6）
  const hitRateHigh = calculateHitRate(playerAttackDP, 6)
  const dodgeRateHigh = calculateDodgeRate(playerDodgeDP, 6, mods.dodgeRate / 100)
  
  // 暴击率（对C级敌人）
  const critRate = calculateCritRate(playerAttackDP, 3, mods.critRate / 100)

  return {
    hp,
    mp,
    speed,
    hitRateLow: probabilityToPercent(hitRateLow),
    hitRateMid: probabilityToPercent(hitRateMid),
    hitRateHigh: probabilityToPercent(hitRateHigh),
    dodgeRateLow: probabilityToPercent(dodgeRateLow),
    dodgeRateMid: probabilityToPercent(dodgeRateMid),
    dodgeRateHigh: probabilityToPercent(dodgeRateHigh),
    critRate: probabilityToPercent(critRate),
    xpGain: 100 + mods.xpGain,
    hpRegen: 0 + mods.hpRegen,
    initiative: rec + mods.initiative,
    dualWieldDamage: mods.dualWieldDamage,
  }
})

// 天赋点数计算
const maxTalentPoints = computed(() => {
  return selectedFlaws.value.reduce((sum, id) => {
    const flaw = getFlawById(id)
    return sum + (flaw?.points || 0)
  }, 0)
})

const usedTalentPoints = computed(() => {
  return selectedTalents.value.reduce((sum: number, id: string) => {
    const talent = getTalentById(id)
    return sum + (talent?.cost || 0)
  }, 0)
})

const talentPoints = computed(() => maxTalentPoints.value - usedTalentPoints.value)

// 角色形象
const characterImage = computed(() => {
  if (!selectedProfession.value) {
    return '/character/1-1.png'
  }
  const profIndex = PROFESSIONS.findIndex(p => p.id === selectedProfession.value) + 1
  const genderSuffix = gender.value === 'male' ? '1' : '2'
  return `/character/${profIndex}-${genderSuffix}.png`
})

// 是否可以完成
const canFinish = computed(() => {
  return characterName.value.trim() && selectedProfession.value
})

// ==================== 方法 ====================

function getAttrName(key: string): string {
  const names: Record<string, string> = {
    strength: '肌肉强度',
    vitality: '细胞活力',
    intelligence: '智力',
    spirit: '精神力',
    reaction: '神经反应',
    immunity: '免疫强度',
  }
  return names[key] || key
}

function toggleFlaw(flawId: string) {
  const idx = selectedFlaws.value.indexOf(flawId)
  if (idx >= 0) {
    selectedFlaws.value.splice(idx, 1)
    // 同时移除因该缺陷点数不足而无法选择的天赋
    adjustTalentsAfterFlawChange()
  } else {
    if (selectedFlaws.value.length < 3) {
      selectedFlaws.value.push(flawId)
    }
  }
}

function toggleTalent(talentId: string) {
  const idx = selectedTalents.value.indexOf(talentId)
  if (idx >= 0) {
    selectedTalents.value.splice(idx, 1)
  } else {
    const talent = getTalentById(talentId)
    if (talent && talent.cost <= talentPoints.value) {
      selectedTalents.value.push(talentId)
    }
  }
}

function canSelectTalent(talentId: string): boolean {
  if (selectedTalents.value.includes(talentId)) return true
  const talent = getTalentById(talentId)
  return !!talent && talent.cost <= talentPoints.value
}

function adjustTalentsAfterFlawChange() {
  // 移除点数不足的天赋
  while (usedTalentPoints.value > maxTalentPoints.value && selectedTalents.value.length > 0) {
    selectedTalents.value.pop()
  }
}

function getFlawName(id: string): string {
  return getFlawById(id)?.name || id
}

function getFlawPoints(id: string): number {
  return getFlawById(id)?.points || 0
}

function getTalentName(id: string): string {
  return getTalentById(id)?.name || id
}

function getTalentCost(id: string): number {
  return getTalentById(id)?.cost || 0
}

function finishCreation() {
  if (!canFinish.value) return
  emit('complete', {
    name: characterName.value.trim(),
    gender: gender.value,
    professionId: selectedProfession.value,
    selectedFlaws: [...selectedFlaws.value],
    selectedTalents: [...selectedTalents.value],
  })
}
</script>

<style scoped>
.char-create {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a12;
  color: #e0d8c8;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.char-create-header {
  text-align: center;
  padding: 12px 20px 6px;
  flex-shrink: 0;
}

.char-create-header h1 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #d4a85a;
}

.step-indicator {
  font-size: 13px;
  color: #888;
}

.step-indicator span.active {
  color: #d4a85a;
  font-weight: bold;
}

.step-indicator span.done {
  color: #6a6;
}

.step-indicator .arrow {
  margin: 0 8px;
  color: #555;
}

.name-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  background: rgba(20, 20, 32, 0.8);
  border-bottom: 1px solid rgba(212, 168, 90, 0.15);
  flex-shrink: 0;
}

.name-bar label {
  color: #d4a85a;
  font-size: 14px;
  white-space: nowrap;
}

.name-bar input {
  flex: 1;
  max-width: 200px;
  padding: 6px 10px;
  background: rgba(30, 30, 45, 0.9);
  border: 1px solid rgba(212, 168, 90, 0.3);
  border-radius: 4px;
  color: #e0d8c8;
  font-size: 15px;
  outline: none;
}

.name-bar input:focus {
  border-color: #d4a85a;
}

.gender-select {
  display: flex;
  gap: 6px;
}

.gender-select button {
  padding: 5px 12px;
  border: 1px solid rgba(212, 168, 90, 0.3);
  border-radius: 4px;
  background: rgba(30, 30, 45, 0.9);
  color: #aaa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.gender-select button.active {
  background: rgba(212, 168, 90, 0.2);
  border-color: #d4a85a;
  color: #d4a85a;
}

.char-create-body {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  overflow: hidden;
  min-height: 0;
}

.panel {
  background: rgba(20, 20, 32, 0.85);
  border: 1px solid rgba(212, 168, 90, 0.15);
  border-radius: 8px;
  padding: 12px;
  overflow-y: auto;
}

.panel-title,
.section-title {
  font-size: 14px;
  color: #d4a85a;
  margin-bottom: 10px;
  font-weight: bold;
}

.hint {
  color: #888;
  font-weight: normal;
  font-size: 12px;
}

/* ==================== 属性面板（左侧接地） ==================== */
.attribute-panel {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.attr-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attr-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

.attr-name {
  color: #bbb;
  width: 75px;
  flex-shrink: 0;
}

.attr-value {
  color: #888;
  min-width: 16px;
  text-align: right;
}

.attr-bonus {
  color: #6d6;
  font-size: 13px;
}

.attr-total {
  color: #e0d8c8;
  font-weight: bold;
  margin-left: auto;
}

/* ==================== 中间区域 ==================== */
.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 步骤1容器 */
.step1-content {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

/* 职业列表（纵向排列） */
.profession-list {
  width: 120px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profession-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  background: rgba(30, 30, 45, 0.9);
  border: 1px solid rgba(212, 168, 90, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  color: #ccc;
  text-align: left;
  white-space: nowrap;
}

.profession-card:hover {
  border-color: rgba(212, 168, 90, 0.5);
  background: rgba(40, 40, 55, 0.9);
}

.profession-card.active {
  border-color: #d4a85a;
  background: rgba(212, 168, 90, 0.15);
  color: #d4a85a;
}

.prof-icon {
  font-size: 18px;
}

.prof-name {
  font-size: 13px;
  font-weight: bold;
}

/* 职业详情 */
.profession-detail {
  flex: 1;
  overflow-y: auto;
  border-left: 1px solid rgba(212, 168, 90, 0.1);
  padding-left: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.detail-icon {
  font-size: 42px;
}

.detail-name {
  font-size: 20px;
  font-weight: bold;
  color: #d4a85a;
}

.detail-ref,
.detail-pos {
  font-size: 13px;
  color: #aaa;
}

.detail-desc {
  font-size: 14px;
  color: #bbb;
  margin-bottom: 12px;
  line-height: 1.6;
}

.detail-passives {
  margin-bottom: 12px;
}

.passive-title,
.bonus-title {
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.passive-item {
  display: flex;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 5px;
}

.passive-name {
  color: #6d6;
  min-width: 90px;
}

.passive-desc {
  color: #bbb;
}

.bonus-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bonus-tag {
  padding: 4px 10px;
  background: rgba(100, 180, 100, 0.15);
  border: 1px solid rgba(100, 180, 100, 0.3);
  border-radius: 4px;
  font-size: 13px;
  color: #6d6;
}

/* ==================== 缺陷与天赋（步骤2） ==================== */
.flaw-talent-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

.section-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.item-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(30, 30, 45, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
  color: #ccc;
  font-size: 14px;
}

.item-row:hover {
  background: rgba(40, 40, 55, 0.9);
  border-color: rgba(212, 168, 90, 0.3);
}

.item-row.selected {
  background: rgba(212, 168, 90, 0.12);
  border-color: #d4a85a;
}

.item-row.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.item-check {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.item-name {
  font-weight: bold;
  min-width: 70px;
}

.item-points {
  color: #d4a85a;
  font-size: 13px;
  min-width: 36px;
  text-align: right;
}

.item-desc {
  color: #999;
  font-size: 13px;
  flex: 1;
  text-align: left;
  line-height: 1.4;
}

/* ==================== 右侧面板（角色形象） ==================== */
.right-panel {
  width: 560px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.char-image-box {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(15, 15, 25, 0.8);
  border-radius: 8px;
  padding: 12px;
  height: 750px;
}

.char-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.selected-summary {
  background: rgba(20, 20, 35, 0.9);
  border: 1px solid rgba(212, 168, 90, 0.3);
  border-radius: 8px;
  padding: 12px;
}

.summary-title {
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.summary-empty {
  font-size: 12px;
  color: #555;
  font-style: italic;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-item.flaw {
  color: #e88;
}

.summary-item.talent {
  color: #8e8;
}

.summary-point {
  font-size: 12px;
}

.points-summary {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(212, 168, 90, 0.2);
  font-size: 13px;
  color: #aaa;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.points-summary strong {
  color: #d4a85a;
}

/* ==================== 底部按钮 ==================== */
.char-create-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  border-top: 1px solid rgba(212, 168, 90, 0.15);
  flex-shrink: 0;
  margin: 0;
}

.btn-back,
.btn-next,
.btn-finish {
  padding: 8px 24px;
  border: 1px solid rgba(212, 168, 90, 0.4);
  border-radius: 6px;
  background: rgba(30, 30, 45, 0.9);
  color: #d4a85a;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.btn-back:hover,
.btn-next:hover,
.btn-finish:hover {
  background: rgba(212, 168, 90, 0.15);
  border-color: #d4a85a;
}

.btn-next:disabled,
.btn-finish:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-finish {
  background: rgba(212, 168, 90, 0.2);
  border-color: #d4a85a;
  font-weight: bold;
}

.btn-finish:hover:not(:disabled) {
  background: rgba(212, 168, 90, 0.3);
}
</style>
