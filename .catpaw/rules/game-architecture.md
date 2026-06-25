---
ruleType: Always
name: 游戏架构
description: wxkb游戏核心架构、系统分层、状态管理结构及开发约定
---

# 游戏架构

## 目录结构

```
wxkb/src/
├── stores/game.ts        # 核心Store（~1370行），集中管理所有游戏状态
├── types/                # 类型定义
│   ├── game.ts           # 游戏核心类型（属性、状态、日志等）
│   └── equipment.ts      # 装备类型（ShopItemDef、EquipmentStats等）
├── config/combat.ts      # 战斗系统配置（所有数值常量集中管理）
├── data/                 # 游戏数据（静态配置，不包含运行时状态）
│   ├── maps.ts           # 挂机地图（6张）
│   ├── dungeonMap.ts     # MUD副本地图（房间连线图、NPC、Boss等）
│   ├── scenarios.ts      # 副本场景和敌人定义
│   ├── characterCreate.ts# 职业/缺陷/天赋创建数据
│   ├── bloodline.ts      # 血统数据
│   ├── geneLock.ts       # 基因锁数据
│   ├── skills.ts         # 技能数据（15个技能）
│   ├── spells.ts         # 法术数据（9个法术3系）
│   ├── shop.ts           # 商店物品数据
│   ├── companion.ts      # 队友配置
│   └── statusEffects.ts  # 状态效果系统
├── systems/              # 游戏引擎系统
│   ├── dice.ts           # D10骰子检定系统
│   └── bloodlineTriggers.ts # 血统触发器
├── utils/diceProbability.ts # 骰子概率计算工具
├── components/pages/     # 20个页面组件
└── App.vue               # 根组件（路由控制）
```

## 核心架构原则

### 1. 单Store架构
- **所有游戏状态集中在 `stores/game.ts`**，不拆分多Store
- Store内部用 `ref()` 管理 state，`computed()` 管理 getters
- 存档/读档逻辑也在 Store 内部实现

### 2. 数据与逻辑分离
- `data/` 目录只放静态配置数据（纯数据，无业务逻辑）
- `config/` 目录放可调参数常量（修改数值只改这里）
- `systems/` 目录放游戏引擎算法（骰子、战斗结算等）
- `stores/game.ts` 调用 systems 和 data，不反向依赖

### 3. 页面路由
- `App.vue` 通过 `pageComponents` 映射表实现简单路由
- 页面切换通过 `store.setPage('pageId')` 触发
- `scenario` 和 `dungeon` 都路由到 `DungeonMapPage`
- 占位符页面（待开发）：CyberneticPage、CultivationPage、EyeTechPage、EnergyPage、TitlePage、MultiversePage

### 4. 已实现系统清单
- 角色创建（13职业/6缺陷/8天赋）
- 6属性系统（智力/精神/活力/反应/肌肉/免疫）
- D10骰子战斗系统（科技/魔幻/特异三本质）
- 挂机离线奖励（最大5小时）
- 装备系统（6槽位5等级）
- 商店与支线互换（3:1经典比例）
- 血统系统（4类多等级）
- 基因锁（5阶）
- 技能（15个12级）+ 法术（9个3系）
- 队友系统
- 状态效果系统
- 体积系统
- MUD式副本探索（SVG地图+任务+NPC，目前1个完整副本：生化危机）

### 5. 待开发系统
- 义体植入 (CyberneticPage)
- 修真总纲 (CultivationPage)
- 瞳术修炼 (EyeTechPage)
- 能量拓展 (EnergyPage)
- 称号技艺 (TitlePage)
- 诸天大观 (MultiversePage)

## 开发注意
- 新增系统时，先在 `types/` 定义类型，再在 `data/` 添加数据，然后在 `config/` 添加配置，最后在 `stores/game.ts` 实现逻辑
- `config/combat.ts` 是所有数值的唯一来源，禁止在业务代码中硬编码数字
- 存档兼容性：新增字段时要在 `loadSave()` 中提供默认值
