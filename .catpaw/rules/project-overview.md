---
ruleType: Always
name: 项目总览
description: 工作区整体结构、各子项目用途及技术栈概览，帮助AI理解项目全貌
---

# 工作区总览

本工作区 `f:/1/fangzhi` 包含多个子项目，以 wxkb（无限恐怖挂机放置游戏）为核心。

## 子项目说明

### wxkb/ — 核心游戏项目（主力开发）
- **技术栈**: Vue 3 + TypeScript + Vite + Pinia + 原生CSS（赛博朋克主题）
- **世界观**: 基于《无限恐怖》(zhttty) 小说的挂机放置游戏
- **开发服务器端口**: 3001，API代理到 localhost:3000
- **路径别名**: `@/*` → `src/*`
- **构建命令**: `npm run dev` (开发) / `npm run build` (vue-tsc + vite build)

### 设定集/ — TRPG游戏规则设计文档（只读参考）
- 包含20+个Markdown文件，记录无限恐怖TRPG核心规则
- **重要**: 这些是设计参考文档，不要修改其中的内容
- 包含: 核心规则TRPG版、战斗规则、属性系统、技能、血统、基因锁、副本设计等
- 代码实现时应参考这些文档中的规则设定

### character/ — 角色立绘图片资源（26张PNG，13角色×2表情）
### monster/ — 怪物Sprite图片资源（4张僵尸PNG）
### wxkb/public/character/ — 同步的角色立绘（游戏实际使用）
### DESIGN.md — wxkb项目设计文档（含UI设计、色彩方案、系统规划）
### 战斗规则.md — 简化战斗规则文档

### infinite-horror/ — 另一个后端项目（有game.db，前端为空，非当前重点）
### xiugexian.pages.dev/ — 另一款修仙游戏的前端截图（参考UI/UX用，不要修改）

## 核心注意事项
1. **主要开发目标是 wxkb/**，其他目录为资源或参考
2. **设定集/ 是权威设计文档**，代码实现必须遵循其中的规则
3. **xiugexian.pages.dev/ 是参考站点**，仅用于UI/UX灵感，不要修改其中文件
4. 图片资源在 `character/` 和 `wxkb/public/character/` 两处存放，游戏实际引用的是 `public/character/`
