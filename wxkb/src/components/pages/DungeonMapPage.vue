<template>
  <div class="dungeon-container">
    <div v-if="mode === 'select'" class="dungeon-select">
      <div class="page-title">⚔️ 副本入口</div>
      <div class="page-subtitle">主神空间已切换为现代 MUD 式副本。当前首个教学本为【生化危机：零号样本】。</div>

      <div class="dungeon-list">
        <button
          v-for="dungeon in dungeonList"
          :key="dungeon.id"
          class="dungeon-card"
          :class="{ locked: store.level < dungeon.minLevel }"
          :disabled="store.level < dungeon.minLevel"
          @click="enterDungeon(dungeon.id)"
        >
          <div class="dungeon-card__header">
            <span class="dungeon-tier" :class="dungeon.tier">{{ dungeon.tier }}级</span>
            <span class="dungeon-name">{{ dungeon.name }}</span>
            <span class="dungeon-level">Lv.{{ dungeon.minLevel }}+</span>
          </div>
          <div class="dungeon-desc">{{ dungeon.description }}</div>
          <div class="dungeon-meta">
            <span>结构：房间移动 / 自动战斗 / NPC 交互</span>
            <span>教学：搜索线索 / 恢复电力 / 逃离追击</span>
          </div>
          <div v-if="store.level < dungeon.minLevel" class="dungeon-lock">🔒 等级不足（需要 Lv.{{ dungeon.minLevel }}）</div>
        </button>
      </div>
    </div>

    <div v-else-if="mode === 'exploring' && currentDungeon && currentRoom" class="dungeon-exploring">
      <div class="dungeon-playfield">
        <main class="dungeon-primary">
          <section class="overview-scene panel-box">
            <div class="overview-header">
              <div>
                <span class="overview-location">{{ currentRoom.name }}</span>
                <span class="overview-type">{{ getRoomTypeName(currentRoom.type) }}</span>
              </div>
              <span v-if="isMoving" class="moving-indicator">正在沿路径移动…</span>
            </div>
            <div class="overview-text">{{ currentRoom.description }}</div>
            <div v-if="currentRoom.storyText" class="overview-story">{{ currentRoom.storyText }}</div>
          </section>

          <section class="dungeon-detail panel-box">
            <div class="panel-title-row">
              <span>{{ detailTitle }}</span>
            </div>

            <div class="detail-presence">
              <div class="presence-title">此处有：</div>
              <div v-if="presenceItems.length" class="presence-list">
                <button
                  v-for="item in presenceItems"
                  :key="item.id"
                  class="presence-item"
                  :class="{ active: selectedInteractable?.id === item.id }"
                  @click="selectInteractable(item.id)"
                >
                  <span class="presence-icon">{{ getInteractableIcon(item.type) }}</span>
                  <span class="presence-text">{{ item.title }}</span>
                </button>
              </div>
              <div v-else class="presence-empty">这里暂时没有可直接交互的对象。</div>
            </div>

            <div class="detail-body">
              <div class="detail-description">{{ detailDescription }}</div>
              <div v-if="detailExtra" class="detail-extra">{{ detailExtra }}</div>

              <div v-if="detailActions.length" class="detail-actions">
                <button
                  v-for="action in detailActions"
                  :key="action.id"
                  class="detail-action-btn"
                  :disabled="isMoving"
                  @click="handleDetailAction(action.id)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </section>
        </main>

        <div class="dungeon-map-row">
          <div class="dungeon-map-box panel-box">
            <div class="panel-title-row">
              <span>副本地图</span>
              <span class="map-hint">点击已连通格子自动寻路</span>
            </div>

            <div class="map-scroll">
              <svg class="map-svg" :viewBox="mapViewBox">
                <line
                  v-for="(line, i) in mapLines"
                  :key="`line-${i}`"
                  :x1="line.x1"
                  :y1="line.y1"
                  :x2="line.x2"
                  :y2="line.y2"
                  class="map-line"
                />

                <g
                  v-for="(room, roomId) in currentDungeon.rooms"
                  :key="roomId"
                  :transform="`translate(${roomPositions[roomId]?.x || 0}, ${roomPositions[roomId]?.y || 0})`"
                  class="room-node"
                  :class="roomClass(roomId, room)"
                  @click="moveToRoom(roomId)"
                >
                  <rect x="-50" y="-28" width="100" height="56" rx="4" class="room-box" />
                  <text class="room-icon" y="-2">{{ getRoomIcon(room.type) }}</text>
                  <text class="room-name" y="18">{{ room.name }}</text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <aside class="dungeon-side">
          <section class="quest-panel panel-box">
            <div class="quest-panel-title">任务目标</div>
            <div v-if="mainQuests.length" class="quest-section">
              <div class="quest-section-title main">主线任务</div>
              <div v-for="quest in mainQuests" :key="quest.id" class="quest-item" :class="quest.status">
                <div class="quest-header">
                  <span class="quest-icon">{{ quest.status === 'completed' ? '✅' : quest.status === 'locked' ? '🔒' : '📋' }}</span>
                  <span class="quest-title">{{ quest.title }}</span>
                </div>
                <div v-if="quest.status !== 'locked'" class="quest-objectives">
                  <div v-for="obj in quest.objectives" :key="obj.id" class="quest-objective" :class="obj.status">
                    <span class="obj-check">{{ obj.status === 'completed' ? '✓' : '○' }}</span>
                    <span class="obj-desc">{{ obj.description }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="sideQuests.length" class="quest-section">
              <div class="quest-section-title side">支线任务</div>
              <div v-for="quest in sideQuests" :key="quest.id" class="quest-item" :class="quest.status">
                <div class="quest-header">
                  <span class="quest-icon">{{ quest.status === 'completed' ? '✅' : quest.status === 'locked' ? '🔒' : '📋' }}</span>
                  <span class="quest-title">{{ quest.title }}</span>
                </div>
                <div v-if="quest.status !== 'locked'" class="quest-objectives">
                  <div v-for="obj in quest.objectives" :key="obj.id" class="quest-objective" :class="obj.status">
                    <span class="obj-check">{{ obj.status === 'completed' ? '✓' : '○' }}</span>
                    <span class="obj-desc">{{ obj.description }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!mainQuests.length && !sideQuests.length" class="quest-empty">暂无任务目标</div>
          </section>
        </aside>
      </div>

      <div v-if="combatMode && currentEnemy" class="combat-overlay">
        <div class="combat-panel">
          <div class="combat-header">
            <div class="combat-combatant">
              <span class="combat-name enemy">{{ currentEnemy.name }}</span>
              <div class="hp-bar">
                <div class="hp-fill enemy-bar" :style="{ width: `${(currentEnemyHp / (currentEnemy.hp || 1)) * 100}%` }"></div>
              </div>
              <span class="combat-number">{{ currentEnemyHp }}/{{ currentEnemy.hp }}</span>
            </div>

            <div class="combat-combatant">
              <span class="combat-name player">你</span>
              <div class="hp-bar">
                <div class="hp-fill player-bar" :style="{ width: `${(playerHp / playerMaxHp) * 100}%` }"></div>
              </div>
              <span class="combat-number">{{ playerHp }}/{{ playerMaxHp }}</span>
              <div class="mp-bar">
                <div class="mp-fill" :style="{ width: `${(playerMp / playerMaxMp) * 100}%` }"></div>
              </div>
              <span class="combat-number">MP: {{ playerMp }}/{{ playerMaxMp }}</span>
            </div>
          </div>

          <!-- 队友状态 -->
          <div v-if="store.getCompanions().length > 0" class="combat-companions">
            <div v-for="comp in store.getCompanions()" :key="comp.id" class="combat-companion-row">
              <span class="companion-combat-name">{{ store.getCompanionCombatStats(comp).attack > 0 ? '⚔️' : '🛡' }} {{ comp.name }}</span>
              <span class="companion-combat-atk">攻:{{ store.getCompanionCombatStats(comp).attack }}</span>
            </div>
          </div>

          <div class="spell-selection">
            <button class="spell-btn" :class="{ active: !selectedSpell }" @click="selectedSpell = null">物理攻击</button>
            <button
              v-for="spell in availableSpells"
              :key="spell.id"
              class="spell-btn"
              :class="{ active: selectedSpell === spell.id, disabled: playerMp < spell.mpCost }"
              :disabled="playerMp < spell.mpCost"
              @click="selectedSpell = spell.id"
            >
              {{ spell.icon }} {{ spell.name }}（{{ spell.mpCost }}）
            </button>
          </div>

          <div class="combat-logs">
            <div v-for="(log, i) in combatLogs" :key="`${i}-${log}`" class="combat-log">{{ log }}</div>
          </div>

          <div class="combat-actions">
            <button class="detail-action-btn" :disabled="combatOver" @click="doCombatRound">
              {{ combatOver ? '战斗结束' : '继续自动战斗' }}
            </button>
            <button v-if="combatOver" class="detail-action-btn" @click="endCombat">继续</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="mode === 'reward'" class="dungeon-reward panel-box">
      <div class="reward-title">副本完成</div>
      <div class="reward-subtitle">你成功突破研究所并活着撤离了这里。</div>

      <div class="reward-list">
        <div v-if="rewards.rewardPoints" class="reward-item">
          <span class="reward-item__label">💎 奖励点</span>
          <span class="reward-item__value">+{{ rewards.rewardPoints }}</span>
        </div>
        <div v-if="rewards.xp" class="reward-item">
          <span class="reward-item__label">⚡ XP</span>
          <span class="reward-item__value">+{{ rewards.xp }}</span>
        </div>
        <div v-if="rewards.sidePlots.D" class="reward-item">
          <span class="reward-item__label">📋 D级支线</span>
          <span class="reward-item__value">+{{ rewards.sidePlots.D }}</span>
        </div>
        <div v-if="rewards.sidePlots.C" class="reward-item">
          <span class="reward-item__label">📋 C级支线</span>
          <span class="reward-item__value">+{{ rewards.sidePlots.C }}</span>
        </div>
        <div v-if="rewards.sidePlots.B" class="reward-item">
          <span class="reward-item__label">📋 B级支线</span>
          <span class="reward-item__value">+{{ rewards.sidePlots.B }}</span>
        </div>
      </div>

      <button class="detail-action-btn claim-btn" @click="claimRewards">领取奖励</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../../stores/game'
import {
  EXIT_ICONS,
  ROOM_TYPE_ICONS,
  ROOM_TYPE_NAMES,
  dungeonScenarios,
  getDungeonById,
  type DungeonMap,
  type MudRoom,
  type RoomExit,
  type RoomInteractable,
  type RoomInteractableAction,
  type Quest,
  type QuestObjective,
  type QuestStatus,
} from '../../data/dungeonMap'
import { getSpellById, spells } from '../../data/spells'
import { simulateCombatRound } from '../../systems/dice'
import type { DamageType } from '../../config/combat'

const store = useGameStore()

type Mode = 'select' | 'exploring' | 'reward'
type DungeonLogType = 'success' | 'warning' | 'danger' | 'info' | 'gold' | ''

interface DungeonLogEntry {
  id: number
  text: string
  type: DungeonLogType
  time: string
}

interface EnemyLike {
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  damage: number
  armor: number
  exp: number
  sidePlots: { D?: number; C?: number; B?: number; A?: number; S?: number }
}

const mode = ref<Mode>('select')
const currentDungeon = ref<DungeonMap | null>(null)
const currentRoomId = ref('')
const exploredRooms = ref<Set<string>>(new Set())
const takenActions = ref<Set<string>>(new Set())
const dungeonLogs = ref<DungeonLogEntry[]>([])
const selectedInteractableId = ref<string | null>(null)
const isMoving = ref(false)

const playerHp = ref(0)
const playerMaxHp = ref(0)
const playerMp = ref(0)
const playerMaxMp = ref(0)

const combatMode = ref(false)
const currentEnemy = ref<EnemyLike | null>(null)
const currentEnemyHp = ref(0)
const currentEnemyIndex = ref(0)
const combatOver = ref(false)
const selectedSpell = ref<string | null>(null)
const combatLogs = ref<string[]>([])

const rewards = ref({ sidePlots: { D: 0, C: 0, B: 0 }, xp: 0, rewardPoints: 0 })

// 任务追踪状态
const mainQuests = ref<Quest[]>([])
const sideQuests = ref<Quest[]>([])

const roomPositions = ref<Record<string, { x: number; y: number }>>({})
const mapLines = ref<{ x1: number; y1: number; x2: number; y2: number }[]>([])
const mapViewBox = ref('0 0 1320 620')

const dungeonList = computed(() => dungeonScenarios.map((d) => ({
  id: d.id,
  name: d.name,
  tier: d.tier,
  minLevel: d.minLevel,
  description: d.description,
})))

const currentRoom = computed(() => {
  if (!currentDungeon.value || !currentRoomId.value) return null
  return currentDungeon.value.rooms[currentRoomId.value] || null
})

const availableSpells = computed(() => spells.filter((spell) => store.hasSpell(spell.id) && playerMp.value >= spell.mpCost))

const availableExits = computed(() => {
  if (!currentRoom.value) return []
  return currentRoom.value.exits.map((exit) => ({
    ...exit,
    locked: isExitLocked(currentRoom.value!.id, exit),
  }))
})

const presenceItems = computed<RoomInteractable[]>(() => currentRoom.value?.interactables ?? [])

const selectedInteractable = computed(() => {
  if (!selectedInteractableId.value) {
    return presenceItems.value[0] ?? null
  }
  return presenceItems.value.find((item) => item.id === selectedInteractableId.value) ?? presenceItems.value[0] ?? null
})

const detailTitle = computed(() => {
  if (selectedInteractable.value) return selectedInteractable.value.title
  return currentRoom.value?.name ?? '交互信息'
})

const detailDescription = computed(() => {
  if (selectedInteractable.value) return selectedInteractable.value.detail
  return currentRoom.value?.description ?? '请选择一个房间或交互对象。'
})

const detailExtra = computed(() => {
  if (selectedInteractable.value) return selectedInteractable.value.summary
  return currentRoom.value?.storyText ?? ''
})

const detailActions = computed<RoomInteractableAction[]>(() => {
  const actions = selectedInteractable.value ? selectedInteractable.value.actions : []

  if (currentRoom.value?.type === 'exit') {
    return [{ id: 'complete-dungeon', label: '登上升降机', effect: '你准备正式撤离研究所。' }]
  }

  return actions
})

const visibleDungeonLogs = computed(() => dungeonLogs.value.slice(-8).reverse())

function addRoomLog(text: string, type: DungeonLogType = 'info') {
  store.addLog(text, type)
  const cleanText = text.replace(/^\[ACTION:[^\]]+\]\s*/, '')
  dungeonLogs.value.push({
    id: Date.now() + dungeonLogs.value.length,
    text: cleanText,
    type,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })
  if (dungeonLogs.value.length > 60) dungeonLogs.value.shift()
}

function enterDungeon(dungeonId: string) {
  const dungeon = getDungeonById(dungeonId)
  if (!dungeon || store.level < dungeon.minLevel) return

  const clonedDungeon = JSON.parse(JSON.stringify(dungeon)) as DungeonMap
  store.setDungeonNav({
    tier: dungeon.tier,
    name: dungeon.name,
    description: dungeon.description,
  })
  currentDungeon.value = clonedDungeon
  currentRoomId.value = dungeon.startRoomId
  exploredRooms.value = new Set([dungeon.startRoomId])
  takenActions.value = new Set()
  dungeonLogs.value = []
  selectedInteractableId.value = clonedDungeon.rooms[dungeon.startRoomId].interactables?.[0]?.id ?? null

  playerMaxHp.value = store.getMaxHp()
  playerHp.value = playerMaxHp.value
  playerMaxMp.value = store.getMaxMp()
  playerMp.value = playerMaxMp.value
  rewards.value = { sidePlots: { D: 0, C: 0, B: 0 }, xp: 0, rewardPoints: 0 }

  // 初始化任务追踪
  if (dungeon.quests) {
    mainQuests.value = JSON.parse(JSON.stringify(dungeon.quests.mainQuests))
    sideQuests.value = JSON.parse(JSON.stringify(dungeon.quests.sideQuests))
  } else {
    mainQuests.value = []
    sideQuests.value = []
  }

  clonedDungeon.rooms[dungeon.startRoomId].visited = true
  calculateMapLayout()
  mode.value = 'exploring'

  addRoomLog(`进入副本：${dungeon.name}`)
  addRoomLog(clonedDungeon.rooms[dungeon.startRoomId].description)
  if (clonedDungeon.rooms[dungeon.startRoomId].storyText) {
    addRoomLog(clonedDungeon.rooms[dungeon.startRoomId].storyText as string)
  }
  maybeAutoStartCombat(clonedDungeon.rooms[dungeon.startRoomId])
}

// ==================== 任务追踪 ====================

function updateQuests(actionId: string) {
  const allQuests = [...mainQuests.value, ...sideQuests.value]

  for (const quest of allQuests) {
    for (const obj of quest.objectives) {
      if (obj.status !== 'completed' && obj.triggerActions.includes(actionId)) {
        obj.status = 'completed'
        addRoomLog(`任务目标完成：${obj.description}`, 'gold')
      }
    }

    // 检查任务整体是否完成
    if (quest.status !== 'completed' && quest.objectives.every(o => o.status === 'completed')) {
      quest.status = 'completed'
      addRoomLog(`任务完成：${quest.title}${quest.reward ? ' — 奖励：' + quest.reward : ''}`, 'gold')
    }
  }

  // 检查任务解锁条件（根据已访问房间和已完成任务）
  unlockQuestsByProgress()
}

function unlockQuestsByProgress() {
  const visitedRoomIds = Array.from(exploredRooms.value)
  const allQuests = [...mainQuests.value, ...sideQuests.value]

  for (const quest of allQuests) {
    if (quest.status !== 'locked') continue

    // 主线任务解锁：根据前置任务完成状态
    if (quest.type === 'main') {
      const questIndex = mainQuests.value.indexOf(quest)
      if (questIndex > 0) {
        const prevQuest = mainQuests.value[questIndex - 1]
        if (prevQuest.status === 'completed') {
          quest.status = 'available'
          addRoomLog(`新主线任务解锁：${quest.title}`, 'gold')
        }
      }
    }

    // 支线任务解锁：根据房间访问
    if (quest.type === 'side') {
      let shouldUnlock = false
      if (quest.id === 'side_linwei' && visitedRoomIds.includes('sample_room')) shouldUnlock = true
      if (quest.id === 'side_heche' && visitedRoomIds.includes('medical_room')) shouldUnlock = true
      if (quest.id === 'side_data' && visitedRoomIds.includes('monitor_room')) shouldUnlock = true
      if (quest.id === 'side_armory' && visitedRoomIds.includes('armory')) shouldUnlock = true

      if (shouldUnlock) {
        quest.status = 'available'
        addRoomLog(`新支线任务解锁：${quest.title}`, 'gold')
      }
    }
  }
}

function calculateMapLayout() {
  const positions: Record<string, { x: number; y: number }> = {
    lab_gate: { x: 110, y: 290 },
    main_corridor: { x: 260, y: 290 },
    duty_room: { x: 430, y: 220 },
    sample_room: { x: 430, y: 360 },
    power_room: { x: 600, y: 220 },
    security_gate: { x: 600, y: 360 },
    b_zone_corridor: { x: 770, y: 290 },
    medical_room: { x: 940, y: 160 },
    armory: { x: 940, y: 290 },
    monitor_room: { x: 940, y: 420 },
    evac_platform: { x: 1120, y: 290 },
    escape_lift: { x: 1280, y: 290 },
  }

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  if (currentDungeon.value) {
    Object.values(currentDungeon.value.rooms).forEach((room) => {
      room.exits.forEach((exit) => {
        const from = positions[room.id]
        const to = positions[exit.roomId]
        if (from && to) {
          lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })
        }
      })
    })
  }

  roomPositions.value = positions
  mapLines.value = lines
  mapViewBox.value = '0 0 1380 560'
}

function roomClass(roomId: string, room: MudRoom) {
  return {
    current: currentRoomId.value === roomId,
    visited: room.visited,
    cleared: room.cleared,
  }
}

function isExitLocked(fromRoomId: string, exit: RoomExit) {
  if (fromRoomId === 'security_gate' && exit.roomId === 'b_zone_corridor') {
    const hasKeycard = hasTakenAnyAction(['help_rosen', 'threaten_rosen', 'kill_rosen'])
    const hasPower = hasTakenAnyAction(['restore_power', 'force_power'])
    return !(hasKeycard && hasPower)
  }

  if (fromRoomId === 'security_gate' && exit.roomId === 'main_corridor') {
    return false
  }

  return Boolean(exit.locked)
}

function hasTakenAction(actionId: string) {
  return takenActions.value.has(actionId)
}

function hasTakenAnyAction(actionIds: string[]) {
  return actionIds.some((actionId) => hasTakenAction(actionId))
}

function moveToRoom(targetRoomId: string) {
  if (!currentDungeon.value || !currentRoom.value || isMoving.value || combatMode.value) return
  if (targetRoomId === currentRoomId.value) return

  const path = findPath(currentRoomId.value, targetRoomId)
  if (!path) {
    addRoomLog('这条路线当前不可达。', 'warning')
    return
  }

  void traversePath(path)
}

function findPath(startId: string, targetId: string) {
  if (!currentDungeon.value) return null

  const queue: string[][] = [[startId]]
  const visited = new Set<string>([startId])

  while (queue.length) {
    const path = queue.shift()!
    const currentId = path[path.length - 1]
    if (currentId === targetId) return path

    const room = currentDungeon.value.rooms[currentId]
    room.exits.forEach((exit) => {
      if (visited.has(exit.roomId)) return
      if (isExitLocked(currentId, exit)) return
      visited.add(exit.roomId)
      queue.push([...path, exit.roomId])
    })
  }

  return null
}

async function traversePath(path: string[]) {
  if (!currentDungeon.value) return
  isMoving.value = true

  for (const roomId of path.slice(1)) {
    const room = currentDungeon.value.rooms[roomId]
    currentRoomId.value = roomId
    room.visited = true
    exploredRooms.value.add(roomId)
    selectedInteractableId.value = room.interactables?.[0]?.id ?? null
    addRoomLog(`你沿路径移动到【${room.name}】。`)
    addRoomLog(room.description)
    if (room.storyText && !room.cleared) {
      addRoomLog(room.storyText)
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    if (maybeAutoStartCombat(room)) break
  }

  isMoving.value = false
}

function selectInteractable(interactableId: string) {
  selectedInteractableId.value = interactableId
}

function getRoomIcon(type: string) {
  return (ROOM_TYPE_ICONS as Record<string, string>)[type] || '□'
}

function getRoomTypeName(type: string) {
  return (ROOM_TYPE_NAMES as Record<string, string>)[type] || '未知'
}

function getExitIcon(direction: string) {
  return (EXIT_ICONS as Record<string, string>)[direction] || '→'
}

function getRoomNameById(roomId: string) {
  return currentDungeon.value?.rooms[roomId]?.name ?? ''
}

function getInteractableIcon(type: RoomInteractable['type']) {
  const iconMap: Record<RoomInteractable['type'], string> = {
    npc: '人',
    item: '物',
    device: '机',
    clue: '讯',
  }
  return iconMap[type]
}

function isCombatRoom(type: string) {
  return type === 'combat' || type === 'elite' || type === 'boss'
}

function handleDetailAction(actionId: string) {
  if (!currentRoom.value) return

  if (actionId === 'start-combat') {
    startCombat()
    return
  }

  if (actionId === 'complete-dungeon') {
    completeDungeon()
    return
  }

  const action = detailActions.value.find((item) => item.id === actionId)
  if (!action) return

  takenActions.value.add(action.id)
  addRoomLog(`[ACTION:${action.id}] ${action.effect}`, 'success')

  // 更新任务追踪
  updateQuests(action.id)

  if (action.grantRewards) {
    rewards.value.rewardPoints += action.grantRewards.rewardPoints || 0
    rewards.value.xp += action.grantRewards.xp || 0
    rewards.value.sidePlots.D += action.grantRewards.sidePlots?.D || 0
    rewards.value.sidePlots.C += action.grantRewards.sidePlots?.C || 0
    rewards.value.sidePlots.B += action.grantRewards.sidePlots?.B || 0
  }

  applyActionEffects(action)

  if (currentRoom.value.type === 'chest' || currentRoom.value.type === 'story') {
    currentRoom.value.cleared = true
  }

  if (currentRoom.value.type === 'trap' && action.id === 'restore_power') {
    triggerTrap()
  }

  if (action.nextRoom) {
    moveToRoom(action.nextRoom)
  }
}

function applyActionEffects(action: RoomInteractableAction) {
  const effects = action.effects
  if (!effects) return

  if (effects.rewardPoints) rewards.value.rewardPoints += effects.rewardPoints
  if (effects.xp) rewards.value.xp += effects.xp

  if (effects.damage) {
    playerHp.value = Math.max(0, playerHp.value - effects.damage)
    addRoomLog(`你受到 ${effects.damage} 点伤害，当前HP：${playerHp.value}/${playerMaxHp.value}。`, 'warning')
  }

  if (effects.heal) {
    playerHp.value = Math.min(playerMaxHp.value, playerHp.value + effects.heal)
    addRoomLog(`你恢复 ${effects.heal} 点生命，当前HP：${playerHp.value}/${playerMaxHp.value}。`, 'success')
  }

  if (effects.spawnEnemies?.length && currentRoom.value) {
    currentRoom.value.enemies = [
      ...(currentRoom.value.enemies || []),
      ...effects.spawnEnemies,
    ]
    currentRoom.value.cleared = false
    addRoomLog(`遭遇判定：${effects.spawnEnemies.map((enemy) => enemy.name).join('、')} 出现。`, 'danger')
  }

  if (effects.addItem) addRoomLog(`获得物品：${effects.addItem}`, 'gold')
  if (effects.removeItem) addRoomLog(`消耗/交出物品：${effects.removeItem}`, 'warning')
  if (effects.infectionChange) addRoomLog(`感染值变化：${effects.infectionChange > 0 ? '+' : ''}${effects.infectionChange}`, effects.infectionChange > 0 ? 'warning' : 'success')
  if (effects.noiseChange) addRoomLog(`噪音值变化：${effects.noiseChange > 0 ? '+' : ''}${effects.noiseChange}`, effects.noiseChange > 0 ? 'warning' : 'success')
  if (effects.timerChange) addRoomLog(`倒计时变化：${effects.timerChange > 0 ? '+' : ''}${Math.round(effects.timerChange / 60)}分钟`, effects.timerChange < 0 ? 'warning' : 'success')
  if (effects.bossWeakness) addRoomLog(`弱点情报：${effects.bossWeakness}`, 'success')
  if (effects.unlockExit) addRoomLog(`路线更新：${effects.unlockExit} 已可尝试通行。`, 'success')
  if (effects.statusEffect) addRoomLog(`状态变化：${effects.statusEffect}`, 'warning')
  if (effects.npcFavor) {
    Object.entries(effects.npcFavor).forEach(([name, value]) => {
      addRoomLog(`${name} 好感变化：${value > 0 ? '+' : ''}${value}`, value > 0 ? 'success' : 'warning')
    })
  }

  if (effects.ending) {
    addRoomLog(`结局标记：${effects.ending}`, 'gold')
  }

  if (effects.startCombat) {
    triggerCombatEncounter('交互触发战斗判定。')
  }
}

function maybeAutoStartCombat(room: MudRoom) {
  if (!room.autoStartCombat || room.cleared || !room.enemies?.length || combatMode.value) return false
  triggerCombatEncounter(`遭遇判定：【${room.name}】存在敌对目标。`)
  return true
}

function triggerCombatEncounter(reason: string) {
  if (!currentRoom.value?.enemies?.length || currentRoom.value.cleared || combatMode.value) return
  addRoomLog(reason, 'danger')
  isMoving.value = false
  startCombat()
}

function startCombat() {
  if (!currentRoom.value?.enemies?.length) return

  currentEnemyIndex.value = 0
  currentEnemy.value = currentRoom.value.enemies[0] as EnemyLike
  currentEnemyHp.value = currentEnemy.value.hp
  combatOver.value = false
  selectedSpell.value = null
  combatLogs.value = [`遭遇敌人：${currentEnemy.value.name}`]
  combatMode.value = true
}

function doCombatRound() {
  if (!currentEnemy.value || combatOver.value) return

  const combatStats = store.getCombatStats()
  const advancedStats = store.getAdvancedCombatStats()
  const weaponInfo = store.getWeaponCombatInfo()
  const meleeLevel = store.getSkillLevel('melee')
  const firearmLevel = store.getSkillLevel('firearm')
  const dodgeLevel = store.getSkillLevel('dodge')

  const weaponDamageType: DamageType = weaponInfo.essence || 'technology'
  let damageType: DamageType = weaponDamageType
  let attackMode: 'normal' | 'skill' = 'normal'
  let skillCoefficient = 1
  let proficiencyBonus: number | undefined
  let statusEffectApplied = ''

  if (selectedSpell.value) {
    const spell = getSpellById(selectedSpell.value)
    if (spell && playerMp.value >= spell.mpCost) {
      damageType = weaponDamageType
      attackMode = 'skill'
      skillCoefficient = 1 + spell.baseDamage / 50
      proficiencyBonus = store.getSkillLevel('mysticism') * 2
      playerMp.value -= spell.mpCost
      combatLogs.value.push(`你施放了 ${spell.name}，消耗 ${spell.mpCost} MP，技能系数 ${skillCoefficient.toFixed(2)}。`)
      
      // 应用法术状态效果
      if (spell.statusEffect) {
        const resistance = combatStats.immunity * 0.01
        if (Math.random() > resistance) {
          statusEffectApplied = spell.statusEffect.type
          combatLogs.value.push(`附加状态：${getStatusEffectName(spell.statusEffect.type)}！`)
        }
      }
    }
  }

  const result = simulateCombatRound(
    {
      strength: combatStats.strength,
      reaction: combatStats.reaction,
      spirit: combatStats.spirit,
      intelligence: combatStats.intelligence,
      vitality: combatStats.vitality,
      immunity: combatStats.immunity,
    },
    { melee: meleeLevel, ranged: firearmLevel, dodge: dodgeLevel },
    {
      attack: currentEnemy.value.attack,
      defense: currentEnemy.value.defense,
      damage: currentEnemy.value.damage,
      armor: currentEnemy.value.armor,
      ...(currentEnemy.value as any).technologyAttack && { technologyAttack: (currentEnemy.value as any).technologyAttack },
      ...(currentEnemy.value as any).fantasyAttack && { fantasyAttack: (currentEnemy.value as any).fantasyAttack },
      ...(currentEnemy.value as any).abnormalAttack && { abnormalAttack: (currentEnemy.value as any).abnormalAttack },
      ...(currentEnemy.value as any).technologyDefense && { technologyDefense: (currentEnemy.value as any).technologyDefense },
      ...(currentEnemy.value as any).fantasyDefense && { fantasyDefense: (currentEnemy.value as any).fantasyDefense },
      ...(currentEnemy.value as any).abnormalDefense && { abnormalDefense: (currentEnemy.value as any).abnormalDefense },
      ...(currentEnemy.value as any).speed && { speed: (currentEnemy.value as any).speed },
      ...(currentEnemy.value as any).critRate && { critRate: (currentEnemy.value as any).critRate },
      ...(currentEnemy.value as any).critDamage && { critDamage: (currentEnemy.value as any).critDamage },
      ...(currentEnemy.value as any).critResist && { critResist: (currentEnemy.value as any).critResist },
      ...(currentEnemy.value as any).hit && { hit: (currentEnemy.value as any).hit },
      ...(currentEnemy.value as any).evasion && { evasion: (currentEnemy.value as any).evasion },
      ...(currentEnemy.value as any).stunRate && { stunRate: (currentEnemy.value as any).stunRate },
      ...(currentEnemy.value as any).stunResist && { stunResist: (currentEnemy.value as any).stunResist },
      ...(currentEnemy.value as any).blockRate && { blockRate: (currentEnemy.value as any).blockRate },
      ...(currentEnemy.value as any).toughness && { toughness: (currentEnemy.value as any).toughness },
      ...(currentEnemy.value as any).damageReduction && { damageReduction: (currentEnemy.value as any).damageReduction },
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
    damageType,
    playerHp.value,
    currentEnemyHp.value,
  )

  combatLogs.value.push('—— 自动战斗回合 ——')
  result.logs.forEach((log) => combatLogs.value.push(log))

  if (result.playerHit) {
    currentEnemyHp.value = Math.max(0, currentEnemyHp.value - result.playerDamage)
    combatLogs.value.push(`敌人剩余HP：${currentEnemyHp.value}/${currentEnemy.value.hp}`)
  }

  if (result.playerHealing > 0) {
    playerHp.value = Math.min(playerMaxHp.value, playerHp.value + result.playerHealing)
    combatLogs.value.push(`你回复生命：${playerHp.value}/${playerMaxHp.value}`)
  }

  if (result.enemyHit) {
    playerHp.value = Math.max(0, playerHp.value - result.enemyDamage)
    combatLogs.value.push(`你剩余HP：${playerHp.value}/${playerMaxHp.value}`)
  }

  if (result.enemyHealing > 0) {
    currentEnemyHp.value = Math.min(currentEnemy.value.hp, currentEnemyHp.value + result.enemyHealing)
    combatLogs.value.push(`敌人回复生命：${currentEnemyHp.value}/${currentEnemy.value.hp}`)
  }

  // 队友自动攻击
  const companions = store.getCompanions()
  if (companions.length > 0 && currentEnemyHp.value > 0) {
    combatLogs.value.push('—— 队友攻击 ——')
    for (const companion of companions) {
      const cStats = store.getCompanionCombatStats(companion)
      const dmg = cStats.attack
      if (dmg > 0) {
        currentEnemyHp.value = Math.max(0, currentEnemyHp.value - dmg)
        combatLogs.value.push(`${companion.name}发动攻击，造成 ${dmg} 点伤害。`)
        if (currentEnemyHp.value <= 0) {
          combatLogs.value.push(`🎉 ${companion.name}击败了 ${currentEnemy.value.name}！`)
          break
        }
      }
    }
    if (currentEnemyHp.value > 0) {
      combatLogs.value.push(`敌人剩余HP：${currentEnemyHp.value}/${currentEnemy.value.hp}`)
    }
  }

  if (currentEnemyHp.value <= 0) {
    combatLogs.value.push(`🎉 击败了 ${currentEnemy.value.name}！`)
    currentEnemyIndex.value += 1

    if (currentRoom.value?.enemies && currentEnemyIndex.value < currentRoom.value.enemies.length) {
      currentEnemy.value = currentRoom.value.enemies[currentEnemyIndex.value] as EnemyLike
      currentEnemyHp.value = currentEnemy.value.hp
      combatLogs.value.push(`新的敌人出现：${currentEnemy.value.name}`)
    } else {
      combatOver.value = true
      combatLogs.value.push('战斗胜利，区域已暂时安全。')
    }
  } else if (playerHp.value <= 0) {
    combatOver.value = true
    combatLogs.value.push('💀 你被击败了……')
  }
}

function endCombat() {
  combatMode.value = false

  if (playerHp.value <= 0) {
    addRoomLog('你在研究所中倒下，只能被迫撤离。', 'danger')
    leaveDungeon()
    return
  }

  if (currentRoom.value) {
    currentRoom.value.cleared = true
    currentRoom.value.enemies?.forEach((enemy) => {
      rewards.value.xp += enemy.exp
      rewards.value.sidePlots.D += enemy.sidePlots.D || 0
      rewards.value.sidePlots.C += enemy.sidePlots.C || 0
      rewards.value.sidePlots.B += enemy.sidePlots.B || 0
    })
    addRoomLog(`你清理了房间【${currentRoom.value.name}】。`, 'success')
  }
}

function triggerTrap() {
  if (!currentRoom.value || currentRoom.value.type !== 'trap') return
  const damage = currentRoom.value.trapDamage || 10
  playerHp.value = Math.max(0, playerHp.value - damage)
  currentRoom.value.cleared = true
  addRoomLog(`你在【${currentRoom.value.name}】中承受了 ${damage} 点伤害，但完成了关键操作。`, 'warning')
}

function getStatusEffectName(effectType: string): string {
  const effectNames: Record<string, string> = {
    burn: '燃烧',
    bleed: '流血',
    poison: '中毒',
    stun: '眩晕',
    silence: '沉默',
    slow: '减速',
    root: '束缚',
    strengthen: '强化',
  }
  return effectNames[effectType] || effectType
}

function completeDungeon() {
  addRoomLog('撤离升降机已经开启，你成功完成了研究所突破。', 'gold')
  mode.value = 'reward'
}

function claimRewards() {
  store.addRewards(rewards.value.rewardPoints, rewards.value.xp)
  store.addSidePlots({
    D: rewards.value.sidePlots.D || 0,
    C: rewards.value.sidePlots.C || 0,
    B: rewards.value.sidePlots.B || 0,
  })
  mode.value = 'select'
  currentDungeon.value = null
  takenActions.value = new Set()
  dungeonLogs.value = []
  store.setDungeonNav(null)
}

function leaveDungeon() {
  mode.value = 'select'
  currentDungeon.value = null
  takenActions.value = new Set()
  dungeonLogs.value = []
  combatMode.value = false
  isMoving.value = false
  store.setDungeonNav(null)
}

watch(
  () => store.dungeonExitRequest,
  () => {
    if (mode.value === 'exploring' || mode.value === 'reward') {
      leaveDungeon()
    }
  }
)

onUnmounted(() => {
  store.setDungeonNav(null)
})
</script>

<style scoped>
/* ==================== iOS 18 副本界面设计系统 ==================== */

.dungeon-container {
  height: 100%;
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
}

.panel-box {
  background: rgba(28, 28, 30, 0.94);
  backdrop-filter: saturate(150%) blur(20px);
  -webkit-backdrop-filter: saturate(150%) blur(20px);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.page-title,
.reward-title {
  text-align: center;
  color: #ffd38a;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.page-subtitle,
.reward-subtitle {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.7;
  font-weight: 400;
}

/* ==================== 副本选择 ==================== */

.dungeon-select {
  max-width: 980px;
  height: 100%;
  margin: 0 auto;
  overflow-y: auto;
}

.dungeon-list {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.dungeon-card {
  text-align: left;
  padding: 20px;
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(44, 44, 46, 0.92);
  color: #f2f2f7;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.dungeon-card:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.dungeon-card:hover:not(.locked) {
  border-color: rgba(255, 211, 138, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.dungeon-card.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.dungeon-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dungeon-tier {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dungeon-tier.D { background: rgba(142, 142, 147, 0.18); color: #8e8e93; }
.dungeon-tier.C { background: rgba(0, 122, 255, 0.15); color: #5ac8fa; }
.dungeon-tier.B { background: rgba(175, 82, 222, 0.15); color: #bf5af2; }
.dungeon-tier.A { background: rgba(255, 149, 0, 0.15); color: #ffd38a; }
.dungeon-tier.S { background: rgba(255, 59, 48, 0.15); color: #ff6259; }

.dungeon-name {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #ffd38a;
}

.dungeon-level,
.dungeon-meta,
.map-hint,
.overview-type,
.presence-empty,
.moving-indicator {
  color: rgba(255, 255, 255, 0.45);
  font-weight: 400;
}

.dungeon-desc,
.overview-text,
.detail-description {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.75;
  font-weight: 400;
}

.dungeon-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
}

.dungeon-lock {
  margin-top: 10px;
  color: #ff6259;
  font-size: 12px;
  font-weight: 500;
}

/* ==================== 副本探索 ==================== */

.dungeon-exploring {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.detail-extra,
.overview-story {
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.7;
}

.exit-btn,
.presence-item,
.detail-action-btn,
.claim-btn {
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  -webkit-tap-highlight-color: transparent;
}

.exit-btn:active,
.presence-item:active,
.detail-action-btn:active,
.claim-btn:active {
  transform: scale(0.96);
  transition-duration: 0.1s;
}

/* ==================== 副本布局 ==================== */

.dungeon-playfield {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  grid-template-rows: auto minmax(360px, 1fr);
  grid-template-areas:
    "primary side"
    "map side";
  gap: 12px 16px;
  align-items: stretch;
}

.dungeon-side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.dungeon-primary {
  grid-area: primary;
  display: grid;
  grid-template-columns: minmax(220px, 0.42fr) minmax(480px, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

/* ==================== 面板通用 ==================== */

.overview-scene,
.dungeon-map-box,
.dungeon-detail,
.dungeon-reward {
  padding: 14px 16px;
}

.overview-header,
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #ffd38a;
  font-weight: 600;
}

.overview-header > div {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.overview-location {
  font-size: 20px;
  font-weight: 700;
}

.overview-type {
  font-size: 12px;
  white-space: nowrap;
  font-weight: 400;
}

.overview-story {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
}

.overview-move {
  margin-top: 16px;
}

.overview-label,
.presence-title {
  display: block;
  color: #ffd38a;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.exit-buttons,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-presence {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

/* ==================== 按钮样式 ==================== */

.exit-btn,
.presence-item,
.detail-action-btn,
.claim-btn {
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #f2f2f7;
  font-weight: 500;
}

.exit-btn {
  padding: 8px 14px;
}

.exit-btn:hover:not(.locked),
.presence-item:hover,
.detail-action-btn:hover,
.claim-btn:hover {
  border-color: rgba(255, 211, 138, 0.3);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.exit-btn.locked {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ==================== 存在对象 ==================== */

.presence-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.presence-item {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  padding: 8px 10px;
  text-align: left;
}

.presence-item.active {
  border-color: rgba(255, 211, 138, 0.35);
  background: rgba(255, 211, 138, 0.08);
}

.presence-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 0.5px solid rgba(255, 211, 138, 0.2);
  color: #ffd38a;
  font-size: 11px;
}

/* ==================== 任务面板 ==================== */

.quest-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
}

.quest-panel-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #ffd38a;
  text-transform: uppercase;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.quest-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quest-section-title {
  font-size: 11px;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
}

.quest-section-title.main { color: #ffd38a; }
.quest-section-title.side { color: #bf5af2; }

.quest-item {
  padding: 8px 10px;
  border-radius: 10px;
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.15s ease;
}

.quest-item.completed { opacity: 0.45; }
.quest-item.locked { opacity: 0.3; }

.quest-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #f2f2f7;
}

.quest-icon { font-size: 12px; }

.quest-title { color: #f2f2f7; }

.quest-item.completed .quest-title {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.4);
}

.quest-objectives {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 20px;
}

.quest-objective {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.quest-objective.completed {
  color: #30d158;
  text-decoration: line-through;
}

.obj-check {
  font-size: 10px;
  width: 14px;
  text-align: center;
}

.quest-objective.completed .obj-check { color: #30d158; }

.quest-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  padding: 16px 0;
}

/* ==================== 地图 ==================== */

.dungeon-map-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.dungeon-map-row {
  grid-area: map;
  min-width: 0;
  min-height: 0;
}

.map-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0;
}

.map-svg {
  display: block;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 360px;
}

.map-line {
  stroke: rgba(255, 211, 138, 0.25);
  stroke-width: 2;
}

.room-node { cursor: pointer; }

.room-box {
  fill: rgba(44, 44, 46, 0.96);
  stroke: rgba(255, 211, 138, 0.35);
  stroke-width: 1.5;
  rx: 6;
  ry: 6;
}

.room-node.current .room-box {
  stroke: #ff6259;
  stroke-width: 2.5;
}

.room-node.visited .room-box {
  fill: rgba(58, 58, 60, 0.96);
}

.room-node.cleared .room-box {
  stroke: #30d158;
}

.room-icon,
.room-name {
  text-anchor: middle;
  fill: #f2f2f7;
  pointer-events: none;
}

.room-icon { font-size: 18px; }
.room-name { font-size: 12px; font-weight: 500; }

/* ==================== 详情面板 ==================== */

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 190px;
  justify-content: center;
  padding: 12px 12px 16px;
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.25);
}

.dungeon-detail {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.dungeon-detail .panel-title-row {
  margin-bottom: 10px;
  font-size: 20px;
}

.detail-description { font-size: 18px; }

.detail-action-btn,
.claim-btn {
  padding: 10px 16px;
}

/* ==================== 战斗界面 ==================== */

.combat-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: saturate(180%) blur(30px);
  -webkit-backdrop-filter: saturate(180%) blur(30px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  animation: ios-fade-in 0.2s ease;
}

.combat-panel {
  width: min(760px, 92vw);
  max-height: 86vh;
  overflow-y: auto;
  border-radius: 20px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(28, 28, 30, 0.96);
  backdrop-filter: saturate(180%) blur(40px);
  -webkit-backdrop-filter: saturate(180%) blur(40px);
  padding: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  animation: ios-spring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.combat-header {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.combat-combatant { text-align: center; }

.combat-name {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
}

.combat-name.enemy { color: #ff6259; }
.combat-name.player { color: #30d158; }

.hp-bar,
.mp-bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  margin-bottom: 6px;
}

.hp-fill,
.mp-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.hp-fill::after,
.mp-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent);
  border-radius: 999px 999px 0 0;
}

.enemy-bar { background: linear-gradient(90deg, #b91c1c, #ff6259); }
.player-bar { background: linear-gradient(90deg, #15803d, #30d158); }
.mp-fill { background: linear-gradient(90deg, #2563eb, #5ac8fa); }

.combat-number {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.combat-companions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
  flex-wrap: wrap;
}

.combat-companion-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(48, 209, 88, 0.08);
  border: 0.5px solid rgba(48, 209, 88, 0.2);
  border-radius: 10px;
  font-size: 11px;
}

.companion-combat-name {
  color: #30d158;
  font-weight: 600;
}

.companion-combat-atk { color: #ffd38a; }

.spell-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.spell-btn {
  padding: 8px 12px;
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.spell-btn:active { transform: scale(0.96); }

.spell-btn.active {
  border-color: rgba(255, 211, 138, 0.35);
  background: rgba(255, 211, 138, 0.1);
  color: #ffd38a;
}

.spell-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.combat-logs {
  min-height: 220px;
  max-height: 320px;
  overflow-y: auto;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px;
}

.combat-log {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  font-size: 13px;
}

.combat-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* ==================== 奖励 ==================== */

.dungeon-reward {
  max-width: 520px;
  margin: 0 auto;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 22px 0;
}

.reward-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
}

.reward-item__label { color: rgba(255, 255, 255, 0.7); }
.reward-item__value { color: #ffd38a; font-weight: 700; }

.claim-btn { width: 100%; }

/* ==================== 响应式 ==================== */

@media (max-width: 1100px) {
  .dungeon-container { overflow-y: auto; }
  .dungeon-exploring { height: auto; }

  .dungeon-playfield {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(320px, 1fr);
    grid-template-areas: "primary" "side" "map";
  }

  .dungeon-primary { grid-template-columns: 1fr; }
  .dungeon-side { display: flex; min-height: 0; }

  .quest-panel { min-height: 220px; max-height: 360px; }
  .combat-header { grid-template-columns: 1fr; }
}

@media (min-width: 1101px) and (max-width: 1420px) {
  .dungeon-playfield { grid-template-columns: minmax(0, 1fr) 240px; }
  .dungeon-primary { grid-template-columns: minmax(200px, 0.4fr) minmax(420px, 1fr); }
  .detail-description { font-size: 16px; }
}

@media (max-width: 720px) {
  .dungeon-container { padding: 12px; }

  .dungeon-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .dungeon-side { display: flex; }

  .overview-header,
  .panel-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-description { font-size: 15px; }
  .map-svg { min-height: 320px; }
}
</style>
