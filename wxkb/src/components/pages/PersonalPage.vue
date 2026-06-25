<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../../stores/game'

const store = useGameStore()

function goToEquipment() {
  store.setPage('equipment')
}

const roomType = ref<'indoor' | 'outdoor'>('indoor')
const roomStyle = ref('modern')
const roomSize = ref(100)

const indoorStyles = [
  { id: 'modern', name: '现代简约', icon: '🏠', desc: '简洁明亮的现代风格' },
  { id: 'traditional', name: '古典中式', icon: '🏯', desc: '古色古香的东方韵味' },
  { id: 'tech', name: '科技感', icon: '🚀', desc: '充满未来感的科技风' },
  { id: 'military', name: '军事基地', icon: '⚔️', desc: '专业的战斗训练场所' },
]

const outdoorStyles = [
  { id: 'grassland', name: '草原', icon: '🌿', desc: '风吹草低见牛羊' },
  { id: 'forest', name: '森林', icon: '🌲', desc: '宁静的深林秘境' },
  { id: 'beach', name: '海滩', icon: '🏖️', desc: '阳光沙滩海浪' },
  { id: 'mountain', name: '山峰', icon: '⛰️', desc: '会当凌绝顶' },
]

const facilities = [
  { id: 'shooting', name: '射击训练场', icon: '🎯', desc: '练习枪法', unlocked: true },
  { id: 'gym', name: '体能训练室', icon: '💪', desc: '锻炼身体', unlocked: true },
  { id: 'library', name: '知识图书馆', icon: '📚', desc: '学习技能', unlocked: true },
  { id: 'meditation', name: '冥想室', icon: '🧘', desc: '恢复精神', unlocked: true },
  { id: 'workshop', name: '装备工坊', icon: '🔧', desc: '制作装备', unlocked: false },
  { id: 'lab', name: '研究实验室', icon: '🔬', desc: '研究科技', unlocked: false },
]

const entertainment = [
  { id: 'karaoke', name: '卡拉OK', icon: '🎤', desc: '唱歌放松' },
  { id: 'gaming', name: '游戏室', icon: '🎮', desc: '电子娱乐' },
  { id: 'spa', name: '温泉浴场', icon: '♨️', desc: '放松身心' },
  { id: 'garden', name: '空中花园', icon: '🌺', desc: '赏花休憩' },
]

const currentEnvironment = ref('现代简约的房间，白色墙壁，简约家具')

function enterSpace() {
  const styleName = roomType.value === 'indoor' 
    ? indoorStyles.find(s => s.id === roomStyle.value)?.name 
    : outdoorStyles.find(s => s.id === roomStyle.value)?.name
  currentEnvironment.value = `${styleName}的${roomType.value === 'indoor' ? '室内空间' : '户外环境'}`
  store.addLog(`进入个人空间：${currentEnvironment.value}`, 'success')
}
</script>

<template>
  <div class="personal-space">
    <div class="card-panel">
      <div class="card-header">
        <span class="card-title">🏠 个人空间</span>
        <span class="card-badge">{{ roomSize }}m²</span>
      </div>
      <div class="card-body">
        <div class="space-desc">
          <p>你的个人空间由主神创造，你可以自由设计它的外观和功能。</p>
          <p class="space-hint">空间上限：27立方千米 | 食物和日用品可自由获取</p>
        </div>
      </div>
    </div>

    <div class="space-grid">
      <div class="card-panel">
        <div class="card-header"><span class="card-title">🌍 环境类型</span></div>
        <div class="card-body">
          <div class="env-toggle">
            <button :class="{ active: roomType === 'indoor' }" @click="roomType = 'indoor'">室内</button>
            <button :class="{ active: roomType === 'outdoor' }" @click="roomType = 'outdoor'">户外</button>
          </div>
          
          <div class="style-list">
            <div v-for="style in (roomType === 'indoor' ? indoorStyles : outdoorStyles)" 
                 :key="style.id"
                 :class="['style-item', { active: roomStyle === style.id }]"
                 @click="roomStyle = style.id">
              <span class="style-icon">{{ style.icon }}</span>
              <div class="style-info">
                <div class="style-name">{{ style.name }}</div>
                <div class="style-desc">{{ style.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header"><span class="card-title">🏗️ 设施建筑</span></div>
        <div class="card-body">
          <div class="facility-list">
            <div v-for="fac in facilities" :key="fac.id" 
                 :class="['facility-item', { locked: !fac.unlocked }]">
              <span class="facility-icon">{{ fac.icon }}</span>
              <div class="facility-info">
                <div class="facility-name">{{ fac.name }}</div>
                <div class="facility-desc">{{ fac.desc }}</div>
              </div>
              <span v-if="!fac.unlocked" class="lock-badge">🔒</span>
              <button v-else class="facility-btn">建造</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header"><span class="card-title">🎭 娱乐设施</span></div>
        <div class="card-body">
          <div class="facility-list">
            <div v-for="ent in entertainment" :key="ent.id" class="facility-item">
              <span class="facility-icon">{{ ent.icon }}</span>
              <div class="facility-info">
                <div class="facility-name">{{ ent.name }}</div>
                <div class="facility-desc">{{ ent.desc }}</div>
              </div>
              <button class="facility-btn">建造</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header"><span class="card-title">📋 空间规则</span></div>
        <div class="card-body">
          <div class="rules-list">
            <div class="rule-item">
              <span class="rule-icon">✅</span>
              <span>食物、饮料、日用品可自由获取</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">✅</span>
              <span>电子设施可自由摆放使用</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">✅</span>
              <span>可建造训练设施提升技能</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">❌</span>
              <span>未兑换物品无法带出空间</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">❌</span>
              <span>空间边缘无法穿越</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-panel equip-entry" @click="goToEquipment">
        <div class="card-header"><span class="card-title">🛡️ 装备管理</span></div>
        <div class="card-body">
          <p>管理和装备你的武器、护甲和饰品</p>
          <div class="equip-preview">
            <span>⚔️ 武器</span>
            <span>🛡️ 盔甲</span>
            <span>⛑️ 头盔</span>
            <span>🧤 手套</span>
            <span>👟 鞋子</span>
            <span>💍 饰品</span>
          </div>
        </div>
      </div>

      <div class="card-panel equip-entry" @click="goToEquipment">
        <div class="card-header"><span class="card-title">🛡️ 装备管理</span></div>
        <div class="card-body">
          <p>管理和装备你的武器、护甲和饰品</p>
          <div class="equip-preview">
            <span>⚔️ 武器</span>
            <span>🛡️ 盔甲</span>
            <span>⛑️ 头盔</span>
            <span>🧤 手套</span>
            <span>👟 鞋子</span>
            <span>💍 饰品</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card-panel enter-panel">
      <div class="card-body" style="text-align:center; padding: 20px;">
        <div class="current-env">当前环境：{{ currentEnvironment }}</div>
        <button class="enter-btn" @click="enterSpace">进入个人空间</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.personal-space {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.space-desc p {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 6px 0;
}

.space-hint {
  color: var(--color-text-muted) !important;
  font-size: 11px !important;
}

.space-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.env-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.env-toggle button {
  flex: 1;
  padding: 8px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.env-toggle button.active {
  background: rgba(201,168,108,0.15);
  border-color: var(--color-accent-gold);
  color: var(--color-accent-gold);
}

.style-list, .facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-item, .facility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.style-item:hover, .facility-item:hover {
  border-color: var(--color-border);
}

.style-item.active {
  border-color: var(--color-accent-gold);
  background: rgba(201,168,108,0.1);
}

.facility-item.locked {
  opacity: 0.5;
}

.style-icon, .facility-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
}

.style-info, .facility-info {
  flex: 1;
}

.style-name, .facility-name {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.style-desc, .facility-desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

.lock-badge {
  font-size: 16px;
}

.facility-btn {
  padding: 6px 12px;
  background: rgba(201,168,108,0.1);
  border: 1px solid rgba(201,168,108,0.3);
  border-radius: 4px;
  color: var(--color-accent-gold);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.facility-btn:hover {
  background: rgba(201,168,108,0.2);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.rule-icon {
  font-size: 14px;
}

.enter-panel {
  margin-top: 4px;
}

.current-env {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.enter-btn {
  padding: 14px 48px;
  background: rgba(201,168,108,0.15);
  border: 1px solid var(--color-accent-gold);
  border-radius: 6px;
  color: var(--color-accent-gold);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.enter-btn:hover {
  background: rgba(201,168,108,0.25);
}

.equip-entry {
  cursor: pointer;
  transition: all 0.2s;
}

.equip-entry:hover {
  border-color: rgba(255,165,0,0.3);
  background: var(--color-bg-hover);
}

.equip-preview {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
