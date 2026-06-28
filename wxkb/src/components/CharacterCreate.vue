<template>
  <div class="char-create">
    <!-- 背景效果 -->
    <div class="starfield"></div>
    <div class="dark-matter"></div>
    <div class="crt-grid"></div>

    <!-- 头部 -->
    <div class="char-create-header">
      <div class="header-accent"></div>
      <h1>◉ 角色创建</h1>
      <div class="step-indicator">
        <span :class="{ active: step === 1, done: step === 2 }">
          <span class="step-num">01</span> 选择职业
        </span>
        <span class="step-arrow">→</span>
        <span :class="{ active: step === 2 }">
          <span class="step-num">02</span> 缺陷与天赋
        </span>
      </div>
      <div class="header-line"></div>
    </div>

    <!-- 名字和性别 -->
    <div class="name-bar">
      <div class="input-group">
        <label>代号</label>
        <input v-model="characterName" type="text" placeholder="输入角色代号" maxlength="12" />
      </div>
      <div class="gender-select">
        <button :class="{ active: gender === 'male' }" @click="gender = 'male'">
          <span class="gender-icon">♂</span> 男
        </button>
        <button :class="{ active: gender === 'female' }" @click="gender = 'female'">
          <span class="gender-icon">♀</span> 女
        </button>
      </div>
      <div class="system-code">[SYSTEM.CREATE_MODE]</div>
    </div>

    <div class="char-create-body">
      <!-- 左侧：属性面板 -->
      <div class="panel attribute-panel">
        <div class="panel-header">
          <span class="panel-icon">◈</span>
          <span class="panel-title">基础属性</span>
        </div>
        <div class="attr-group">
          <div class="attr-row" v-for="attr in attributeList" :key="attr.key">
            <span class="attr-name">{{ attr.name }}</span>
            <div class="attr-values">
              <span class="attr-base">{{ attr.base }}</span>
              <span v-if="attr.bonus > 0" class="attr-bonus">+{{ attr.bonus }}</span>
              <span class="attr-total">{{ attr.total }}</span>
            </div>
          </div>
        </div>

        <div class="panel-header" style="margin-top: 20px;">
          <span class="panel-icon">◈</span>
          <span class="panel-title">衍生属性</span>
        </div>
        <div class="attr-group derived">
          <div class="attr-row compact">
            <span class="attr-name">生命值</span>
            <span class="attr-total highlight">{{ derivedStats.hp }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">MP上限</span>
            <span class="attr-total">{{ derivedStats.mp }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">速度</span>
            <span class="attr-total">{{ derivedStats.speed }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">意志力</span>
            <span class="attr-total">{{ derivedStats.willpower }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">命中(D级)</span>
            <span class="attr-total">{{ derivedStats.hitRateLow }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">命中(C级)</span>
            <span class="attr-total">{{ derivedStats.hitRateMid }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">命中(B级)</span>
            <span class="attr-total">{{ derivedStats.hitRateHigh }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">闪避(D级)</span>
            <span class="attr-total">{{ derivedStats.dodgeRateLow }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">闪避(C级)</span>
            <span class="attr-total">{{ derivedStats.dodgeRateMid }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">暴击率</span>
            <span class="attr-total accent">{{ derivedStats.critRate }}</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">经验获取</span>
            <span class="attr-total">{{ derivedStats.xpGain }}%</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">HP回复</span>
            <span class="attr-total">{{ derivedStats.hpRegen }}/回合</span>
          </div>
          <div class="attr-row compact">
            <span class="attr-name">先攻</span>
            <span class="attr-total">{{ derivedStats.initiative }}</span>
          </div>
          <div class="attr-row compact">
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
            <!-- 职业列表 -->
            <div class="profession-list">
              <div class="list-header">
                <span class="list-title">职业列表</span>
                <span class="list-count">{{ professions.length }}</span>
              </div>
              <button
                v-for="prof in professions"
                :key="prof.id"
                class="profession-card"
                :class="{ active: selectedProfession === prof.id }"
                @click="selectedProfession = prof.id"
              >
                <span class="prof-icon">{{ prof.icon }}</span>
                <span class="prof-name">{{ prof.name }}</span>
                <span v-if="selectedProfession === prof.id" class="prof-indicator">▶</span>
              </button>
            </div>

            <!-- 职业详情 -->
            <div v-if="currentProfession" class="profession-detail">
              <div class="detail-header">
                <div class="detail-icon-box">
                  <span class="detail-icon">{{ currentProfession.icon }}</span>
                </div>
                <div class="detail-info">
                  <div class="detail-name">{{ currentProfession.name }}</div>
                  <div class="detail-pos">
                    <span class="pos-label">定位</span>
                    <span class="pos-value">{{ currentProfession.position }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-desc">{{ currentProfession.description }}</div>
              <div class="detail-passives">
                <div class="section-label">
                  <span class="label-line"></span>
                  <span>武器被动</span>
                  <span class="label-line"></span>
                </div>
                <div class="passive-item">
                  <span class="passive-name">{{ currentProfession.weaponPassive.name }}</span>
                  <span class="passive-desc">{{ currentProfession.weaponPassive.description }}</span>
                </div>
              </div>
              <div class="detail-bonus">
                <div class="section-label">
                  <span class="label-line"></span>
                  <span>属性加成</span>
                  <span class="label-line"></span>
                </div>
                <div class="bonus-list">
                  <span v-for="bonus in attributeBonusList" :key="bonus.key" class="bonus-tag">
                    {{ bonus.name }} +{{ bonus.value }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="profession-empty">
              <div class="empty-icon">◉</div>
              <div class="empty-text">请选择一个职业开始</div>
            </div>
          </div>
        </template>

        <!-- 步骤2：缺陷与天赋 -->
        <template v-if="step === 2">
          <div class="flaw-talent-section">
            <div class="section-block">
              <div class="section-header">
                <span class="section-icon">◆</span>
                <span class="section-title">可选缺陷</span>
                <span class="section-hint">选择获得天赋点数</span>
              </div>
              <div class="item-list">
                <button
                  v-for="flaw in flaws"
                  :key="flaw.id"
                  class="item-row"
                  :class="{ selected: selectedFlaws.includes(flaw.id) }"
                  @click="toggleFlaw(flaw.id)"
                >
                  <span class="item-check">{{ selectedFlaws.includes(flaw.id) ? '◉' : '○' }}</span>
                  <span class="item-name">{{ flaw.name }}</span>
                  <span class="item-points">+{{ flaw.points }}</span>
                  <span class="item-desc">{{ flaw.description }}</span>
                </button>
              </div>
            </div>
            <div class="section-block">
              <div class="section-header">
                <span class="section-icon">◇</span>
                <span class="section-title">可选天赋</span>
                <span class="section-hint">消耗天赋点数</span>
              </div>
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
                  <span class="item-check">{{ selectedTalents.includes(talent.id) ? '◉' : '○' }}</span>
                  <span class="item-name">{{ talent.name }}</span>
                  <span class="item-points">-{{ talent.cost }}</span>
                  <span class="item-desc">{{ talent.description }}</span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧：形象 + 已选 -->
      <div class="panel right-panel">
        <div class="panel-header">
          <span class="panel-icon">◈</span>
          <span class="panel-title">形象预览</span>
        </div>
        <div class="char-image-box">
          <img :src="characterImage" alt="角色形象" class="char-image" />
          <div class="image-overlay"></div>
          <div class="image-scan"></div>
        </div>

        <div v-if="step === 2" class="selected-summary">
          <div class="summary-header">
            <span class="summary-title">已选配置</span>
          </div>

          <div class="summary-section">
            <div class="summary-label">缺陷</div>
            <div v-if="selectedFlaws.length === 0" class="summary-empty">未选择</div>
            <div v-for="id in selectedFlaws" :key="id" class="summary-item flaw">
              <span class="item-dot">◆</span>
              <span>{{ getFlawName(id) }}</span>
              <span class="summary-point">+{{ getFlawPoints(id) }}</span>
            </div>
          </div>

          <div class="summary-section">
            <div class="summary-label">天赋</div>
            <div v-if="selectedTalents.length === 0" class="summary-empty">未选择</div>
            <div v-for="id in selectedTalents" :key="id" class="summary-item talent">
              <span class="item-dot">◇</span>
              <span>{{ getTalentName(id) }}</span>
              <span class="summary-point">-{{ getTalentCost(id) }}</span>
            </div>
          </div>

          <div class="points-summary">
            <div class="points-row">
              <span>可用点数</span>
              <span class="points-value">{{ talentPoints }} / {{ maxTalentPoints }}</span>
            </div>
            <div class="points-row">
              <span>已消耗</span>
              <span class="points-value used">{{ usedTalentPoints }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="char-create-footer">
      <button v-if="step === 2" class="btn-back" @click="step = 1">
        <span class="btn-icon">←</span> 返回
      </button>
      <div v-else class="footer-code">[MAIN_GOD_SYSTEM]</div>

      <button v-if="step === 1" class="btn-next" :disabled="!selectedProfession" @click="step = 2">
        下一步 <span class="btn-icon">→</span>
      </button>
      <button v-if="step === 2" class="btn-finish" :disabled="!canFinish" @click="finishCreation">
        <span class="btn-glow"></span>
        <span class="btn-text">完成创建</span>
        <span class="btn-sub">ENTER THE VOID</span>
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
  const prof = currentProfession.value
  return [
    { key: prof.mainAttribute, name: getAttrName(prof.mainAttribute), value: 3 },
    { key: prof.secondaryAttribute, name: getAttrName(prof.secondaryAttribute), value: 2 },
  ]
})

// 基础属性（全为1）
const baseAttributes = {
  strength: 1,
  agility: 1,
  endurance: 1,
  intelligence: 1,
  perception: 1,
  resolve: 1,
  presence: 1,
  manipulation: 1,
  composure: 1,
}

// 计算职业属性加成
const professionBonus = computed(() => {
  if (!currentProfession.value) return {} as Record<string, number>
  const result: Record<string, number> = {}
  result[currentProfession.value.mainAttribute] = 3
  result[currentProfession.value.secondaryAttribute] = 2
  return result
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
  const keys = ['strength', 'agility', 'endurance', 'intelligence', 'perception', 'resolve', 'presence', 'manipulation', 'composure'] as const
  const mods = flawTalentModifiers.value

  return keys.map(key => {
    const base = baseAttributes[key]
    const bonus = professionBonus.value[key] || 0
    let total = base + bonus

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

  const end = attrs.find(a => a.key === 'endurance')?.total || 1
  const int_ = attrs.find(a => a.key === 'intelligence')?.total || 1
  const agi = attrs.find(a => a.key === 'agility')?.total || 1
  const res = attrs.find(a => a.key === 'resolve')?.total || 1
  const cmp = attrs.find(a => a.key === 'composure')?.total || 1

  let hp = 100 + end * 10
  const mp = int_ * 10
  const speed = agi + cmp + 5
  const willpower = res + cmp

  // 应用缺陷/天赋修正
  if (mods.maxHpPercent !== 0) {
    hp = Math.floor(hp * (1 + mods.maxHpPercent / 100))
  }

  // 骰池概率计算（基于不同等级敌人）
  const playerAttackDP = agi
  const playerDodgeDP = agi

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
    willpower,
    hitRateLow: probabilityToPercent(hitRateLow),
    hitRateMid: probabilityToPercent(hitRateMid),
    hitRateHigh: probabilityToPercent(hitRateHigh),
    dodgeRateLow: probabilityToPercent(dodgeRateLow),
    dodgeRateMid: probabilityToPercent(dodgeRateMid),
    dodgeRateHigh: probabilityToPercent(dodgeRateHigh),
    critRate: probabilityToPercent(critRate),
    xpGain: 100 + mods.xpGain,
    hpRegen: 0 + mods.hpRegen,
    initiative: agi + mods.initiative,
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
    strength: '力量',
    agility: '敏捷',
    endurance: '耐力',
    intelligence: '智力',
    perception: '感知',
    resolve: '决心',
    presence: '风度',
    manipulation: '操控',
    composure: '沉着',
  }
  return names[key] || key
}

function toggleFlaw(flawId: string) {
  const idx = selectedFlaws.value.indexOf(flawId)
  if (idx >= 0) {
    selectedFlaws.value.splice(idx, 1)
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
  background: #050505;
  color: #d8e0e8;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: relative;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

/* ==================== 背景效果 ==================== */
.starfield {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 40px 70px, rgba(0,240,255,0.3), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.2), transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(176,38,255,0.2), transparent);
  background-repeat: repeat;
  background-size: 800px 160px;
  animation: starfieldDrift 120s linear infinite;
}

.dark-matter {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
  background:
    radial-gradient(ellipse 60% 40% at 15% 20%, rgba(176,38,255,0.3), transparent 60%),
    radial-gradient(ellipse 40% 60% at 85% 80%, rgba(0,240,255,0.2), transparent 55%);
  animation: darkMatterShift 20s ease-in-out infinite;
}

.crt-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

@keyframes starfieldDrift {
  from { background-position: 0 0; }
  to { background-position: 800px 160px; }
}

@keyframes darkMatterShift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
  50% { transform: translate(-20px, 10px) scale(1.05); opacity: 0.08; }
}

/* ==================== 头部 ==================== */
.char-create-header {
  text-align: center;
  padding: 16px 20px 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.header-accent {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f0ff, transparent);
}

.char-create-header h1 {
  margin: 0 0 12px;
  font-size: 28px;
  color: #00f0ff;
  text-shadow: 0 0 20px rgba(0,240,255,0.5);
  letter-spacing: 4px;
}

.step-indicator {
  font-size: 14px;
  color: #4a5563;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.step-indicator span {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.step-num {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: rgba(0,240,255,0.1);
  border: 1px solid rgba(0,240,255,0.2);
  color: #4a5563;
}

.step-indicator span.active {
  color: #00f0ff;
}

.step-indicator span.active .step-num {
  background: rgba(0,240,255,0.2);
  border-color: #00f0ff;
  color: #00f0ff;
  box-shadow: 0 0 10px rgba(0,240,255,0.3);
}

.step-indicator span.done {
  color: #39ff14;
}

.step-indicator span.done .step-num {
  background: rgba(57,255,20,0.2);
  border-color: #39ff14;
  color: #39ff14;
}

.step-arrow {
  color: #4a5563;
}

.header-line {
  margin-top: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent);
}

/* ==================== 名字栏 ==================== */
.name-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 24px;
  background: rgba(13,13,17,0.9);
  border-bottom: 1px solid rgba(0,240,255,0.15);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-group label {
  color: #00f0ff;
  font-size: 14px;
  letter-spacing: 2px;
}

.name-bar input {
  width: 200px;
  padding: 8px 12px;
  background: rgba(8,8,12,0.9);
  border: 1px solid rgba(0,240,255,0.3);
  color: #d8e0e8;
  font-size: 15px;
  outline: none;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.name-bar input:focus {
  border-color: #00f0ff;
  box-shadow: 0 0 15px rgba(0,240,255,0.2);
}

.name-bar input::placeholder {
  color: #4a5563;
}

.gender-select {
  display: flex;
  gap: 8px;
}

.gender-select button {
  padding: 8px 16px;
  border: 1px solid rgba(0,240,255,0.2);
  background: rgba(13,13,17,0.9);
  color: #8a99aa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.gender-select button.active {
  background: rgba(0,240,255,0.15);
  border-color: #00f0ff;
  color: #00f0ff;
  box-shadow: 0 0 15px rgba(0,240,255,0.2);
}

.gender-icon {
  font-size: 16px;
}

.system-code {
  margin-left: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #4a5563;
}

/* ==================== 主体布局 ==================== */
.char-create-body {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  overflow: hidden;
  min-height: 0;
  position: relative;
  z-index: 1;
}

.panel {
  background: rgba(13,13,17,0.95);
  border: 1px solid rgba(0,240,255,0.12);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  overflow-y: auto;
  position: relative;
}

.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, #00f0ff, transparent 60%);
  opacity: 0.5;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0,240,255,0.05);
  border-bottom: 1px solid rgba(0,240,255,0.1);
}

.panel-icon {
  color: #00f0ff;
  font-size: 12px;
}

.panel-title {
  font-size: 14px;
  color: #00f0ff;
  letter-spacing: 2px;
}

/* ==================== 属性面板 ==================== */
.attribute-panel {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.attr-group {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attr-group.derived {
  gap: 6px;
}

.attr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0,240,255,0.05);
}

.attr-row.compact {
  padding: 4px 0;
}

.attr-name {
  color: #8a99aa;
  font-size: 14px;
}

.attr-values {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attr-base {
  color: #4a5563;
  font-size: 13px;
}

.attr-bonus {
  color: #39ff14;
  font-size: 12px;
}

.attr-total {
  color: #d8e0e8;
  font-weight: bold;
  font-size: 15px;
  min-width: 24px;
  text-align: right;
}

.attr-total.highlight {
  color: #ff3366;
  text-shadow: 0 0 10px rgba(255,51,102,0.4);
}

.attr-total.accent {
  color: #ffb000;
}

/* ==================== 中间面板 ==================== */
.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.step1-content {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
}

/* 职业列表 */
.profession-list {
  width: 160px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0,240,255,0.1);
  background: rgba(0,0,0,0.2);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(0,240,255,0.1);
}

.list-title {
  font-size: 12px;
  color: #00f0ff;
  letter-spacing: 2px;
}

.list-count {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #4a5563;
  padding: 2px 6px;
  background: rgba(0,240,255,0.1);
}

.profession-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(0,240,255,0.05);
  cursor: pointer;
  transition: all 0.2s;
  color: #8a99aa;
  text-align: left;
  position: relative;
}

.profession-card:hover {
  background: rgba(0,240,255,0.05);
  color: #d8e0e8;
}

.profession-card.active {
  background: rgba(0,240,255,0.1);
  color: #00f0ff;
}

.prof-icon {
  font-size: 18px;
}

.prof-name {
  font-size: 14px;
  flex: 1;
}

.prof-indicator {
  font-size: 10px;
  color: #00f0ff;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 职业详情 */
.profession-detail {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.profession-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #4a5563;
}

.empty-icon {
  font-size: 48px;
  color: #00f0ff;
  opacity: 0.3;
  animation: pulse 3s ease-in-out infinite;
}

.empty-text {
  font-size: 14px;
  letter-spacing: 2px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0,240,255,0.1);
}

.detail-icon-box {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,240,255,0.05);
  border: 1px solid rgba(0,240,255,0.2);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.detail-icon {
  font-size: 36px;
}

.detail-info {
  flex: 1;
}

.detail-name {
  font-size: 22px;
  font-weight: bold;
  color: #00f0ff;
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(0,240,255,0.3);
}

.detail-pos {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.pos-label {
  color: #4a5563;
  padding: 2px 6px;
  background: rgba(0,240,255,0.1);
  font-size: 11px;
  letter-spacing: 1px;
}

.pos-value {
  color: #8a99aa;
}

.detail-desc {
  font-size: 14px;
  color: #8a99aa;
  margin-bottom: 20px;
  line-height: 1.7;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-left: 2px solid rgba(0,240,255,0.3);
}

.section-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #00f0ff;
  letter-spacing: 2px;
}

.label-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(0,240,255,0.3), transparent);
}

.section-label span:nth-child(3) {
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.3));
}

.detail-passives {
  margin-bottom: 20px;
}

.passive-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgba(0,240,255,0.03);
  border: 1px solid rgba(0,240,255,0.1);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.passive-name {
  color: #39ff14;
  font-weight: bold;
  font-size: 14px;
}

.passive-desc {
  color: #8a99aa;
  font-size: 13px;
  line-height: 1.5;
}

.bonus-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bonus-tag {
  padding: 4px 10px;
  background: rgba(0,240,255,0.08);
  border: 1px solid rgba(0,240,255,0.2);
  color: #00f0ff;
  font-size: 12px;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}

/* ==================== 缺陷与天赋（步骤2） ==================== */
.flaw-talent-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
  padding: 16px;
}

.section-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(0,240,255,0.1);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0,240,255,0.05);
  border-bottom: 1px solid rgba(0,240,255,0.1);
}

.section-icon {
  font-size: 12px;
}

.section-block:first-child .section-icon {
  color: #ff3366;
}

.section-block:last-child .section-icon {
  color: #39ff14;
}

.section-title {
  font-size: 13px;
  color: #d8e0e8;
  letter-spacing: 2px;
}

.section-hint {
  margin-left: auto;
  font-size: 11px;
  color: #4a5563;
}

.item-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(13,13,17,0.8);
  border: 1px solid rgba(0,240,255,0.08);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  color: #8a99aa;
  font-size: 13px;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}

.item-row:hover {
  background: rgba(0,240,255,0.05);
  border-color: rgba(0,240,255,0.2);
  color: #d8e0e8;
}

.item-row.selected {
  background: rgba(0,240,255,0.1);
  border-color: #00f0ff;
  color: #00f0ff;
}

.item-row.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.item-check {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
  font-size: 12px;
}

.item-name {
  font-weight: bold;
  min-width: 80px;
  color: #d8e0e8;
}

.item-points {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  min-width: 40px;
  text-align: right;
}

.item-row .item-points {
  color: #ff3366;
}

.item-row.selected .item-points {
  color: #00f0ff;
}

.item-desc {
  color: #4a5563;
  font-size: 12px;
  flex: 1;
  text-align: left;
  line-height: 1.4;
}

.item-row:hover .item-desc {
  color: #8a99aa;
}

/* ==================== 右侧面板（角色形象） ==================== */
.right-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.char-image-box {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(8,8,12,0.9);
  padding: 16px;
  flex: 1;
  min-height: 400px;
  overflow: hidden;
}

.char-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,240,255,0.05) 0%, transparent 30%),
    linear-gradient(0deg, rgba(0,240,255,0.05) 0%, transparent 30%);
  pointer-events: none;
  z-index: 2;
}

.image-scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f0ff, transparent);
  opacity: 0.5;
  animation: imageScan 3s ease-in-out infinite;
  z-index: 3;
}

@keyframes imageScan {
  0%, 100% { top: 0; opacity: 0; }
  50% { opacity: 0.5; }
  100% { top: 100%; opacity: 0; }
}

.selected-summary {
  padding: 16px;
  border-top: 1px solid rgba(0,240,255,0.1);
  background: rgba(0,0,0,0.2);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.summary-title {
  font-size: 13px;
  color: #00f0ff;
  letter-spacing: 2px;
}

.summary-section {
  margin-bottom: 12px;
}

.summary-label {
  font-size: 11px;
  color: #4a5563;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.summary-empty {
  font-size: 12px;
  color: #4a5563;
  font-style: italic;
  padding: 4px 0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(0,240,255,0.05);
}

.item-dot {
  font-size: 8px;
}

.summary-item.flaw {
  color: #ff3366;
}

.summary-item.flaw .item-dot {
  color: #ff3366;
}

.summary-item.talent {
  color: #39ff14;
}

.summary-item.talent .item-dot {
  color: #39ff14;
}

.summary-point {
  margin-left: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  opacity: 0.8;
}

.points-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,240,255,0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.points-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #8a99aa;
}

.points-value {
  font-family: 'Courier New', monospace;
  color: #00f0ff;
}

.points-value.used {
  color: #ff3366;
}

/* ==================== 底部按钮 ==================== */
.char-create-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid rgba(0,240,255,0.15);
  flex-shrink: 0;
  margin: 0;
  background: rgba(13,13,17,0.9);
  position: relative;
  z-index: 1;
}

.footer-code {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #4a5563;
  letter-spacing: 1px;
}

.btn-back,
.btn-next {
  padding: 10px 24px;
  border: 1px solid rgba(0,240,255,0.3);
  background: rgba(13,13,17,0.9);
  color: #8a99aa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.btn-back:hover,
.btn-next:hover {
  border-color: #00f0ff;
  color: #00f0ff;
  background: rgba(0,240,255,0.1);
  box-shadow: 0 0 20px rgba(0,240,255,0.2);
}

.btn-next:disabled,
.btn-finish:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 12px;
}

.btn-finish {
  position: relative;
  padding: 14px 32px;
  border: 1px solid #00f0ff;
  background: rgba(0,240,255,0.15);
  color: #00f0ff;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 4px;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  overflow: hidden;
}

.btn-finish:hover:not(:disabled) {
  background: rgba(0,240,255,0.25);
  box-shadow: 0 0 40px rgba(0,240,255,0.4), inset 0 0 40px rgba(0,240,255,0.1);
  transform: translateY(-2px);
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(0,240,255,0.2) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.btn-finish:hover:not(:disabled) .btn-glow {
  opacity: 1;
  animation: glowSweep 1.5s ease-in-out infinite;
}

@keyframes glowSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.btn-text {
  position: relative;
  z-index: 1;
}

.btn-sub {
  font-size: 9px;
  letter-spacing: 3px;
  opacity: 0.6;
  font-weight: normal;
}
</style>
