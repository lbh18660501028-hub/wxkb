/**
 * 战斗技能数据注册表（CombatAbility Registry）
 *
 * ==================== 功能说明 ====================
 * 所有战斗技能的静态定义集中在此文件，提供统一的注册表和查询函数。
 * 技能定义是纯数据，不包含业务逻辑。
 *
 * ==================== 使用方式 ====================
 * - 通过 getAbilityById(id) 查询单个技能
 * - 通过 getAbilitiesByTag(tag) 按标签筛选技能
 * - 通过 BUILTIN_ABILITIES 获取所有内置技能
 * - 新增技能只需在数组中添加条目，自动注册到 ABILITY_REGISTRY
 *
 * ==================== 技能来源分类（tags） ====================
 * - 'system'  — 系统内置技能（普通攻击、近战攻击、范围打击）
 * - 'weapon'  — 武器专属技能（未来：手枪射击、霰弹枪扫射）
 * - 'item'    — 道具技能（未来：医疗包、手雷）
 * - 'enemy'   — 敌人专属技能（未来：舔食者舌刺、感染者突袭）
 * - 'dungeon' — 副本专属技能（未来：蜂巢自毁模式特殊行动）
 *
 * ==================== 如何新增技能 ====================
 * 1. 在 BUILTIN_ABILITIES 数组中添加新的 CombatAbility 条目
 * 2. 设置合适的 tags 和 source 标识来源
 * 3. 在 systems/dungeon/abilities.ts 的 getUnitAbilities() 中决定哪些单位可用
 * 4. UI 层会自动展示新技能（卡片样式、范围预览等）
 *
 * ==================== 与现有系统的关系 ====================
 * - 类型定义在 types/dungeon-v2.ts 的 CombatAbility
 * - 引擎逻辑在 systems/dungeon/abilities.ts（范围计算、目标筛选、验证）
 * - 伤害结算在 systems/dungeon/combat.ts（executeAttack / executePlayerAoeAttack）
 * - UI 展示在 components/dungeon/DungeonCombatOverlay.vue
 */

import type { CombatAbility } from '../types/dungeon-v2'

// ==================== 内置技能定义 ====================

/**
 * 所有内置战斗技能
 *
 * 注意：'basic_attack' 不在此数组中，因为其射程随单位变化，
 * 由 systems/dungeon/abilities.ts 的 getUnitAbilities() 动态生成。
 */
export const BUILTIN_ABILITIES: CombatAbility[] = [
  // ==================== 近战攻击 ====================
  /**
   * 近战攻击技能（固定射程 1）
   *
   * 所有单位通用，射程固定为 1（仅相邻格）。
   * 与"普通攻击"的区别：普通攻击射程跟随单位 attack_range，
   * 近战攻击始终为 1，即使单位是远程兵种也能用。
   */
  {
    id: 'melee_attack',
    name: '近战攻击',
    description: '对相邻敌人进行近战攻击（射程固定 1）',
    range: 1,
    area: 0,
    targetType: 'enemy',
    shape: 'single',
    hostile: true,
    damageMultiplier: 1.0,
    tags: ['system', 'basic'],
    source: 'system',
  },

  // ==================== 范围打击 ====================
  /**
   * 范围打击 AOE 技能
   *
   * 施放范围 3（曼哈顿距离），AOE 半径 1（菱形），
   * 对目标格周围 1 格内的所有敌人造成伤害。
   *
   * ==================== 参数说明 ====================
   * - range=3：施法者 3 格内任意格子都可释放
   * - area=1：以释放格为中心，曼哈顿距离 ≤1 的格子受影响（菱形 5 格）
   * - shape='aoe-diamond'：UI 需要显示 hover 预览
   */
  {
    id: 'aoe_strike',
    name: '范围打击',
    description: '对目标格周围 1 格内的所有敌人造成伤害',
    range: 3,
    area: 1,
    targetType: 'enemy',
    shape: 'aoe-diamond',
    hostile: true,
    damageMultiplier: 1.0,
    tags: ['system', 'aoe'],
    source: 'system',
  },

  // ==================== 测试用技能 ====================
  /**
   * 测试治疗技能
   *
   * 用于验证 healAmount 字段能正确驱动治疗结算。
   * 以后可以替换成正式道具（如医疗包）。
   */
  {
    id: 'test_heal',
    name: '急救包',
    description: '治疗一个友方目标，恢复 25 点生命（测试用）',
    range: 3,
    area: 0,
    targetType: 'ally',
    shape: 'single',
    hostile: false,
    healAmount: 25,
    tags: ['system', 'test', 'heal'],
    source: 'system',
  },

  /**
   * 测试感染技能
   *
   * 用于验证 infectionBonus 字段能正确驱动感染结算。
   * 定义为敌对技能，命中时附加感染值。
   * 当敌人使用此技能攻击玩家/队友时，感染值会增加。
   */
  {
    id: 'test_infect',
    name: '扑击',
    description: '攻击目标并附加 5 点感染值（测试用）',
    range: 1,
    area: 0,
    targetType: 'enemy',
    shape: 'single',
    hostile: true,
    infectionBonus: 5,
    tags: ['system', 'test', 'infection'],
    source: 'system',
  },
]

// ==================== 注册表与查询函数 ====================

/**
 * 技能注册表 — ID → CombatAbility 映射
 *
 * 从 BUILTIN_ABILITIES 自动构建，也支持外部动态注册。
 */
const ABILITY_REGISTRY: Record<string, CombatAbility> = {}
for (const ability of BUILTIN_ABILITIES) {
  ABILITY_REGISTRY[ability.id] = ability
}

/**
 * 根据 ID 查询技能
 *
 * @param abilityId 技能 ID
 * @returns 技能定义，找不到返回 undefined
 *
 * @example getAbilityById('melee_attack') → 近战攻击技能
 * @example getAbilityById('basic_attack') → undefined（需通过 getUnitAbilities 动态生成）
 */
export function getAbilityById(abilityId: string): CombatAbility | undefined {
  return ABILITY_REGISTRY[abilityId]
}

/**
 * 按标签筛选技能
 *
 * @param tag 标签名（如 'system'、'weapon'、'item'、'enemy'、'dungeon'）
 * @returns 包含该标签的所有技能数组
 *
 * @example getAbilitiesByTag('system') → [近战攻击, 范围打击]
 * @example getAbilitiesByTag('aoe') → [范围打击]
 */
export function getAbilitiesByTag(tag: string): CombatAbility[] {
  return BUILTIN_ABILITIES.filter((ability) =>
    ability.tags?.includes(tag) ?? false,
  )
}

/**
 * 动态注册技能（用于扩展系统：武器、道具、敌人技能等）
 *
 * 将技能添加到全局注册表，后续可通过 getAbilityById 查询。
 * 如果 ID 已存在则覆盖（用于更新/升级技能定义）。
 *
 * @param ability 技能定义
 *
 * @example registerAbility({ id: 'pistol_shot', name: '手枪射击', ... })
 */
export function registerAbility(ability: CombatAbility): void {
  ABILITY_REGISTRY[ability.id] = ability
}
