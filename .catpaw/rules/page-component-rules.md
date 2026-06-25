---
ruleType: Auto Attached
name: Vue页面组件规范
description: wxkb/src/components/ 目录下的Vue3组件开发规范，包括页面结构、样式、Store交互等
globs: wxkb/src/components/**/*.vue
---

# Vue 页面组件规范

本规则适用于 `wxkb/src/components/` 目录下的所有 Vue 组件。

## 组件分类
- **页面组件** (`pages/XxxPage.vue`): 20个，对应游戏中各个功能页面
- **布局组件**: `NavBar.vue`、`SidebarLeft.vue`、`SidebarRight.vue`、`SquadStatus.vue`、`StatusBar.vue`
- **流程组件**: `LoginScreen.vue`、`AccountSystem.vue`、`CharacterCreate.vue`

## 页面组件规范
1. 使用 `<script setup lang="ts">` 语法
2. 通过 `const store = useGameStore()` 获取全局状态
3. 页面不维护本地状态（除UI状态如tab切换），游戏数据一律从Store读取
4. 使用 `computed()` 包装Store数据，避免解构丢失响应性
5. 修改游戏状态一律调用Store的action方法

## 样式规范
1. 使用 `<style scoped>` 隔离样式
2. 赛博朋克主题色：
   - 背景 `#0a0a12`，面板 `#12121f`，边框 `rgba(0, 200, 255, 0.15)`
   - 主色 `#00c8ff`，危险 `#ff3366`，成功 `#00ff88`，金色 `#ffd700`
3. 物品等级颜色：D灰 `#8b8b8b` / C蓝 `#4a9eff` / B紫 `#a855f7` / A金 `#f59e0b` / S红 `#ef4444`
4. 使用CSS Grid和Flexbox布局，避免float
5. 动画用 `transition`，避免影响性能的复杂动画

## 占位符页面
以下页面当前为占位符，开发时应：
- `CyberneticPage.vue` — 义体植入系统
- `CultivationPage.vue` — 修真总纲
- `EyeTechPage.vue` — 瞳术修炼
- `EnergyPage.vue` — 能量拓展
- `TitlePage.vue` — 称号技艺
- `MultiversePage.vue` — 诸天大观

开发占位符页面时：
1. 先在 `types/game.ts` 添加新状态的类型定义
2. 在 `data/` 添加静态数据
3. 在 `config/combat.ts` 添加配置常量
4. 在 `stores/game.ts` 添加状态和action
5. 最后实现页面UI

## App.vue 路由
- `pageComponents` 映射表控制页面路由
- `scenario` 和 `dungeon` 都映射到 `DungeonMapPage`
- 新增页面需要在 `pageComponents` 和 `pageNames` 中注册
