/**
 * 副本 V2 — 战棋规则内核（Tactics Engine）
 *
 * ==================== 功能说明 ====================
 * 纯逻辑模块，负责所有"空间维度"的规则计算：
 * - 网格坐标管理（占据判定、越界检查）
 * - 距离计算（切比雪夫距离、曼哈顿距离）
 * - 射程判定（目标是否在攻击范围内）
 * - 寻路算法（BFS 广度优先搜索，4 方向移动，不穿障碍/单位）
 * - 可移动格列表（给定移动力，返回所有可达格）
 * - 可攻击目标列表（给定射程，返回所有在范围内的敌方单位）
 * - 阵型放置（开战时按区域摆放我方/敌方单位）
 * - 行动顺序计算（按速度降序排列所有单位）
 * - 战场文字渲染（ASCII 网格图，用于日志输出）
 *
 * ==================== 设计原则 ====================
 * - 本模块不依赖 Vue 响应式，纯函数式操作
 * - 本模块不修改任何战斗状态，只提供计算和查询
 * - 所有数值参数从 TACTICS_CONFIG 读取，不硬编码
 * - 手动模式和自动模式共用同一套规则内核
 *
 * ==================== 扩展预留 ====================
 * - MOVE_DIRECTIONS：支持从 4 方向扩展到 8 方向
 * - AI_TARGET_STRATEGY：支持从"最近敌人"扩展到"最低血量"等策略
 * - ENABLE_OBSTACLES：支持从"无障碍"扩展到"有地形障碍"
 */

import type {
GridPosition,
CombatEnemy,
CombatAlly,
DungeonCombatState,
AbilityLoadout,
} from '../../types/dungeon-v2'
import { TACTICS_CONFIG } from '../../config/dungeon-v2'

// ==================== 统一单位接口 ====================

/**
 * 战棋单位 — 战术模块操作的统一单位视图
 *
 * 无论玩家、敌人还是队友，在战棋规则内核中都被视为同一个"单位"。
 * 这样手动驱动和 AI 驱动可以调用同一套函数，不需要区分单位类型。
 *
 * 转换函数（toTacticsUnit）负责把 CombatEnemy / CombatAlly / 玩家状态
 * 映射成 TacticsUnit，确保内核不关心数据来源。
 */
export interface TacticsUnit {
  /** 唯一标识（'player' / 'enemy:0' / 'ally:0' 等） */
  uid: string
  /** 显示名称 */
  name: string
  /** 阵营：'player'=玩家方，'enemy'=敌方 */
  side: 'player' | 'enemy'
  /** 网格位置（null = 未放置） */
  position: GridPosition | null
  /** 每回合移动力 */
  move_range: number
  /** 攻击射程 */
  attack_range: number
  /** 本回合是否已移动 */
  has_moved: boolean
  /** 本回合是否已攻击 */
  has_attacked: boolean
  /** 控制方式：'manual'=手动，'auto'=AI托管 */
  control_mode: 'manual' | 'auto'
  /** 当前HP */
  hp: number
  /** 最大HP */
  max_hp: number
  /** 速度（决定行动顺序） */
  speed: number
/** 是否存活 */
alive: boolean

// ==================== 能力来源 ====================
/** 该单位的能力装配槽（决定可用技能） */
abilityLoadout?: AbilityLoadout
}

// ==================== 单位标识工具 ====================

/**
 * 生成玩家单位的 uid
 * @returns 固定字符串 'player'
 */
export function playerUid(): string {
  return 'player'
}

/**
 * 生成敌人单位的 uid
 * @param index 敌人在 enemies 数组中的下标
 * @returns 如 'enemy:0'、'enemy:1'
 */
export function enemyUid(index: number): string {
  return `enemy:${index}`
}

/**
 * 生成队友单位的 uid
 * @param index 队友在 allies 数组中的下标
 * @returns 如 'ally:0'、'ally:1'
 */
export function allyUid(index: number): string {
  return `ally:${index}`
}

/**
 * 解析 uid，返回单位类型和索引
 * @param uid 单位唯一标识
 * @returns { kind: 'player' } 或 { kind: 'enemy', index: 0 } 等
 */
export function parseUid(uid: string):
  | { kind: 'player' }
  | { kind: 'enemy'; index: number }
  | { kind: 'ally'; index: number } {
  if (uid === 'player') return { kind: 'player' }
  if (uid.startsWith('enemy:')) return { kind: 'enemy', index: parseInt(uid.slice(6), 10) }
  if (uid.startsWith('ally:')) return { kind: 'ally', index: parseInt(uid.slice(5), 10) }
  // 不应该到达这里，但为了类型安全返回一个默认值
  return { kind: 'player' }
}

// ==================== 单位转换函数 ====================

/**
 * 把战斗状态中的所有单位转换成统一的 TacticsUnit 列表
 *
 * 这是手动驱动和 AI 驱动与规则内核之间的"适配层"——
 * 无论数据来自哪里，转换后都是同一种格式，内核函数不需要区分。
 *
 * @param combat 当前战斗状态
 * @returns 所有存活单位的 TacticsUnit 数组
 */
export function collectTacticsUnits(combat: DungeonCombatState): TacticsUnit[] {
  const units: TacticsUnit[] = []

  // 玩家（如果存活）
  if (combat.player_hp > 0) {
    units.push({
      uid: playerUid(),
      name: '你',
      side: 'player',
      position: combat.player_position,
      move_range: combat.player_move_range,
      attack_range: combat.player_attack_range,
      has_moved: combat.player_has_moved,
      has_attacked: combat.player_has_attacked,
// 玩家始终手动控制（在自动模式下由AI驱动，但 control_mode 标记为 manual）
control_mode: 'manual',
hp: combat.player_hp,
max_hp: combat.player_max_hp,
speed: 0, // 玩家速度由外部计算，这里先占位
alive: true,
abilityLoadout: combat.player_ability_loadout,
})
  }

  // 敌人
  for (let i = 0; i < combat.enemies.length; i++) {
    const enemy = combat.enemies[i]
    if (enemy.hp > 0) {
      units.push({
        uid: enemyUid(i),
        name: enemy.name,
        side: 'enemy',
        position: enemy.position,
        move_range: enemy.move_range,
        attack_range: enemy.attack_range,
        has_moved: enemy.has_moved,
        has_attacked: enemy.has_attacked,
        control_mode: 'auto',
hp: enemy.hp,
max_hp: enemy.max_hp,
speed: enemy.speed,
alive: true,
abilityLoadout: enemy.abilityLoadout,
})
    }
  }

  // 队友
  for (let i = 0; i < combat.allies.length; i++) {
    const ally = combat.allies[i]
    if (!ally.down && ally.hp > 0) {
      units.push({
        uid: allyUid(i),
        name: ally.name,
        side: 'player',
        position: ally.position,
        move_range: ally.move_range,
        attack_range: ally.attack_range,
        has_moved: ally.has_moved,
        has_attacked: ally.has_attacked,
        control_mode: ally.control_mode,
        hp: ally.hp,
        max_hp: ally.max_hp,
        speed: ally.speed,
        alive: true,
        abilityLoadout: ally.abilityLoadout,
      })
    }
  }

  return units
}

// ==================== 坐标工具 ====================

/**
 * 生成格子唯一键（用于 Set 存储）
 * @param pos 坐标
 * @returns 如 "3,2"
 */
export function cellKey(pos: GridPosition): string {
  return `${pos.x},${pos.y}`
}

/**
 * 从键解析回坐标
 * @param key 如 "3,2"
 * @returns 坐标
 */
export function parseCellKey(key: string): GridPosition {
  const parts = key.split(',')
  return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) }
}

/**
 * 检查坐标是否在网格范围内
 * @param pos 待检查坐标
 * @param width 网格宽度
 * @param height 网格高度
 * @returns true=在范围内
 */
export function isInBounds(pos: GridPosition, width: number, height: number): boolean {
  return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
}

/**
 * 检查两个坐标是否相同
 */
export function isSamePos(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y
}

// ==================== 距离计算 ====================

/**
 * 切比雪夫距离（含对角线）
 *
 * 国际象棋国王的走法距离：8 个方向中最大轴差。
 * 用于射程判定时，"相邻"包括对角线相邻。
 *
 * @param a 起点坐标
 * @param b 终点坐标
 * @returns 距离值（≥0）
 *
 * @example chebyshevDistance({x:0,y:0}, {x:1,y:1}) = 1（对角线相邻）
 * @example chebyshevDistance({x:0,y:0}, {x:3,y:0}) = 3（水平距离3）
 */
export function chebyshevDistance(a: GridPosition, b: GridPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/**
 * 曼哈顿距离（仅正交方向）
 *
 * 只计算上下左右方向的距离，不走对角线。
 * 用于 4 方向移动模式下的路径长度计算。
 *
 * @param a 起点坐标
 * @param b 终点坐标
 * @returns 距离值（≥0）
 *
 * @example manhattanDistance({x:0,y:0}, {x:1,y:1}) = 2（需走两步）
 * @example manhattanDistance({x:0,y:0}, {x:3,y:0}) = 3
 */
export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * 根据配置选择距离算法计算射程距离
 *
 * 射程判定用哪种距离算法，由 TACTICS_CONFIG.RANGE_CALCULATION 决定：
 * - 'chebyshev'：切比雪夫距离（含对角线，近战范围1=8格相邻）
 * - 'manhattan'：曼哈顿距离（仅正交，近战范围1=4格相邻）
 *
 * @param a 攻击者坐标
 * @param b 目标坐标
 * @returns 距离值
 */
export function getRangeDistance(a: GridPosition, b: GridPosition): number {
  if (TACTICS_CONFIG.RANGE_CALCULATION === 'manhattan') {
    return manhattanDistance(a, b)
  }
  return chebyshevDistance(a, b)
}

/**
 * 判断目标是否在攻击射程内
 *
 * @param attackerPos 攻击者坐标
 * @param targetPos 目标坐标
 * @param range 攻击射程
 * @returns true=在射程内，可以攻击
 */
export function isInRange(
  attackerPos: GridPosition,
  targetPos: GridPosition,
  range: number,
): boolean {
  return getRangeDistance(attackerPos, targetPos) <= range
}

// ==================== 占据判定 ====================

/**
 * 获取所有被占据的格子坐标集合
 *
 * 一个格子被占据 = 有一个存活单位站在上面。
 * 用于寻路时判断"能不能走过去"。
 *
 * @param units 所有战术单位
 * @param excludeUid 要排除的单位 uid（比如正在移动的单位自身，不阻挡自己）
 * @returns 被占据格子的键集合（如 Set{"0,0", "5,3"}）
 */
export function getOccupiedCells(
  units: TacticsUnit[],
  excludeUid?: string,
): Set<string> {
  const occupied = new Set<string>()
  for (const unit of units) {
    if (!unit.alive) continue
    if (excludeUid && unit.uid === excludeUid) continue
    if (unit.position) {
      occupied.add(cellKey(unit.position))
    }
  }
  return occupied
}

// ==================== 寻路算法（BFS） ====================

/**
 * 4 方向移动偏移量（上、下、左、右）
 *
 * 预留扩展：如果 TACTICS_CONFIG.MOVE_DIRECTIONS 改为 '8dir'，
 * 可以在 directions 数组中添加对角线方向。
 */
const MOVE_DIRECTIONS_4: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 }, // 上
  { dx: 0, dy: 1 },  // 下
  { dx: -1, dy: 0 }, // 左
  { dx: 1, dy: 0 },  // 右
]

/**
 * 8 方向移动偏移量（含对角线，预留扩展用）
 */
const MOVE_DIRECTIONS_8: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 }, // 上
  { dx: 0, dy: 1 },  // 下
  { dx: -1, dy: 0 }, // 左
  { dx: 1, dy: 0 },  // 右
  { dx: -1, dy: -1 }, // 左上
  { dx: 1, dy: -1 },  // 右上
  { dx: -1, dy: 1 },  // 左下
  { dx: 1, dy: 1 },   // 右下
]

/**
 * 获取当前配置的移动方向列表
 * @returns 方向偏移量数组
 */
function getMoveDirections(): ReadonlyArray<{ dx: number; dy: number }> {
  return TACTICS_CONFIG.MOVE_DIRECTIONS === '8dir'
    ? MOVE_DIRECTIONS_8
    : MOVE_DIRECTIONS_4
}

/**
 * BFS 寻路 — 找到从起点到终点的最短路径
 *
 * ==================== 算法说明 ====================
 * 广度优先搜索，逐层扩展，保证找到的是最短路径。
 * 不能穿过被其他单位占据的格子，不能走出网格边界。
 * 起点和终点本身不算"被阻挡"（终点可以为目标格子，即使被占据时返回 null）。
 *
 * ==================== 参数说明 ====================
 * @param start 起点坐标
 * @param end 终点坐标
 * @param width 网格宽度
 * @param height 网格高度
 * @param occupied 被占据的格子集合（来自 getOccupiedCells）
 * @returns 路径坐标数组（不含起点，含终点），如果不可达返回 null
 */
export function findPath(
  start: GridPosition,
  end: GridPosition,
  width: number,
  height: number,
  occupied: Set<string>,
): GridPosition[] | null {
  // 起点就是终点，返回空路径
  if (isSamePos(start, end)) return []

  // 终点出界，不可达
  if (!isInBounds(end, width, height)) return null

  // BFS 队列
  const queue: GridPosition[] = [start]
  // 访问记录：记录每个格子的"前一个格子"，用于回溯路径
  const visited = new Map<string, string | null>()
  visited.set(cellKey(start), null) // 起点没有前驱

  const directions = getMoveDirections()

  while (queue.length > 0) {
    const current = queue.shift()!

    // 到达终点，回溯路径
    if (isSamePos(current, end)) {
      return reconstructPath(visited, start, end)
    }

    for (const dir of directions) {
      const next: GridPosition = { x: current.x + dir.dx, y: current.y + dir.dy }
      const key = cellKey(next)

      // 已访问过，跳过
      if (visited.has(key)) continue

      // 出界，跳过
      if (!isInBounds(next, width, height)) continue

      // 被占据（但终点允许被占据——寻到终点即可）
      if (occupied.has(key) && !isSamePos(next, end)) continue

      visited.set(key, cellKey(current))
      queue.push(next)
    }
  }

  // 队列空了还没到终点，说明不可达
  return null
}

/**
 * 从 BFS 访问记录中回溯出完整路径
 * @param visited 访问记录（格子键 → 前驱格子键）
 * @param start 起点坐标
 * @param end 终点坐标
 * @returns 路径坐标数组（不含起点，含终点）
 */
function reconstructPath(
  visited: Map<string, string | null>,
  start: GridPosition,
  end: GridPosition,
): GridPosition[] {
  const path: GridPosition[] = []
  let currentKey: string | null = cellKey(end)

  while (currentKey !== null && currentKey !== cellKey(start)) {
    path.unshift(parseCellKey(currentKey))
    currentKey = visited.get(currentKey) ?? null
  }

  return path
}

// ==================== 可移动格列表 ====================

/**
 * 获取一个单位可移动到的所有格子
 *
 * 从单位当前位置出发，BFS 扩展 move_range 步，
 * 返回所有可达且未被占据的格子（不含起点）。
 *
 * @param unit 要移动的单位
 * @param allUnits 战场上所有单位（用于计算占据）
 * @param width 网格宽度
 * @param height 网格高度
 * @returns 可移动到的格子坐标数组
 */
export function getMovableCells(
  unit: TacticsUnit,
  allUnits: TacticsUnit[],
  width: number,
  height: number,
): GridPosition[] {
  if (!unit.position || !unit.alive) return []
  if (unit.has_moved) return [] // 本回合已移动

  const occupied = getOccupiedCells(allUnits, unit.uid)
  const movable: GridPosition[] = []
  const visited = new Set<string>()
  visited.add(cellKey(unit.position))

  // BFS 层级扩展，每层代表移动 1 格
  let frontier: GridPosition[] = [unit.position]

  for (let step = 0; step < unit.move_range; step++) {
    const nextFrontier: GridPosition[] = []

    for (const cell of frontier) {
      for (const dir of getMoveDirections()) {
        const next: GridPosition = { x: cell.x + dir.dx, y: cell.y + dir.dy }
        const key = cellKey(next)

        if (visited.has(key)) continue
        if (!isInBounds(next, width, height)) continue
        if (occupied.has(key)) continue

        visited.add(key)
        movable.push(next)
        nextFrontier.push(next)
      }
    }

    frontier = nextFrontier
    if (frontier.length === 0) break
  }

  return movable
}

// ==================== 可攻击目标列表 ====================

/**
 * 获取一个单位在当前射程内可以攻击的所有敌方单位
 *
 * @param unit 攻击方单位
 * @param allUnits 战场上所有单位
 * @returns 在射程内的敌方单位数组（已按距离从近到远排序）
 */
export function getAttackableTargets(
  unit: TacticsUnit,
  allUnits: TacticsUnit[],
): TacticsUnit[] {
  if (!unit.position || !unit.alive) return []
  if (unit.has_attacked) return [] // 本回合已攻击

  const targets = allUnits.filter((target) => {
    if (!target.alive) return false
    if (!target.position) return false
    if (target.side === unit.side) return false // 同阵营不能攻击
    return isInRange(unit.position!, target.position, unit.attack_range)
  })

  // 按距离从近到远排序（方便手动模式展示选项）
  targets.sort((a, b) => {
    if (!a.position || !b.position) return 0
    return getRangeDistance(unit.position!, a.position) - getRangeDistance(unit.position!, b.position)
  })

  return targets
}

// ==================== 阵型放置 ====================

/**
 * 开战时按区域摆放所有单位到网格上
 *
 * ==================== 摆放规则 ====================
 * - 我方单位（玩家 + 队友）放在网格左侧（PLAYER_ZONE 区域）
 * - 敌方单位放在网格右侧（ENEMY_ZONE 区域）
 * - 同一阵营内，按 y 轴均匀分布
 * - 如果单位数超过区域格数，自动向中间扩展
 *
 * @param combat 战斗状态（会直接修改其中的 position 字段）
 * @param playerSpeed 玩家的速度值（用于后续行动顺序计算）
 */
export function placeFormation(
  combat: DungeonCombatState,
  playerSpeed: number,
): void {
  const width = combat.grid_width
  const height = combat.grid_height
  const playerZone = TACTICS_CONFIG.PLAYER_ZONE
  const enemyZone = TACTICS_CONFIG.ENEMY_ZONE

  // ---- 我方单位列表（玩家 + 存活队友） ----
  const playerSideUnits: { setPos: (pos: GridPosition) => void }[] = []

  // 玩家
  playerSideUnits.push({
    setPos: (pos: GridPosition) => {
      combat.player_position = pos
    },
  })

  // 存活队友
  for (const ally of combat.allies) {
    if (!ally.down && ally.hp > 0) {
      playerSideUnits.push({
        setPos: (pos: GridPosition) => {
          ally.position = pos
        },
      })
    }
  }

  // ---- 敌方单位列表 ----
  const enemySideUnits: { setPos: (pos: GridPosition) => void }[] = []
  for (const enemy of combat.enemies) {
    if (enemy.hp > 0) {
      enemySideUnits.push({
        setPos: (pos: GridPosition) => {
          enemy.position = pos
        },
      })
    }
  }

  // ---- 摆放我方 ----
  placeUnitsInZone(playerSideUnits, playerZone.x_min, playerZone.x_max, height, width)
  // ---- 摆放敌方 ----
  placeUnitsInZone(enemySideUnits, enemyZone.x_min, enemyZone.x_max, height, width)
}

/**
 * 在指定区域内摆放单位
 *
 * 策略：先填满 x_min 列（从上到下），再填 x_min+1 列，以此类推。
 * 如果区域列数不够，向区域外扩展（优先向中间方向）。
 *
 * @param units 要摆放的单位列表（每个含 setPos 回调）
 * @param xMin 区域左边界
 * @param xMax 区域右边界
 * @param height 网格高度
 * @param width 网格宽度（用于越界保护）
 */
function placeUnitsInZone(
  units: { setPos: (pos: GridPosition) => void }[],
  xMin: number,
  xMax: number,
  height: number,
  width: number,
): void {
  // 生成区域内所有可用格子（按列优先、行从上到下排列）
  const slots: GridPosition[] = []
  for (let x = xMin; x <= xMax && x < width; x++) {
    for (let y = 0; y < height; y++) {
      slots.push({ x, y })
    }
  }

  // 如果格子不够，向中间扩展
  let expandDir = xMin === 0 ? 1 : -1 // 我方向右扩，敌方向左扩
  let expandX = expandDir > 0 ? xMax + 1 : xMin - 1
  while (slots.length < units.length) {
    if (expandX < 0 || expandX >= width) break
    for (let y = 0; y < height; y++) {
      slots.push({ x: expandX, y })
    }
    expandX += expandDir
  }

  // 分配格子
  for (let i = 0; i < units.length && i < slots.length; i++) {
    units[i].setPos(slots[i])
  }
}

// ==================== 行动顺序计算 ====================

/**
 * 计算所有存活单位的行动顺序
 *
 * ==================== 排序规则 ====================
 * 按速度（speed）降序排列，速度相同则按 uid 字母序（保证稳定性）。
 *
 * @param combat 战斗状态
 * @param playerSpeed 玩家的速度值
 * @returns uid 数组，如 ['player', 'enemy:0', 'ally:0', 'enemy:1']
 */
export function calculateTurnOrder(
  combat: DungeonCombatState,
  playerSpeed: number,
): string[] {
  const entries: { uid: string; speed: number }[] = []

  // 玩家
  if (combat.player_hp > 0) {
    entries.push({ uid: playerUid(), speed: playerSpeed })
  }

  // 敌人
  for (let i = 0; i < combat.enemies.length; i++) {
    const enemy = combat.enemies[i]
    if (enemy.hp > 0) {
      entries.push({ uid: enemyUid(i), speed: enemy.speed })
    }
  }

  // 队友
  for (let i = 0; i < combat.allies.length; i++) {
    const ally = combat.allies[i]
    if (!ally.down && ally.hp > 0) {
      entries.push({ uid: allyUid(i), speed: ally.speed })
    }
  }

  // 按速度降序，速度相同按 uid 升序（保证稳定排序）
  entries.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed
    return a.uid.localeCompare(b.uid)
  })

  return entries.map((e) => e.uid)
}

// ==================== 回合内行动状态管理 ====================

/**
 * 重置一个单位本回合的行动标记
 *
 * 每个单位开始行动时调用，把 has_moved 和 has_attacked 重置为 false。
 *
 * @param combat 战斗状态
 * @param uid 要重置的单位 uid
 */
export function resetUnitActions(combat: DungeonCombatState, uid: string): void {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') {
    combat.player_has_moved = false
    combat.player_has_attacked = false
  } else if (parsed.kind === 'enemy') {
    const enemy = combat.enemies[parsed.index]
    if (enemy) {
      enemy.has_moved = false
      enemy.has_attacked = false
    }
  } else if (parsed.kind === 'ally') {
    const ally = combat.allies[parsed.index]
    if (ally) {
      ally.has_moved = false
      ally.has_attacked = false
    }
  }
}

/**
 * 检查一个单位本回合是否已经行动完毕（移动和攻击都用完了）
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 * @returns true=本回合无法再行动
 */
export function isUnitDone(combat: DungeonCombatState, uid: string): boolean {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') {
    return combat.player_has_moved && combat.player_has_attacked
  } else if (parsed.kind === 'enemy') {
    const enemy = combat.enemies[parsed.index]
    if (!enemy) return true
    return enemy.has_moved && enemy.has_attacked
  } else if (parsed.kind === 'ally') {
    const ally = combat.allies[parsed.index]
    if (!ally) return true
    return ally.has_moved && ally.has_attacked
  }
  return true
}

/**
 * 根据 uid 设置单位在网格上的位置
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 * @param pos 新位置坐标
 */
export function setUnitPosition(combat: DungeonCombatState, uid: string, pos: GridPosition): void {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') {
    combat.player_position = pos
  } else if (parsed.kind === 'enemy') {
    const enemy = combat.enemies[parsed.index]
    if (enemy) enemy.position = pos
  } else if (parsed.kind === 'ally') {
    const ally = combat.allies[parsed.index]
    if (ally) ally.position = pos
  }
}

/**
 * 根据 uid 标记单位本回合已移动
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 */
export function markUnitMoved(combat: DungeonCombatState, uid: string): void {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') {
    combat.player_has_moved = true
  } else if (parsed.kind === 'enemy') {
    const enemy = combat.enemies[parsed.index]
    if (enemy) enemy.has_moved = true
  } else if (parsed.kind === 'ally') {
    const ally = combat.allies[parsed.index]
    if (ally) ally.has_moved = true
  }
}

/**
 * 根据 uid 标记单位本回合已攻击
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 */
export function markUnitAttacked(combat: DungeonCombatState, uid: string): void {
  const parsed = parseUid(uid)
  if (parsed.kind === 'player') {
    combat.player_has_attacked = true
  } else if (parsed.kind === 'enemy') {
    const enemy = combat.enemies[parsed.index]
    if (enemy) enemy.has_attacked = true
  } else if (parsed.kind === 'ally') {
    const ally = combat.allies[parsed.index]
    if (ally) ally.has_attacked = true
  }
}

/**
 * 根据 uid 获取对应的 TacticsUnit
 *
 * @param combat 战斗状态
 * @param uid 单位 uid
 * @param playerSpeed 玩家速度（用于填充 TacticsUnit.speed）
 * @returns 战术单位对象，如果找不到返回 null
 */
export function getTacticsUnit(
  combat: DungeonCombatState,
  uid: string,
  playerSpeed: number,
): TacticsUnit | null {
  const units = collectTacticsUnits(combat)
  // 玩家的 speed 需要外部传入，因为 DungeonCombatState 不存玩家速度
  const unit = units.find((u) => u.uid === uid)
  if (!unit) return null
  if (uid === playerUid()) {
    unit.speed = playerSpeed
  }
  return unit
}

// ==================== 最简 AI 决策 ====================

/**
 * AI 目标选择接口（扩展点）
 *
 * 当前实现为"最近敌人"策略。
 * 未来可以通过实现不同的选择函数来扩展 AI 行为。
 */
export interface AIDecision {
  /** AI 决定的行动类型 */
  action: 'move' | 'attack' | 'move_and_attack' | 'wait'
  /** 移动目标格（如果 action 含 move） */
  moveTarget?: GridPosition
  /** 攻击目标 uid（如果 action 含 attack） */
  attackTargetUid?: string
}

/**
 * 最简 AI 决策 — 朝最近敌人移动，进射程就打
 *
 * ==================== 决策逻辑 ====================
 * 1. 如果射程内已有可攻击目标 → 直接攻击（不移动）
 * 2. 如果射程内没有目标 → 朝最近的敌人移动一步
 *    移动到能让自己进入射程的位置（如果能做到）
 * 3. 如果移动后仍无目标 → 结束回合
 *
 * ==================== 扩展预留 ====================
 * AI_TARGET_STRATEGY 配置项预留了 'lowest_hp'、'weakest' 等策略。
 * 未来可以实现不同的目标选择函数，替换这里的"最近"逻辑。
 *
 * @param unit AI 控制的单位
 * @param allUnits 战场上所有单位
 * @param width 网格宽度
 * @param height 网格高度
 * @returns AI 决策结果
 */
export function simpleAIDecide(
  unit: TacticsUnit,
  allUnits: TacticsUnit[],
  width: number,
  height: number,
): AIDecision {
  if (!unit.position || !unit.alive) {
    return { action: 'wait' }
  }

  // 找所有敌方单位
  const enemies = allUnits.filter((u) => u.side !== unit.side && u.alive && u.position)

  if (enemies.length === 0) {
    return { action: 'wait' }
  }

  // 射程内已有目标？
  const inRangeTargets = getAttackableTargets(unit, allUnits)

  if (inRangeTargets.length > 0 && !unit.has_attacked) {
    // 有目标在射程内，直接攻击最近的
    return {
      action: 'attack',
      attackTargetUid: inRangeTargets[0].uid,
    }
  }

  // 射程内没有目标，需要移动
  if (unit.has_moved) {
    // 已经移动过但还没有目标（移动后射程外），结束行动
    return { action: 'wait' }
  }

  // 找最近的敌人
  const nearestEnemy = findNearestEnemy(unit, enemies)

  if (!nearestEnemy || !nearestEnemy.position) {
    return { action: 'wait' }
  }

  // 计算可移动的格子
  const movableCells = getMovableCells(unit, allUnits, width, height)

  if (movableCells.length === 0) {
    // 无法移动，结束行动
    return { action: 'wait' }
  }

  // 找一个移动后能进入射程的格子，优先选离敌人最近的
  let bestCell: GridPosition | null = null
  let bestDist = Infinity

  for (const cell of movableCells) {
    const dist = getRangeDistance(cell, nearestEnemy.position)
    if (dist < bestDist) {
      bestDist = dist
      bestCell = cell
    }
  }

  if (!bestCell) {
    return { action: 'wait' }
  }

  // 移动后是否能在新位置攻击？
  const willBeInRange = bestDist <= unit.attack_range
  if (willBeInRange && !unit.has_attacked) {
    return {
      action: 'move_and_attack',
      moveTarget: bestCell,
      attackTargetUid: nearestEnemy.uid,
    }
  }

  // 只移动，移动后还打不到
  return {
    action: 'move',
    moveTarget: bestCell,
  }
}

/**
 * 找最近的敌方单位
 *
 * 根据 TACTICS_CONFIG.AI_TARGET_STRATEGY 选择策略：
 * - 'nearest'：距离最近（默认）
 * - 'lowest_hp'：血量最低（预留扩展）
 * - 'weakest'：综合最弱（预留扩展）
 *
 * @param unit 当前单位
 * @param enemies 敌方单位列表
 * @returns 最近的敌方单位，如果没有返回 null
 */
function findNearestEnemy(
  unit: TacticsUnit,
  enemies: TacticsUnit[],
): TacticsUnit | null {
  if (!unit.position) return null
  if (enemies.length === 0) return null

  let nearest: TacticsUnit | null = null
  let minDist = Infinity

  for (const enemy of enemies) {
    if (!enemy.position) continue

    const dist = getRangeDistance(unit.position, enemy.position)

    // 根据策略选择（当前只实现 'nearest'）
    if (TACTICS_CONFIG.AI_TARGET_STRATEGY === 'lowest_hp') {
      // 预留扩展：优先选血量最低的，血量相同选最近的
      if (nearest === null || enemy.hp < nearest.hp) {
        nearest = enemy
        minDist = dist
      }
    } else if (TACTICS_CONFIG.AI_TARGET_STRATEGY === 'weakest') {
      // 预留扩展：优先选 max_hp 最低的
      if (nearest === null || enemy.max_hp < nearest.max_hp) {
        nearest = enemy
        minDist = dist
      }
    } else {
      // 默认策略：最近
      if (dist < minDist) {
        minDist = dist
        nearest = enemy
      }
    }
  }

  return nearest
}

// ==================== 战场文字渲染 ====================

/**
 * 生成战场 ASCII 文字地图（用于日志输出）
 *
 * 第一阶段没有图形界面，用文字网格展示战场状态。
 * 每格显示一个字符：
 * - '你' = 玩家
 * - '敌' = 敌人
 * - '友' = 队友
 * - '·' = 空格
 * - '##' = 障碍物（预留，当前不使用）
 *
 * @param combat 战斗状态
 * @returns 字符串数组，每行一个字符串（可直接 push 到日志）
 */
export function renderGridText(combat: DungeonCombatState): string[] {
  const width = combat.grid_width
  const height = combat.grid_height

  // 构建格子映射：cellKey → 显示字符
  const cellMap = new Map<string, string>()

  // 玩家
  if (combat.player_position) {
    cellMap.set(cellKey(combat.player_position), '你')
  }

  // 敌人
  for (const enemy of combat.enemies) {
    if (enemy.hp > 0 && enemy.position) {
      cellMap.set(cellKey(enemy.position), '敌')
    }
  }

  // 队友
  for (const ally of combat.allies) {
    if (!ally.down && ally.hp > 0 && ally.position) {
      cellMap.set(cellKey(ally.position), '友')
    }
  }

  // 生成文字网格
  const lines: string[] = []

  // 顶部坐标标尺
  let header = '   '
  for (let x = 0; x < width; x++) {
    header += `${x} `
  }
  lines.push(header)

  // 分隔线
  lines.push('   ' + '─'.repeat(width * 2))

  // 每行
  for (let y = 0; y < height; y++) {
    let line = `${y}│ `
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`
      const char = cellMap.get(key)
      line += (char ?? '·') + ' '
    }
    lines.push(line)
  }

  return lines
}

// ==================== 工具函数：坐标格式化 ====================

/**
 * 将坐标格式化为可读字符串
 * @param pos 坐标
 * @returns 如 "(3,2)"
 */
export function formatPos(pos: GridPosition): string {
  return `(${pos.x},${pos.y})`
}

/**
 * 将坐标格式化为日志用的中文描述
 * @param pos 坐标
 * @returns 如 "(3,2)"
 */
export function posLabel(pos: GridPosition): string {
  return formatPos(pos)
}
