/**
 * 骰池概率计算工具
 * 用于计算D10骰池的各种等效概率
 * 
 * D10骰池规则：
 * - 每枚骰子≥8算成功（概率0.2）
 * - 骰出10会获得加骰（加骰也按同样规则）
 * - 加骰会递归触发
 */

const SUCCESS_RATE = 0.2 // D10 ≥8 的概率

/**
 * 计算n枚骰子中获得k个成功的概率（不考虑加骰）
 * P(k) = C(n,k) × p^k × (1-p)^(n-k)
 */
function binomialProbability(n: number, k: number, p: number = SUCCESS_RATE): number {
  if (k > n) return 0
  if (k === 0) return Math.pow(1 - p, n)
  if (n === 0) return 0
  
  // 使用对数计算避免溢出
  let logProb = 0
  for (let i = 0; i < k; i++) {
    logProb += Math.log(n - i) - Math.log(i + 1)
  }
  logProb += k * Math.log(p) + (n - k) * Math.log(1 - p)
  
  return Math.exp(logProb)
}

/**
 * 计算n枚骰子获得≤k个成功的累积概率（不考虑加骰）
 */
function cumulativeProbabilityUpTo(n: number, k: number): number {
  let sum = 0
  const maxK = Math.min(k, n)
  for (let i = 0; i <= maxK; i++) {
    sum += binomialProbability(n, i)
  }
  return sum
}

/**
 * 计算n枚骰子获得≥k个成功的累积概率（不考虑加骰）
 */
function cumulativeProbabilityFrom(n: number, k: number): number {
  return 1 - cumulativeProbabilityUpTo(n, k - 1)
}

/**
 * 考虑加骰后的成功数期望值
 * D10投n枚，每颗10产生1个加骰，加骰也有概率产生更多加骰
 * 期望成功数 = n × p + n × p(10) × E[加骰成功数]
 * 
 * 简化计算：期望成功数 ≈ n × 0.25 （考虑加骰链）
 */
function expectedSuccessesWithBonus(n: number): number {
  // 无加骰时：E = n × 0.2
  // 有加骰时：每颗10（概率0.1）产生1个加骰，加骰期望0.25成功
  // 总期望 ≈ n × 0.2 + n × 0.1 × 0.25 = n × 0.225
  // 更精确：考虑加骰链，约 n × 0.25
  return n * 0.25
}

/**
 * 计算命中率：P(玩家成功数 > 敌人成功数)
 * 
 * @param playerDP 玩家攻击骰池大小（反应 + 枪械技能）
 * @param enemyDP 敌人防御骰池大小
 * @returns 命中概率 (0-1)
 */
export function calculateHitRate(playerDP: number, enemyDP: number): number {
  if (playerDP <= 0 || enemyDP <= 0) {
    return playerDP > 0 ? 1 : 0
  }
  
  let hitRate = 0
  
  // 遍历所有可能的玩家成功数
  for (let ps = 1; ps <= playerDP + 5; ps++) { // +5 考虑加骰
    const pPlayer = getSuccessProbability(playerDP, ps)
    if (pPlayer < 1e-10) continue // 跳过极小概率
    
    // 敌人成功数 < ps 的概率
    const pEnemyLess = cumulativeProbabilityUpTo(enemyDP, ps - 1)
    hitRate += pPlayer * pEnemyLess
  }
  
  return Math.min(1, Math.max(0, hitRate))
}

/**
 * 计算闪避率：P(玩家闪避成功数 > 敌人攻击成功数)
 * 
 * @param dodgeDP 玩家闪避骰池大小（反应 + 闪避技能）
 * @param enemyAttackDP 敌人攻击骰池大小
 * @param dodgeBuff 闪避率加成（来自基因锁等，小数）
 * @returns 闪避概率 (0-1)
 */
export function calculateDodgeRate(dodgeDP: number, enemyAttackDP: number, dodgeBuff: number = 0): number {
  if (dodgeDP <= 0 || enemyAttackDP <= 0) {
    return dodgeDP > 0 ? 0.8 : 0
  }
  
  let dodgeRate = 0
  
  // 遍历所有可能的闪避成功数
  for (let ps = 1; ps <= dodgeDP + 5; ps++) {
    const pPlayer = getSuccessProbability(dodgeDP, ps)
    if (pPlayer < 1e-10) continue
    
    // 敌人攻击成功数 < ps 的概率
    const pEnemyLess = cumulativeProbabilityUpTo(enemyAttackDP, ps - 1)
    dodgeRate += pPlayer * pEnemyLess
  }
  
  // 加上闪避率加成（来自基因锁等）
  dodgeRate = Math.min(1, dodgeRate + dodgeBuff)
  
  return Math.max(0, dodgeRate)
}

/**
 * 计算暴击率
 * 暴击触发条件：
 * 1. 成功数 ≥ 2倍敌人成功数（骰池暴击）
 * 2. 暴击率触发（来自基因锁等）
 * 
 * @param playerDP 玩家攻击骰池大小
 * @param enemyDP 敌人防御骰池大小
 * @param critBuff 暴击率加成（来自基因锁等，小数）
 * @returns 暴击概率 (0-1)
 */
export function calculateCritRate(playerDP: number, enemyDP: number, critBuff: number = 0): number {
  if (playerDP <= 0) return critBuff
  
  let critRate = 0
  
  // 骰池暴击：玩家成功数 ≥ 2 × 敌人成功数
  for (let ps = 0; ps <= playerDP + 5; ps++) {
    const pPlayer = getSuccessProbability(playerDP, ps)
    if (pPlayer < 1e-10) continue
    
    // 暴击条件：ps >= 2 × es，即 es <= ps/2
    const maxEnemySuccesses = Math.floor(ps / 2)
    const pEnemyLess = cumulativeProbabilityUpTo(enemyDP, maxEnemySuccesses)
    critRate += pPlayer * pEnemyLess
  }
  
  // 加上暴击率加成
  critRate = Math.min(1, critRate + critBuff)
  
  return Math.max(0, critRate)
}

/**
 * 获取成功概率（考虑加骰链）
 * 
 * @param dp 骰池大小
 * @param targetSuccesses 目标成功数
 * @returns 概率
 */
function getSuccessProbability(dp: number, targetSuccesses: number): number {
  // 简化计算：使用二项分布近似
  // 考虑加骰，有效骰子数 ≈ dp × 1.1
  const effectiveDP = dp * 1.1
  
  return binomialProbability(Math.round(effectiveDP), targetSuccesses)
}

/**
 * 计算等效命中率（针对不同等级敌人）
 * 参考TRPG原版设定：
 * - D级普通丧尸：防御0（无防御），攻击1（牙齿天生武器）
 * - C级变异丧尸：防御3，攻击3
 * - B级舔舐者：防御6，攻击6
 * - A级暴君：防御10，攻击10
 * - S级超级暴君：防御15，攻击12
 * 
 * @param playerAttrs 玩家属性
 * @param playerSkills 玩家技能
 * @returns 各等级敌人的命中率
 */
export function calculateHitRatesByEnemyTier(
  playerAttrs: { reaction: number },
  playerSkills: { ranged: number; dodge: number },
  critBuff: number = 0,
  dodgeBuff: number = 0
): {
  hitRateLow: number   // 对D级丧尸（无防御）
  hitRateMid: number   // 对C级变异丧尸
  hitRateHigh: number  // 对B级舔舐者
  dodgeRateLow: number
  dodgeRateMid: number
  dodgeRateHigh: number
  critRate: number
} {
  // 参考敌人防御骰池
  const enemyDefenseLow = 0   // D级普通丧尸：无防御
  const enemyDefenseMid = 3   // C级变异丧尸
  const enemyDefenseHigh = 6  // B级舔舐者
  
  // 参考敌人攻击骰池
  const enemyAttackLow = 1    // D级：牙齿攻击
  const enemyAttackMid = 3    // C级
  const enemyAttackHigh = 6   // B级
  
  const playerAttackDP = playerAttrs.reaction + playerSkills.ranged
  const playerDodgeDP = playerAttrs.reaction + playerSkills.dodge
  
  return {
    hitRateLow: calculateHitRate(playerAttackDP, enemyDefenseLow),
    hitRateMid: calculateHitRate(playerAttackDP, enemyDefenseMid),
    hitRateHigh: calculateHitRate(playerAttackDP, enemyDefenseHigh),
    dodgeRateLow: calculateDodgeRate(playerDodgeDP, enemyAttackLow, dodgeBuff),
    dodgeRateMid: calculateDodgeRate(playerDodgeDP, enemyAttackMid, dodgeBuff),
    dodgeRateHigh: calculateDodgeRate(playerDodgeDP, enemyAttackHigh, dodgeBuff),
    critRate: calculateCritRate(playerAttackDP, enemyDefenseMid, critBuff),
  }
}

/**
 * 将概率转换为百分比字符串
 */
export function probabilityToPercent(prob: number): string {
  return (prob * 100).toFixed(1) + '%'
}

/**
 * 获取命中率描述
 */
export function getHitRateDescription(prob: number): string {
  if (prob >= 0.9) return '极高'
  if (prob >= 0.7) return '较高'
  if (prob >= 0.5) return '一般'
  if (prob >= 0.3) return '较低'
  return '很低'
}
