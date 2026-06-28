<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AttributeKey, FacilityPlacement } from '../../types/game'
import { useGameStore } from '../../stores/game'
import { getItemById } from '../../data/shop'
import { getProfessionById } from '../../data/characterCreate'

const store = useGameStore()

const roomType = ref<'indoor' | 'outdoor'>(store.personalSpace.roomType)
const roomStyle = ref(store.personalSpace.roomStyle)
const activeHotspotId = ref('hotspot_storage')

const indoorStyles = [
  { id: 'military', name: '战术基地', icon: '⚔️', desc: '以训练、仓储和整备为核心的封闭空间。' },
  { id: 'tech', name: '科技中枢', icon: '🚀', desc: '冷白金属墙面与自动控制终端构成的实验空间。' },
  { id: 'modern', name: '现代居所', icon: '🏠', desc: '兼顾日常起居与队伍休整的标准房间。' },
  { id: 'traditional', name: '东方庭院', icon: '🏯', desc: '静室、廊桥与温润木构组成的修整环境。' },
]

const outdoorStyles = [
  { id: 'grassland', name: '开阔草原', icon: '🌿', desc: '适合跑动恢复与低压休整的户外景观。' },
  { id: 'forest', name: '深林营地', icon: '🌲', desc: '隐蔽、安静，适合侦察与生存训练。' },
  { id: 'beach', name: '海岸平台', icon: '🏖️', desc: '风压与潮湿环境利于耐力与平衡训练。' },
  { id: 'mountain', name: '高地营盘', icon: '⛰️', desc: '高强度负重与意志训练的极限地带。' },
]

const trainingFacilities: Array<{
  id: string
  icon: string
  name: string
  attribute: AttributeKey
  desc: string
}> = [
  { id: 'gym', icon: '💪', name: '健身房', attribute: 'strength', desc: '负重、爆发、力量器械训练。' },
  { id: 'agility', icon: '⚡', name: '敏捷训练场', attribute: 'agility', desc: '高速感应、闪避与神经同步训练。' },
  { id: 'endurance', icon: '❤', name: '耐力舱', attribute: 'endurance', desc: '恢复、耐久和机体活性强化。' },
  { id: 'library', icon: '📚', name: '知识图书馆', attribute: 'intelligence', desc: '理论学习、战术复盘与知识吸收。' },
  { id: 'perception', icon: '👁', name: '感知训练室', attribute: 'perception', desc: '侦察、洞察与暴击感知训练。' },
  { id: 'resolve', icon: '◈', name: '决心冥想室', attribute: 'resolve', desc: '冥想、意志聚焦与能量梳理。' },
  { id: 'presence', icon: '✦', name: '风度演武场', attribute: 'presence', desc: '气场压制与社交压迫训练。' },
  { id: 'manipulation', icon: '🎭', name: '操控演说厅', attribute: 'manipulation', desc: '交际、游说与心理博弈训练。' },
  { id: 'composure', icon: '🛡', name: '沉着适应室', attribute: 'composure', desc: '抗性、耐受与环境适应训练。' },
]

const attributeLabels: Record<AttributeKey, string> = {
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

const roomSurfaceClasses = computed(() => ({
  [`room-style-${store.personalSpace.roomStyle}`]: true,
  [`room-type-${store.personalSpace.roomType}`]: true,
}))

type HotspotKind = 'backpack' | 'storage' | 'facility'

const placementMeta: Record<string, {
  kind: HotspotKind
  icon: string
  label: string
  desc: string
  attribute?: AttributeKey
}> = {
  backpack: { kind: 'backpack', icon: '🎒', label: '随身背包', desc: '查看并整理当前携带的物资。' },
  storage: { kind: 'storage', icon: '▣', label: '个人仓库', desc: '存放无法随身携带或暂不使用的战利品。' },
  gym: { kind: 'facility', icon: '💪', label: '健身房', desc: '训练力量。', attribute: 'strength' },
  agility: { kind: 'facility', icon: '⚡', label: '敏捷训练场', desc: '训练敏捷。', attribute: 'agility' },
  library: { kind: 'facility', icon: '📚', label: '知识图书馆', desc: '训练智力。', attribute: 'intelligence' },
  perception: { kind: 'facility', icon: '👁', label: '感知训练室', desc: '训练感知。', attribute: 'perception' },
  resolve: { kind: 'facility', icon: '◈', label: '决心冥想室', desc: '训练决心。', attribute: 'resolve' },
  presence: { kind: 'facility', icon: '✦', label: '风度演武场', desc: '训练风度。', attribute: 'presence' },
  manipulation: { kind: 'facility', icon: '🎭', label: '操控演说厅', desc: '训练操控。', attribute: 'manipulation' },
  endurance: { kind: 'facility', icon: '❤', label: '耐力舱', desc: '训练耐力。', attribute: 'endurance' },
  composure: { kind: 'facility', icon: '🛡', label: '沉着适应室', desc: '训练沉着。', attribute: 'composure' },
}

const styleOptions = computed(() => roomType.value === 'indoor' ? indoorStyles : outdoorStyles)

const environmentPreview = computed(() => {
  const selected = styleOptions.value.find(style => style.id === roomStyle.value) ?? styleOptions.value[0]
  return roomType.value === 'indoor'
    ? `${selected.name}内部整合了中央仓储终端、九维训练模块与小队整备区。`
    : `${selected.name}被主神空间封装为可控环境，外围接入仓储与训练设施。`
})

const backpackItems = computed(() =>
  Object.entries(store.inventory)
    .map(([id, quantity]) => ({ item: getItemById(id), id, quantity }))
    .filter(entry => entry.item && entry.quantity > 0),
)

const storageItems = computed(() =>
  Object.entries(store.personalSpace.storage)
    .map(([id, quantity]) => ({ item: getItemById(id), id, quantity }))
    .filter(entry => entry.item && entry.quantity > 0),
)

const squadTraining = computed(() =>
  store.getCharacters().map(char => {
    const assignment = store.getCharacterTrainingAssignment(char.id)
    return {
      id: char.id,
      name: char.name,
      profession: getProfessionById(char.professionId)?.name || '未定职业',
      assignment,
      facility: trainingFacilities.find(item => item.attribute === assignment) ?? null,
    }
  }),
)

const activeTrainingCount = computed(() => squadTraining.value.filter(char => char.assignment).length)

const roomHotspots = computed(() =>
  store.personalSpace.facilityPlacements
    .map((placement: FacilityPlacement) => {
      const meta = placementMeta[placement.type]
      return meta ? { ...placement, ...meta } : null
    })
    .filter(Boolean) as Array<FacilityPlacement & {
      kind: HotspotKind
      icon: string
      label: string
      desc: string
      attribute?: AttributeKey
    }>,
)

const activeHotspot = computed(() =>
  roomHotspots.value.find(item => item.id === activeHotspotId.value) ?? roomHotspots.value[0],
)

const activePanelTitle = computed(() => activeHotspot.value?.label ?? '个人空间')

const activePanelEntries = computed(() => {
  if (!activeHotspot.value) return []
  if (activeHotspot.value.kind === 'backpack') return backpackItems.value
  if (activeHotspot.value.kind === 'storage') return storageItems.value
  return []
})

const activeFacilityOccupants = computed(() => {
  const attr = activeHotspot.value?.attribute
  return attr ? getOccupants(attr) : []
})

const activePanelEmptyText = computed(() => {
  if (activeHotspot.value?.kind === 'backpack') return '背包为空'
  if (activeHotspot.value?.kind === 'storage') return '仓库为空'
  return '当前无人训练'
})

function selectHotspot(id: string) {
  activeHotspotId.value = id
}

function applyEnvironment() {
  store.setPersonalSpaceEnvironment(roomType.value, roomStyle.value, environmentPreview.value)
}

function moveToStorage(itemId: string) {
  store.moveItemToStorage(itemId, 1)
}

function moveToBackpack(itemId: string) {
  store.moveItemToInventory(itemId, 1)
}

function getOccupants(attribute: AttributeKey) {
  return squadTraining.value.filter(char => char.assignment === attribute)
}

function goToEquipment() {
  store.setPage('equipment')
}

function goToCycle() {
  store.setPage('cycle')
}
</script>

<template>
  <div class="personal-space-page">
    <section class="card-panel space-overview">
      <div class="card-header">
        <span class="card-title">个人空间中枢</span>
        <span class="card-badge">上限 27km3</span>
      </div>
      <div class="card-body">
        <div class="overview-copy">
          <p>主神空间中的个人房间现在被配置成了小队的后勤核心。你可以在这里整理背包、存放仓库物资，并通过六维训练设施安排全队自动挂机训练。</p>
          <p class="muted-line">20扇门之外是无边黑暗，门内则是你唯一能完全支配的区域。</p>
        </div>
        <div class="overview-stats">
          <div class="overview-stat">
            <span class="stat-k">队伍人数</span>
            <span class="stat-v">{{ store.getCharacterCount() }}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-k">背包物资</span>
            <span class="stat-v">{{ store.getInventoryItemCount() }}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-k">仓库存量</span>
            <span class="stat-v">{{ store.getStorageItemCount() }}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-k">训练中</span>
            <span class="stat-v">{{ activeTrainingCount }}</span>
          </div>
        </div>
        <div class="command-row">
          <button class="command-btn" @click="goToCycle">前往挂机调度</button>
          <button class="command-btn" @click="goToEquipment">打开装备管理</button>
        </div>
      </div>
    </section>

    <section class="room-stage">
      <div class="room-viewport" :class="roomSurfaceClasses">
        <div class="room-backdrop">
          <div class="room-depth room-depth--ceiling"></div>
          <div class="room-depth room-depth--floor"></div>
          <div class="room-core-light"></div>
          <div class="room-grid-lines"></div>
        </div>

        <button
          v-for="hotspot in roomHotspots"
          :key="hotspot.id"
          type="button"
          class="room-hotspot"
          :class="[`room-hotspot--${hotspot.kind}`, { active: activeHotspot?.id === hotspot.id }]"
          :style="{ left: hotspot.x + '%', top: hotspot.y + '%' }"
          :aria-label="hotspot.label"
          @click="selectHotspot(hotspot.id)"
        >
          <span class="hotspot-pulse"></span>
          <span class="hotspot-icon">{{ hotspot.icon }}</span>
          <span class="hotspot-label">{{ hotspot.label }}</span>
        </button>
      </div>

      <aside class="room-panel">
        <div class="room-panel-header">
          <span class="room-panel-kicker">ROOM NODE</span>
          <span class="room-panel-title">{{ activePanelTitle }}</span>
        </div>

        <div class="room-panel-body">
          <p class="room-panel-desc">{{ activeHotspot?.desc }}</p>

          <template v-if="activeHotspot?.kind === 'facility'">
            <div class="room-facility-status">
              <div class="facility-signal">
                <span class="signal-label">训练属性</span>
                <span class="signal-value">{{ activeHotspot.attribute ? attributeLabels[activeHotspot.attribute] : '未知' }}</span>
              </div>
              <div class="facility-signal">
                <span class="signal-label">设施等级</span>
                <span class="signal-value">Lv.{{ activeHotspot.level }}</span>
              </div>
            </div>

            <div v-if="activeFacilityOccupants.length > 0" class="panel-chip-list">
              <span v-for="char in activeFacilityOccupants" :key="char.id" class="panel-chip">{{ char.name }}</span>
            </div>
            <div v-else class="empty-terminal compact">{{ activePanelEmptyText }}</div>
            <button class="panel-action" @click="goToCycle">分配训练人员</button>
          </template>

          <template v-else>
            <div v-if="activePanelEntries.length > 0" class="panel-item-list">
              <div v-for="entry in activePanelEntries.slice(0, 5)" :key="entry.id" class="panel-item-row">
                <span class="panel-item-icon">{{ entry.item?.icon }}</span>
                <span class="panel-item-name">{{ entry.item?.name }}</span>
                <span class="panel-item-qty">x{{ entry.quantity }}</span>
                <button
                  v-if="activeHotspot?.kind === 'backpack'"
                  class="mini-transfer"
                  @click="moveToStorage(entry.id)"
                >入库</button>
                <button
                  v-else
                  class="mini-transfer"
                  @click="moveToBackpack(entry.id)"
                >取出</button>
              </div>
            </div>
            <div v-else class="empty-terminal compact">{{ activePanelEmptyText }}</div>
          </template>
        </div>
      </aside>
    </section>

    <div class="space-grid">
      <section class="card-panel">
        <div class="card-header">
          <span class="card-title">空间构型</span>
          <span class="card-badge">{{ roomType === 'indoor' ? '室内' : '户外' }}</span>
        </div>
        <div class="card-body">
          <div class="toggle-row">
            <button class="mode-btn" :class="{ active: roomType === 'indoor' }" @click="roomType = 'indoor'">室内</button>
            <button class="mode-btn" :class="{ active: roomType === 'outdoor' }" @click="roomType = 'outdoor'">户外</button>
          </div>

          <div class="style-list">
            <button
              v-for="style in styleOptions"
              :key="style.id"
              class="style-card"
              :class="{ active: roomStyle === style.id }"
              @click="roomStyle = style.id"
            >
              <span class="style-icon">{{ style.icon }}</span>
              <span class="style-copy">
                <span class="style-name">{{ style.name }}</span>
                <span class="style-desc">{{ style.desc }}</span>
              </span>
            </button>
          </div>

          <div class="preview-box">
            <div class="preview-label">当前设定</div>
            <div class="preview-text">{{ store.personalSpace.currentEnvironment }}</div>
            <div class="preview-label preview-label--ghost">待应用</div>
            <div class="preview-text preview-text--ghost">{{ environmentPreview }}</div>
          </div>

          <button class="apply-btn" @click="applyEnvironment">写入主神构型</button>
        </div>
      </section>

      <section class="card-panel">
        <div class="card-header">
          <span class="card-title">六维训练设施</span>
          <span class="card-badge">{{ activeTrainingCount }}/{{ store.getCharacterCount() }}</span>
        </div>
        <div class="card-body">
          <div class="facility-grid">
            <div v-for="facility in trainingFacilities" :key="facility.id" class="facility-card">
              <div class="facility-top">
                <span class="facility-icon">{{ facility.icon }}</span>
                <div class="facility-meta">
                  <div class="facility-name">{{ facility.name }}</div>
                  <div class="facility-attr">{{ attributeLabels[facility.attribute] }}</div>
                </div>
              </div>
              <div class="facility-desc">{{ facility.desc }}</div>
              <div class="facility-occupants">
                <span class="occupant-label">当前人员</span>
                <div v-if="getOccupants(facility.attribute).length > 0" class="occupant-list">
                  <span v-for="char in getOccupants(facility.attribute)" :key="char.id" class="occupant-tag">
                    {{ char.name }}
                  </span>
                </div>
                <div v-else class="occupant-empty">无人占用</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card-panel">
        <div class="card-header">
          <span class="card-title">随身背包</span>
          <span class="card-badge">{{ store.getInventoryItemCount() }}</span>
        </div>
        <div class="card-body">
          <div v-if="backpackItems.length > 0" class="item-list">
            <div v-for="entry in backpackItems" :key="entry.id" class="item-row">
              <div class="item-main">
                <span class="item-icon">{{ entry.item?.icon }}</span>
                <div class="item-copy">
                  <div class="item-name">{{ entry.item?.name }}</div>
                  <div class="item-desc">{{ entry.item?.description }}</div>
                </div>
              </div>
              <div class="item-side">
                <span class="item-qty">x{{ entry.quantity }}</span>
                <button class="transfer-btn" @click="moveToStorage(entry.id)">入库</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-terminal">背包为空</div>
        </div>
      </section>

      <section class="card-panel">
        <div class="card-header">
          <span class="card-title">个人仓库</span>
          <span class="card-badge">{{ store.getStorageItemCount() }}</span>
        </div>
        <div class="card-body">
          <div v-if="storageItems.length > 0" class="item-list">
            <div v-for="entry in storageItems" :key="entry.id" class="item-row">
              <div class="item-main">
                <span class="item-icon">{{ entry.item?.icon }}</span>
                <div class="item-copy">
                  <div class="item-name">{{ entry.item?.name }}</div>
                  <div class="item-desc">{{ entry.item?.description }}</div>
                </div>
              </div>
              <div class="item-side">
                <span class="item-qty">x{{ entry.quantity }}</span>
                <button class="transfer-btn transfer-btn--return" @click="moveToBackpack(entry.id)">取出</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-terminal">仓库为空</div>
        </div>
      </section>

      <section class="card-panel squad-board">
        <div class="card-header">
          <span class="card-title">驻留人员</span>
          <span class="card-badge">{{ store.getCharacterCount() }}</span>
        </div>
        <div class="card-body">
          <div class="crew-list">
            <div v-for="char in squadTraining" :key="char.id" class="crew-row">
              <div class="crew-main">
                <div class="crew-name">{{ char.name }}</div>
                <div class="crew-prof">{{ char.profession }}</div>
              </div>
              <div class="crew-training">
                <span v-if="char.facility">{{ char.facility.icon }} {{ char.facility.name }}</span>
                <span v-else class="crew-rest">待命中</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card-panel rules-board">
        <div class="card-header">
          <span class="card-title">空间规则</span>
        </div>
        <div class="card-body">
          <div class="rule-list">
            <div class="rule-row">
              <span class="rule-mark">01</span>
              <span>未兑换的高价值物品无法带出个人空间，背包与仓库仅管理已持有战利品。</span>
            </div>
            <div class="rule-row">
              <span class="rule-mark">02</span>
              <span>六维训练与自动挂机联动，具体训练分配在“再入轮回”界面中调度。</span>
            </div>
            <div class="rule-row">
              <span class="rule-mark">03</span>
              <span>训练设施可同时容纳多人，但每名角色同一时刻只能专注一种属性训练。</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.personal-space-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.space-overview .card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.overview-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.muted-line {
  color: var(--text-muted);
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.overview-stat,
.preview-box,
.facility-card,
.item-row,
.crew-row,
.rule-row {
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid var(--void-border);
  clip-path: var(--clip-corner-sm);
}

.overview-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}

.stat-k {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.stat-v {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--neon-cyan);
}

.command-row {
  display: flex;
  gap: 8px;
}

.command-btn,
.mode-btn,
.apply-btn,
.transfer-btn {
  border: 1px solid var(--void-border);
  background: rgba(0, 240, 255, 0.04);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.2s var(--ease-fast);
  clip-path: var(--clip-corner-sm);
}

.command-btn {
  padding: 8px 14px;
  font-size: 12px;
}

.command-btn:hover,
.mode-btn:hover,
.apply-btn:hover,
.transfer-btn:hover {
  border-color: var(--void-border-strong);
  color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
}

.room-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 12px;
  min-height: 420px;
}

.room-viewport {
  /* Replace with url('/images/personal-space/room-military.jpg') when a real room image is added. */
  --room-image: linear-gradient(135deg, rgba(17, 24, 32, 0.96), rgba(9, 10, 13, 0.96) 46%, rgba(24, 17, 13, 0.96));
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid var(--void-border);
  background:
    linear-gradient(180deg, rgba(5, 8, 12, 0.18), rgba(5, 5, 5, 0.82)),
    var(--room-image),
    radial-gradient(ellipse at 50% 22%, rgba(0, 240, 255, 0.22), transparent 34%),
    linear-gradient(135deg, #111820 0%, #090a0d 46%, #18110d 100%);
  background-size: cover;
  background-position: center;
  clip-path: var(--clip-corner);
}

.room-type-outdoor {
  --room-image: linear-gradient(135deg, rgba(15, 31, 24, 0.96), rgba(9, 18, 19, 0.96) 48%, rgba(21, 24, 17, 0.96));
}

.room-style-tech {
  --room-image: linear-gradient(135deg, rgba(9, 24, 32, 0.96), rgba(8, 9, 13, 0.96) 48%, rgba(11, 18, 24, 0.96));
}

.room-style-modern {
  --room-image: linear-gradient(135deg, rgba(20, 25, 29, 0.96), rgba(10, 12, 15, 0.96) 50%, rgba(20, 20, 18, 0.96));
}

.room-style-traditional {
  --room-image: linear-gradient(135deg, rgba(27, 18, 16, 0.96), rgba(10, 10, 13, 0.96) 50%, rgba(18, 24, 20, 0.96));
}

.room-style-grassland,
.room-style-forest,
.room-style-beach,
.room-style-mountain {
  --room-image: linear-gradient(135deg, rgba(12, 28, 20, 0.96), rgba(8, 15, 18, 0.96) 48%, rgba(22, 23, 14, 0.96));
}

.room-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 240, 255, 0.08), transparent 18%, transparent 82%, rgba(255, 176, 0, 0.08)),
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.12), transparent 10%),
    linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.34) 64%, rgba(0, 0, 0, 0.82) 100%);
}

.room-depth {
  position: absolute;
  left: 8%;
  right: 8%;
  border: 1px solid rgba(0, 240, 255, 0.12);
  pointer-events: none;
}

.room-depth--ceiling {
  top: 8%;
  height: 26%;
  transform: perspective(480px) rotateX(62deg);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.04), rgba(255, 176, 0, 0.03));
}

.room-depth--floor {
  bottom: -4%;
  height: 42%;
  transform: perspective(520px) rotateX(64deg);
  background:
    linear-gradient(rgba(0, 240, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
  background-size: 42px 28px;
  opacity: 0.55;
}

.room-core-light {
  position: absolute;
  left: 50%;
  top: 20%;
  width: 110px;
  height: 110px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(0, 240, 255, 0.36) 28%, transparent 68%);
  filter: blur(2px);
  opacity: 0.8;
  animation: heartbeat 3s ease-in-out infinite;
}

.room-grid-lines {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(0, 240, 255, 0.035) 32px),
    repeating-linear-gradient(90deg, transparent 0 47px, rgba(255, 176, 0, 0.028) 48px);
  mask-image: linear-gradient(180deg, transparent, black 28%, black 92%, transparent);
  opacity: 0.5;
}

.room-hotspot {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 116px;
  min-height: 34px;
  padding: 6px 9px;
  border: 1px solid rgba(0, 240, 255, 0.28);
  background: rgba(3, 7, 10, 0.78);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: all 0.2s var(--ease-fast);
  clip-path: var(--clip-corner-sm);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.42);
}

.room-hotspot:hover,
.room-hotspot.active {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
  background: rgba(0, 20, 24, 0.88);
  box-shadow: 0 0 14px rgba(0, 240, 255, 0.18);
}

.room-hotspot--facility {
  border-color: rgba(57, 255, 20, 0.24);
}

.room-hotspot--storage {
  border-color: rgba(255, 176, 0, 0.28);
}

.hotspot-pulse {
  width: 6px;
  height: 6px;
  background: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
  flex-shrink: 0;
  animation: heartbeat 1.8s ease-in-out infinite;
}

.hotspot-icon {
  font-size: 15px;
  line-height: 1;
}

.hotspot-label {
  white-space: nowrap;
}

.room-panel {
  display: flex;
  flex-direction: column;
  min-height: 420px;
  border: 1px solid var(--void-border);
  background: rgba(8, 10, 14, 0.94);
  clip-path: var(--clip-corner);
  overflow: hidden;
}

.room-panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid var(--void-border);
  background: rgba(0, 240, 255, 0.035);
}

.room-panel-kicker {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.12em;
}

.room-panel-title {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--neon-cyan);
}

.room-panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  min-height: 0;
  overflow-y: auto;
}

.room-panel-desc {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.room-facility-status {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.facility-signal {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px;
  border: 1px solid var(--void-border);
  background: rgba(0, 0, 0, 0.24);
  clip-path: var(--clip-corner-sm);
}

.signal-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.signal-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--neon-green);
}

.panel-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.panel-chip {
  padding: 3px 7px;
  border: 1px solid rgba(0, 240, 255, 0.16);
  background: rgba(0, 240, 255, 0.05);
  color: var(--neon-cyan);
  font-family: var(--font-mono);
  font-size: 11px;
  clip-path: var(--clip-corner-sm);
}

.panel-action,
.mini-transfer {
  border: 1px solid var(--void-border);
  background: rgba(0, 240, 255, 0.05);
  color: var(--neon-cyan);
  font-family: var(--font-mono);
  cursor: pointer;
  clip-path: var(--clip-corner-sm);
}

.panel-action {
  padding: 9px 12px;
  align-self: flex-start;
  font-size: 12px;
}

.panel-item-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.panel-item-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border: 1px solid var(--void-border);
  background: rgba(0, 0, 0, 0.24);
  clip-path: var(--clip-corner-sm);
}

.panel-item-icon {
  text-align: center;
}

.panel-item-name,
.panel-item-qty {
  font-family: var(--font-mono);
  font-size: 11px;
}

.panel-item-name {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-item-qty {
  color: var(--neon-amber);
}

.mini-transfer {
  padding: 4px 7px;
  font-size: 10px;
}

.compact {
  padding: 12px 10px;
}

.space-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.3fr);
  gap: 12px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toggle-row {
  display: flex;
  gap: 8px;
}

.mode-btn {
  flex: 1;
  padding: 8px 0;
  font-size: 12px;
}

.mode-btn.active,
.style-card.active {
  border-color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
  color: var(--neon-cyan);
}

.style-list,
.item-list,
.crew-list,
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--void-border);
  background: rgba(0, 0, 0, 0.18);
  color: inherit;
  text-align: left;
  cursor: pointer;
  clip-path: var(--clip-corner-sm);
  transition: all 0.2s var(--ease-fast);
}

.style-card:hover {
  border-color: var(--void-border-strong);
}

.style-icon,
.facility-icon,
.item-icon {
  width: 34px;
  text-align: center;
  flex-shrink: 0;
  font-size: 20px;
}

.style-copy,
.item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.style-name,
.facility-name,
.item-name,
.crew-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.style-desc,
.facility-desc,
.item-desc,
.crew-prof,
.occupant-empty {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.preview-box {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--neon-green);
  letter-spacing: 0.06em;
}

.preview-label--ghost {
  color: var(--text-muted);
  margin-top: 4px;
}

.preview-text {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.preview-text--ghost {
  color: var(--text-primary);
}

.apply-btn {
  padding: 10px 14px;
  align-self: flex-start;
  font-size: 12px;
  color: var(--neon-green);
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.facility-card {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.facility-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.facility-attr {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--neon-cyan);
}

.facility-occupants {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.occupant-label,
.item-qty,
.crew-training,
.rule-mark {
  font-family: var(--font-mono);
  font-size: 11px;
}

.occupant-label {
  color: var(--text-muted);
}

.occupant-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.occupant-tag {
  padding: 2px 6px;
  border: 1px solid rgba(0, 240, 255, 0.16);
  background: rgba(0, 240, 255, 0.05);
  color: var(--neon-cyan);
  font-family: var(--font-mono);
  font-size: 11px;
  clip-path: var(--clip-corner-sm);
}

.item-row,
.crew-row,
.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.item-main,
.crew-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.item-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-qty {
  color: var(--neon-amber);
}

.transfer-btn {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--neon-green);
}

.transfer-btn--return {
  color: var(--neon-cyan);
}

.crew-prof {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crew-training {
  color: var(--neon-amber);
  flex-shrink: 0;
}

.crew-rest {
  color: var(--text-muted);
}

.rule-row {
  align-items: flex-start;
}

.rule-mark {
  color: var(--neon-green);
  flex-shrink: 0;
  padding-top: 1px;
}

.empty-terminal {
  padding: 18px 12px;
  border: 1px dashed var(--void-border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
  clip-path: var(--clip-corner-sm);
}

.squad-board,
.rules-board {
  grid-column: span 1;
}

@media (max-width: 1200px) {
  .room-stage {
    grid-template-columns: 1fr;
  }

  .room-panel {
    min-height: 0;
  }

  .space-grid {
    grid-template-columns: 1fr;
  }

  .overview-stats,
  .facility-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .room-hotspot {
    min-width: 42px;
    padding: 7px;
  }

  .hotspot-label {
    display: none;
  }

  .overview-stats,
  .facility-grid,
  .room-facility-status {
    grid-template-columns: 1fr;
  }
}
</style>
