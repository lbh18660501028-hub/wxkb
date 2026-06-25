/**
 * 血统特性触发系统
 * 
 * ==================== 设计概述 ====================
 * 血统特性在战斗中自动触发，提供被动加成或主动效果
 * 
 * ==================== 特性触发类型 ====================
 * - onHit：命中敌人时触发
 * - onKill：击杀敌人时触发
 * - onTakeDamage：受到伤害时触发
 * - onCrit：暴击时触发
 * - lowHp：低血量时触发
 * 
 * ==================== 如何添加新特性 ====================
 * 1. 在此文件的 traitHandlers 中添加处理函数
 * 2. 确保处理函数返回 TraitEffect 对象
 * 3. 在 getTraitEffects 中调用对应的处理函数
 */

import { getBloodlineById } from '../data/bloodline'

/**
 * 血统特性触发结果
 */
export interface TraitTriggerResult {
  traitIndex: number              // 特性索引
  bloodlineId: string             // 血统ID
  name: string                    // 特性名称
  description: string             // 特性描述
  effect: { type: string; stat?: string; value: number; duration?: number }
  triggered: boolean              // 是否触发
  message?: string                // 触发消息
}

/**
 * 血统特性触发上下文
 */
export interface TraitTriggerContext {
  bloodlineId: string           // 装备的血统ID
  tier: string                  // 血统等级
  currentHp: number             // 当前HP
  maxHp: number                 // 最大HP
  damage?: number               // 本次造成的伤害
  damageReceived?: number       // 本次受到的伤害
  isCrit?: boolean              // 是否暴击
  killCount?: number            // 本轮击杀数
}

// ==================== 特性触发处理函数 ====================

/**
 * 特性触发处理函数
 */
type TraitHandler = (context: TraitTriggerContext) => TraitTriggerResult | null

/**
 * 处理吸血特性
 * @description 命中敌人时恢复HP
 */
const handleLifeSteal: TraitHandler = (ctx) => {
  if (!ctx.damage) return null
  
  const restoreAmount = Math.floor(ctx.damage * 0.3) // 30%吸血
  return {
    traitIndex: 0,
    bloodlineId: 'vampire',
    name: '嗜血',
    description: `恢复 ${restoreAmount} HP`,
    effect: { type: 'heal', value: restoreAmount },
    triggered: true,
    message: `吸血特性触发，恢复 ${restoreAmount} HP`,
  }
}

/**
 * 处理暗影之翼特性
 * @description 闪避+10%，持续3回合
 */
const handleShadowWing: TraitHandler = (ctx) => {
  return {
    traitIndex: 1,
    bloodlineId: 'vampire',
    name: '暗影之翼',
    description: '闪避+10%，持续3回合',
    effect: { type: 'buff', stat: 'dodge', value: 0.1, duration: 3 },
    triggered: true,
    message: '暗影之翼特性触发',
  }
}

/**
 * 处理血族亲王特性
 * @description 所有伤害+25%
 */
const handleBloodPrince: TraitHandler = (ctx) => {
  return {
    traitIndex: 2,
    bloodlineId: 'vampire',
    name: '血族亲王',
    description: '所有伤害+25%',
    effect: { type: 'buff', stat: 'damage', value: 0.25, duration: 999 },
    triggered: true,
    message: '血族亲王特性激活',
  }
}

/**
 * 处理不朽之躯特性
 * @description 受到致命伤害时保留1HP
 */
const handleImmortalBody: TraitHandler = (ctx) => {
  if (ctx.damageReceived && ctx.damageReceived >= ctx.currentHp) {
    return {
      traitIndex: 3,
      bloodlineId: 'vampire',
      name: '不朽之躯',
      description: '免疫本次死亡',
      effect: { type: 'heal', value: 1 },
      triggered: true,
      message: '不朽之躯触发，免疫死亡！',
    }
  }
  return null
}

/**
 * 处理暗夜女神特性
 * @description 暴击率+15%
 */
const handleDarkGoddess: TraitHandler = (ctx) => {
  return {
    traitIndex: 4,
    bloodlineId: 'vampire',
    name: '暗夜女神',
    description: '暴击率+15%',
    effect: { type: 'buff', stat: 'crit', value: 0.15, duration: 999 },
    triggered: true,
    message: '暗夜女神特性激活',
  }
}

/**
 * 处理血族始祖特性
 * @description 吸血比例+20%
 */
const handleBloodAncestor: TraitHandler = (ctx) => {
  return {
    traitIndex: 5,
    bloodlineId: 'vampire',
    name: '血族始祖',
    description: '吸血比例+20%',
    effect: { type: 'buff', stat: 'lifeSteal', value: 0.2, duration: 999 },
    triggered: true,
    message: '血族始祖特性激活',
  }
}

// ==================== 特性处理函数映射 ====================

/**
 * 特性处理函数映射
 * key: 血统ID:特性索引
 */
const traitHandlers: Record<string, TraitHandler> = {
  // 吸血鬼特性
  'vampire:0': handleLifeSteal,
  'vampire:1': handleShadowWing,
  'vampire:2': handleBloodPrince,
  'vampire:3': handleImmortalBody,
  'vampire:4': handleDarkGoddess,
  'vampire:5': handleBloodAncestor,
}

// ==================== 公开接口 ====================

/**
 * 获取血统特性触发效果
 * 
 * @param context 触发上下文
 * @returns 触发的特性效果列表
 */
export function getTraitEffects(context: TraitTriggerContext): TraitTriggerResult[] {
  const results: TraitTriggerResult[] = []
  const bloodline = getBloodlineById(context.bloodlineId)
  if (!bloodline || bloodline.id !== context.tier) return results

  // 遍历当前等级的特性
  bloodline.traits.forEach((trait, index) => {
    const handler = traitHandlers[`${context.bloodlineId}:${index}`]
    if (handler) {
      const result = handler(context)
      if (result && result.triggered) {
        results.push(result)
      }
    }
  })

  return results
}

/**
 * 获取被动特性（始终生效）
 * 
 * @param bloodlineId 血统ID
 * @param tier 血统等级
 * @returns 被动特性效果列表
 */
export function getPassiveTraitEffects(bloodlineId: string, tier: string): TraitTriggerResult[] {
  const bloodline = getBloodlineById(bloodlineId)
  if (!bloodline || bloodline.id !== tier) return []

  const results: TraitTriggerResult[] = []

  bloodline.traits.forEach((trait, index) => {
    const handler = traitHandlers[`${bloodlineId}:${index}`]
    if (handler) {
      const ctx: TraitTriggerContext = {
        bloodlineId,
        tier,
        currentHp: 999, // 被动特性无HP限制
        maxHp: 999,
      }
      const result = handler(ctx)
      if (result && result.triggered) {
        results.push(result)
      }
    }
  })

  return results
}
