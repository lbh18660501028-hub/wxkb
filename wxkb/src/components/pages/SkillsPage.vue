/**
 * 技能修炼页面 — 扁平列表展示10个技能
 * 技能与战斗完全解绑，仅作用于副本骰子检定
 */
<template>
  <div class="skills-page">
    <div class="page-title">⚡ 技能修炼</div>

    <div class="skills-overview">
      <div class="stat-item">
        <span class="stat-label">总技能等级</span>
        <span class="stat-value">{{ totalSkillLevels }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">经验值</span>
        <span class="stat-value">⚡{{ store.xp }}</span>
      </div>
    </div>

    <div class="skill-list">
      <div
        v-for="skill in allSkills"
        :key="skill.id"
        class="skill-card"
      >
        <div class="skill-header">
          <span class="skill-icon">{{ skill.icon }}</span>
          <span class="skill-name">{{ skill.name }}</span>
          <span class="skill-level">Lv.{{ getSkillLevel(skill.id) }}</span>
        </div>

        <div class="skill-desc">{{ skill.description }}</div>

        <div class="skill-stats">
          <span>关联属性: {{ getAttrName(skill.relatedAttr) }}</span>
          <span>检定骰池: {{ getSkillDicePool(skill.id) }} 枚D10</span>
          <span v-if="getSkillLevel(skill.id) > 0">附加成功: +{{ getSkillLevelBonus(getSkillLevel(skill.id)) }}</span>
        </div>

        <div class="skill-actions">
          <button
            class="upgrade-btn"
            :disabled="!canUpgrade(skill.id)"
            @click="handleUpgrade(skill.id)"
          >
            升级 (⚡{{ getUpgradeCost(skill.id) }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { skills, getSkillUpgradeCost, getSkillLevelBonus } from '../../data/skills'

const store = useGameStore()

const allSkills = computed(() => skills)

const totalSkillLevels = computed(() => {
  const playerSkills = store.playerSkills
  return Object.values(playerSkills).reduce((sum, level) => sum + level, 0)
})

function getSkillLevel(skillId: string): number {
  return store.playerSkills[skillId] ?? 0
}

function getSkillDicePool(skillId: string): number {
  const skill = skills.find(s => s.id === skillId)
  if (!skill) return 1
  const attrValue = store.attributes[skill.relatedAttr as keyof typeof store.attributes] ?? 1
  const skillLevel = getSkillLevel(skillId)
  // 每5点属性 = 1枚骰子，保底1枚
  return Math.max(Math.floor(attrValue / 5), 1) + skillLevel
}

function getUpgradeCost(skillId: string): number {
  return getSkillUpgradeCost(getSkillLevel(skillId))
}

function canUpgrade(skillId: string): boolean {
  const level = getSkillLevel(skillId)
  if (level >= 12) return false
  return store.xp >= getUpgradeCost(skillId)
}

function handleUpgrade(skillId: string) {
  store.upgradeSkill(skillId)
}

function getAttrName(attr: string): string {
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
  return names[attr] || attr
}
</script>

<style scoped>
.skills-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
  text-align: center;
  margin-bottom: 20px;
}

.skills-overview {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 30px;
}

.stat-item {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  padding: 12px 24px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #aaa;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.skill-card {
  background: rgba(30, 30, 40, 0.8);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  padding: 15px;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.skill-icon {
  font-size: 24px;
}

.skill-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  flex: 1;
}

.skill-level {
  font-size: 14px;
  color: #00ff88;
}

.skill-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 10px;
}

.skill-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.skill-actions {
  display: flex;
  justify-content: flex-end;
}

.upgrade-btn {
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 200, 100, 0.2));
  border: 1px solid rgba(0, 255, 136, 0.4);
  color: #00ff88;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.upgrade-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 200, 100, 0.3));
}

.upgrade-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
