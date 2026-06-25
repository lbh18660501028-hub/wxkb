---
ruleType: Auto Attached
name: 类型定义规范
description: wxkb/src/types/ 目录下的TypeScript类型定义文件开发规范
globs: wxkb/src/types/**/*.ts
---

# 类型定义规范

本规则适用于 `wxkb/src/types/` 目录下的类型定义文件。

## 文件清单
- `game.ts` — 游戏核心类型（属性、状态、日志、页面等）
- `equipment.ts` — 装备系统类型（ShopItemDef、EquipmentStats等）

## game.ts 核心类型
- `Attributes` — 6属性（intelligence/spirit/vitality/reaction/strength/immunity）
- `DerivedAttributes` — 派生属性（hpMax/speed/defense/willpower/volume）
- `SidePlots` — 支线线索（D/C/B/A/S 五级）
- `IdleState` / `OfflineIdle` — 挂机/离线状态
- `MapProgress` — 地图进度（解锁/通关）
- `GameState` — 完整游戏状态接口
- `LogEntry` — 游戏日志条目
- `PageId` — 页面ID联合类型
- `Scenario` — 副本场景
- `Companion` — 队友
- `GeneLockTier` — 基因锁阶层

## equipment.ts 核心类型
- `EquipmentSlot` — 6个装备槽位（weapon/armor/helmet/gloves/boots/accessory）
- `ItemTier` — 物品等级（D/C/B/A/S）
- `ItemCategory` — 物品分类（9类）
- `WeaponEssence` — 武器本质（technology/fantasy/abnormal）
- `EquipmentStats` — 装备属性加成（30+可选字段）
- `ShopItemDef` — 商店物品完整定义
- `OwnedEquipment` — 已拥有装备实例

## 编写原则
1. 优先使用 `interface` 定义对象结构，`type` 定义联合类型
2. 字符串枚举用联合类型而非 enum：`type Tier = 'D' | 'C' | 'B' | 'A' | 'S'`
3. 可选字段用 `?:`，如 `EquipmentStats` 中的属性加成
4. 导出常量映射（如 `SLOT_NAMES`、`TIER_COLORS`）供UI使用
5. 废弃接口保留注释说明替代方案
6. 新增类型时同步更新 `GameState` 接口（如需要持久化）
