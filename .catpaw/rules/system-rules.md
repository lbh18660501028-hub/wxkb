---
ruleType: Auto Attached
name: 系统引擎规范
description: wxkb/src/systems/ 目录下的游戏引擎系统开发规范，包括D10骰子检定、血统触发器等
globs: wxkb/src/systems/**/*.ts
---

# 系统引擎规范

本规则适用于 `wxkb/src/systems/` 目录下的游戏引擎系统文件。

## 文件清单
- `dice.ts` — D10骰子检定系统（核心战斗引擎）
- `bloodlineTriggers.ts` — 血统触发器系统

## D10 骰子系统 (dice.ts)

### 核心函数
- `rollDice(count)` — 投掷D10骰子，返回成功数和加骰结果
- `getAttrBonus(value)` — 属性附加成功数（6→1, 11→2, 16→3, 21→4）

### D10 检定规则（基于TRPG核心规则）
1. **DP（骰池）** = 属性 + 技能 + 调整值
2. **成功判定**: 投出 8/9/10 = 1个成功
3. **加骰规则**: 投出10再投1枚，可连锁（10→10→10...）
4. **附加成功**: 属性值6→+1, 11→+2, 16→+3, 21→+4
5. **机运骰**: DP≤0时仍投1枚，仅10=成功，1=大失败
6. **附加成功不能使失败变成功**: 投骰成功数为0时，附加成功无效

### 战斗结算流程
1. 攻击方投骰（DP = 攻击属性 + 技能 + 调整）
2. 防御方投骰（DP = 防御属性 + 技能 + 调整）
3. 成功数差值 = 攻击成功数 - 防御成功数
4. 伤害 = BASE_DAMAGE + 差值 × DIFF_DAMAGE_MULTIPLIER
5. 伤害类型: technology/fantasy/abnormal，对应不同本质防御减免
6. 暴击: 成功数 ≥ 敌人防御 × CRIT_SUCCESS_RATIO

### 引用关系
- 引用 `config/combat.ts` 的 `COMBAT_CONFIG`、`DAMAGE_TYPE_CONFIG` 等
- 引用 `data/skills.ts` 的 `getSkillLevelBonus`
- 引用 `data/statusEffects.ts` 的状态效果类型
- 被 `stores/game.ts` 调用

## 开发原则
1. 纯函数优先：骰子函数应该是纯函数（除了随机数生成）
2. 不直接修改Store状态，返回结果由Store决定如何应用
3. 所有数值常量从 `config/combat.ts` 引用，不硬编码
4. 函数要有完整类型标注和JSDoc注释
5. 复杂检定流程要注释每一步对应的TRPG规则条目
