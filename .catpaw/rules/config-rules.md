---
ruleType: Auto Attached
name: 配置文件规范
description: wxkb/src/config/ 目录下的配置文件开发规范，所有数值常量集中管理
globs: wxkb/src/config/**/*.ts
---

# 配置文件规范

本规则适用于 `wxkb/src/config/` 目录，目前主要是 `combat.ts`。

## 核心原则
1. **所有数值常量集中在此文件**，业务代码中禁止硬编码数字
2. 修改数值只需修改此文件，无需搜索整个代码库
3. 使用 `UPPER_SNAKE_CASE` 命名常量
4. 每个配置块使用分隔线注释分区

## 配置分区
| 配置常量 | 用途 |
|---------|------|
| `COMBAT_CONFIG` | 战斗公式（基础伤害、暴击、闪避、护甲） |
| `DAMAGE_TYPE_CONFIG` | 伤害类型（三本质分配比例、名称映射） |
| `MP_CONFIG` | MP公式（基础值、智力倍率、魔法伤害） |
| `VOLUME_CONFIG` | 体积系统（5级修正值） |
| `IMMUNITY_CONFIG` | 免疫属性（状态抗性、伤害减免） |
| `HP_CONFIG` | HP公式（基础值、活力倍率、基因锁加成） |
| `WILLPOWER_CONFIG` | 意志力公式 |
| `XP_CONFIG` | 经验值公式（升级基础值、倍率） |
| `IDLE_CONFIG` | 挂机配置（最大离线时间、挂机间隔） |
| `ATTRIBUTE_CONFIG` | 属性系统（上限、升级费用、属性效果） |
| `EQUIPMENT_CONFIG` | 装备系统（槽位数、等级价格） |
| `GENE_LOCK_CONFIG` | 基因锁（被动加成、主动效果、解锁概率） |
| `BLOODLINE_CONFIG` | 血统系统（9级配置、属性上限、天赋点） |
| `SKILL_CONFIG` | 技能系统（最大等级、附加成功、升级费用） |

## 类型导出
- `DamageType` — 伤害类型联合类型
- `EssenceDamageType` — 本质伤害类型
- `AdvancedCombatStats` — 进阶战斗属性接口（30+字段）
- `EMPTY_ADVANCED_STATS` — 进阶属性默认值

## 新增配置步骤
1. 在对应CONFIG对象中添加新字段
2. 添加JSDoc注释说明用途和取值范围
3. 在业务代码中通过 `CONFIG.xxx` 引用
4. 如果是新的配置分类，添加新的分隔线分区

## 注意事项
- 旧字段 `physicalAttack`/`magicAttack` 保留用于兼容，结算时映射为 `technologyAttack`/`fantasyAttack`
- `AdvancedCombatStats` 中的 `hit` 默认值 0.75（75%基础命中率）
- `critDamage` 默认值 1.5（150%暴击伤害）
- 暴击/闪避/格挡等概率字段使用小数表示（0.1 = 10%）
