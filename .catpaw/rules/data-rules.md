---
ruleType: Auto Attached
name: 数据文件规范
description: wxkb/src/data/ 目录下的游戏数据文件开发规范，包括数据结构、导出方式、扩展方法等
globs: wxkb/src/data/**/*.ts
---

# 数据文件规范

本规则适用于 `wxkb/src/data/` 目录下的所有数据文件。这些文件只包含静态配置数据，不包含运行时状态。

## 文件清单
| 文件 | 内容 | 导出 |
|------|------|------|
| `maps.ts` | 挂机地图（6张） | `GAME_MAPS`、`GameMap`接口 |
| `dungeonMap.ts` | MUD副本房间/出口/NPC/Boss | `DungeonMap`、`Room`等接口和数据 |
| `scenarios.ts` | 副本场景和敌人定义 | `Enemy`接口、场景数据 |
| `characterCreate.ts` | 13职业/6缺陷/8天赋 | `getProfessionById`等查询函数 |
| `bloodline.ts` | 血统数据 | `getBloodlineById`等查询函数 |
| `geneLock.ts` | 基因锁5阶数据 | `calculateUnlockChance`等 |
| `skills.ts` | 15个技能（12级） | `getSkillById`、`getSkillLevelBonus`等 |
| `spells.ts` | 9个法术（3系） | 法术数据 |
| `shop.ts` | 商店物品 | `shopItems`数组、`getItemById` |
| `companion.ts` | 队友配置 | `COMPANION_CONFIG`、`getRecruitCost` |
| `statusEffects.ts` | 状态效果系统 | `applyStatusEffect`等函数 |

## 编写原则
1. **纯数据导出**：数据文件导出常量数组和接口，不包含业务逻辑
2. **提供查询函数**：如 `getXxxById(id)`，避免组件直接遍历数组
3. **ID唯一性**：物品ID推荐格式 `类型_名称_等级`，如 `sword_iron_d`
4. **类型安全**：所有数据项必须有明确的TypeScript接口
5. **扩展友好**：文件头部注释说明如何添加新条目

## 数据引用关系
- `dungeonMap.ts` 引用 `scenarios.ts` 的 `Enemy` 类型
- `stores/game.ts` 引用所有数据文件的导出
- `systems/dice.ts` 引用 `skills.ts` 的 `getSkillLevelBonus`
- `config/combat.ts` 不引用data目录，但data目录可引用config

## 扩展新数据示例
```typescript
// 1. 在对应data文件中添加数据项
export const newItems: ItemDef[] = [
  { id: 'new_item', name: '新物品', ... }
]

// 2. 如果需要查询，添加查询函数
export function getNewItemById(id: string): ItemDef | undefined {
  return newItems.find(item => item.id === id)
}

// 3. 在 types/ 中定义接口（如果是新类型）
// 4. 在 config/combat.ts 中添加相关配置常量
// 5. 在 stores/game.ts 中实现逻辑
```
