---
ruleType: Model Request
name: 副本设计规则
description: 当涉及MUD副本、地图设计、房间连线、NPC、Boss、任务、事件等副本内容开发时使用此规则
---

# 副本设计规则

本规则在讨论副本设计、地图编辑、房间/NPC/Boss创建等内容时生效。

## 副本系统概述

项目存在两套副本系统：
1. **MUD式副本** (`DungeonMapPage.vue`) — 房间连线图探索，当前主力系统
2. **节点式副本** (`ScenarioPage.vue`) — 旧系统，已废弃合并到MUD式

`App.vue` 中 `scenario` 和 `dungeon` 都路由到 `DungeonMapPage`。

## MUD副本架构 (data/dungeonMap.ts)

### 房间类型 (RoomType)
- `start` — 起点
- `empty` — 空房间
- `combat` — 普通战斗
- `elite` — 精英战斗
- `boss` — Boss战
- `chest` — 宝箱
- `trap` — 陷阱
- `story` — 剧情
- `shop` — 副本内商店
- `rest` — 休息点
- `exit` — 出口

### 房间结构
```typescript
interface Room {
  id: string
  name: string
  description: string
  type: RoomType
  exits: RoomExit[]        // 出口（方向+目标房间ID）
  interactables?: ...      // 可交互物件
  enemies?: Enemy[]        // 敌人
  npc?: NPC                // NPC
  visited: boolean
  cleared: boolean
}
```

### 出口方向
`north` | `south` | `east` | `west` | `up` | `down`

### 副本特殊系统（生化危机副本已实现）
- **感染值**：被抓伤/咬伤/毒雾增加，阈值影响行动
- **噪音值**：开枪/爆炸增加，吸引怪物
- **90分钟倒计时**：副本限时，超时失败
- **NPC好感度**：影响结局分支
- **5种结局**：根据选择和数据决定
- **Boss三阶段**：追击 → 适应 → 最终
- **恐惧检定**：首次遭遇高级怪物时触发

## 挂机地图 (data/maps.ts)

### 地图结构
```typescript
interface GameMap {
  id: number
  name: string
  icon: string           // emoji图标
  description: string
  difficulty: string     // 难度描述
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  rewardPerHour: { rewardPoints: number; xp: number }
  unlockCondition: string
  unlocked: boolean
}
```

### 已有地图（6张）
1. 生化危机（D级，教学，初始解锁）
2. 异形巢穴（D级，11-25级）
3. 猛鬼街（C级，26-40级）
4. 寂静岭（C级，41-60级）
5. 异形2（B级，61-80级）
6. 星河战队（A级，81-100级）

## 设计新副本的步骤
1. 在 `设定集/` 中编写副本设计文档（参考 `生化危机副本设计.md`）
2. 在 `data/scenarios.ts` 中定义敌人和场景
3. 在 `data/dungeonMap.ts` 中设计房间连线图
4. 在 `data/maps.ts` 中添加挂机地图入口
5. 在 `stores/game.ts` 中实现副本进入/退出逻辑
6. 测试副本流程（移动、战斗、事件、结局）

## 副本设计原则
1. **非线性探索**：房间有多条路径，不是纯线性
2. **资源管理**：HP/MP/感染值/噪音值需要玩家权衡
3. **选择有意义**：不同选择导致不同结局
4. **难度递进**：从入口到Boss难度逐渐增加
5. **参考原著**：副本应基于电影/小说的世界观
6. **奖励匹配**：副本难度和奖励等级对应（D/C/B/A/S）
