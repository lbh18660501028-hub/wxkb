---
ruleType: Auto Attached
name: Store开发规范
description: wxkb/src/stores/ 目录下的Pinia Store开发规范，包括状态管理、存档、战斗逻辑等
globs: wxkb/src/stores/**/*.ts
---

# Store 开发规范

本规则适用于 `wxkb/src/stores/game.ts` —— 游戏唯一的中央Store。

## 核心原则
1. **单Store架构**：所有游戏状态都在 `useGameStore` 中，不创建新的Store
2. **Composition API风格**：`defineStore('game', () => { ... })`
3. **State用ref，Getters用computed**

## 状态管理
- 基础状态：`name`、`squadName`、`level`、`xp`、`rewardPoints`、`attributes`、`sidePlots`
- 装备状态：`inventory`（背包）、`equippedItems`（已装备）
- 成长系统：`geneLock`、`equippedBloodline`、`playerSkills`、`playerSpells`
- 副本状态：`dungeonNav`、`currentDungeonRoom`、`dungeonInfection`、`dungeonNoise`、`dungeonTimer`
- 战斗状态：`playerStatusEffects`、`currentMp`
- 挂机状态：`idle`（含 `isRunning`、`startTime`、`offline`）

## 存档系统
- 存档Key: `wxkb_save`
- 存档时只序列化可持久化字段，`logs` 只保留最近50条
- 读档时所有字段使用 `saved?.xxx ?? defaultValue` 提供默认值
- 新增字段必须在 `loadSave()` 和 `saveToDisk()` 中同步添加
- `watch` 自动触发存档

## 战斗逻辑
- 战斗结算调用 `systems/dice.ts` 中的函数
- 伤害计算使用 `config/combat.ts` 中的常量，不硬编码数值
- 伤害类型三本质：technology(科技)、fantasy(魔幻)、abnormal(特异)
- 旧字段 physical/magical 自动映射为 technology/fantasy
- 状态效果通过 `data/statusEffects.ts` 的函数管理

## 页面导航
- `currentPage` 控制，通过 `setPage(pageId)` 切换
- `PageId` 类型在 `types/game.ts` 中定义
- 进入副本时设置 `dungeonNav` 状态

## 数值公式来源
- HP = BASE_HP(100) + vitality × HP_MULTIPLIER(10) + geneLockBonus + volumeBonus
- MP = intelligence × MP_MULTIPLIER(10)
- XP需求 = 100 × 1.15^(level-1)
- 属性附加成功：6→1, 11→2, 16→3, 21→4
- 所有公式常量在 `config/combat.ts` 中定义
