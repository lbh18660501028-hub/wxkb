<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useGameStore } from '../../stores/game'
import { scenarios, type ScenarioData, type ScenarioNode } from '../../data/scenarios'
import { rollSkillCheck, simulateCombatRound } from '../../systems/dice'
import { spells, getSpellById } from '../../data/spells'
import { statusEffects, getStatusEffectConfig } from '../../data/statusEffects'
import type { DamageType } from '../../config/combat'

const store = useGameStore()

type Phase = 'list' | 'exploring' | 'skill_check' | 'combat' | 'reward' | 'complete'

const phase = ref<Phase>('list')
const currentScenario = ref<ScenarioData | null>(null)
const currentNodeIndex = ref(0)
const currentNode = computed(() => currentScenario.value?.nodes[currentNodeIndex.value] || null)

const skillCheckResult = ref<{ success: boolean; rolls: number[]; bonusRolls: number[]; total: number; dc: number } | null>(null)
const combatState = ref<{
  enemies: { name: string; hp: number; maxHp: number; damageType: DamageType }[]
  currentEnemy: number
  round: number
  logs: string[]
  playerHp: number
  playerMaxHp: number
  playerMp: number
  playerMaxMp: number
  playerStatusEffects: { type: string; remainingDuration: number }[]
  enemyStatusEffects: { type: string; remainingDuration: number }[]
} | null>(null)
const combatRoundResult = ref<any>(null)
const nodeAccumulatedRewards = ref<{ sidePlots: { D: number; C: number }; xp: number; rewardPoints: number }>({ sidePlots: { D: 0, C: 0 }, xp: 0, rewardPoints: 0 })
const explorationLog = ref<string[]>([])
const isAutoMode = ref(false)
let autoTimer: ReturnType<typeof setTimeout> | null = null

// 魔法战斗相关
const selectedSpell = ref<string | null>(null)
const playerDamageType = ref<DamageType>('technology')

const skillNames: Record<string, string> = {
  strength: '肌肉强度', reaction: '神经反应', intelligence: '智力', spirit: '精神力',
  vitality: '细胞活力', immunity: '免疫强度', melee: '肉搏', ranged: '枪械', dodge: '闪避',
 白刃: '白刃', archery: '弓术', survival: '求生', knowledge: '学识', investigation: '调查',
  mysticism: '神秘学', meditation: '冥想'
}

const tierColors: Record<string, string> = { D: '#8b8b8b', C: '#4a9eff', B: '#a855f7', A: '#f59e0b', S: '#ef4444' }

function enterScenario(scenario: ScenarioData) {
  currentScenario.value = scenario
  currentNodeIndex.value = 0
  phase.value = 'exploring'
  explorationLog.value = [`进入副本: ${scenario.name}`]
  nodeAccumulatedRewards.value = { sidePlots: { D: 0, C: 0 }, xp: 0, rewardPoints: 0 }
  enterNode(scenario.nodes[0])
}

function enterNode(node: ScenarioNode) {
  explorationLog.value.push(`\n--- ${node.name} ---`)
  explorationLog.value.push(node.description)
  
  if (node.type === 'skill_check' && node.skillCheck) {
    phase.value = 'skill_check'
    skillCheckResult.value = null
  } else if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
    startCombat(node)
  } else if (node.type === 'chest' && node.chestReward) {
    const r = node.chestReward
    if (r.sidePlots) { nodeAccumulatedRewards.value.sidePlots.D += r.sidePlots.D || 0; nodeAccumulatedRewards.value.sidePlots.C += r.sidePlots.C || 0 }
    if (r.xp) nodeAccumulatedRewards.value.xp += r.xp
    if (r.rewardPoints) nodeAccumulatedRewards.value.rewardPoints += r.rewardPoints
    explorationLog.value.push(`获得宝箱奖励！`)
    phase.value = 'reward'
  } else if (node.type === 'story') {
    phase.value = 'reward'
  } else if (node.type === 'rest') {
    explorationLog.value.push(`你在这里休息了一会儿，恢复了一些体力。`)
    phase.value = 'reward'
  } else if (node.type === 'reward') {
    if (currentScenario.value) {
      const r = currentScenario.value.rewards
      nodeAccumulatedRewards.value.sidePlots.D += r.sidePlots.D
      nodeAccumulatedRewards.value.sidePlots.C += r.sidePlots.C
      nodeAccumulatedRewards.value.xp += r.xp
      nodeAccumulatedRewards.value.rewardPoints += r.rewardPoints
    }
    phase.value = 'complete'
  }
}

function doSkillCheck() {
  if (!currentNode.value?.skillCheck) return
  const sc = currentNode.value.skillCheck
  
  // 使用统一的战斗属性
  const combatStats = store.getCombatStats()
  const attrVal = (combatStats as any)[sc.attr] || 1
  // 从技能系统获取对应技能等级
  const skillVal = store.getSkillLevel(sc.attr) || 0
  
  skillCheckResult.value = rollSkillCheck(attrVal, skillVal, sc.dc)
  
  if (skillCheckResult.value.success) {
    explorationLog.value.push(`✅ 检定成功！${sc.successText}`)
    if (sc.successReward) {
      const r = sc.successReward
      if (r.sidePlots) { nodeAccumulatedRewards.value.sidePlots.D += r.sidePlots.D || 0; nodeAccumulatedRewards.value.sidePlots.C += r.sidePlots.C || 0 }
      if (r.xp) nodeAccumulatedRewards.value.xp += r.xp
      if (r.rewardPoints) nodeAccumulatedRewards.value.rewardPoints += r.rewardPoints
    }
  } else {
    explorationLog.value.push(`❌ 检定失败！${sc.failText}`)
  }
}

function startCombat(node: ScenarioNode) {
  if (!node.enemies) return
  
  // 使用统一的战斗属性计算
  const combatStats = store.getCombatStats()
  const maxHp = store.getMaxHp()
  const maxMp = store.getMaxMp()
  
  combatState.value = {
    enemies: node.enemies.map(e => ({ 
      ...e, 
      damageType: (e as any).damageType || 'physical' 
    })),
    currentEnemy: 0,
    round: 0,
    logs: [],
    playerHp: maxHp,
    playerMaxHp: maxHp,
    playerMp: maxMp,
    playerMaxMp: maxMp,
    playerStatusEffects: [],
    enemyStatusEffects: [],
  }
  combatRoundResult.value = null
  phase.value = 'combat'
  doCombatRound()
}

function doCombatRound() {
  if (!combatState.value || !currentNode.value?.enemies) return
  
  const cs = combatState.value
  const enemy = currentNode.value.enemies[cs.currentEnemy]
  if (!enemy || cs.playerHp <= 0) return
  
  cs.round++
  
  // 处理玩家回合开始的不良状态
  const statusResult = store.processPlayerStatusEffects()
  if (statusResult.damage > 0) {
    cs.playerHp = Math.max(0, cs.playerHp - statusResult.damage)
    cs.logs.push(`不良状态造成 ${statusResult.damage} 点伤害`)
  }
  
  // 检查是否被眩晕（无法行动）
  if (!statusResult.canAct) {
    cs.logs.push(`💫 你被眩晕，无法行动！`)
    // 敌人攻击
    // ... (简化处理)
    checkCombatEnd()
    return
  }
  
  // 使用统一的战斗属性
  const combatStats = store.getCombatStats()
  const advancedStats = store.getAdvancedCombatStats()
  const weaponInfo = store.getWeaponCombatInfo()
  
  // 获取玩家技能等级
  const meleeLevel = store.getSkillLevel('melee')
  const firearmLevel = store.getSkillLevel('firearm')
  const dodgeLevel = store.getSkillLevel('dodge')
  
  // 确定伤害类型（根据是否选择法术）
  const weaponDamageType: DamageType = weaponInfo.essence || 'technology'
  let damageType: DamageType = weaponDamageType
  let attackMode: 'normal' | 'skill' = 'normal'
  let skillCoefficient = 1
  let proficiencyBonus: number | undefined
  
  if (selectedSpell.value && statusResult.canCast) {
    const spell = getSpellById(selectedSpell.value)
    if (spell && cs.playerMp >= spell.mpCost) {
      damageType = weaponDamageType
      attackMode = 'skill'
      skillCoefficient = 1 + spell.baseDamage / 50
      proficiencyBonus = store.getSkillLevel('mysticism') * 2
      cs.playerMp -= spell.mpCost
      cs.logs.push(`使用 ${spell.name}，消耗 ${spell.mpCost} MP，技能系数 ${skillCoefficient.toFixed(2)}`)
    }
  }
  
  const result = simulateCombatRound(
    { strength: combatStats.strength, reaction: combatStats.reaction, spirit: combatStats.spirit, intelligence: combatStats.intelligence, vitality: combatStats.vitality, immunity: combatStats.immunity },
    { melee: meleeLevel, ranged: firearmLevel, dodge: dodgeLevel },
    {
      attack: enemy.attack,
      defense: enemy.defense,
      damage: enemy.damage,
      armor: enemy.armor,
      ...(enemy as any).technologyAttack && { technologyAttack: (enemy as any).technologyAttack },
      ...(enemy as any).fantasyAttack && { fantasyAttack: (enemy as any).fantasyAttack },
      ...(enemy as any).abnormalAttack && { abnormalAttack: (enemy as any).abnormalAttack },
      ...(enemy as any).technologyDefense && { technologyDefense: (enemy as any).technologyDefense },
      ...(enemy as any).fantasyDefense && { fantasyDefense: (enemy as any).fantasyDefense },
      ...(enemy as any).abnormalDefense && { abnormalDefense: (enemy as any).abnormalDefense },
      ...(enemy as any).speed && { speed: (enemy as any).speed },
      ...(enemy as any).critRate && { critRate: (enemy as any).critRate },
      ...(enemy as any).critDamage && { critDamage: (enemy as any).critDamage },
      ...(enemy as any).evasion && { evasion: (enemy as any).evasion },
      ...(enemy as any).hit && { hit: (enemy as any).hit },
      ...(enemy as any).blockRate && { blockRate: (enemy as any).blockRate },
      ...(enemy as any).toughness && { toughness: (enemy as any).toughness },
    },
    {
      ...advancedStats,
      weaponAttack: weaponInfo.attack,
      weaponEssence: weaponInfo.essence,
      attackMode,
      skillCoefficient,
      proficiencyBonus,
    },
    damageType,
    (enemy as any).damageType || 'physical',
    combatState.value.playerHp,
    cs.enemies[cs.currentEnemy].hp,
  )
  
  combatRoundResult.value = result
  cs.logs.push(`\n=== 第 ${cs.round} 回合 ===`)
  result.logs.forEach((log: string) => cs.logs.push(log))
  
  // 更新敌人HP
  if (result.playerHit) {
    cs.enemies[cs.currentEnemy].hp = Math.max(0, cs.enemies[cs.currentEnemy].hp - result.playerDamage)
    cs.logs.push(`敌人剩余HP: ${cs.enemies[cs.currentEnemy].hp}/${enemy.hp}`)
  }

  if (result.playerHealing > 0) {
    cs.playerHp = Math.min(cs.playerMaxHp, cs.playerHp + result.playerHealing)
    cs.logs.push(`你回复生命: ${cs.playerHp}/${cs.playerMaxHp}`)
  }
  
  // 更新玩家HP
  if (result.enemyHit) {
    cs.playerHp = Math.max(0, cs.playerHp - result.enemyDamage)
    cs.logs.push(`你剩余HP: ${cs.playerHp}/${cs.playerMaxHp}`)
  }

  if (result.enemyHealing > 0) {
    cs.enemies[cs.currentEnemy].hp = Math.min(enemy.hp, cs.enemies[cs.currentEnemy].hp + result.enemyHealing)
    cs.logs.push(`敌人回复生命: ${cs.enemies[cs.currentEnemy].hp}/${enemy.hp}`)
  }
  
  // 检查战斗结果
  checkCombatEnd()
}

function checkCombatEnd() {
  if (!combatState.value || !currentNode.value?.enemies) return
  
  const cs = combatState.value
  const enemy = currentNode.value.enemies[cs.currentEnemy]
  
  if (cs.enemies[cs.currentEnemy].hp <= 0) {
    cs.logs.push(`\n🎉 击败了 ${cs.enemies[cs.currentEnemy].name}！`)
    nodeAccumulatedRewards.value.xp += enemy.exp
    nodeAccumulatedRewards.value.sidePlots.D += enemy.sidePlots.D || 0
    nodeAccumulatedRewards.value.sidePlots.C += enemy.sidePlots.C || 0
    
    cs.currentEnemy++
    if (cs.currentEnemy >= cs.enemies.length) {
      cs.logs.push(`\n战斗胜利！`)
      phase.value = 'reward'
    }
  } else if (cs.playerHp <= 0) {
    cs.logs.push(`\n💀 你被击败了……`)
    phase.value = 'list'
    currentScenario.value = null
  }
  
  nextTick(() => {
    const el = document.querySelector('.combat-logs')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function nextNode() {
  if (!currentScenario.value) return
  currentNodeIndex.value++
  if (currentNodeIndex.value < currentScenario.value.nodes.length) {
    enterNode(currentScenario.value.nodes[currentNodeIndex.value])
  }
}

function claimRewards() {
  if (!currentScenario.value) return
  const r = nodeAccumulatedRewards.value
  store.addRewards(r.rewardPoints, r.xp)
  if (r.sidePlots.D > 0 || r.sidePlots.C > 0) {
    store.addSidePlots(r.sidePlots)
  }
  explorationLog.value.push(`\n获得奖励: 💎${r.rewardPoints} | XP${r.xp} | D支线${r.sidePlots.D} | C支线${r.sidePlots.C}`)
  phase.value = 'list'
  currentScenario.value = null
}

function exitScenario() {
  if (autoTimer) clearTimeout(autoTimer)
  phase.value = 'list'
  currentScenario.value = null
}

function toggleAuto() {
  isAutoMode.value = !isAutoMode.value
  if (isAutoMode.value && phase.value === 'combat') {
    autoCombat()
  }
}

function autoCombat() {
  if (!isAutoMode.value || phase.value !== 'combat') return
  doCombatRound()
  if (phase.value === 'combat') {
    autoTimer = setTimeout(autoCombat, 800)
  } else {
    isAutoMode.value = false
  }
}

const playerHpPercent = computed(() => {
  if (!combatState.value) return 100
  return Math.max(0, (combatState.value.playerHp / combatState.value.playerMaxHp) * 100)
})

const currentEnemyData = computed(() => {
  if (!combatState.value || !currentNode.value?.enemies) return null
  return currentNode.value.enemies[combatState.value.currentEnemy] || null
})
</script>

<template>
  <div class="scenario-container">
    <!-- 副本列表 -->
    <div v-if="phase === 'list'" class="scenario-list-phase">
      <div class="card-panel">
        <div class="card-header"><span class="card-title">⚔️ 副本列表</span></div>
        <div class="card-body">
          <div class="scenario-grid">
            <div v-for="s in scenarios" :key="s.id" class="scenario-card"
              :class="{ locked: store.level < s.minLevel }"
              @click="store.level >= s.minLevel && enterScenario(s)">
              <div class="sc-tier" :style="{ color: tierColors[s.tier] }">{{ s.tier }}级</div>
              <div class="sc-name">{{ s.name }}</div>
              <div class="sc-desc">{{ s.description }}</div>
              <div class="sc-info">
                <span class="sc-diff">难度 {{ s.difficulty }}</span>
                <span class="sc-need">需要 Lv.{{ s.minLevel }}</span>
              </div>
              <div class="sc-rewards">
                <span>💎{{ s.rewards.rewardPoints }}</span>
                <span>XP{{ s.rewards.xp }}</span>
                <span v-if="s.rewards.sidePlots.D">D{{ s.rewards.sidePlots.D }}</span>
                <span v-if="s.rewards.sidePlots.C">C{{ s.rewards.sidePlots.C }}</span>
              </div>
              <div v-if="store.level < s.minLevel" class="sc-locked">等级不足</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 副本探索 -->
    <div v-else class="scenario-explore-phase">
      <div class="explore-header">
        <div class="explore-title">
          <span :style="{ color: tierColors[currentScenario!.tier] }">[{{ currentScenario!.tier }}]</span>
          {{ currentScenario!.name }}
        </div>
        <button class="exit-btn" @click="exitScenario">退出副本</button>
      </div>

      <!-- 节点进度条 -->
      <div class="node-progress">
        <div v-for="(node, i) in currentScenario!.nodes" :key="node.id" class="node-dot"
          :class="{ active: i === currentNodeIndex, done: i < currentNodeIndex, current: i === currentNodeIndex }">
          <div class="node-icon">
            {{ node.type === 'combat' ? '⚔' : node.type === 'elite' ? '💀' : node.type === 'skill_check' ? '🎯' : node.type === 'chest' ? '📦' : node.type === 'reward' ? '🏆' : '📍' }}
          </div>
          <div class="node-name">{{ node.name }}</div>
        </div>
      </div>

      <!-- 技能检定 -->
      <div v-if="phase === 'skill_check' && currentNode?.skillCheck" class="skill-check-panel">
        <div class="sc-header">🎯 技能检定</div>
        <div class="sc-desc">{{ currentNode.description }}</div>
        <div class="sc-info">
          <span>检定: {{ skillNames[currentNode.skillCheck.attr] || currentNode.skillCheck.attr }}</span>
          <span>DC: {{ currentNode.skillCheck.dc }}</span>
          <span>你的骰池: {{ (store.attributes as any)[currentNode.skillCheck.attr] + (store.getSkillLevel(currentNode.skillCheck.attr) || 0) }} 枚D10</span>
        </div>
        
        <div v-if="!skillCheckResult" class="sc-action">
          <button class="roll-btn" @click="doSkillCheck">投骰检定</button>
        </div>
        
        <div v-else class="sc-result">
          <div class="result-rolls">
            投掷: [{{ skillCheckResult.rolls.join(', ') }}]
            <span v-if="skillCheckResult.bonusRolls.length"> + 加骰: [{{ skillCheckResult.bonusRolls.join(', ') }}]</span>
          </div>
          <div class="result-total" :class="skillCheckResult.success ? 'success' : 'fail'">
            成功数: {{ skillCheckResult.total }} / DC: {{ skillCheckResult.dc }}
            {{ skillCheckResult.success ? '✅ 成功' : '❌ 失败' }}
          </div>
          <button class="next-btn" @click="nextNode">继续 →</button>
        </div>
      </div>

      <!-- 战斗 -->
      <div v-if="phase === 'combat' && combatState" class="combat-panel">
        <div class="combat-header">
          <div class="combat-enemy">
            <span class="enemy-name">{{ currentEnemyData?.name || '敌人' }}</span>
            <div class="hp-bar">
              <div class="hp-fill enemy-hp" :style="{ width: currentEnemyData ? (currentEnemyData.hp / currentEnemyData.maxHp * 100) + '%' : '0%' }"></div>
            </div>
            <span class="hp-text">{{ currentEnemyData?.hp || 0 }}/{{ currentEnemyData?.maxHp || 0 }}</span>
          </div>
          <div class="combat-player">
            <span class="player-name">你</span>
            <div class="hp-bar">
              <div class="hp-fill player-hp" :style="{ width: playerHpPercent + '%' }"></div>
            </div>
            <span class="hp-text">{{ combatState.playerHp }}/{{ combatState.playerMaxHp }}</span>
            <div class="mp-bar">
              <div class="mp-fill" :style="{ width: (combatState.playerMp / combatState.playerMaxMp * 100) + '%' }"></div>
            </div>
            <span class="mp-text">MP: {{ combatState.playerMp }}/{{ combatState.playerMaxMp }}</span>
          </div>
          <button class="auto-btn" :class="{ active: isAutoMode }" @click="toggleAuto">
            {{ isAutoMode ? '⏸ 暂停' : '▶ 自动' }}
          </button>
        </div>

        <!-- 法术选择 -->
        <div class="spell-selection">
          <div class="spell-label">选择攻击方式：</div>
          <div class="spell-list">
            <button 
              class="spell-btn" 
              :class="{ active: !selectedSpell }"
              @click="selectedSpell = null"
            >
              ⚔️ 物理攻击
            </button>
            <button 
              v-for="spell in spells" 
              :key="spell.id"
              class="spell-btn"
              :class="{ active: selectedSpell === spell.id, disabled: combatState.playerMp < spell.mpCost }"
              :disabled="combatState.playerMp < spell.mpCost"
              @click="selectedSpell = spell.id"
            >
              {{ spell.icon }} {{ spell.name }} ({{ spell.mpCost }} MP)
            </button>
          </div>
        </div>

        <!-- 状态效果显示 -->
        <div v-if="combatState.playerStatusEffects.length > 0" class="status-effects">
          <span class="status-label">你的状态：</span>
          <span v-for="(effect, i) in combatState.playerStatusEffects" :key="i" class="status-tag">
            {{ getStatusEffectConfig(effect.type as any)?.icon }} {{ getStatusEffectConfig(effect.type as any)?.name }} ({{ effect.remainingDuration }}回合)
          </span>
        </div>

        <div class="combat-logs">
          <div v-for="(log, i) in combatState.logs" :key="i" class="combat-log" :class="{ 
            'log-success': log.includes('✅') || log.includes('命中') || log.includes('暴击'),
            'log-fail': log.includes('❌') || log.includes('未命中'),
            'log-enemy': log.includes('敌人'),
            'log-round': log.includes('==='),
            'log-reward': log.includes('击败')
          }">{{ log }}</div>
        </div>
      </div>

      <!-- 奖励/完成 -->
      <div v-if="phase === 'complete' || (phase === 'reward' && currentNode && (currentNode.type === 'chest' || currentNode.type === 'rest' || currentNode.type === 'story'))" class="reward-panel">
        <div class="reward-header">🏆 副本完成</div>
        <div class="reward-list">
          <div v-if="nodeAccumulatedRewards.rewardPoints" class="reward-item">
            <span class="ri-icon">💎</span>
            <span class="ri-label">奖励点</span>
            <span class="ri-value">+{{ nodeAccumulatedRewards.rewardPoints }}</span>
          </div>
          <div v-if="nodeAccumulatedRewards.xp" class="reward-item">
            <span class="ri-icon">⚡</span>
            <span class="ri-label">经验值</span>
            <span class="ri-value">+{{ nodeAccumulatedRewards.xp }}</span>
          </div>
          <div v-if="nodeAccumulatedRewards.sidePlots.D" class="reward-item">
            <span class="ri-icon">📋</span>
            <span class="ri-label">D级支线</span>
            <span class="ri-value">+{{ nodeAccumulatedRewards.sidePlots.D }}</span>
          </div>
          <div v-if="nodeAccumulatedRewards.sidePlots.C" class="reward-item">
            <span class="ri-icon">📋</span>
            <span class="ri-label">C级支线</span>
            <span class="ri-value">+{{ nodeAccumulatedRewards.sidePlots.C }}</span>
          </div>
        </div>
        <button class="claim-btn" @click="claimRewards">领取奖励</button>
      </div>

      <div v-if="phase === 'reward' && currentNode && currentNode.type !== 'chest' && currentNode.type !== 'rest' && currentNode.type !== 'story'" class="reward-panel">
        <button class="next-btn" @click="nextNode">继续 →</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenario-container {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.scenario-card {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.scenario-card:hover:not(.locked) {
  border-color: rgba(255,215,0,0.3);
  background: var(--color-bg-hover);
}

.scenario-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.sc-tier {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}

.sc-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.sc-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.sc-info {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.sc-rewards {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--color-accent);
}

.sc-locked {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text-muted);
}

.explore-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.explore-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.exit-btn {
  padding: 6px 12px;
  background: rgba(220,50,50,0.15);
  border: 1px solid rgba(220,50,50,0.4);
  border-radius: 6px;
  color: #dc3232;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.exit-btn:hover {
  background: rgba(220,50,50,0.25);
}

.node-progress {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding: 8px 0;
}

.node-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.node-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  border: 2px solid var(--color-border-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.3s;
}

.node-dot.done .node-icon {
  border-color: rgba(76,175,80,0.6);
  background: rgba(76,175,80,0.15);
}

.node-dot.current .node-icon {
  border-color: rgba(255,165,0,0.8);
  background: rgba(255,165,0,0.2);
  box-shadow: 0 0 12px rgba(255,165,0,0.4);
}

.node-name {
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
}

.skill-check-panel, .combat-panel, .reward-panel {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 20px;
}

.sc-header, .combat-header, .reward-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.sc-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.sc-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.sc-action {
  text-align: center;
}

.roll-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, rgba(255,165,0,0.2) 0%, rgba(255,100,0,0.15) 100%);
  border: 1px solid rgba(255,165,0,0.4);
  border-radius: 8px;
  color: #ffa500;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.roll-btn:hover {
  background: linear-gradient(135deg, rgba(255,165,0,0.3) 0%, rgba(255,100,0,0.25) 100%);
  transform: scale(1.02);
}

.sc-result {
  text-align: center;
}

.result-rolls {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.result-total {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.result-total.success { color: #4caf50; }
.result-total.fail { color: #f44336; }

.next-btn {
  padding: 10px 24px;
  background: rgba(255,165,0,0.15);
  border: 1px solid rgba(255,165,0,0.4);
  border-radius: 6px;
  color: #ffa500;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}

.next-btn:hover {
  background: rgba(255,165,0,0.25);
}

.combat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.combat-enemy, .combat-player {
  flex: 1;
  min-width: 200px;
}

.enemy-name, .player-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  display: block;
}

.hp-bar {
  height: 8px;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2px;
}

.hp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.enemy-hp { background: linear-gradient(90deg, #f44336, #ff5722); }
.player-hp { background: linear-gradient(90deg, #4caf50, #8bc34a); }

.hp-text {
  font-size: 11px;
  color: var(--color-text-muted);
}

.mp-bar {
  height: 6px;
  background: rgba(0,0,0,0.3);
  border-radius: 3px;
  overflow: hidden;
  margin: 2px 0;
}

.mp-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #03a9f4);
  border-radius: 3px;
  transition: width 0.3s;
}

.mp-text {
  font-size: 10px;
  color: #2196f3;
}

.spell-selection {
  margin: 12px 0;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
}

.spell-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.spell-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spell-btn {
  padding: 6px 12px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.spell-btn:hover:not(.disabled) {
  background: rgba(255,255,255,0.1);
}

.spell-btn.active {
  background: rgba(255,165,0,0.2);
  border-color: rgba(255,165,0,0.4);
  color: #ffa500;
}

.spell-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status-effects {
  margin: 8px 0;
  padding: 8px 12px;
  background: rgba(255,0,0,0.1);
  border-radius: 6px;
  font-size: 12px;
}

.status-label {
  color: var(--color-text-secondary);
  margin-right: 8px;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 4px;
  background: rgba(255,0,0,0.2);
  border-radius: 4px;
  color: #ff6b6b;
}

.auto-btn {
  padding: 8px 16px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.auto-btn.active {
  background: rgba(255,165,0,0.2);
  border-color: rgba(255,165,0,0.4);
  color: #ffa500;
}

.combat-logs {
  max-height: 300px;
  overflow-y: auto;
  margin: 12px 0;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.combat-log {
  color: var(--color-text-secondary);
}

.log-round { color: var(--color-accent); font-weight: 700; }
.log-success { color: #4caf50; }
.log-fail { color: #f44336; }
.log-enemy { color: #ff9800; }
.log-reward { color: #ffd700; }

.combat-end {
  text-align: center;
  margin-top: 12px;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
}

.ri-icon { font-size: 18px; }
.ri-label { font-size: 13px; color: var(--color-text-secondary); flex: 1; }
.ri-value { font-size: 14px; font-weight: 600; color: var(--color-accent); }

.claim-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255,165,0,0.2) 0%, rgba(255,100,0,0.15) 100%);
  border: 1px solid rgba(255,165,0,0.4);
  border-radius: 8px;
  color: #ffa500;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.claim-btn:hover {
  background: linear-gradient(135deg, rgba(255,165,0,0.3) 0%, rgba(255,100,0,0.25) 100%);
}
</style>
