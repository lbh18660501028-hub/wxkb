import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Attributes, Companion, SidePlots, IdleState, LogEntry, PageId, OfflineIdle, MapProgress } from '../types/game'
import { GAME_MAPS } from '../data/maps'
import { getItemById } from '../data/shop'
import { calculateUnlockChance } from '../data/geneLock'
import { getBloodlineById } from '../data/bloodline'
import { getSkillById, getSkillUpgradeCost, skills } from '../data/skills'
import { COMBAT_CONFIG, HP_CONFIG, IDLE_CONFIG, ATTRIBUTE_CONFIG, MP_CONFIG, VOLUME_CONFIG, EMPTY_ADVANCED_STATS, type AdvancedCombatStats } from '../config/combat'
import type { ActiveStatusEffect, StatusEffectType } from '../data/statusEffects'
import { applyStatusEffect, processStatusEffects, getStatusEffectsModifier } from '../data/statusEffects'
import type { DamageType } from '../config/combat'
import { getProfessionById, getFlawById, getTalentById } from '../data/characterCreate'
import { COMPANION_CONFIG, getRecruitCost } from '../data/companion'
import type { EquipmentStats, WeaponEssence } from '../types/equipment'

const SAVE_KEY = 'wxkb_save'

interface DungeonNavState {
  tier: string
  name: string
  description: string
}

function loadSave(): Partial<any> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveToDisk(state: any) {
  try {
    const data = {
      name: state.name,
      squadName: state.squadName,
      level: state.level,
      xp: state.xp,
      rewardPoints: state.rewardPoints,
      attributes: state.attributes,
      sidePlots: state.sidePlots,
      idle: state.idle,
      mapProgress: state.mapProgress,
      logs: state.logs.slice(-50),
      companions: state.companions,
      inventory: state.inventory,
      equippedItems: state.equippedItems,
      geneLock: state.geneLock,
      equippedBloodline: state.equippedBloodline,
      playerSkills: state.playerSkills,
      playerSpells: state.playerSpells,
      currentMp: state.currentMp,
      volumeLevel: state.volumeLevel,
      playerStatusEffects: state.playerStatusEffects,
      characterCreation: state.characterCreation,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {}
}

export const useGameStore = defineStore('game', () => {
  const saved = loadSave()

  const name = ref(saved?.name ?? '轮回者')
  const squadName = ref(saved?.squadName ?? '无名小队')
  const level = ref(saved?.level ?? 1)
  const xp = ref(saved?.xp ?? 0)
  const xpMax = computed(() => Math.floor(100 * Math.pow(1.15, level.value - 1)))
  const rewardPoints = ref(saved?.rewardPoints ?? 0)

  const attributes = ref<Attributes>(saved?.attributes ?? {
    intelligence: 1,
    spirit: 1,
    vitality: 1,
    reaction: 1,
    strength: 1,
    immunity: 1,
  })

  const sidePlots = ref<SidePlots>(saved?.sidePlots ?? { D: 0, C: 0, B: 0, A: 0, S: 0 })

  const mapProgress = ref<MapProgress>(saved?.mapProgress ?? {
    unlockedMaps: [1],
    completedScenarios: [],
  })

  const idle = ref<IdleState>(saved?.idle ?? {
    isRunning: false,
    startTime: null,
    totalSeconds: 0,
    maxHours: 5,
    currentMapId: 1,
    offline: {
      lastLogoutTime: Date.now(),
      offlineDuration: 0,
      maxOfflineDuration: IDLE_CONFIG.MAX_OFFLINE_HOURS * 3600,
    },
  })

  const logs = ref<LogEntry[]>(saved?.logs ?? [
    { text: '欢迎来到无限恐怖', type: 'gold', timestamp: Date.now() },
    { text: '你已进入主神空间', type: '', timestamp: Date.now() },
    { text: '准备开始你的轮回之旅', type: 'success', timestamp: Date.now() },
  ])

  // ==================== 角色创建数据 ====================

  const characterCreation = ref(saved?.characterCreation ?? {
    name: '轮回者',
    gender: 'male',
    professionId: '',
    selectedFlaws: [] as string[],
    selectedTalents: [] as string[],
    completed: false,
  })

  const characterProfession = computed(() => {
    if (!characterCreation.value.professionId) return null
    return getProfessionById(characterCreation.value.professionId)
  })

  /**
   * 应用角色创建数据，设置初始属性
   */
  function applyCharacterCreation(data: {
    name: string
    gender: string
    professionId: string
    selectedFlaws: string[]
    selectedTalents: string[]
  }) {
    characterCreation.value = {
      ...data,
      completed: true,
    }

    // 设置角色名
    name.value = data.name

    // 获取职业加成
    const profession = getProfessionById(data.professionId)
    if (profession) {
      // 基础属性全为1 + 职业加成
      attributes.value = {
        intelligence: 1 + (profession.attributeBonus.intelligence || 0),
        spirit: 1 + (profession.attributeBonus.spirit || 0),
        vitality: 1 + (profession.attributeBonus.vitality || 0),
        reaction: 1 + (profession.attributeBonus.reaction || 0),
        strength: 1 + (profession.attributeBonus.strength || 0),
        immunity: 1 + (profession.attributeBonus.immunity || 0),
      }
    }

    // 应用缺陷效果（通过装备系统或特殊标记）
    // 缺陷效果在计算衍生属性时动态应用

    // 应用天赋效果（通过装备系统或特殊标记）
    // 天赋效果在计算衍生属性时动态应用

    addLog(`角色创建完成：${data.name}`, 'gold')
    addLog(`职业：${profession?.name || '未知'}`, 'success')
    if (data.selectedFlaws.length > 0) {
      addLog(`缺陷：${data.selectedFlaws.map(id => getFlawById(id)?.name).join(', ')}`, 'warning')
    }
    if (data.selectedTalents.length > 0) {
      addLog(`天赋：${data.selectedTalents.map(id => getTalentById(id)?.name).join(', ')}`, 'success')
    }
  }

  /**
   * 获取角色创建数据
   */
  function getCharacterCreation() {
    return characterCreation.value
  }

  /**
   * 检查是否已完成角色创建
   */
  function isCharacterCreated() {
    return characterCreation.value.completed
  }

  /**
   * 玩家背包/库存
   * key: 物品ID（对应 shopItems 中的 id）
   * value: 持有数量
   * 
   * 使用方式：
   * - 购买物品：inventory.value[itemId] += 数量
   * - 使用物品：inventory.value[itemId] -= 数量
   * - 查询数量：inventory.value[itemId] || 0
   */
  const inventory = ref<Record<string, number>>(saved?.inventory ?? {})

  // ==================== 基因锁系统 ====================

  /**
   * 基因锁状态
   * tier: 当前解锁的最高阶位（0=未解锁）
   * proficiency: 熟练度（每阶独立）
   * active: 主动效果是否激活
   * activeTier: 当前激活的阶位（0=未激活）
   */
  const geneLock = ref(saved?.geneLock ?? {
    tier: 0,
    proficiency: [0, 0, 0, 0, 0], // 每阶的熟练度
    active: false,
    activeTier: 0,
  })

  // ==================== 血统系统 ====================

  /**
   * 当前装备的血统
   * bloodlineId: 血统ID（对应 bloodlines 中的 id）
   * 未装备血统时为 null
   */
  const equippedBloodline = ref<string | null>(saved?.equippedBloodline ?? null)

  // ==================== 技能系统 ====================

  /**
   * 玩家技能等级
   * key: 技能ID（对应 skills 中的 id）
   * value: 技能等级（0-12）
   * 
   * 使用方式：
   * - 升级技能：skills.value[skillId] += 1
   * - 查询等级：skills.value[skillId] || 0
   */
  const playerSkills = ref<Record<string, number>>(saved?.playerSkills ?? {})

  // ==================== 法术系统 ====================

  /**
   * 玩家已学法术
   * key: 法术ID（对应 spells 中的 id）
   * value: 是否已学会
   */
  const playerSpells = ref<Record<string, boolean>>(saved?.playerSpells ?? {})

  // ==================== MP/魔法系统 ====================

  /**
   * 当前MP
   */
  const currentMp = ref<number>(saved?.currentMp ?? 0)

  // ==================== 体积系统 ====================

  /**
   * 体积等级（0-4）
   * 0=微型, 1=小型, 2=中型, 3=大型, 4=巨型
   */
  const volumeLevel = ref<number>(saved?.volumeLevel ?? 2) // 默认中型

  // ==================== 不良状态系统 ====================

  /**
   * 玩家当前不良状态
   */
  const playerStatusEffects = ref<ActiveStatusEffect[]>(saved?.playerStatusEffects ?? [])

  // ==================== 队友系统 ====================

  const companions = ref<Companion[]>(saved?.companions ?? [])

  const currentPage = ref<PageId>('home')
  const dungeonNav = ref<DungeonNavState | null>(null)
  const dungeonExitRequest = ref(0)

  const hpMax = computed(() => attributes.value.vitality * 10)
  const willpower = computed(() => attributes.value.spirit + attributes.value.intelligence)
  const speed = computed(() => attributes.value.strength + attributes.value.reaction + 5)
  const defense = computed(() => attributes.value.reaction)

  // 获取当前地图数据
  const currentMap = computed(() => {
    return GAME_MAPS.find(m => m.id === idle.value.currentMapId) ?? GAME_MAPS[0]
  })

  // 获取已解锁地图
  const unlockedMaps = computed(() => {
    return GAME_MAPS.filter(m => mapProgress.value.unlockedMaps.includes(m.id))
  })

  // 计算离线奖励（基于地图）
  /**
   * 获取挂机属性加成倍率
   * 基于玩家战斗属性提供奖励加成
   */
  function getIdleBonusMultiplier(): number {
    const combat = getCombatStats()
    // 每点属性提供1%加成，上限50%
    const totalStats = combat.strength + combat.reaction + combat.intelligence + combat.vitality + combat.spirit
    const bonus = totalStats * IDLE_CONFIG.STAT_BONUS_PER_POINT
    return Math.min(1.5, 1 + bonus) // 最高1.5倍
  }

  const offlineReward = computed(() => {
    const off = idle.value.offline
    const seconds = Math.min(off.offlineDuration, off.maxOfflineDuration)
    const hours = seconds / 3600
    const map = currentMap.value
    const multiplier = getIdleBonusMultiplier()
    return {
      rewardPoints: Math.floor(hours * map.rewardPerHour.rewardPoints * multiplier),
      xp: Math.floor(hours * map.rewardPerHour.xp * multiplier),
      bonus: Math.floor((multiplier - 1) * 100),
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      totalSeconds: seconds,
    }
  })

  // 计算在线挂机奖励（基于地图 + 战斗属性加成）
  const onlineReward = computed(() => {
    const hours = Math.min(idle.value.totalSeconds / 3600, idle.value.maxHours)
    const map = currentMap.value
    const multiplier = getIdleBonusMultiplier()
    return {
      rewardPoints: Math.floor(hours * map.rewardPerHour.rewardPoints * multiplier),
      xp: Math.floor(hours * map.rewardPerHour.xp * multiplier),
      bonus: Math.floor((multiplier - 1) * 100),
    }
  })

  // 计算离线累积
  function calculateOfflineAccumulation() {
    const now = Date.now()
    const off = idle.value.offline
    const elapsed = Math.floor((now - off.lastLogoutTime) / 1000)
    if (elapsed > 0) {
      off.offlineDuration = Math.min(off.offlineDuration + elapsed, off.maxOfflineDuration)
    }
    off.lastLogoutTime = now
  }

  // 领取离线奖励
  function claimOfflineReward() {
    const reward = offlineReward.value
    if (reward.rewardPoints > 0 || reward.xp > 0) {
      rewardPoints.value += reward.rewardPoints
      xp.value += reward.xp
      idle.value.offline.offlineDuration = 0
      idle.value.offline.lastLogoutTime = Date.now()
      addLog(`领取离线奖励: 💎${reward.rewardPoints} ⚡${reward.xp}`, 'gold')
      saveToDisk(getState())
    }
  }

  // 选择挂机地图
  function selectMap(mapId: number) {
    if (mapProgress.value.unlockedMaps.includes(mapId)) {
      idle.value.currentMapId = mapId
      addLog(`切换挂机地图: ${GAME_MAPS.find(m => m.id === mapId)?.name}`, 'info')
    }
  }

  // 完成副本，解锁下一张地图
  function completeScenario(scenarioId: number) {
    if (!mapProgress.value.completedScenarios.includes(scenarioId)) {
      mapProgress.value.completedScenarios.push(scenarioId)
      const nextMapId = scenarioId + 1
      if (nextMapId <= GAME_MAPS.length && !mapProgress.value.unlockedMaps.includes(nextMapId)) {
        mapProgress.value.unlockedMaps.push(nextMapId)
        const nextMap = GAME_MAPS.find(m => m.id === nextMapId)
        addLog(`解锁新地图: ${nextMap?.name}`, 'success')
      }
    }
  }

  // 属性升级系统
  const attributeCap = computed(() => ATTRIBUTE_CONFIG.MAX_BASE_ATTRIBUTE) // 无血线时上限

  function getAttributeCost(currentValue: number): number {
    for (const tier of ATTRIBUTE_CONFIG.UPGRADE_COST_TIERS) {
      if (currentValue < tier.threshold) return tier.cost
    }
    return 1500
  }

  function canUpgradeAttribute(attr: keyof Attributes): boolean {
    const current = attributes.value[attr]
    if (current >= attributeCap.value) return false
    const cost = getAttributeCost(current)
    return rewardPoints.value >= cost
  }

  function upgradeAttribute(attr: keyof Attributes): boolean {
    const current = attributes.value[attr]
    if (current >= attributeCap.value) return false
    const cost = getAttributeCost(current)
    if (rewardPoints.value < cost) return false
    
    rewardPoints.value -= cost
    attributes.value = { ...attributes.value, [attr]: current + 1 }
    
    const attrNames: Record<string, string> = {
      intelligence: '智力', spirit: '精神力', vitality: '细胞活力',
      reaction: '神经反应', strength: '肌肉强度', immunity: '免疫强度'
    }
    addLog(`升级${attrNames[attr]}: ${current}→${current + 1} (花费💎${cost})`, 'success')
    return true
  }

  // 在线挂机计时器
  let tickTimer: number | null = null

  function startTick() {
    if (tickTimer) return
    tickTimer = window.setInterval(() => {
      if (idle.value.isRunning) {
        idle.value.totalSeconds++
        const map = currentMap.value
        const hours = idle.value.totalSeconds / 3600
        if (hours <= idle.value.maxHours) {
          rewardPoints.value += map.rewardPerHour.rewardPoints / 3600
          xp.value += map.rewardPerHour.xp / 3600
        }
      }
    }, 1000)
  }

  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  }

  function setPage(page: PageId) {
    currentPage.value = page
  }

  function setDungeonNav(nav: DungeonNavState | null) {
    dungeonNav.value = nav
  }

  function requestDungeonExit() {
    dungeonExitRequest.value += 1
  }

  function setUsername(newName: string) {
    name.value = newName
  }

  function setSquadName(newName: string) {
    squadName.value = newName
  }

  function addLog(text: string, type: LogEntry['type'] = '') {
    logs.value.push({ text, type, timestamp: Date.now() })
    if (logs.value.length > 100) logs.value.shift()
  }

  function addRewards(points: number, xpAmount: number) {
    rewardPoints.value += points
    xp.value += xpAmount
    addLog(`获得 💎${points} + ⚡${xpAmount}`, 'gold')
  }

  function addSidePlots(plots: { D?: number; C?: number; B?: number; A?: number; S?: number }) {
    if (plots.D) sidePlots.value.D += plots.D
    if (plots.C) sidePlots.value.C += plots.C
    if (plots.B) sidePlots.value.B += plots.B
    if (plots.A) sidePlots.value.A += plots.A
    if (plots.S) sidePlots.value.S += plots.S
    addLog(`获得支线剧情`, 'gold')
  }

  /**
   * 购买物品
   * @param itemId 物品ID
   * @param price 单价（奖励点）
   * @param quantity 购买数量
   * @returns 是否购买成功
   * 
   * 流程：
   * 1. 检查奖励点是否足够
   * 2. 扣除奖励点
   * 3. 增加库存数量
   * 4. 记录日志
   */
  function buyItem(itemId: string, price: number, quantity: number = 1): boolean {
    if (rewardPoints.value < price * quantity) {
      addLog(`奖励点不足`, 'warning')
      return false
    }
    rewardPoints.value -= price * quantity
    inventory.value[itemId] = (inventory.value[itemId] || 0) + quantity
    addLog(`购买成功`, 'success')
    return true
  }

  /**
   * 使用物品
   * @param itemId 物品ID
   * @returns 是否使用成功
   * 
   * 注意：此函数只处理库存扣减
   * 物品效果（如恢复HP/MP）由调用方处理
   */
  function useItem(itemId: string): boolean {
    if (!inventory.value[itemId] || inventory.value[itemId] <= 0) return false
    inventory.value[itemId]--
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    return true
  }

  // ==================== 装备系统 ====================

  /**
   * 已装备的物品
   * key: 装备槽位（weapon/armor/helmet/gloves/boots/accessory）
   * value: 物品ID（对应 shopItems 中的 id）
   * 
   * 使用方式：
   * - 装备物品：equippedItems.value[slot] = itemId
   * - 卸下装备：delete equippedItems.value[slot]
   * - 查询装备：equippedItems.value[slot]
   */
  const equippedItems = ref<Record<string, string>>(saved?.equippedItems ?? {})

  /**
   * 装备物品到指定槽位
   * @param itemId 物品ID
   * @param slot 装备槽位
   * @returns 是否装备成功
   * 
   * 流程：
   * 1. 检查物品是否在背包中
   * 2. 如果槽位有装备，先卸下旧装备
   * 3. 装备新物品
   * 4. 记录日志
   */
  function equipItem(itemId: string, slot: string): boolean {
    // 检查物品是否在背包中
    if (!inventory.value[itemId] || inventory.value[itemId] <= 0) {
      addLog(`物品不在背包中`, 'warning')
      return false
    }

    // 如果槽位有装备，先卸下旧装备
    if (equippedItems.value[slot]) {
      const oldItemId = equippedItems.value[slot]
      inventory.value[oldItemId] = (inventory.value[oldItemId] || 0) + 1
    }

    // 装备新物品（从背包移除）
    inventory.value[itemId]--
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    equippedItems.value[slot] = itemId

    addLog(`装备成功`, 'success')
    return true
  }

  /**
   * 从指定槽位卸下装备
   * @param slot 装备槽位
   * @returns 是否卸下成功
   */
  function unequipItem(slot: string): boolean {
    if (!equippedItems.value[slot]) return false

    const itemId = equippedItems.value[slot]
    inventory.value[itemId] = (inventory.value[itemId] || 0) + 1
    delete equippedItems.value[slot]

    addLog(`卸下装备`, 'success')
    return true
  }

  /**
   * 计算装备提供的总属性加成
   * @returns 装备属性加成对象
   * 
   * 遍历所有已装备的物品，累加它们的属性
   */
  function getEquipmentStats(): Required<EquipmentStats> {
    const stats: Required<EquipmentStats> = {
      attack: 0,
      defense: 0,
      magicDefense: 0,
      hp: 0,
      mp: 0,
      speed: 0,
      willpower: 0,
      technologyAttack: 0,
      fantasyAttack: 0,
      abnormalAttack: 0,
      technologyDefense: 0,
      fantasyDefense: 0,
      abnormalDefense: 0,
      physicalAttack: 0,
      magicAttack: 0,
      physicalDefense: 0,
      critRate: 0,
      critDamage: 0,
      critResist: 0,
      hit: 0,
      evasion: 0,
      counterRate: 0,
      reflectRate: 0,
      comboRate: 0,
      shield: 0,
      shieldRegen: 0,
      stunRate: 0,
      stunResist: 0,
      lifeSteal: 0,
      damageReduction: 0,
      penetration: 0,
      armorBreak: 0,
      blockRate: 0,
      toughness: 0,
      trueDamage: 0,
      trueDefense: 0,
    }

    // 遍历所有已装备的物品
    for (const slot of Object.values(equippedItems.value)) {
      const item = getItemById(slot)
      if (item?.stats) {
        Object.entries(item.stats).forEach(([key, value]) => {
          if (typeof value === 'number' && key in stats) {
            stats[key as keyof Required<EquipmentStats>] += value
          }
        })
      }
    }

    return stats
  }

  function getWeaponCombatInfo(): { attack: number; essence: WeaponEssence } {
    const weaponId = equippedItems.value.weapon
    const weapon = weaponId ? getItemById(weaponId) : null
    return {
      attack: weapon?.stats?.attack || 0,
      essence: weapon?.essence || 'technology',
    }
  }

  // ==================== 基因锁功能 ====================

  /**
   * 获取当前基因锁被动属性加成
   * @returns 全属性加成数值
   * 
   * 被动效果：解锁后永久生效
   * 一阶+1，二阶+2，...，五阶+5
   */
  function getGeneLockPassiveBonus(): number {
    return geneLock.value.tier // tier=0时返回0，tier=1时返回1，以此类推
  }

  /**
   * 获取当前基因锁主动效果加成
   * @returns 主动效果数值（全属性、暴击、闪避）
   */
  function getGeneLockActiveBonus(): { allStats: number; crit: number; dodge: number } {
    if (!geneLock.value.active || geneLock.value.activeTier === 0) {
      return { allStats: 0, crit: 0, dodge: 0 }
    }

    const tier = geneLock.value.activeTier
    // 主动效果配置
    const activeConfigs: Record<number, { allStats: number; crit: number; dodge: number }> = {
      1: { allStats: 2, crit: 0.1, dodge: 0.1 },
      2: { allStats: 4, crit: 0.2, dodge: 0.2 },
      3: { allStats: 6, crit: 0.3, dodge: 0.3 },
      4: { allStats: 8, crit: 0.4, dodge: 0.4 },
      5: { allStats: 10, crit: 0.5, dodge: 0.5 },
    }

    return activeConfigs[tier] || { allStats: 0, crit: 0, dodge: 0 }
  }

  /**
   * 尝试解锁基因锁
   * @param tier 目标阶位
   * @returns 是否解锁成功
   * 
   * 解锁条件：
   * - 一阶：受到伤害时自动触发
   * - 二阶+：需要前一阶完全熟练
   */
  function tryUnlockGeneLock(tier: number): boolean {
    // 检查是否满足解锁条件
    if (tier > geneLock.value.tier + 1) return false // 必须逐阶解锁
    
    // 检查前一阶是否完全熟练
    if (tier > 1) {
      const prevTierConfig = getGeneLockConfig(tier - 1)
      if (geneLock.value.proficiency[tier - 2] < prevTierConfig.maxProficiency) {
        addLog(`需要先将前一阶基因锁练至完全熟练`, 'warning')
        return false
      }
    }

    // 计算解锁概率
    const hpPercent = hpMax.value > 0 ? (hpMax.value - 50) / hpMax.value : 1 // 简化处理
    const proficiency = geneLock.value.proficiency[tier - 1] || 0
    const chance = calculateUnlockChance(tier, hpPercent * 100, 100, proficiency)

    // 投骰判定
    const roll = Math.random()
    if (roll < chance) {
      // 解锁成功
      geneLock.value.tier = Math.max(geneLock.value.tier, tier)
      geneLock.value.proficiency[tier - 1] = (geneLock.value.proficiency[tier - 1] || 0) + 1
      addLog(`基因锁第${tier}阶解锁成功！`, 'gold')
      return true
    } else {
      // 解锁失败
      addLog(`基因锁解锁失败`, 'warning')
      return false
    }
  }

  /**
   * 激活基因锁主动效果
   * @param tier 要激活的阶位
   * @returns 是否激活成功
   */
  function activateGeneLock(tier: number): boolean {
    if (tier > geneLock.value.tier) return false // 未解锁的阶位无法激活
    if (geneLock.value.active) return false // 已经激活中

    geneLock.value.active = true
    geneLock.value.activeTier = tier
    addLog(`基因锁第${tier}阶激活`, 'success')
    return true
  }

  /**
   * 解除基因锁激活
   */
  function deactivateGeneLock() {
    if (!geneLock.value.active) return
    geneLock.value.active = false
    geneLock.value.activeTier = 0
    addLog(`基因锁已解除`, '')
  }

  /**
   * 获取基因锁配置
   */
  function getGeneLockConfig(tier: number) {
    const configs = [
      { maxProficiency: 10 },
      { maxProficiency: 18 },
      { maxProficiency: 21 },
      { maxProficiency: 36 },
      { maxProficiency: 50 },
    ]
    return configs[tier - 1] || configs[0]
  }

  // ==================== 血统功能 ====================

  /**
   * 获取当前血统的属性加成
   * @returns 血统属性加成对象
   */
  function getBloodlineStats(): {
    strength: number; reaction: number; intelligence: number;
    vitality: number; spirit: number; immunity: number
  } {
    const defaultStats = { strength: 0, reaction: 0, intelligence: 0, vitality: 0, spirit: 0, immunity: 0 }
    if (!equippedBloodline.value) return defaultStats

    const bloodline = getBloodlineById(equippedBloodline.value)
    if (!bloodline) return defaultStats

    return bloodline.stats
  }

  /**
   * 装备血统
   * @param bloodlineId 血统ID
   * @returns 是否装备成功
   */
  function equipBloodline(bloodlineId: string): boolean {
    equippedBloodline.value = bloodlineId
    addLog(`血统装备成功`, 'success')
    return true
  }

  /**
   * 卸下血统
   */
  function unequipBloodline() {
    equippedBloodline.value = null
    addLog(`血统已卸下`, '')
  }

  // ==================== 技能功能 ====================

  /**
   * 获取技能等级
   * @param skillId 技能ID
   * @returns 技能等级
   */
  function getSkillLevel(skillId: string): number {
    return playerSkills.value[skillId] || 0
  }

  /**
   * 升级技能
   * @param skillId 技能ID
   * @returns 是否升级成功
   */
  function upgradeSkill(skillId: string): boolean {
    const currentLevel = getSkillLevel(skillId)
    if (currentLevel >= 12) {
      addLog(`技能已达到最大等级`, 'warning')
      return false
    }

    const cost = getSkillUpgradeCost(currentLevel)
    if (xp.value < cost) {
      addLog(`经验值不足`, 'warning')
      return false
    }

    xp.value -= cost
    playerSkills.value[skillId] = currentLevel + 1
    addLog(`技能升级成功`, 'success')
    return true
  }

  /**
   * 获取技能检定骰池
   * @param skillId 技能ID
   * @returns 骰子数量（属性 + 技能等级）
   */
  function getSkillDicePool(skillId: string): number {
    const skill = getSkillById(skillId)
    if (!skill) return 1

    const combat = getCombatStats()
    const attrValue = (combat as any)[skill.relatedAttr] || 1
    const skillLevel = getSkillLevel(skillId)

    return attrValue + skillLevel
  }

  // ==================== 法术功能 ====================

  /**
   * 学习法术
   * @param spellId 法术ID
   * @returns 是否学习成功
   */
  function learnSpell(spellId: string): boolean {
    if (playerSpells.value[spellId]) {
      addLog(`你已经学会了这个法术`, 'warning')
      return false
    }
    playerSpells.value[spellId] = true
    addLog(`学会新法术`, 'success')
    return true
  }

  /**
   * 检查是否已学法术
   * @param spellId 法术ID
   * @returns 是否已学
   */
  function hasSpell(spellId: string): boolean {
    return playerSpells.value[spellId] || false
  }

  /**
   * 获取所有已学法术ID
   * @returns 已学法术ID列表
   */
  function getLearnedSpells(): string[] {
    return Object.keys(playerSpells.value).filter(id => playerSpells.value[id])
  }

  // ==================== 技能学习功能 ====================

  /**
   * 学习技能（从商店购买）
   * @param skillId 技能ID
   * @returns 是否学习成功
   */
  function learnSkill(skillId: string): boolean {
    const currentLevel = getSkillLevel(skillId)
    if (currentLevel >= 1) {
      addLog(`你已经学会了这个技能`, 'warning')
      return false
    }
    playerSkills.value[skillId] = 1
    addLog(`学会新技能`, 'success')
    return true
  }

  // ==================== 队友功能 ====================

  function getCompanions(): Companion[] {
    return companions.value
  }

  function getCompanionCount(): number {
    return companions.value.length
  }

  function canRecruitCompanion(): boolean {
    return companions.value.length < COMPANION_CONFIG.MAX_COMPANIONS &&
           rewardPoints.value >= getRecruitCost(companions.value.length)
  }

  function recruitCompanion(name: string, professionId: string, gender: string): boolean {
    if (companions.value.length >= COMPANION_CONFIG.MAX_COMPANIONS) {
      addLog(`队友数量已达上限`, 'warning')
      return false
    }

    const cost = getRecruitCost(companions.value.length)
    if (rewardPoints.value < cost) {
      addLog(`奖励点不足`, 'warning')
      return false
    }

    const profession = getProfessionById(professionId)
    if (!profession) {
      addLog(`职业不存在`, 'warning')
      return false
    }

    rewardPoints.value -= cost

    const companion: Companion = {
      id: `companion_${Date.now()}`,
      name,
      professionId,
      attributes: {
        intelligence: 1 + (profession.attributeBonus.intelligence || 0),
        spirit: 1 + (profession.attributeBonus.spirit || 0),
        vitality: 1 + (profession.attributeBonus.vitality || 0),
        reaction: 1 + (profession.attributeBonus.reaction || 0),
        strength: 1 + (profession.attributeBonus.strength || 0),
        immunity: 1 + (profession.attributeBonus.immunity || 0),
      },
      equippedItems: {},
    }

    companions.value.push(companion)
    addLog(`向主神请求了新队友：${name}（${profession.name}），花费💎${cost}`, 'gold')
    return true
  }

  function removeCompanion(companionId: string): boolean {
    const idx = companions.value.findIndex(c => c.id === companionId)
    if (idx === -1) return false

    // 退还部分装备到库存
    const companion = companions.value[idx]
    for (const [slot, itemId] of Object.entries(companion.equippedItems)) {
      inventory.value[itemId] = (inventory.value[itemId] || 0) + 1
    }

    companions.value.splice(idx, 1)
    addLog(`队友已离队`, 'info')
    return true
  }

  function getCompanionCombatStats(companion: Companion): {
    attack: number
    hpMax: number
    techAttack: number
    fantAttack: number
    abnAttack: number
  } {
    const attr = companion.attributes
    const prof = getProfessionById(companion.professionId)

    // 从装备获取加成
    let equipAttack = 0
    let equipTechAttack = 0
    let equipFantAttack = 0
    let equipAbnAttack = 0
    for (const itemId of Object.values(companion.equippedItems)) {
      const item = getItemById(itemId)
      if (item?.stats) {
        equipAttack += item.stats.attack || 0
        equipTechAttack += item.stats.technologyAttack || item.stats.physicalAttack || 0
        equipFantAttack += item.stats.fantasyAttack || item.stats.magicAttack || 0
        equipAbnAttack += item.stats.abnormalAttack || 0
      }
    }

    const techAttack = (8 + attr.strength * 2 + equipAttack + equipTechAttack) * COMPANION_CONFIG.ATTACK_PER_POINT
    const fantAttack = (6 + attr.spirit * 3 + attr.intelligence + equipFantAttack) * COMPANION_CONFIG.ATTACK_PER_POINT
    const abnAttack = (6 + attr.spirit * 2 + attr.intelligence * 2 + equipAbnAttack) * COMPANION_CONFIG.ATTACK_PER_POINT
    const hpMax = COMPANION_CONFIG.BASE_HP + attr.vitality * COMPANION_CONFIG.HP_VITALITY_MULTIPLIER

    // 总攻击力取最高的一种
    const attack = Math.max(techAttack, fantAttack, abnAttack)

    return { attack: Math.floor(attack), hpMax, techAttack: Math.floor(techAttack), fantAttack: Math.floor(fantAttack), abnAttack: Math.floor(abnAttack) }
  }

  function equipCompanionItem(companionId: string, itemId: string, slot: string): boolean {
    const companion = companions.value.find(c => c.id === companionId)
    if (!companion) return false
    if (!inventory.value[itemId] || inventory.value[itemId] <= 0) return false

    // 卸下旧装备
    if (companion.equippedItems[slot]) {
      const oldItemId = companion.equippedItems[slot]
      inventory.value[oldItemId] = (inventory.value[oldItemId] || 0) + 1
    }

    inventory.value[itemId]--
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    companion.equippedItems[slot] = itemId
    addLog(`为${companion.name}装备了物品`, 'success')
    return true
  }

  function unequipCompanionItem(companionId: string, slot: string): boolean {
    const companion = companions.value.find(c => c.id === companionId)
    if (!companion || !companion.equippedItems[slot]) return false

    const itemId = companion.equippedItems[slot]
    inventory.value[itemId] = (inventory.value[itemId] || 0) + 1
    delete companion.equippedItems[slot]
    addLog(`卸下了${companion.name}的装备`, 'success')
    return true
  }

  function upgradeCompanionAttribute(companionId: string, attr: keyof Attributes): boolean {
    const companion = companions.value.find(c => c.id === companionId)
    if (!companion) return false

    const current = companion.attributes[attr]
    const cost = getAttributeCost(current)
    if (rewardPoints.value < cost) return false

    rewardPoints.value -= cost
    companion.attributes[attr] = current + 1

    const attrNames: Record<string, string> = {
      intelligence: '智力', spirit: '精神力', vitality: '细胞活力',
      reaction: '神经反应', strength: '肌肉强度', immunity: '免疫强度'
    }
    addLog(`强化${companion.name}${attrNames[attr]}: ${current}→${current + 1} (花费💎${cost})`, 'success')
    return true
  }

  // ==================== 统一战斗属性计算 ====================

  /**
   * 获取最终战斗属性（合并所有加成来源）
   * 
   * 加成来源：
   * 1. 基础属性（玩家分配的点数）
   * 2. 装备属性（武器/盔甲等）
   * 3. 基因锁被动（全属性+阶位）
   * 4. 基因锁激活（全属性+额外加成）
   * 5. 血统属性（血统提供的属性加成）
   * 
   * @returns 最终战斗属性
   */
  function getCombatStats() {
    // 1. 基础属性
    const base = { ...attributes.value }

    // 2. 装备属性
    const equip = getEquipmentStats()

    // 3. 基因锁被动
    const genePassive = getGeneLockPassiveBonus()

    // 4. 基因锁激活
    const geneActive = getGeneLockActiveBonus()

    // 5. 血统属性
    const blood = getBloodlineStats()

    // 合并所有属性
    return {
      strength: base.strength + genePassive + geneActive.allStats + blood.strength,
      reaction: base.reaction + genePassive + geneActive.allStats + blood.reaction,
      intelligence: base.intelligence + genePassive + geneActive.allStats + blood.intelligence,
      vitality: base.vitality + genePassive + geneActive.allStats + blood.vitality,
      spirit: base.spirit + genePassive + geneActive.allStats + blood.spirit,
      immunity: base.immunity + genePassive + geneActive.allStats + blood.immunity,
      hpBonus: equip.hp,
      mpBonus: equip.mp,
      speedBonus: equip.speed,
    }
  }

  /**
   * 获取进阶战斗属性
   *
   * 这些属性直接进入战斗公式，不再通过D10成功数比较来放大或抵消。
   * 概率/比例使用小数保存：0.12 = 12%，1.5 = 150%暴击伤害。
   */
  function getAdvancedCombatStats(): AdvancedCombatStats {
    const base = { ...attributes.value }
    const equip = getEquipmentStats()
    const genePassive = getGeneLockPassiveBonus()
    const geneActive = getGeneLockActiveBonus()
    const blood = getBloodlineStats()
    const volumeMod = getVolumeModifier()

    const strength = base.strength + genePassive + geneActive.allStats + blood.strength
    const reaction = base.reaction + genePassive + geneActive.allStats + blood.reaction
    const intelligence = base.intelligence + genePassive + geneActive.allStats + blood.intelligence
    const vitality = base.vitality + genePassive + geneActive.allStats + blood.vitality
    const spirit = base.spirit + genePassive + geneActive.allStats + blood.spirit
    const immunity = base.immunity + genePassive + geneActive.allStats + blood.immunity

    const melee = getSkillLevel('melee')
    const firearm = getSkillLevel('firearm')
    const dodgeSkill = getSkillLevel('dodge')
    const weapon = getWeaponCombatInfo()
    const nonWeaponAttack = Math.max(0, equip.attack - weapon.attack)

    const technologyAttack = (8 + strength * 2 + nonWeaponAttack + equip.technologyAttack + equip.physicalAttack) * (1 + volumeMod.damage)
    const fantasyAttack = 6 + spirit * 3 + intelligence + equip.fantasyAttack + equip.magicAttack
    const abnormalAttack = 6 + spirit * 2 + intelligence * 2 + equip.abnormalAttack

    const technologyDefense = reaction + Math.floor(immunity * 0.5) + equip.defense + equip.technologyDefense + equip.physicalDefense
    const fantasyDefense = spirit + immunity + equip.magicDefense + equip.fantasyDefense
    const abnormalDefense = intelligence + Math.floor(spirit * 0.5) + immunity + equip.abnormalDefense
    const speed = (strength + reaction + 5 + equip.speed) * (1 + volumeMod.speed)

    return {
      ...EMPTY_ADVANCED_STATS,
      technologyAttack: Math.max(1, Math.floor(technologyAttack)),
      fantasyAttack: Math.max(0, Math.floor(fantasyAttack)),
      abnormalAttack: Math.max(0, Math.floor(abnormalAttack)),
      technologyDefense: Math.max(0, Math.floor(technologyDefense * (1 + volumeMod.armor))),
      fantasyDefense: Math.max(0, Math.floor(fantasyDefense)),
      abnormalDefense: Math.max(0, Math.floor(abnormalDefense)),
      speed: Math.max(1, Math.floor(speed)),
      critRate: Math.min(0.95, intelligence * 0.01 + geneActive.crit + equip.critRate),
      critDamage: Math.max(1, 1.5 + equip.critDamage),
      critResist: Math.min(0.75, immunity * 0.01 + equip.critResist),
      hit: Math.min(0.98, 0.75 + reaction * 0.01 + Math.max(melee, firearm) * 0.02 + equip.hit),
      evasion: Math.min(0.85, 0.05 + reaction * 0.01 + dodgeSkill * 0.02 + geneActive.dodge + volumeMod.dodge + equip.evasion),
      counterRate: Math.min(0.75, equip.counterRate),
      reflectRate: Math.min(0.75, equip.reflectRate),
      comboRate: Math.min(0.75, equip.comboRate),
      shield: Math.max(0, equip.shield),
      shieldRegen: Math.max(0, equip.shieldRegen),
      stunRate: Math.min(0.75, equip.stunRate),
      stunResist: Math.min(0.85, immunity * 0.01 + equip.stunResist),
      lifeSteal: Math.min(0.75, equip.lifeSteal),
      damageReduction: Math.min(0.85, immunity * 0.01 + vitality * 0.01 + equip.damageReduction),
      penetration: Math.max(0, equip.penetration),
      armorBreak: Math.min(0.85, equip.armorBreak),
      blockRate: Math.min(0.75, equip.blockRate),
      toughness: Math.min(0.75, immunity * 0.01 + vitality * 0.01 + equip.toughness),
      trueDamage: Math.max(0, equip.trueDamage),
      trueDefense: Math.max(0, equip.trueDefense),
    }
  }

  /**
   * 获取体积修正
   * @returns 体积修正对象
   */
  function getVolumeModifier() {
    return (VOLUME_CONFIG.MODIFIERS as any)[volumeLevel.value] || VOLUME_CONFIG.MODIFIERS[2]
  }

  /**
   * 获取最终HP
   * 公式：(基础HP + 活力×倍率 + 装备HP + 基因锁加成) × 体积修正
   */
  function getMaxHp(): number {
    const combat = getCombatStats()
    const baseHp = HP_CONFIG.BASE_HP + combat.vitality * HP_CONFIG.VITALITY_HP_MULTIPLIER + combat.hpBonus + getGeneLockPassiveBonus() * HP_CONFIG.GENE_LOCK_HP_BONUS
    const volumeMod = getVolumeModifier()
    return Math.floor(baseHp * (1 + volumeMod.hp))
  }

  /**
   * 获取最终MP
   * 公式：智力×10 + 装备MP
   */
  function getMaxMp(): number {
    const combat = getCombatStats()
    return combat.intelligence * MP_CONFIG.INTELLIGENCE_MP_MULTIPLIER + combat.mpBonus
  }

  /**
   * 获取最终意志力
   * 公式：精神力 + 智力 + 装备意志 + 血统加成
   */
  function getMaxWillpower(): number {
    const combat = getCombatStats()
    return combat.spirit + combat.intelligence
  }

  /**
   * 获取最终速度
   * 公式：(肌肉强度 + 神经反应 + 5 + 装备速度) × 体积修正 × 状态修正
   */
  function getSpeed(): number {
    const combat = getCombatStats()
    const baseSpeed = combat.strength + combat.reaction + 5 + combat.speedBonus
    const volumeMod = getVolumeModifier()
    const statusMod = getStatusEffectsModifier(playerStatusEffects.value)
    return Math.floor(baseSpeed * (1 + volumeMod.speed) * (1 + statusMod.speed))
  }

  // ==================== MP/魔法功能 ====================

  /**
   * 消耗MP
   * @param amount 消耗量
   * @returns 是否消耗成功
   */
  function spendMp(amount: number): boolean {
    if (currentMp.value < amount) return false
    currentMp.value -= amount
    return true
  }

  /**
   * 恢复MP
   * @param amount 恢复量
   */
  function restoreMp(amount: number) {
    const maxMp = getMaxMp()
    currentMp.value = Math.min(maxMp, currentMp.value + amount)
  }

  /**
   * 获取魔法伤害
   * @param spellBaseDamage 法术基础伤害
   * @returns 最终魔法伤害
   */
  function getMagicDamage(spellBaseDamage: number): number {
    const combat = getCombatStats()
    return spellBaseDamage + combat.spirit * MP_CONFIG.SPIRIT_DAMAGE_MULTIPLIER
  }

  // ==================== HP回复功能 ====================

  /**
   * 获取每回合HP回复量
   * 公式：活力 × HP_REGEN + 装备/天赋加成
   */
  function getHpRegen(): number {
    const combat = getCombatStats()
    const baseRegen = combat.vitality * ATTRIBUTE_CONFIG.EFFECTS.VITALITY.HP_REGEN
    return Math.floor(baseRegen)
  }

  // ==================== 不良状态功能 ====================

  /**
   * 对玩家施加不良状态
   * @param type 状态类型
   * @param duration 持续回合数
   */
  function applyPlayerStatusEffect(type: StatusEffectType, duration: number) {
    const combat = getCombatStats()
    playerStatusEffects.value = applyStatusEffect(
      playerStatusEffects.value,
      { type, duration, source: 'enemy' },
      combat.immunity
    )
  }

  /**
   * 处理玩家回合结束的不良状态
   * @returns 本回合受到的DOT伤害
   */
  function processPlayerStatusEffects(): { damage: number; canAct: boolean; canCast: boolean } {
    const result = processStatusEffects(playerStatusEffects.value)
    playerStatusEffects.value = result.effects
    return { damage: result.damage, canAct: result.canAct, canCast: result.canCast }
  }

  /**
   * 清除玩家所有不良状态
   */
  function clearPlayerStatusEffects() {
    playerStatusEffects.value = []
  }

  /**
   * 恢复玩家HP
   * @param amount 恢复量
   */
  function healPlayer(amount: number) {
    const maxHp = getMaxHp()
    // 这里需要一个currentHp状态，暂时用maxHp作为参考
    // 实际HP管理在ScenarioPage中处理
  }

  function getState() {
    return {
      name: name.value,
      squadName: squadName.value,
      level: level.value,
      xp: xp.value,
      rewardPoints: rewardPoints.value,
      attributes: attributes.value,
      sidePlots: sidePlots.value,
      idle: idle.value,
      mapProgress: mapProgress.value,
      logs: logs.value,
      inventory: inventory.value,
      equippedItems: equippedItems.value,
      geneLock: geneLock.value,
      equippedBloodline: equippedBloodline.value,
      playerSkills: playerSkills.value,
      playerSpells: playerSpells.value,
      currentMp: currentMp.value,
      volumeLevel: volumeLevel.value,
      playerStatusEffects: playerStatusEffects.value,
      characterCreation: characterCreation.value,
      companions: companions.value,
    }
  }

  // 自动存档
  watch(
    () => [rewardPoints.value, xp.value, attributes.value, sidePlots.value, idle.value, mapProgress.value, inventory.value, equippedItems.value, geneLock.value, equippedBloodline.value, playerSkills.value, playerSpells.value, currentMp.value, volumeLevel.value, playerStatusEffects.value, characterCreation.value, companions.value, name.value, squadName.value],
    () => saveToDisk(getState()),
    { deep: true }
  )

  // 初始化
  calculateOfflineAccumulation()
  startTick()

  // 记录登出时间
  window.addEventListener('beforeunload', () => {
    idle.value.offline.lastLogoutTime = Date.now()
    saveToDisk(getState())
  })

  return {
    name, squadName, level, xp, xpMax, rewardPoints,
    attributes, sidePlots, idle, mapProgress, logs, currentPage, dungeonNav, dungeonExitRequest,
    hpMax, willpower, speed, defense,
    currentMap, unlockedMaps,
    offlineReward, onlineReward,
    attributeCap, getAttributeCost, canUpgradeAttribute, upgradeAttribute,
    setPage, setDungeonNav, requestDungeonExit, setUsername, setSquadName, addLog, addRewards, addSidePlots,
    claimOfflineReward, selectMap, completeScenario,
    inventory, buyItem, useItem,
    equippedItems, equipItem, unequipItem, getEquipmentStats, getWeaponCombatInfo,
    geneLock, getGeneLockPassiveBonus, getGeneLockActiveBonus,
    tryUnlockGeneLock, activateGeneLock, deactivateGeneLock,
    equippedBloodline, getBloodlineStats, equipBloodline, unequipBloodline,
    playerSkills, getSkillLevel, upgradeSkill, getSkillDicePool,
    playerSpells, learnSpell, hasSpell, getLearnedSpells, learnSkill,
    currentMp, volumeLevel, playerStatusEffects,
    getMaxMp, getSpeed, spendMp, restoreMp, getMagicDamage,
    getHpRegen,
    applyPlayerStatusEffect, processPlayerStatusEffects, clearPlayerStatusEffects,
    getVolumeModifier,
    getCombatStats, getAdvancedCombatStats, getMaxHp, getMaxWillpower,
    characterCreation, characterProfession, applyCharacterCreation, getCharacterCreation, isCharacterCreated,
    companions, getCompanions, getCompanionCount, canRecruitCompanion, recruitCompanion, removeCompanion,
    getCompanionCombatStats, equipCompanionItem, unequipCompanionItem, upgradeCompanionAttribute,
  }
})
