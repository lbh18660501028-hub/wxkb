/**
 * 《生化危机：蜂巢》— 搜索配置
 *
 * ==================== 设计说明 ====================
 * 本文件定义生化危机副本的搜索物品池和失败惩罚。
 * 每个副本独立配置，不同世界观副本可配置完全不同的物品和惩罚。
 *
 * 搜索流程：
 * 1. 使用 investigation（调查）技能进行 D10 骰子检定
 * 2. 检定成功 → 从 success_pool 加权随机抽取奖励
 * 3. 检定失败 → 从 failure_pool 加权随机抽取惩罚
 * 4. 警戒值固定增加
 * 5. 标记房间已搜索（不可重复）
 *
 * ==================== 如何修改 ====================
 * - 调整物品概率：修改 weight 值（权重越高出现概率越大）
 * - 新增搜索物品：在 success_pool 中添加新条目
 * - 调整失败惩罚：在 failure_pool 中添加/修改条目
 * - 新增副本搜索表：复制此文件到新副本目录并修改内容
 */

import type { SearchTable } from '../../../types/dungeon-v2'

// ==================== 生化危机副本搜索表 ====================

export const SEARCH_TABLE: SearchTable = {
  // -------------------- 快速搜索（1回合，DC 2） --------------------
  quick_search: {
    skill_id: 'investigation',
    dc: 2,
    alert_increase: 2,
    // 成功池：以常见消耗品和工具为主
    success_pool: [
      // 30% — 弹药（最常见战利品）
      {
        weight: 30,
        effect: {
          add_item: 'pistol_ammo',
          log: '在角落的箱子里找到了一盒手枪弹匣。',
        },
      },
      // 25% — 绷带（基础医疗品）
      {
        weight: 25,
        effect: {
          add_item: 'bandage',
          log: '翻出一个急救包，里面还有几卷绷带。',
        },
      },
      // 15% — 保安钥匙（解锁额外路线）
      {
        weight: 15,
        effect: {
          add_item: 'security_key',
          log: '在一具尸体腰间发现了一把保安钥匙。',
        },
      },
      // 10% — 铁管（临时武器）
      {
        weight: 10,
        effect: {
          add_item: 'iron_pipe',
          log: '从废墟中抽出一根铁管，勉强能用作武器。',
        },
      },
      // 20% — 无发现
      {
        weight: 20,
        effect: {
          log: '快速翻找了一遍，没有发现有价值的东西。',
        },
      },
    ],
    // 失败池：轻度惩罚
    failure_pool: [
      // 60% — 警戒值额外上升
      {
        weight: 60,
        effect: {
          security_alert: 3,
          log: '搜索过程中不小心触发了声响，警戒值额外上升。',
        },
      },
      // 25% — 轻度感染
      {
        weight: 25,
        effect: {
          infection: 2,
          log: '触碰了被污染的表面，感染值上升。',
        },
      },
      // 15% — 无事发生
      {
        weight: 15,
        effect: {
          log: '搜索失败，但也没有触发什么不好的事情。',
        },
      },
    ],
  },

  // -------------------- 彻底搜索（2回合，DC 3） --------------------
  deep_search: {
    skill_id: 'investigation',
    dc: 3,
    alert_increase: 5,
    // 成功池：以稀有道具和高级装备为主
    success_pool: [
      // 20% — 医疗包（大量回血）
      {
        weight: 20,
        effect: {
          add_item: 'medical_pack',
          log: '在锁柜里找到了一个完整的医疗包！',
        },
      },
      // 15% — 9mm手枪（武器升级）
      {
        weight: 15,
        effect: {
          add_item: 'pistol_9mm',
          log: '从武器架子上取下一把9mm手枪，状态良好。',
        },
      },
      // 15% — 消防斧（强力近战）
      {
        weight: 15,
        effect: {
          add_item: 'fire_axe',
          log: '在消防箱里找到了一把消防斧。',
        },
      },
      // 10% — 抗病毒喷雾
      {
        weight: 10,
        effect: {
          add_item: 'antivirus_spray',
          log: '发现了一瓶未开封的抗病毒喷雾。',
        },
      },
      // 10% — 燃烧瓶
      {
        weight: 10,
        effect: {
          add_item: 'molotov',
          log: '用找到的材料制作了一个燃烧瓶。',
        },
      },
      // 10% — 弹药×2
      {
        weight: 10,
        effect: {
          add_items: ['pistol_ammo', 'pistol_ammo'],
          log: '在一个弹药箱里找到了两盒手枪弹匣。',
        },
      },
      // 5% — 数据盘（支线道具）
      {
        weight: 5,
        effect: {
          add_item: 'data_disc',
          log: '在暗格中发现了一块数据盘，上面刻着保护伞公司的标志。',
        },
      },
      // 5% — 变异细胞残片（永久道具）
      {
        weight: 5,
        effect: {
          add_item: 'mutant_cell_fragment',
          log: '在培养皿残骸中发现了一块变异细胞残片。',
        },
      },
      // 10% — 无发现
      {
        weight: 10,
        effect: {
          log: '彻底搜索了整个房间，但一无所获。',
        },
      },
    ],
    // 失败池：较重惩罚
    failure_pool: [
      // 35% — 触发尸变（战斗）
      {
        weight: 35,
        effect: {
          start_combat: true,
          spawn_enemies: ['zombie_shambler', 'zombie_runner'],
          log: '翻动杂物时惊动了藏在暗处的丧尸！',
        },
      },
      // 30% — 警戒值大幅上升
      {
        weight: 30,
        effect: {
          security_alert: 8,
          log: '彻底搜索弄出了太大动静，警报系统被激活了！',
        },
      },
      // 20% — 感染值上升
      {
        weight: 20,
        effect: {
          infection: 5,
          log: '深入搜索时接触了大量感染源，感染值显著上升。',
        },
      },
      // 15% — HP损失
      {
        weight: 15,
        effect: {
          hp: -5,
          log: '搜索过程中被尖锐物体划伤，损失了5点生命值。',
        },
      },
    ],
  },
}
