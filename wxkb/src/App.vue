<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import AccountSystem from './components/AccountSystem.vue'
import CharacterCreate from './components/CharacterCreate.vue'
import NavBar from './components/NavBar.vue'
import SidebarLeft from './components/SidebarLeft.vue'
import SquadStatus from './components/SquadStatus.vue'
import GeneLockStatus from './components/GeneLockStatus.vue'
import { useGameStore } from './stores/game'

import HomePage from './components/pages/HomePage.vue'
import CyclePage from './components/pages/CyclePage.vue'
import PersonalPage from './components/pages/PersonalPage.vue'
import ShopPage from './components/pages/ShopPage.vue'
import ExchangePage from './components/pages/ExchangePage.vue'
import EquipmentPage from './components/pages/EquipmentPage.vue'
import GeneLockPage from './components/pages/GeneLockPage.vue'
import GuidePage from './components/pages/GuidePage.vue'
import SettingsPage from './components/pages/SettingsPage.vue'
import SquadPage from './components/pages/SquadPage.vue'
import BloodlinePage from './components/pages/BloodlinePage.vue'
import CyberneticPage from './components/pages/CyberneticPage.vue'
import CultivationPage from './components/pages/CultivationPage.vue'
import EyeTechPage from './components/pages/EyeTechPage.vue'
import EnergyPage from './components/pages/EnergyPage.vue'
import TitlePage from './components/pages/TitlePage.vue'
import MultiversePage from './components/pages/MultiversePage.vue'
import SkillsPage from './components/pages/SkillsPage.vue'
import DungeonGridPage from './components/pages/DungeonGridPage.vue'

const store = useGameStore()

type Screen = 'login' | 'account' | 'characterCreate' | 'game'

const SKIP_AUTH = true
const currentScreen = ref<Screen>(SKIP_AUTH ? 'characterCreate' : 'login')

onMounted(() => {
  if (store.isCharacterCreated()) {
    currentScreen.value = 'game'
  }
})

const pageComponents: Record<string, any> = {
  home: HomePage,
  cycle: CyclePage,
  personal: PersonalPage,
  shop: ShopPage,
  exchange: ExchangePage,
  equipment: EquipmentPage,
  geneLock: GeneLockPage,
  guide: GuidePage,
  settings: SettingsPage,
  squad: SquadPage,
  bloodline: BloodlinePage,
  cybernetic: CyberneticPage,
  cultivation: CultivationPage,
  eyeTech: EyeTechPage,
  energy: EnergyPage,
  title: TitlePage,
  multiverse: MultiversePage,
  skills: SkillsPage,
  dungeonGrid: DungeonGridPage,
}

const currentComponent = computed(() => pageComponents[store.currentPage] || HomePage)

const pageNames: Record<string, string> = {
  home: '主神空间',
  cycle: '挂机训练',
  personal: '个人空间',
  dungeonGrid: '网格副本',
  shop: '购买空间',
  exchange: '支线兑换',
  equipment: '装备管理',
  geneLock: '基因锁',
  guide: '新手攻略',
  settings: '系统设置',
  squad: '轮回小队',
  bloodline: '血统重塑',
  cybernetic: '义体植入',
  cultivation: '修真总纲',
  eyeTech: '瞳术修炼',
  energy: '能量拓展',
  title: '称号技艺',
  multiverse: '诸天大观',
  skills: '技能修炼',
}

const currentPageName = computed(() => pageNames[store.currentPage] || '主神空间')
const showBackButton = computed(() => store.currentPage !== 'home' && store.currentPage !== 'dungeonGrid')
const currentDungeonNav = computed(() => store.dungeonNav)

function handleEnter() {
  currentScreen.value = 'account'
}

function handleLogin(name: string, squadName: string) {
  store.setSquadName(squadName || name)
  currentScreen.value = 'characterCreate'
}

function handleCharacterComplete(data: {
  name: string
  gender: string
  professionId: string
  selectedFlaws: string[]
  selectedTalents: string[]
}) {
  store.applyCharacterCreation(data)
  currentScreen.value = 'game'
}
</script>

<template>
  <LoginScreen v-if="!SKIP_AUTH && currentScreen === 'login'" @enter="handleEnter" />
  <AccountSystem v-if="!SKIP_AUTH && currentScreen === 'account'" @login="handleLogin" />
  <CharacterCreate v-if="currentScreen === 'characterCreate'" @complete="handleCharacterComplete" />

  <Transition name="fade-in">
    <div v-if="currentScreen === 'game'" class="game-layout">
      <div class="starfield"></div>
      <div class="dark-matter"></div>
      <div class="text-noise-overlay"></div>
      <NavBar />
      <div class="game-main">
        <SidebarLeft />
        <main class="main-content">
          <div v-if="showBackButton" class="content-nav-bar" :class="{ 'content-nav-bar--dungeon': currentDungeonNav }">
            <button class="back-btn" @click="store.setPage('home')">
              <span class="back-icon">◀</span>
              <span>返回</span>
            </button>
            <div class="content-nav-title">
              <template v-if="currentDungeonNav">
                <span class="dungeon-nav-tier" :class="currentDungeonNav.tier">{{ currentDungeonNav.tier }}级</span>
                <span class="current-page-name dungeon-nav-name">{{ currentDungeonNav.name }}</span>
                <span class="dungeon-nav-description">{{ currentDungeonNav.description }}</span>
              </template>
              <span v-else class="current-page-name">{{ currentPageName }}</span>
            </div>
            <button
              v-if="currentDungeonNav && store.currentPage !== 'dungeonGrid'"
              class="dungeon-nav-leave"
              @click="store.requestDungeonExit"
            >
              离开副本
            </button>
          </div>
          <component :is="currentComponent" />
        </main>
        <aside class="sidebar-right">
          <GeneLockStatus />
          <SquadStatus :show-vitals="false" :show-broadcast="true" />
        </aside>
      </div>
    </div>
  </Transition>
</template>

<style>
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
  background: #050505;
}

.fade-in-enter-active {
  transition: opacity 0.8s ease;
}

.fade-in-enter-from {
  opacity: 0;
}
</style>
