/**
 * 商店物品数据配置
 * 
 * ==================== 如何添加新物品 ====================
 * 
 * 1. 在下方 shopItems 数组中添加新物品对象
 * 2. 确保 id 唯一（推荐格式：类型_名称_等级，如 sword_iron_d）
 * 3. 根据物品类型设置 category：
 *    - consumable: 消耗品（药水、解毒剂等）
 *    - weapon: 武器
 *    - armor: 盔甲
 *    - helmet: 头盔
 *    - gloves: 手套
 *    - boots: 鞋子
 *    - accessory: 饰品
 * 4. 装备类物品需设置 stats（属性加成）
 * 5. 消耗品需设置 effect（效果）
 * 
 * ==================== 物品等级价格参考 ====================
 * D级: 50-200    基础物品
 * C级: 300-800   进阶物品
 * B级: 1000-3000 高级物品
 * A级: 5000-15000 顶级物品
 * S级: 30000+    极品物品
 */

import type { ShopItemDef, ItemCategory, ItemTier } from '../types/equipment'

// ==================== 消耗品 ====================
const consumables: ShopItemDef[] = [
  // --- 生命药水 ---
  // 恢复类物品，用于战斗中或战斗后恢复HP
  {
    id: 'potion_hp_d',
    icon: '🧪',
    name: '生命药水',
    description: '恢复50点生命值',
    category: 'consumable',
    tier: 'D',
    price: 50,
    effect: 'hp+50',
  },
  {
    id: 'potion_hp_c',
    icon: '🧪',
    name: '强效生命药水',
    description: '恢复150点生命值',
    category: 'consumable',
    tier: 'C',
    price: 200,
    effect: 'hp+150',
  },
  {
    id: 'potion_hp_b',
    icon: '🧪',
    name: '高级生命药水',
    description: '恢复400点生命值',
    category: 'consumable',
    tier: 'B',
    price: 800,
    effect: 'hp+400',
  },

  // --- 精神药水 ---
  // 恢复MP，用于施法职业
  {
    id: 'potion_mp_d',
    icon: '💧',
    name: '精神药水',
    description: '恢复30点MP',
    category: 'consumable',
    tier: 'D',
    price: 60,
    effect: 'mp+30',
  },
  {
    id: 'potion_mp_c',
    icon: '💧',
    name: '强效精神药水',
    description: '恢复100点MP',
    category: 'consumable',
    tier: 'C',
    price: 250,
    effect: 'mp+100',
  },

  // --- 解毒药剂 ---
  // 解除中毒状态
  {
    id: 'antidote_d',
    icon: '💊',
    name: '解毒药剂',
    description: '解除中毒状态',
    category: 'consumable',
    tier: 'D',
    price: 80,
    effect: 'cure_poison',
  },

  // --- 复活药剂 ---
  // 战斗中自动复活，稀有消耗品
  {
    id: 'revive_c',
    icon: '✨',
    name: '复活药剂',
    description: '战斗中自动复活，恢复50%HP',
    category: 'consumable',
    tier: 'C',
    price: 500,
    effect: 'revive',
  },
]

// ==================== 武器 ====================
// 武器提供攻击力加成，影响物理伤害
// 近战武器依赖肌肉强度，远程武器依赖神经反应
const weapons: ShopItemDef[] = [
  // --- D级武器（基础） ---
  {
    id: 'weapon_sword_d',
    icon: '⚔️',
    name: '铁剑',
    description: '基础近战武器，适合新手',
    category: 'weapon',
    tier: 'D',
    price: 100,
    essence: 'technology',
    stats: { attack: 3 },
  },
  {
    id: 'weapon_gun_d',
    icon: '🔫',
    name: '手枪',
    description: '基础远程武器，射速快',
    category: 'weapon',
    tier: 'D',
    price: 150,
    essence: 'technology',
    stats: { attack: 4 },
  },

  // --- C级武器（进阶） ---
  {
    id: 'weapon_sword_c',
    icon: '⚔️',
    name: '精钢剑',
    description: '精炼打造，锋利无比',
    category: 'weapon',
    tier: 'C',
    price: 500,
    essence: 'technology',
    stats: { attack: 8 },
  },
  {
    id: 'weapon_gun_c',
    icon: '🔫',
    name: '冲锋枪',
    description: '自动射击，火力压制',
    category: 'weapon',
    tier: 'C',
    price: 600,
    essence: 'technology',
    stats: { attack: 10 },
  },

  // --- B级武器（高级） ---
  {
    id: 'weapon_sword_b',
    icon: '⚔️',
    name: '光剑',
    description: '能量武器，切割一切',
    category: 'weapon',
    tier: 'B',
    price: 2000,
    essence: 'technology',
    stats: { attack: 18 },
  },
  {
    id: 'weapon_gun_b',
    icon: '🔫',
    name: '狙击步枪',
    description: '远程精准打击',
    category: 'weapon',
    tier: 'B',
    price: 2500,
    essence: 'technology',
    stats: { attack: 22 },
  },

  // --- A级武器（顶级） ---
  {
    id: 'weapon_sword_a',
    icon: '⚔️',
    name: '等离子刀',
    description: '高温等离子体，无坚不摧',
    category: 'weapon',
    tier: 'A',
    price: 10000,
    essence: 'technology',
    stats: { attack: 35 },
  },
  {
    id: 'weapon_gun_a',
    icon: '🔫',
    name: '激光炮',
    description: '高能激光，毁灭性打击',
    category: 'weapon',
    tier: 'A',
    price: 12000,
    essence: 'technology',
    stats: { attack: 40 },
  },
]

// ==================== 盔甲 ====================
// 盔甲提供护甲防御和生命值加成
// 物理伤害会被护甲防御减免
const armors: ShopItemDef[] = [
  {
    id: 'armor_d',
    icon: '🛡️',
    name: '皮甲',
    description: '轻便的基础护甲',
    category: 'armor',
    tier: 'D',
    price: 80,
    stats: { defense: 2, hp: 20 },
  },
  {
    id: 'armor_c',
    icon: '🛡️',
    name: '锁子甲',
    description: '金属环扣，防护优良',
    category: 'armor',
    tier: 'C',
    price: 400,
    stats: { defense: 5, hp: 50 },
  },
  {
    id: 'armor_b',
    icon: '🛡️',
    name: '防弹衣',
    description: '现代防护装备',
    category: 'armor',
    tier: 'B',
    price: 1800,
    stats: { defense: 10, hp: 100 },
  },
  {
    id: 'armor_a',
    icon: '🛡️',
    name: '纳米护甲',
    description: '高科技纳米材料，轻便坚固',
    category: 'armor',
    tier: 'A',
    price: 8000,
    stats: { defense: 18, hp: 200 },
  },
]

// ==================== 头盔 ====================
// 头盔提供少量防御和生命值，高级头盔可提供魔法抗性
const helmets: ShopItemDef[] = [
  {
    id: 'helmet_d',
    icon: '⛑️',
    name: '钢盔',
    description: '基础头部防护',
    category: 'helmet',
    tier: 'D',
    price: 60,
    stats: { defense: 1, hp: 10 },
  },
  {
    id: 'helmet_c',
    icon: '⛑️',
    name: '战术头盔',
    description: '军用级头部防护',
    category: 'helmet',
    tier: 'C',
    price: 300,
    stats: { defense: 3, hp: 30 },
  },
  {
    id: 'helmet_b',
    icon: '⛑️',
    name: '能量头盔',
    description: '内置能量护盾',
    category: 'helmet',
    tier: 'B',
    price: 1500,
    stats: { defense: 6, hp: 60, magicDefense: 2 },
  },
]

// ==================== 手套 ====================
// 手套主要提供攻击力和速度加成
const gloves: ShopItemDef[] = [
  {
    id: 'gloves_d',
    icon: '🧤',
    name: '皮手套',
    description: '基础手部装备',
    category: 'gloves',
    tier: 'D',
    price: 50,
    stats: { attack: 1 },
  },
  {
    id: 'gloves_c',
    icon: '🧤',
    name: '战术手套',
    description: '增强握力和灵活性',
    category: 'gloves',
    tier: 'C',
    price: 250,
    stats: { attack: 3, speed: 1 },
  },
  {
    id: 'gloves_b',
    icon: '🧤',
    name: '力量手套',
    description: '大幅增强攻击力',
    category: 'gloves',
    tier: 'B',
    price: 1200,
    stats: { attack: 6, speed: 2 },
  },
]

// ==================== 鞋子 ====================
// 鞋子主要提供速度加成，影响行动顺序和闪避
const boots: ShopItemDef[] = [
  {
    id: 'boots_d',
    icon: '👟',
    name: '运动鞋',
    description: '轻便舒适',
    category: 'boots',
    tier: 'D',
    price: 50,
    stats: { speed: 2 },
  },
  {
    id: 'boots_c',
    icon: '👟',
    name: '战术靴',
    description: '军用级足部防护',
    category: 'boots',
    tier: 'C',
    price: 200,
    stats: { speed: 5, defense: 1 },
  },
  {
    id: 'boots_b',
    icon: '👟',
    name: '疾风靴',
    description: '附魔鞋子，移动如风',
    category: 'boots',
    tier: 'B',
    price: 1000,
    stats: { speed: 10, defense: 2 },
  },
]

// ==================== 饰品 ====================
// 饰品提供多种属性加成，是装备搭配的关键
const accessories: ShopItemDef[] = [
  {
    id: 'acc_hp_d',
    icon: '💍',
    name: '生命戒指',
    description: '增加生命值上限',
    category: 'accessory',
    tier: 'D',
    price: 100,
    stats: { hp: 30 },
  },
  {
    id: 'acc_atk_c',
    icon: '💍',
    name: '力量戒指',
    description: '增强攻击力',
    category: 'accessory',
    tier: 'C',
    price: 400,
    stats: { attack: 5 },
  },
  {
    id: 'acc_all_b',
    icon: '💍',
    name: '守护戒指',
    description: '全面增强属性',
    category: 'accessory',
    tier: 'B',
    price: 1500,
    stats: { attack: 4, defense: 4, hp: 50, speed: 3 },
  },
]

// ==================== 导出所有物品 ====================

/**
 * 所有商店物品列表
 * 
 * 添加新物品时，将物品对象添加到对应分类的数组中
 * 例如：添加新武器，在 weapons 数组末尾添加
 */
// ==================== 法术 ====================
const spells: ShopItemDef[] = [
  // --- 火系法术 ---
  {
    id: 'spell_fireball',
    icon: '🔥',
    name: '火球术',
    description: '发射一枚火球，造成火焰伤害并有概率附加燃烧',
    category: 'spell',
    tier: 'D',
    price: 300,
    effect: 'learn_spell:fireball',
  },
  {
    id: 'spell_fire_breath',
    icon: '🔥',
    name: '烈焰吐息',
    description: '喷出烈焰，造成大量火焰伤害',
    category: 'spell',
    tier: 'C',
    price: 800,
    effect: 'learn_spell:fire_breath',
  },
  {
    id: 'spell_inferno',
    icon: '🔥',
    name: '地狱火',
    description: '召唤地狱之火，造成毁灭性伤害',
    category: 'spell',
    tier: 'B',
    price: 2000,
    effect: 'learn_spell:inferno',
  },
  
  // --- 冰系法术 ---
  {
    id: 'spell_ice_lance',
    icon: '🧊',
    name: '冰枪术',
    description: '发射冰枪，造成冰冻伤害并有概率附加减速',
    category: 'spell',
    tier: 'D',
    price: 300,
    effect: 'learn_spell:ice_lance',
  },
  {
    id: 'spell_blizzard',
    icon: '🧊',
    name: '暴风雪',
    description: '召唤暴风雪，造成范围冰冻伤害',
    category: 'spell',
    tier: 'C',
    price: 800,
    effect: 'learn_spell:blizzard',
  },
  {
    id: 'spell_absolute_zero',
    icon: '🧊',
    name: '绝对零度',
    description: '冻结一切，造成极高冰冻伤害',
    category: 'spell',
    tier: 'B',
    price: 2000,
    effect: 'learn_spell:absolute_zero',
  },
  
  // --- 雷系法术 ---
  {
    id: 'spell_lightning_bolt',
    icon: '⚡',
    name: '闪电箭',
    description: '发射闪电，造成雷电伤害',
    category: 'spell',
    tier: 'D',
    price: 300,
    effect: 'learn_spell:lightning_bolt',
  },
  {
    id: 'spell_chain_lightning',
    icon: '⚡',
    name: '连锁闪电',
    description: '释放连锁闪电，造成高额雷电伤害',
    category: 'spell',
    tier: 'C',
    price: 800,
    effect: 'learn_spell:chain_lightning',
  },
  {
    id: 'spell_thunder_god',
    icon: '⚡',
    name: '雷神之怒',
    description: '召唤雷神之力，造成毁灭性雷电伤害',
    category: 'spell',
    tier: 'B',
    price: 2000,
    effect: 'learn_spell:thunder_god',
  },
]

// ==================== 技能 ====================
const skillItems: ShopItemDef[] = [
  // --- 物理技能 ---
  {
    id: 'skill_melee',
    icon: '👊',
    name: '肉搏技能',
    description: '提升近身格斗能力，增加肉搏检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:melee',
  },
  {
    id: 'skill_firearm',
    icon: '🔫',
    name: '枪械技能',
    description: '提升枪械使用能力，增加枪械检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:firearm',
  },
  {
    id: 'skill_dodge',
    icon: '💨',
    name: '闪避技能',
    description: '提升闪避能力，增加闪避检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:dodge',
  },
  
  // --- 精神技能 ---
  {
    id: 'skill_knowledge',
    icon: '📚',
    name: '学识技能',
    description: '提升知识储备，增加学识检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:knowledge',
  },
  {
    id: 'skill_investigation',
    icon: '🔍',
    name: '调查技能',
    description: '提升调查能力，增加调查检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:investigation',
  },
  {
    id: 'skill_mysticism',
    icon: '🔮',
    name: '神秘学技能',
    description: '提升神秘学知识，增加神秘学检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:mysticism',
  },
  
  // --- 社交技能 ---
  {
    id: 'skill_persuasion',
    icon: '🗣️',
    name: '说服技能',
    description: '提升说服能力，增加说服检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:persuasion',
  },
  {
    id: 'skill_stealth',
    icon: '🥷',
    name: '潜行技能',
    description: '提升潜行能力，增加潜行检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:stealth',
  },
  {
    id: 'skill_first_aid',
    icon: '🏥',
    name: '急救技能',
    description: '提升急救能力，增加急救检定成功数',
    category: 'skill',
    tier: 'D',
    price: 200,
    effect: 'learn_skill:first_aid',
  },
]

export const shopItems: ShopItemDef[] = [
  ...consumables,
  ...weapons,
  ...armors,
  ...helmets,
  ...gloves,
  ...boots,
  ...accessories,
  ...spells,
  ...skillItems,
]

// ==================== 辅助查询函数 ====================

/**
 * 根据ID获取物品
 */
export function getItemById(id: string): ShopItemDef | undefined {
  return shopItems.find(item => item.id === id)
}

/**
 * 根据分类获取物品列表
 */
export function getItemsByCategory(category: ItemCategory): ShopItemDef[] {
  return shopItems.filter(item => item.category === category)
}

/**
 * 根据等级获取物品列表
 */
export function getItemsByTier(tier: ItemTier): ShopItemDef[] {
  return shopItems.filter(item => item.tier === tier)
}

/**
 * 获取所有分类（去重）
 */
export function getAllCategories(): ItemCategory[] {
  return [...new Set(shopItems.map(item => item.category))]
}
