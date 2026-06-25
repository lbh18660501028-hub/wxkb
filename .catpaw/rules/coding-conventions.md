---
ruleType: Always
name: 编码规范
description: Vue3+TypeScript+Pinia项目的编码规范和代码风格约定
---

# 编码规范

## TypeScript
- 严格模式 (`strict: true`)，所有变量必须有明确类型
- 优先使用 `interface` 定义对象类型，`type` 定义联合类型和工具类型
- 避免使用 `any`，必须使用时添加注释说明原因
- 枚举值使用字符串字面量联合类型而非 enum（如 `type Tier = 'D' | 'C' | 'B' | 'A' | 'S'`）
- 导出常量使用 `UPPER_SNAKE_CASE`，如 `COMBAT_CONFIG`、`GAME_MAPS`

## Vue 3 组件
- 使用 `<script setup lang="ts">` 语法
- 组件文件名使用 `PascalCase.vue`，如 `DungeonMapPage.vue`
- Props 使用 `defineProps<T>()` 泛型语法
- Emits 使用 `defineEmits<T>()` 泛型语法
- 模板中不写复杂逻辑，抽取为 computed
- CSS 使用 `<style scoped>`，全局样式写在 `style.css`

## Pinia Store
- 使用 Composition API 风格 (`defineStore('name', () => { ... })`)
- State 用 `ref()`，Getters 用 `computed()`
- 存档使用 `localStorage`，key 为 `wxkb_save`
- 存档时要序列化所有可持久化状态，注意去掉函数和不可序列化内容
- 加载存档时要做容错处理 (`try/catch` + 空值合并 `??`)

## 命名约定
- 游戏术语统一中文：奖励点(rewardPoints)、支线(sidePlots)、副本(dungeon)、基因锁(geneLock)
- 数据文件以内容命名：`bloodline.ts`、`skills.ts`、`spells.ts`
- 页面组件以 `XxxPage.vue` 命名，对应 `pageComponents` 映射
- 配置常量以 `_CONFIG` 后缀：`COMBAT_CONFIG`、`HP_CONFIG`

## 注释规范
- 文件头部使用 `/** */` 块注释说明文件用途
- 复杂算法和游戏公式必须注释来源（如"基于TRPG核心规则"）
- 配置文件使用分隔线注释分区（`// ==================== 分区名 ====================`）
- 数据扩展说明：在数据文件中注明如何添加新条目

## CSS 风格
- 赛博朋克主题色：
  - 背景 `#0a0a12`，面板 `#12121f`，主色 `#00c8ff`
  - 强调 `#ff3366`，成功 `#00ff88`，金色 `#ffd700`
- 使用 CSS 变量管理主题色
- 动画使用 `transition` 和 `@keyframes`，避免重动画影响性能
