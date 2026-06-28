import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Attributes, AttributeKey, Character, CharacterGeneLock, Companion, SidePlots, IdleState, LogEntry, PageId, OfflineIdle, MapProgress, PersonalSpaceState, FacilityPlacement } from '../types/game'
import { GAME_MAPS } from '../data/maps'
import { getItemById } from '../data/shop'
import { calculateUnlockChance } from '../data/geneLock'
import { getBloodlineById } from '../data/bloodline'
import { getSkillById, getSkillUpgradeCost, skills, NEW_SKILL_IDS, LEGACY_SKILL_IDS, SKILL_ID_MIGRATION } from '../data/skills'
import { COMBAT_CONFIG, HP_CONFIG, IDLE_CONFIG, ATTRIBUTE_CONFIG, MP_CONFIG, VOLUME_CONFIG, EMPTY_ADVANCED_STATS, type AdvancedCombatStats, ATTRIBUTE_LABELS, type AttributeId } from '../config/combat'
import type { ActiveStatusEffect, StatusEffectType } from '../data/statusEffects'
import { applyStatusEffect, processStatusEffects, getStatusEffectsModifier } from '../data/statusEffects'
import type { DamageType } from '../config/combat'
import { getProfessionById, getFlawById, getTalentById } from '../data/characterCreate'
import { COMPANION_CONFIG, getRecruitCost } from '../data/companion'
import type { EquipmentStats, WeaponEssence } from '../types/equipment'

const SAVE_KEY = 'wxkb_save'
const PERSONAL_TRAINING_POINTS_PER_HOUR = 0.2

/** 九属性默认值 */
const DEFAULT_ATTRIBUTES: Attributes = {
  strength: 1, agility: 1, endurance: 1,
  intelligence: 1, perception: 1, resolve: 1,
  presence: 1, manipulation: 1, composure: 1,
}

/** 属性标签（从 config 统一引入） */
const ATTR_LABELS = ATTRIBUTE_LABELS

/** 个人空间设施ID迁移：旧六属性→新九属性 */
const FACILITY_TYPE_MIGRATION: Record<string, string> = {
  reaction: 'agility',
  meditation: 'resolve',
  recovery: 'endurance',
  immune: 'composure',
}

/** 迁移个人空间设施布局 */
function migrateFacilityPlacements(placements: FacilityPlacement[]): FacilityPlacement[] {
  return placements.map(p => {
    const newType = FACILITY_TYPE_MIGRATION[p.type]
    if (newType) {
      return { ...p, type: newType, id: p.id.replace(p.type, newType) }
    }
    return p
  })
}

/** 迁移个人空间训练分配 */
function migrateTrainingAssignments(assignments: Record<string, AttributeKey | null>): Record<string, AttributeKey | null> {
  const result: Record<string, AttributeKey | null> = {}
  for (const [charId, attr] of Object.entries(assignments)) {
    if (attr && attr in FACILITY_TYPE_MIGRATION) {
      result[charId] = FACILITY_TYPE_MIGRATION[attr] as AttributeKey
    } else {
      result[charId] = attr
    }
  }
  return result
}

const DEFAULT_PERSONAL_SPACE: PersonalSpaceState = {
  roomType: 'indoor',
  roomStyle: 'military',
  currentEnvironment: '军事风训练基地，中央控制台已经接入主神空间的仓储与训练模块。',
facilityPlacements: [
{ id: 'hotspot_backpack', type: 'backpack', x: 17, y: 72, level: 1 },
{ id: 'hotspot_storage', type: 'storage', x: 84, y: 68, level: 1 },
{ id: 'hotspot_gym', type: 'gym', x: 25, y: 43, level: 1 },
{ id: 'hotspot_agility', type: 'agility', x: 52, y: 34, level: 1 },
{ id: 'hotspot_endurance', type: 'endurance', x: 62, y: 66, level: 1 },
{ id: 'hotspot_library', type: 'library', x: 76, y: 38, level: 1 },
{ id: 'hotspot_perception', type: 'perception', x: 15, y: 30, level: 1 },
{ id: 'hotspot_resolve', type: 'resolve', x: 37, y: 63, level: 1 },
{ id: 'hotspot_presence', type: 'presence', x: 88, y: 52, level: 1 },
{ id: 'hotspot_manipulation', type: 'manipulation', x: 70, y: 80, level: 1 },
{ id: 'hotspot_composure', type: 'composure', x: 49, y: 78, level: 1 },
],
  storage: {},
  trainingAssignments: {},
  trainingProgress: {},
}

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

/**
 * 迁移旧技能到新技能系统
 * - dodge → athletics
 * - knowledge → lore, mysticism → occult, animal_handling → animalHandling, socializing → persuasion
 * - 清除所有旧技能ID
 * - 如果没有任何新技能，按职业赋予初始技能
 */
function migrateSkills(skills: Record<string, number>, professionId: string): Record<string, number> {
  const result: Record<string, number> = {}

  // 1. 先尝试用迁移映射表转换旧技能 ID
  for (const [oldId, level] of Object.entries(skills)) {
    const newId = SKILL_ID_MIGRATION[oldId]
    if (newId) {
      result[newId] = Math.max(result[newId] ?? 0, level)
    }
  }

  // 2. 保留已经是新技能 ID 的条目
  for (const id of NEW_SKILL_IDS) {
    if (skills[id] !== undefined) {
      result[id] = Math.max(result[id] ?? 0, skills[id])
    }
  }

  // 3. 如果没有任何新技能，按职业赋予初始技能
  const hasNewSkill = NEW_SKILL_IDS.some(id => result[id])
  if (!hasNewSkill && professionId) {
    const prof = getProfessionById(professionId)
    if (prof?.startingSkill) {
      result[prof.startingSkill] = 1
    }
  }

  return result
}

/**
 * 创建默认角色数据（用于新角色/迁移）
 */
function createDefaultCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: '角色',
    professionId: '',
    gender: 'male',
    attributes: { ...DEFAULT_ATTRIBUTES },
    equippedItems: {},
    geneLock: { tier: 0, proficiency: [0, 0, 0, 0, 0], active: false, activeTier: 0 },
    equippedBloodline: null,
    skills: {},
    spells: {},
    currentMp: 0,
    volumeLevel: 2,
    statusEffects: [],
    ...overrides,
  }
}

/**
 * 将旧六属性存档迁移为九属性
 *
 * 迁移规则：
 *   strength     ← old.strength (肌肉强度)
 *   agility      ← old.reaction (神经反应)
 *   endurance    ← old.vitality (细胞活力)
 *   intelligence ← old.intelligence (智力)
 *   perception   ← max(old.reaction, old.intelligence)
 *   resolve      ← old.spirit (精神力)
 *   presence     ← old.spirit (精神力)
 *   manipulation ← old.spirit (精神力)
 *   composure    ← old.immunity (免疫强度)
 */
function migrateAttributes(old: any): Attributes {
  // 如果已经是九属性格式，直接返回
  if (old && typeof old.strength === 'number' && typeof old.agility === 'number' && typeof old.composure === 'number') {
    return {
      strength: old.strength ?? 1,
      agility: old.agility ?? 1,
      endurance: old.endurance ?? 1,
      intelligence: old.intelligence ?? 1,
      perception: old.perception ?? 1,
      resolve: old.resolve ?? 1,
      presence: old.presence ?? 1,
      manipulation: old.manipulation ?? 1,
      composure: old.composure ?? 1,
    }
  }

  // 从旧六属性迁移
  const oldStrength = old?.strength ?? old?.muscle ?? 1
  const oldReaction = old?.reaction ?? 1
  const oldVitality = old?.vitality ?? 1
  const oldIntelligence = old?.intelligence ?? 1
  const oldSpirit = old?.spirit ?? 1
  const oldImmunity = old?.immunity ?? 1

  return {
    strength: oldStrength,
    agility: oldReaction,
    endurance: oldVitality,
    intelligence: oldIntelligence,
    perception: Math.max(oldReaction, oldIntelligence),
    resolve: oldSpirit,
    presence: oldSpirit,
    manipulation: oldSpirit,
    composure: oldImmunity,
  }
}

/**
 * 从旧存档格式迁移到统一角色数组
 * 旧格式：name, attributes, equippedItems, geneLock, ... + companions[]
 * 新格式：characters[] (index 0 = 主角)
 */
function migrateToCharacters(saved: any): Character[] {
  // 如果已经是新格式，直接返回（但需要迁移技能和属性）
  if (saved?.characters && Array.isArray(saved.characters)) {
    return saved.characters.map((c: any) => {
      const char = createDefaultCharacter(c)
      // 迁移技能到新系统
      char.skills = migrateSkills(char.skills, char.professionId)
      // 迁移属性到九属性
      char.attributes = migrateAttributes(c.attributes)
      return char
    })
  }

  // 从旧格式迁移
  const mainChar = createDefaultCharacter({
    id: 'char_main',
    name: saved?.name ?? '轮回者',
    professionId: saved?.characterCreation?.professionId ?? '',
    gender: saved?.characterCreation?.gender ?? 'male',
    attributes: migrateAttributes(saved?.attributes),
    equippedItems: saved?.equippedItems ?? {},
    geneLock: saved?.geneLock ?? { tier: 0, proficiency: [0, 0, 0, 0, 0], active: false, activeTier: 0 },
    equippedBloodline: saved?.equippedBloodline ?? null,
    skills: migrateSkills(saved?.playerSkills ?? {}, saved?.characterCreation?.professionId ?? ''),
    spells: saved?.playerSpells ?? {},
    currentMp: saved?.currentMp ?? 0,
    volumeLevel: saved?.volumeLevel ?? 2,
    statusEffects: saved?.playerStatusEffects ?? [],
  })

  const companionChars: Character[] = (saved?.companions ?? []).map((c: any) => createDefaultCharacter({
    id: c.id ?? 'char_' + Math.random().toString(36).slice(2),
    name: c.name ?? '队友',
    professionId: c.professionId ?? '',
    gender: 'male',
    attributes: migrateAttributes(c.attributes),
    equippedItems: c.equippedItems ?? {},
  }))

  return [mainChar, ...companionChars]
}

function saveToDisk(state: any) {
  try {
    const data = {
      squadName: state.squadName,
      level: state.level,
      xp: state.xp,
      rewardPoints: state.rewardPoints,
      sidePlots: state.sidePlots,
      idle: state.idle,
      mapProgress: state.mapProgress,
      logs: state.logs.slice(-50),
      inventory: state.inventory,
      personalSpace: state.personalSpace,
      characterCreation: state.characterCreation,
      characters: state.characters,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {}
}

export const useGameStore = defineStore('game', () => {
  const saved = loadSave()

  // ==================== 统一角色系统 ====================
  // characters[0] = 主角（角色1），characters[1+] = 招募角色（角色2/3/4）
  const characters = ref<Character[]>(migrateToCharacters(saved))

  // 向后兼容：主角属性的计算属性（只读，写入通过 characters[0] 直接操作）
  const name = computed(() => characters.value[0]?.name ?? '轮回者')
  const attributes = computed(() => characters.value[0]?.attributes ?? { ...DEFAULT_ATTRIBUTES })
  const equippedItems = computed(() => characters.value[0]?.equippedItems ?? {})
  const geneLock = computed(() => characters.value[0]?.geneLock ?? { tier: 0, proficiency: [0, 0, 0, 0, 0], active: false, activeTier: 0 })
  const equippedBloodline = computed(() => characters.value[0]?.equippedBloodline ?? null)
  const playerSkills = computed(() => characters.value[0]?.skills ?? {})
  const playerSpells = computed(() => characters.value[0]?.spells ?? {})
  const currentMp = computed(() => characters.value[0]?.currentMp ?? 0)
  const volumeLevel = computed(() => characters.value[0]?.volumeLevel ?? 2)
  const playerStatusEffects = computed(() => characters.value[0]?.statusEffects ?? [])
  // 向后兼容：队友列表 = characters[1:]
  const companions = computed(() => characters.value.slice(1))

  // 全局状态（非角色级别）
  const squadName = ref(saved?.squadName ?? '无名小队')
  const level = ref(saved?.level ?? 1)
  const xp = ref(saved?.xp ?? 0)
  const xpMax = computed(() => Math.floor(100 * Math.pow(1.15, level.value - 1)))
  const rewardPoints = ref(saved?.rewardPoints ?? 0)

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

    // 写入主角数据
    characters.value[0].name = data.name
    characters.value[0].professionId = data.professionId
    characters.value[0].gender = data.gender

    // 获取职业加成：主属性+3，副属性+2，其余初始=1
    const profession = getProfessionById(data.professionId)
    if (profession) {
      const attrs = { ...DEFAULT_ATTRIBUTES }
      attrs[profession.mainAttribute] += 3
      attrs[profession.secondaryAttribute] += 2
      characters.value[0].attributes = attrs
      // 赋予初始技能
      if (profession.startingSkill) {
        characters.value[0].skills[profession.startingSkill] = 1
      }
    }

    addLog(`角色创建完成：${data.name}`, 'gold')
    addLog(`职业：${profession?.name || '未知'}`, 'success')
    if (data.selectedFlaws.length > 0) {
      addLog(`缺陷：${data.selectedFlaws.map(id => getFlawById(id)?.name).join(', ')}`, 'warning')
    }
    if (data.selectedTalents.length > 0) {
      addLog(`天赋：${data.selectedTalents.map(id => getTalentById(id)?.name).join(', ')}`, 'success')
    }
  }

  function getCharacterCreation() {
    return characterCreation.value
  }

  function isCharacterCreated() {
    return characterCreation.value.completed
  }

  /**
   * 玩家背包/库存
   */
  const inventory = ref<Record<string, number>>(saved?.inventory ?? {})
const personalSpace = ref<PersonalSpaceState>({
...DEFAULT_PERSONAL_SPACE,
...(saved?.personalSpace ?? {}),
facilityPlacements: migrateFacilityPlacements(saved?.personalSpace?.facilityPlacements ?? DEFAULT_PERSONAL_SPACE.facilityPlacements),
storage: saved?.personalSpace?.storage ?? {},
trainingAssignments: migrateTrainingAssignments(saved?.personalSpace?.trainingAssignments ?? {}),
trainingProgress: saved?.personalSpace?.trainingProgress ?? {},
})

  const currentPage = ref<PageId>('home')
  const dungeonNav = ref<DungeonNavState | null>(null)
  const dungeonExitRequest = ref(0)

  const hpMax = computed(() => HP_CONFIG.BASE_HP + attributes.value.endurance * HP_CONFIG.ENDURANCE_HP_MULTIPLIER)
  const willpower = computed(() => attributes.value.resolve + attributes.value.composure)
  const speed = computed(() => attributes.value.agility + attributes.value.composure)
  const defense = computed(() => attributes.value.agility)

  // 获取当前地图数据
  const currentMap = computed(() => {
    return GAME_MAPS.find(m => m.id === idle.value.currentMapId) ?? GAME_MAPS[0]
  })

  // 获取已解锁地图
  const unlockedMaps = computed(() => {
    return GAME_MAPS.filter(m => mapProgress.value.unlockedMaps.includes(m.id))
  })

  function normalizePersonalSpaceState() {
    const validIds = new Set(characters.value.map(char => char.id))

    for (const char of characters.value) {
      if (!(char.id in personalSpace.value.trainingAssignments)) {
        personalSpace.value.trainingAssignments[char.id] = null
      }
      if (!personalSpace.value.trainingProgress[char.id]) {
        personalSpace.value.trainingProgress[char.id] = {}
      }
    }

    for (const id of Object.keys(personalSpace.value.trainingAssignments)) {
      if (!validIds.has(id)) {
        delete personalSpace.value.trainingAssignments[id]
      }
    }

    for (const id of Object.keys(personalSpace.value.trainingProgress)) {
      if (!validIds.has(id)) {
        delete personalSpace.value.trainingProgress[id]
      }
    }
  }

  normalizePersonalSpaceState()

  /**
   * 获取挂机属性加成倍率
   */
  function getIdleBonusMultiplier(): number {
    const combat = getCombatStats()
    const totalStats = combat.strength + combat.agility + combat.endurance + combat.intelligence + combat.perception + combat.resolve + combat.presence + combat.manipulation + combat.composure
    const bonus = totalStats * IDLE_CONFIG.STAT_BONUS_PER_POINT
    return Math.min(1.5, 1 + bonus)
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

  function calculateOfflineAccumulation() {
    const now = Date.now()
    const off = idle.value.offline
    const elapsed = Math.floor((now - off.lastLogoutTime) / 1000)
    if (elapsed > 0) {
      const appliedSeconds = Math.min(elapsed, off.maxOfflineDuration)
      off.offlineDuration = Math.min(off.offlineDuration + elapsed, off.maxOfflineDuration)
      if (idle.value.isRunning) {
        applyTrainingSeconds(appliedSeconds)
      }
    }
    off.lastLogoutTime = now
  }

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

  function selectMap(mapId: number) {
    if (mapProgress.value.unlockedMaps.includes(mapId)) {
      idle.value.currentMapId = mapId
      addLog(`切换挂机地图: ${GAME_MAPS.find(m => m.id === mapId)?.name}`, 'info')
    }
  }

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

  function getInventoryItemCount(): number {
    return Object.values(inventory.value).reduce((sum, qty) => sum + qty, 0)
  }

  function getStorageItemCount(): number {
    return Object.values(personalSpace.value.storage).reduce((sum, qty) => sum + qty, 0)
  }

  function moveItemToStorage(itemId: string, quantity: number = 1): boolean {
    if (!inventory.value[itemId] || inventory.value[itemId] < quantity) return false
    inventory.value[itemId] -= quantity
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    personalSpace.value.storage[itemId] = (personalSpace.value.storage[itemId] || 0) + quantity
    const item = getItemById(itemId)
    addLog(`已将 ${item?.name || itemId} x${quantity} 存入个人仓库`, 'info')
    return true
  }

  function moveItemToInventory(itemId: string, quantity: number = 1): boolean {
    if (!personalSpace.value.storage[itemId] || personalSpace.value.storage[itemId] < quantity) return false
    personalSpace.value.storage[itemId] -= quantity
    if (personalSpace.value.storage[itemId] <= 0) delete personalSpace.value.storage[itemId]
    inventory.value[itemId] = (inventory.value[itemId] || 0) + quantity
    const item = getItemById(itemId)
    addLog(`已从个人仓库取出 ${item?.name || itemId} x${quantity}`, 'info')
    return true
  }

  function setPersonalSpaceEnvironment(roomType: 'indoor' | 'outdoor', roomStyle: string, environment: string) {
    personalSpace.value.roomType = roomType
    personalSpace.value.roomStyle = roomStyle
    personalSpace.value.currentEnvironment = environment
    addLog(`个人空间已调整为：${environment}`, 'success')
  }

  function getCharacterTrainingAssignment(charId: string): AttributeKey | null {
    return personalSpace.value.trainingAssignments[charId] ?? null
  }

  function getCharacterTrainingProgress(charId: string, attr: AttributeKey): number {
    return personalSpace.value.trainingProgress[charId]?.[attr] ?? 0
  }

  function setCharacterTrainingAssignment(charId: string, attr: AttributeKey | null): boolean {
    const char = characters.value.find(item => item.id === charId)
    if (!char) return false
    personalSpace.value.trainingAssignments[charId] = attr
    if (!personalSpace.value.trainingProgress[charId]) {
      personalSpace.value.trainingProgress[charId] = {}
    }
    if (attr) {
      addLog(`${char.name} 已进入${ATTR_LABELS[attr]}训练`, 'info')
    } else {
      addLog(`${char.name} 已停止个人空间训练`, 'warning')
    }
    return true
  }

  function applyTrainingSeconds(seconds: number) {
    if (seconds <= 0) return

    const gain = seconds * (PERSONAL_TRAINING_POINTS_PER_HOUR / 3600)

    for (const char of characters.value) {
      const attr = personalSpace.value.trainingAssignments[char.id]
      if (!attr) continue
      if (char.attributes[attr] >= attributeCap.value) {
        personalSpace.value.trainingProgress[char.id][attr] = 0
        continue
      }

      const progressBucket = personalSpace.value.trainingProgress[char.id] ?? (personalSpace.value.trainingProgress[char.id] = {})
      progressBucket[attr] = (progressBucket[attr] ?? 0) + gain

      while ((progressBucket[attr] ?? 0) >= 1 && char.attributes[attr] < attributeCap.value) {
        progressBucket[attr]! -= 1
        char.attributes[attr] += 1
        addLog(`${char.name} 在个人空间训练中提升了${ATTR_LABELS[attr]}`, 'success')
      }

      if (char.attributes[attr] >= attributeCap.value) {
        progressBucket[attr] = 0
      }
    }
  }

  // ==================== 属性升级系统（统一） ====================

  const attributeCap = computed(() => ATTRIBUTE_CONFIG.MAX_BASE_ATTRIBUTE)

  function getAttributeCost(currentValue: number): number {
    for (const tier of ATTRIBUTE_CONFIG.UPGRADE_COST_TIERS) {
      if (currentValue < tier.threshold) return tier.cost
    }
    return 1500
  }

  function canUpgradeAttribute(attr: keyof Attributes): boolean {
    return canUpgradeCharacterAttribute(0, attr)
  }

  function canUpgradeCharacterAttribute(charIndex: number, attr: keyof Attributes): boolean {
    const char = characters.value[charIndex]
    if (!char) return false
    const current = char.attributes[attr]
    if (current >= attributeCap.value) return false
    const cost = getAttributeCost(current)
    return rewardPoints.value >= cost
  }

  function upgradeAttribute(attr: keyof Attributes): boolean {
    return upgradeCharacterAttribute(0, attr)
  }

  /** 统一属性升级 — 适用于所有角色 */
  function upgradeCharacterAttribute(charIndex: number, attr: keyof Attributes): boolean {
    const char = characters.value[charIndex]
    if (!char) return false

    const current = char.attributes[attr]
    if (current >= attributeCap.value) return false
    const cost = getAttributeCost(current)
    if (rewardPoints.value < cost) return false

    rewardPoints.value -= cost
    char.attributes[attr] = current + 1

    const attrNames = ATTR_LABELS
    addLog(`升级${char.name}${attrNames[attr]}: ${current}→${current + 1} (花费💎${cost})`, 'success')
    return true
  }

  // 在线挂机计时器
  let tickTimer: number | null = null

  function startTick() {
    if (tickTimer) return
    tickTimer = window.setInterval(() => {
      if (idle.value.isRunning) {
        idle.value.totalSeconds++
        applyTrainingSeconds(1)
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

  function setPage(page: PageId | 'scenario' | 'dungeon') {
    currentPage.value = page === 'scenario' || page === 'dungeon' ? 'dungeonGrid' : page
  }

  function setDungeonNav(nav: DungeonNavState | null) {
    dungeonNav.value = nav
  }

  function requestDungeonExit() {
    dungeonExitRequest.value += 1
  }

  function setUsername(newName: string) {
    characters.value[0].name = newName
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

  function useItem(itemId: string): boolean {
    if (!inventory.value[itemId] || inventory.value[itemId] <= 0) return false
    inventory.value[itemId]--
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    return true
  }

  // ==================== 装备系统（统一） ====================

  /** 装备物品到主角指定槽位（向后兼容） */
  function equipItem(itemId: string, slot: string): boolean {
    return equipCharacterItem(0, itemId, slot)
  }

  /** 统一装备函数 — 适用于所有角色 */
  function equipCharacterItem(charIndex: number, itemId: string, slot: string): boolean {
    const char = characters.value[charIndex]
    if (!char) return false
    if (!inventory.value[itemId] || inventory.value[itemId] <= 0) {
      addLog(`物品不在背包中`, 'warning')
      return false
    }

    // 如果槽位有装备，先卸下旧装备
    if (char.equippedItems[slot]) {
      const oldItemId = char.equippedItems[slot]
      inventory.value[oldItemId] = (inventory.value[oldItemId] || 0) + 1
    }

    inventory.value[itemId]--
    if (inventory.value[itemId] <= 0) delete inventory.value[itemId]
    char.equippedItems[slot] = itemId

    addLog(`装备成功`, 'success')
    return true
  }

  /** 从主角指定槽位卸下装备（向后兼容） */
  function unequipItem(slot: string): boolean {
    return unequipCharacterItem(0, slot)
  }

  /** 统一卸装函数 — 适用于所有角色 */
  function unequipCharacterItem(charIndex: number, slot: string): boolean {
    const char = characters.value[charIndex]
    if (!char || !char.equippedItems[slot]) return false

    const itemId = char.equippedItems[slot]
    inventory.value[itemId] = (inventory.value[itemId] || 0) + 1
    delete char.equippedItems[slot]

    addLog(`卸下装备`, 'success')
    return true
  }

  /** 计算主角装备提供的总属性加成（向后兼容） */
  function getEquipmentStats(): Required<EquipmentStats> {
    return getCharacterEquipmentStats(0)
  }

  /** 统一装备属性计算 — 适用于所有角色 */
  function getCharacterEquipmentStats(charIndex: number): Required<EquipmentStats> {
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

    const char = characters.value[charIndex]
    if (!char) return stats

    for (const slot of Object.values(char.equippedItems)) {
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

  /** 获取主角武器战斗信息（向后兼容） */
  function getWeaponCombatInfo(): { attack: number; essence: WeaponEssence } {
    return getCharacterWeaponCombatInfo(0)
  }

  /** 统一武器信息 — 适用于所有角色 */
  function getCharacterWeaponCombatInfo(charIndex: number): { attack: number; essence: WeaponEssence } {
    const char = characters.value[charIndex]
    if (!char) return { attack: 0, essence: 'technology' }
    const weaponId = char.equippedItems.weapon
    const weapon = weaponId ? getItemById(weaponId) : null
    return {
      attack: weapon?.stats?.attack || 0,
      essence: weapon?.essence || 'technology',
    }
  }

  // ==================== 基因锁功能（统一） ====================

  function getGeneLockPassiveBonus(): number {
    return getCharacterGeneLockPassiveBonus(0)
  }

  function getCharacterGeneLockPassiveBonus(charIndex: number): number {
    return characters.value[charIndex]?.geneLock.tier ?? 0
  }

  function getGeneLockActiveBonus(): { allStats: number; crit: number; dodge: number } {
    return getCharacterGeneLockActiveBonus(0)
  }

  function getCharacterGeneLockActiveBonus(charIndex: number): { allStats: number; crit: number; dodge: number } {
    const gl = characters.value[charIndex]?.geneLock
    if (!gl || !gl.active || gl.activeTier === 0) {
      return { allStats: 0, crit: 0, dodge: 0 }
    }

    const tier = gl.activeTier
    const activeConfigs: Record<number, { allStats: number; crit: number; dodge: number }> = {
      1: { allStats: 2, crit: 0.1, dodge: 0.1 },
      2: { allStats: 4, crit: 0.2, dodge: 0.2 },
      3: { allStats: 6, crit: 0.3, dodge: 0.3 },
      4: { allStats: 8, crit: 0.4, dodge: 0.4 },
      5: { allStats: 10, crit: 0.5, dodge: 0.5 },
    }

    return activeConfigs[tier] || { allStats: 0, crit: 0, dodge: 0 }
  }

  function tryUnlockGeneLock(tier: number): boolean {
    return tryUnlockCharacterGeneLock(0, tier)
  }

  function tryUnlockCharacterGeneLock(charIndex: number, tier: number): boolean {
    const char = characters.value[charIndex]
    if (!char) return false
    const gl = char.geneLock

    if (tier > gl.tier + 1) return false

    if (tier > 1) {
      const prevTierConfig = getGeneLockConfig(tier - 1)
      if (gl.proficiency[tier - 2] < prevTierConfig.maxProficiency) {
        addLog(`需要先将前一阶基因锁练至完全熟练`, 'warning')
        return false
      }
    }

    const hpPercent = hpMax.value > 0 ? (hpMax.value - 50) / hpMax.value : 1
    const proficiency = gl.proficiency[tier - 1] || 0
    const chance = calculateUnlockChance(tier, hpPercent * 100, 100, proficiency)

    const roll = Math.random()
    if (roll < chance) {
      gl.tier = Math.max(gl.tier, tier)
      gl.proficiency[tier - 1] = (gl.proficiency[tier - 1] || 0) + 1
      addLog(`基因锁第${tier}阶解锁成功！`, 'gold')
      return true
    } else {
      addLog(`基因锁解锁失败`, 'warning')
      return false
    }
  }

  function activateGeneLock(tier: number): boolean {
    return activateCharacterGeneLock(0, tier)
  }

  function activateCharacterGeneLock(charIndex: number, tier: number): boolean {
    const char = characters.value[charIndex]
    if (!char) return false
    const gl = char.geneLock

    if (tier > gl.tier) return false
    if (gl.active) return false

    gl.active = true
    gl.activeTier = tier
    addLog(`基因锁第${tier}阶激活`, 'success')
    return true
  }

  function deactivateGeneLock() {
    deactivateCharacterGeneLock(0)
  }

  function deactivateCharacterGeneLock(charIndex: number) {
    const char = characters.value[charIndex]
    if (!char) return
    const gl = char.geneLock
    if (!gl.active) return
    gl.active = false
    gl.activeTier = 0
    addLog(`基因锁已解除`, '')
  }

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

  // ==================== 血统功能（统一） ====================

  function getBloodlineStats(): Partial<Record<AttributeId, number>> {
    return getCharacterBloodlineStats(0)
  }

  function getCharacterBloodlineStats(charIndex: number): Partial<Record<AttributeId, number>> {
    const char = characters.value[charIndex]
    if (!char || !char.equippedBloodline) return {}

    const bloodline = getBloodlineById(char.equippedBloodline)
    if (!bloodline) return {}

    return bloodline.stats
  }

  function equipBloodline(bloodlineId: string): boolean {
    return equipCharacterBloodline(0, bloodlineId)
  }

  function equipCharacterBloodline(charIndex: number, bloodlineId: string): boolean {
    const char = characters.value[charIndex]
    if (!char) return false
    char.equippedBloodline = bloodlineId
    addLog(`血统装备成功`, 'success')
    return true
  }

  function unequipBloodline() {
    unequipCharacterBloodline(0)
  }

  function unequipCharacterBloodline(charIndex: number) {
    const char = characters.value[charIndex]
    if (!char) return
    char.equippedBloodline = null
    addLog(`血统已卸下`, '')
  }

  // ==================== 技能功能（统一） ====================

  function getSkillLevel(skillId: string): number {
    return getCharacterSkillLevel(0, skillId)
  }

  function getCharacterSkillLevel(charIndex: number, skillId: string): number {
    return characters.value[charIndex]?.skills[skillId] || 0
  }

  function upgradeSkill(skillId: string): boolean {
    return upgradeCharacterSkill(0, skillId)
  }

  function upgradeCharacterSkill(charIndex: number, skillId: string): boolean {
    const char = characters.value[charIndex]
    if (!char) return false

    const currentLevel = char.skills[skillId] || 0
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
    char.skills[skillId] = currentLevel + 1
    addLog(`技能升级成功`, 'success')
    return true
  }

  function getSkillDicePool(skillId: string): number {
    return getCharacterSkillDicePool(0, skillId)
  }

  function getCharacterSkillDicePool(charIndex: number, skillId: string): number {
    const skill = getSkillById(skillId)
    if (!skill) return 1

    const combat = getCharacterCombatStatsInternal(charIndex)
    const attrValue = (combat as any)[skill.relatedAttr] || 1
    const skillLevel = getCharacterSkillLevel(charIndex, skillId)

    // DP = 属性值 + 技能等级（不再除以5，直接用属性值）
    return attrValue + skillLevel
  }

  // ==================== 法术功能（统一） ====================

  function learnSpell(spellId: string): boolean {
    return learnCharacterSpell(0, spellId)
  }

  function learnCharacterSpell(charIndex: number, spellId: string): boolean {
    const char = characters.value[charIndex]
    if (!char) return false

    if (char.spells[spellId]) {
      addLog(`你已经学会了这个法术`, 'warning')
      return false
    }
    char.spells[spellId] = true
    addLog(`学会新法术`, 'success')
    return true
  }

  function hasSpell(spellId: string): boolean {
    return hasCharacterSpell(0, spellId)
  }

  function hasCharacterSpell(charIndex: number, spellId: string): boolean {
    return characters.value[charIndex]?.spells[spellId] || false
  }

  function getLearnedSpells(): string[] {
    return getCharacterLearnedSpells(0)
  }

  function getCharacterLearnedSpells(charIndex: number): string[] {
    const spells = characters.value[charIndex]?.spells ?? {}
    return Object.keys(spells).filter(id => spells[id])
  }

  function learnSkill(skillId: string): boolean {
    return learnCharacterSkill(0, skillId)
  }

  function learnCharacterSkill(charIndex: number, skillId: string): boolean {
    const char = characters.value[charIndex]
    if (!char) return false

    const currentLevel = char.skills[skillId] || 0
    if (currentLevel >= 1) {
      addLog(`你已经学会了这个技能`, 'warning')
      return false
    }
    char.skills[skillId] = 1
    addLog(`学会新技能`, 'success')
    return true
  }

  // ==================== 角色管理（统一） ====================

  /** 获取所有角色 */
  function getCharacters(): Character[] {
    return characters.value
  }

  /** 获取角色总数（含主角） */
  function getCharacterCount(): number {
    return characters.value.length
  }

  /** 向后兼容：获取队友列表 */
  function getCompanions(): Companion[] {
    return companions.value
  }

  /** 向后兼容：获取队友数量 */
  function getCompanionCount(): number {
    return companions.value.length
  }

  /** 是否可以招募新角色 */
  function canRecruitCompanion(): boolean {
    return canRecruitCharacter()
  }

  function canRecruitCharacter(): boolean {
    return characters.value.length < 1 + COMPANION_CONFIG.MAX_COMPANIONS &&
           rewardPoints.value >= getRecruitCost(characters.value.length - 1)
  }

  /** 招募新角色（统一入口） */
  function recruitCharacter(charName: string, professionId: string, gender: string): boolean {
    if (characters.value.length >= 1 + COMPANION_CONFIG.MAX_COMPANIONS) {
      addLog(`队伍人数已达上限`, 'warning')
      return false
    }

    const cost = getRecruitCost(characters.value.length - 1)
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

    const newAttrs = { ...DEFAULT_ATTRIBUTES }
    newAttrs[profession.mainAttribute] += 3
    newAttrs[profession.secondaryAttribute] += 2
    const newChar = createDefaultCharacter({
      id: `char_${Date.now()}`,
      name: charName,
      professionId,
      gender,
      attributes: newAttrs,
      skills: profession.startingSkill ? { [profession.startingSkill]: 1 } : {},
    })

    characters.value.push(newChar)
    normalizePersonalSpaceState()
    addLog(`向主神请求了新角色：${charName}（${profession.name}），花费💎${cost}`, 'gold')
    return true
  }

  /** 向后兼容：招募队友 */
  function recruitCompanion(charName: string, professionId: string, gender: string): boolean {
    return recruitCharacter(charName, professionId, gender)
  }

  /** 移除角色（不能移除主角 index 0） */
  function removeCharacter(charId: string): boolean {
    const idx = characters.value.findIndex(c => c.id === charId)
    if (idx <= 0) return false // 不能移除主角

    const char = characters.value[idx]
    // 退还装备到库存
    for (const [, itemId] of Object.entries(char.equippedItems)) {
      inventory.value[itemId] = (inventory.value[itemId] || 0) + 1
    }

    characters.value.splice(idx, 1)
    normalizePersonalSpaceState()
    addLog(`角色已离队`, 'info')
    return true
  }

  /** 向后兼容：移除队友 */
  function removeCompanion(companionId: string): boolean {
    return removeCharacter(companionId)
  }

  /**
   * 统一战斗属性概览 — 适用于所有角色
   * 返回简化版战斗数据，供 UI 展示
   */
  function getCharacterCombatStats(charIndex: number): {
    attack: number
    hpMax: number
    mpMax: number
    techAttack: number
    fantAttack: number
    abnAttack: number
  } {
    const advanced = getCharacterAdvancedCombatStats(charIndex)
    const hpMaxVal = getCharacterMaxHp(charIndex)
    const mpMaxVal = getCharacterMaxMp(charIndex)
    const attack = Math.max(advanced.technologyAttack ?? 0, advanced.fantasyAttack ?? 0, advanced.abnormalAttack ?? 0)
    return {
      attack,
      hpMax: hpMaxVal,
      mpMax: mpMaxVal,
      techAttack: advanced.technologyAttack ?? 0,
      fantAttack: advanced.fantasyAttack ?? 0,
      abnAttack: advanced.abnormalAttack ?? 0,
    }
  }

  /**
   * 向后兼容：获取队友战斗属性
   * 内部调用统一的 getCharacterCombatStats
   */
  function getCompanionCombatStats(companion: Companion): {
    attack: number
    hpMax: number
    mpMax: number
    techAttack: number
    fantAttack: number
    abnAttack: number
  } {
    const index = characters.value.findIndex(c => c.id === companion.id)
    if (index === -1) {
      return { attack: 0, hpMax: 0, mpMax: 0, techAttack: 0, fantAttack: 0, abnAttack: 0 }
    }
    return getCharacterCombatStats(index)
  }

  /** 向后兼容：为队友装备物品 */
  function equipCompanionItem(companionId: string, itemId: string, slot: string): boolean {
    const index = characters.value.findIndex(c => c.id === companionId)
    if (index === -1) return false
    return equipCharacterItem(index, itemId, slot)
  }

  /** 向后兼容：卸下队友装备 */
  function unequipCompanionItem(companionId: string, slot: string): boolean {
    const index = characters.value.findIndex(c => c.id === companionId)
    if (index === -1) return false
    return unequipCharacterItem(index, slot)
  }

  /** 向后兼容：升级队友属性 */
  function upgradeCompanionAttribute(companionId: string, attr: keyof Attributes): boolean {
    const index = characters.value.findIndex(c => c.id === companionId)
    if (index === -1) return false
    return upgradeCharacterAttribute(index, attr)
  }

  // ==================== 统一战斗属性计算 ====================

  /**
   * 获取主角最终战斗属性（向后兼容）
   */
  function getCombatStats() {
    return getCharacterCombatStatsInternal(0)
  }

  /**
   * 统一战斗属性计算（内部函数）
   * 合并所有加成来源：基础属性 + 装备 + 基因锁 + 血统
   */
  function getCharacterCombatStatsInternal(charIndex: number) {
    const char = characters.value[charIndex]
    if (!char) {
      return {
        ...DEFAULT_ATTRIBUTES,
        hpBonus: 0, mpBonus: 0, speedBonus: 0,
      }
    }

    const base = { ...char.attributes }
    const equip = getCharacterEquipmentStats(charIndex)
    const genePassive = getCharacterGeneLockPassiveBonus(charIndex)
    const geneActive = getCharacterGeneLockActiveBonus(charIndex)
    const blood = getCharacterBloodlineStats(charIndex)

    const result = { ...base }
    for (const key of Object.keys(DEFAULT_ATTRIBUTES) as AttributeId[]) {
      result[key] = base[key] + genePassive + geneActive.allStats + (blood[key] ?? 0)
    }

    return {
      ...result,
      hpBonus: equip.hp,
      mpBonus: equip.mp,
      speedBonus: equip.speed,
    }
  }

  /**
   * 获取主角进阶战斗属性（向后兼容）
   */
  function getAdvancedCombatStats(): AdvancedCombatStats {
    return getCharacterAdvancedCombatStats(0)
  }

  /**
   * 统一进阶战斗属性计算 — 适用于所有角色
   */
  function getCharacterAdvancedCombatStats(charIndex: number): AdvancedCombatStats {
    const char = characters.value[charIndex]
    if (!char) return { ...EMPTY_ADVANCED_STATS }

    const combat = getCharacterCombatStatsInternal(charIndex)
    const equip = getCharacterEquipmentStats(charIndex)
    const geneActive = getCharacterGeneLockActiveBonus(charIndex)
    const volumeMod = getCharacterVolumeModifier(charIndex)

    const strength = combat.strength
    const agility = combat.agility
    const endurance = combat.endurance
    const intelligence = combat.intelligence
    const perception = combat.perception
    const resolve = combat.resolve
    const presence = combat.presence
    const composure = combat.composure

    const weapon = getCharacterWeaponCombatInfo(charIndex)
    const nonWeaponAttack = Math.max(0, equip.attack - weapon.attack)

    // 九属性战斗公式（基于 config/combat.ts ATTRIBUTE_CONFIG.COMBAT_MAPPING）
    const technologyAttack = (8 + strength * 2 + nonWeaponAttack + equip.technologyAttack + equip.physicalAttack) * (1 + volumeMod.damage)
    const fantasyAttack = 6 + resolve * 3 + intelligence + equip.fantasyAttack + equip.magicAttack
    const abnormalAttack = 6 + resolve * 2 + presence + equip.abnormalAttack

    const technologyDefense = endurance + Math.floor(composure * 0.5) + equip.defense + equip.technologyDefense + equip.physicalDefense
    const fantasyDefense = resolve + composure + equip.magicDefense + equip.fantasyDefense
    const abnormalDefense = composure + equip.abnormalDefense
    const speedVal = (agility + composure + 5 + equip.speed) * (1 + volumeMod.speed)

    return {
      ...EMPTY_ADVANCED_STATS,
      technologyAttack: Math.max(1, Math.floor(technologyAttack)),
      fantasyAttack: Math.max(0, Math.floor(fantasyAttack)),
      abnormalAttack: Math.max(0, Math.floor(abnormalAttack)),
      technologyDefense: Math.max(0, Math.floor(technologyDefense * (1 + volumeMod.armor))),
      fantasyDefense: Math.max(0, Math.floor(fantasyDefense)),
      abnormalDefense: Math.max(0, Math.floor(abnormalDefense)),
      speed: Math.max(1, Math.floor(speedVal)),
      critRate: Math.min(0.95, perception * 0.01 + geneActive.crit + equip.critRate),
      critDamage: Math.max(1, 1.5 + equip.critDamage),
      critResist: Math.min(0.75, composure * 0.01 + equip.critResist),
      hit: Math.min(0.98, 0.75 + perception * 0.005 + equip.hit),
      evasion: Math.min(0.85, agility * 0.02 + geneActive.dodge + volumeMod.dodge + equip.evasion),
      counterRate: Math.min(0.75, equip.counterRate),
      reflectRate: Math.min(0.75, equip.reflectRate),
      comboRate: Math.min(0.75, equip.comboRate),
      shield: Math.max(0, equip.shield),
      shieldRegen: Math.max(0, equip.shieldRegen),
      stunRate: Math.min(0.75, equip.stunRate),
      stunResist: Math.min(0.85, composure * 0.01 + equip.stunResist),
      lifeSteal: Math.min(0.75, equip.lifeSteal),
      damageReduction: Math.min(0.85, composure * 0.01 + endurance * 0.005 + equip.damageReduction),
      penetration: Math.max(0, equip.penetration),
      armorBreak: Math.min(0.85, equip.armorBreak),
      blockRate: Math.min(0.75, equip.blockRate),
      toughness: Math.min(0.75, composure * 0.01 + endurance * 0.005 + equip.toughness),
      trueDamage: Math.max(0, equip.trueDamage),
      trueDefense: Math.max(0, equip.trueDefense),
    }
  }

  /** 获取主角体积修正（向后兼容） */
  function getVolumeModifier() {
    return getCharacterVolumeModifier(0)
  }

  /** 统一体积修正 — 适用于所有角色 */
  function getCharacterVolumeModifier(charIndex: number) {
    const vol = characters.value[charIndex]?.volumeLevel ?? 2
    return (VOLUME_CONFIG.MODIFIERS as any)[vol] || VOLUME_CONFIG.MODIFIERS[2]
  }

  /** 获取主角最终HP（向后兼容） */
  function getMaxHp(): number {
    return getCharacterMaxHp(0)
  }

  /** 统一HP计算 — 适用于所有角色 */
  function getCharacterMaxHp(charIndex: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    const baseHp = HP_CONFIG.BASE_HP + combat.endurance * HP_CONFIG.ENDURANCE_HP_MULTIPLIER + combat.hpBonus + getCharacterGeneLockPassiveBonus(charIndex) * HP_CONFIG.GENE_LOCK_HP_BONUS
    const volumeMod = getCharacterVolumeModifier(charIndex)
    return Math.floor(baseHp * (1 + volumeMod.hp))
  }

  /** 获取主角最终MP（向后兼容） */
  function getMaxMp(): number {
    return getCharacterMaxMp(0)
  }

  /** 统一MP计算 — 适用于所有角色 */
  function getCharacterMaxMp(charIndex: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    return combat.intelligence * MP_CONFIG.INTELLIGENCE_MP_MULTIPLIER + combat.mpBonus
  }

  /** 获取主角最终意志力（向后兼容） */
  function getMaxWillpower(): number {
    return getCharacterMaxWillpower(0)
  }

  /** 统一意志力计算 — 适用于所有角色 */
  function getCharacterMaxWillpower(charIndex: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    return combat.resolve + combat.composure
  }

  /** 获取主角最终速度（向后兼容） */
  function getSpeed(): number {
    return getCharacterSpeed(0)
  }

  /** 统一速度计算 — 适用于所有角色 */
  function getCharacterSpeed(charIndex: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    const baseSpeed = combat.agility + combat.composure + 5 + combat.speedBonus
    const volumeMod = getCharacterVolumeModifier(charIndex)
    const statusMod = getStatusEffectsModifier(characters.value[charIndex]?.statusEffects ?? [])
    return Math.floor(baseSpeed * (1 + volumeMod.speed) * (1 + statusMod.speed))
  }

  // ==================== MP/魔法功能（统一） ====================

  function spendMp(amount: number): boolean {
    return spendCharacterMp(0, amount)
  }

  function spendCharacterMp(charIndex: number, amount: number): boolean {
    const char = characters.value[charIndex]
    if (!char || char.currentMp < amount) return false
    char.currentMp -= amount
    return true
  }

  function restoreMp(amount: number) {
    restoreCharacterMp(0, amount)
  }

  function restoreCharacterMp(charIndex: number, amount: number) {
    const char = characters.value[charIndex]
    if (!char) return
    const maxMp = getCharacterMaxMp(charIndex)
    char.currentMp = Math.min(maxMp, char.currentMp + amount)
  }

  function getMagicDamage(spellBaseDamage: number): number {
    return getCharacterMagicDamage(0, spellBaseDamage)
  }

  function getCharacterMagicDamage(charIndex: number, spellBaseDamage: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    return spellBaseDamage + combat.resolve * MP_CONFIG.RESOLVE_DAMAGE_MULTIPLIER
  }

  // ==================== HP回复功能（统一） ====================

  function getHpRegen(): number {
    return getCharacterHpRegen(0)
  }

  function getCharacterHpRegen(charIndex: number): number {
    const combat = getCharacterCombatStatsInternal(charIndex)
    const baseRegen = combat.endurance * 0.5
    return Math.floor(baseRegen)
  }

  // ==================== 不良状态功能（统一） ====================

  function applyPlayerStatusEffect(type: StatusEffectType, duration: number) {
    applyCharacterStatusEffect(0, type, duration)
  }

  function applyCharacterStatusEffect(charIndex: number, type: StatusEffectType, duration: number) {
    const char = characters.value[charIndex]
    if (!char) return
    const combat = getCharacterCombatStatsInternal(charIndex)
    char.statusEffects = applyStatusEffect(
      char.statusEffects,
      { type, duration, source: 'enemy' },
      combat.composure
    )
  }

  function processPlayerStatusEffects(): { damage: number; canAct: boolean; canCast: boolean } {
    return processCharacterStatusEffects(0)
  }

  function processCharacterStatusEffects(charIndex: number): { damage: number; canAct: boolean; canCast: boolean } {
    const char = characters.value[charIndex]
    if (!char) return { damage: 0, canAct: true, canCast: true }
    const result = processStatusEffects(char.statusEffects)
    char.statusEffects = result.effects
    return { damage: result.damage, canAct: result.canAct, canCast: result.canCast }
  }

  function clearPlayerStatusEffects() {
    clearCharacterStatusEffects(0)
  }

  function clearCharacterStatusEffects(charIndex: number) {
    const char = characters.value[charIndex]
    if (!char) return
    char.statusEffects = []
  }

  function healPlayer(amount: number) {
    // HP管理在副本页中处理
  }

  function getState() {
    return {
      squadName: squadName.value,
      level: level.value,
      xp: xp.value,
      rewardPoints: rewardPoints.value,
      sidePlots: sidePlots.value,
      idle: idle.value,
      mapProgress: mapProgress.value,
      logs: logs.value,
      inventory: inventory.value,
      personalSpace: personalSpace.value,
      characterCreation: characterCreation.value,
      characters: characters.value,
    }
  }

  // 自动存档
  watch(
    () => [characters.value, rewardPoints.value, xp.value, sidePlots.value, idle.value, mapProgress.value, inventory.value, personalSpace.value, characterCreation.value, squadName.value, level.value],
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
    // 全局状态
    name, squadName, level, xp, xpMax, rewardPoints,
    attributes, sidePlots, idle, mapProgress, logs, currentPage, dungeonNav, dungeonExitRequest,
    hpMax, willpower, speed, defense,
    currentMap, unlockedMaps,
    offlineReward, onlineReward,
    attributeCap, getAttributeCost, canUpgradeAttribute, upgradeAttribute,
    setPage, setDungeonNav, requestDungeonExit, setUsername, setSquadName, addLog, addRewards, addSidePlots,
    claimOfflineReward, selectMap, completeScenario,
    inventory, buyItem, useItem,
    personalSpace, getInventoryItemCount, getStorageItemCount,
    moveItemToStorage, moveItemToInventory, setPersonalSpaceEnvironment,
    getCharacterTrainingAssignment, getCharacterTrainingProgress, setCharacterTrainingAssignment,

    // 装备系统
    equippedItems, equipItem, unequipItem, getEquipmentStats, getWeaponCombatInfo,

    // 基因锁系统
    geneLock, getGeneLockPassiveBonus, getGeneLockActiveBonus,
    tryUnlockGeneLock, activateGeneLock, deactivateGeneLock,

    // 血统系统
    equippedBloodline, getBloodlineStats, equipBloodline, unequipBloodline,

    // 技能/法术系统
    playerSkills, getSkillLevel, upgradeSkill, getSkillDicePool,
    playerSpells, learnSpell, hasSpell, getLearnedSpells, learnSkill,

    // MP/体积/状态
    currentMp, volumeLevel, playerStatusEffects,
    getMaxMp, getSpeed, spendMp, restoreMp, getMagicDamage,
    getHpRegen,
    applyPlayerStatusEffect, processPlayerStatusEffects, clearPlayerStatusEffects,
    getVolumeModifier,

    // 战斗属性
    getCombatStats, getAdvancedCombatStats, getMaxHp, getMaxWillpower,

    // 角色创建
    characterCreation, characterProfession, applyCharacterCreation, getCharacterCreation, isCharacterCreated,

    // ==================== 统一角色系统（新接口） ====================
    // characters 数组是所有角色的唯一数据源
    characters,
    getCharacters, getCharacterCount,
    canRecruitCharacter, recruitCharacter, removeCharacter,
    getCharacterCombatStats,
    getCharacterAdvancedCombatStats,
    getCharacterMaxHp, getCharacterMaxMp, getCharacterMaxWillpower, getCharacterSpeed,
    getCharacterEquipmentStats, getCharacterWeaponCombatInfo,
    getCharacterGeneLockPassiveBonus, getCharacterGeneLockActiveBonus,
    getCharacterBloodlineStats,
    getCharacterSkillLevel, getCharacterSkillDicePool,
    upgradeCharacterSkill, learnCharacterSpell, hasCharacterSpell, getCharacterLearnedSpells, learnCharacterSkill,
    getCharacterVolumeModifier, getCharacterHpRegen, getCharacterMagicDamage,
    getCharacterCombatStatsInternal,
    spendCharacterMp, restoreCharacterMp,
    applyCharacterStatusEffect, processCharacterStatusEffects, clearCharacterStatusEffects,
    tryUnlockCharacterGeneLock, activateCharacterGeneLock, deactivateCharacterGeneLock,
    equipCharacterBloodline, unequipCharacterBloodline,
    equipCharacterItem, unequipCharacterItem,
    canUpgradeCharacterAttribute, upgradeCharacterAttribute,

    // ==================== 向后兼容：队友接口 ====================
    companions, getCompanions, getCompanionCount, canRecruitCompanion, recruitCompanion, removeCompanion,
    getCompanionCombatStats, equipCompanionItem, unequipCompanionItem, upgradeCompanionAttribute,
  }
})
