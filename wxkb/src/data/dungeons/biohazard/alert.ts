/**
 * 《生化危机：蜂巢》— 警戒值配置
 *
 * ==================== 设计说明 ====================
 * 本文件定义生化危机副本的警戒值系统配置。
 * 每个副本独立配置，不同世界观副本可配以完全不同的阶段和效果。
 *
 * 警戒值范围：0—100
 * | 警戒值   | 阶段ID    | 状态        | 效果                                |
 * | -------- | --------- | ----------- | ----------------------------------- |
 * | 0—29     | low       | 低警戒       | 敌人巡逻减少                         |
 * | 30—59    | camera    | 摄像头苏醒   | 随机遭遇概率小幅上升                 |
 * | 60—79    | tracking  | AI定位玩家   | 遭遇概率上升，无人机加入巡逻          |
 * | 80—99    | elite     | 精英敌人巡逻 | 遭遇概率大幅上升，NPC恐惧增加        |
 * | 100      | protocol  | 清除协议启动 | 遭遇概率极高，精英+无人机全出         |
 *
 * ==================== 警戒值增加方式 ====================
 * 通过 ActionEffect.security_alert 在房间动作/事件选项中配置：
 * - 开枪: +3（需在战斗系统中实现）
 * - 爆破开门: +15（J4/K4 爆破动作）
 * - 黑客失败: +10（E3 hack_security 的 failure_effect）
 * - 破坏摄像头: +5（H3 destroy_camera 动作）
 * - 拿走病毒样本: +15（F4 take_virus_sample）
 * - 攻击 AI 核心: +30（K3 destroy_ai 事件选项）
 * - 搜索: +2/+5（search.ts 中 alert_increase）
 *
 * ==================== 如何新增副本警戒值 ====================
 * 1. 复制此文件到新副本目录
 * 2. 修改 tiers 数组定义自己的阶段
 * 3. 在 data/dungeons/index.ts 的 bundle 中引用
 */
import type { AlertConfig } from '../../../types/dungeon-v2'

export const ALERT_CONFIG: AlertConfig = {
  max: 100,
  tiers: [
    {
      id: 'low',
      min: 0,
      max: 29,
      name: '低警戒',
      description: '安保系统处于待机状态，敌人巡逻减少。',
      color: '#00ff88',
      // 低警戒无额外效果
    },
    {
      id: 'camera',
      min: 30,
      max: 59,
      name: '摄像头苏醒',
      description: '监控系统已检测到异常活动，随机遭遇概率小幅上升。',
      color: '#ffd700',
      encounter_bonus: 0.05,
    },
    {
      id: 'tracking',
      min: 60,
      max: 79,
      name: 'AI 定位玩家',
      description: '红后开始追踪你的位置，安全无人机加入巡逻。',
      color: '#ff8800',
      encounter_bonus: 0.10,
      patrol_enemies: ['security_drone'],
    },
    {
      id: 'elite',
      min: 80,
      max: 99,
      name: '精英敌人巡逻',
      description: '全设施进入高度戒备，精英单位主动搜索入侵者，NPC 恐惧值上升。',
      color: '#ff3366',
      encounter_bonus: 0.20,
      npc_fear_per_turn: 2,
      patrol_enemies: ['security_drone', 'infected_guard'],
    },
    {
      id: 'protocol',
      min: 100,
      max: 100,
      name: '清除协议启动',
      description: '全设施启动清除协议，所有安保单位执行猎杀指令。',
      color: '#ff0000',
      encounter_bonus: 0.40,
      npc_fear_per_turn: 5,
      patrol_enemies: ['security_drone', 'security_drone', 'infected_guard'],
    },
  ],
}
