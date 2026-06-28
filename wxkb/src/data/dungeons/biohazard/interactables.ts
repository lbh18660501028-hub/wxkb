/**
 * 《生化危机：蜂巢》— 房间可交互对象配置
 *
 * ==================== 设计说明 ====================
 * 每个房间的 interactables 定义了玩家可以点击的对象。
 * 点击后触发对应的 dialogue_event，进入 TRPG 对话流程。
 *
 * 与旧 visible_objects / conditional_actions 并存：
 * - interactables 优先展示，点击后打开对话弹窗
 * - 旧系统作为后备，保留向后兼容
 *
 * ==================== 如何新增可交互对象 ====================
 * 1. 在对应房间的数组中添加 DungeonInteractable
 * 2. 设置 dialogueEventId 指向 events.ts 中的 DungeonEvent.id
 * 3. 如需条件控制，添加 requirements
 * 4. 如需一次性触发，设置 once: true 和 triggeredFlag
 */

import type { DungeonInteractable } from '../../../types/dungeon-v2'

// ==================== G3 医疗室 ====================

export const G3_INTERACTABLES: DungeonInteractable[] = [
  {
    id: 'rain',
    name: 'Rain — 受伤队员',
    type: 'npc',
    description: '保护伞特安部队成员，手臂被咬伤，正在强撑。',
    icon: '👤',
    dialogueEventId: 'ev_g3_meet_rain',
    // Rain 可以反复对话（态度会随 flag 变化）
    once: false,
  },
  {
    id: 'medical_cabinet',
    name: '医疗柜',
    type: 'container',
    description: '门半开的医疗柜，里面散落着绷带和针管。',
    icon: '💊',
    dialogueEventId: 'ev_g3_medical_cabinet',
    once: true,
    hideAfterTriggered: false,
    triggeredFlag: 'medical_cabinet_searched',
  },
  {
    id: 'blood_stains',
    name: '感染血迹',
    type: 'clue',
    description: '地上的血迹呈现不自然的灰白色，似乎已经凝结了很久。',
    icon: '🩸',
    dialogueEventId: 'ev_g3_blood_stains',
    once: true,
    triggeredFlag: 'blood_stains_examined',
  },
]

// ==================== H3 监控室 ====================

export const H3_INTERACTABLES: DungeonInteractable[] = [
  {
    id: 'red_queen_terminal',
    name: '红后终端',
    type: 'terminal',
    description: '弧形控制台中央的主控终端，红后的全息投影在此运行。',
    icon: '🖥',
    dialogueEventId: 'ev_h3_monitor_hack',
    once: false,
  },
  {
    id: 'surveillance_wall',
    name: '监控屏幕墙',
    type: 'terminal',
    description: '数十个屏幕显示着实验室各区域的实时画面。',
    icon: '📹',
    dialogueEventId: 'ev_h3_surveillance_wall',
    once: true,
    triggeredFlag: 'cameras_viewed',
  },
  {
    id: 'door_records',
    name: '门禁记录面板',
    type: 'terminal',
    description: '门禁系统的出入记录，可能包含关键人员的行动轨迹。',
    icon: '📋',
    dialogueEventId: 'ev_h3_door_records',
    once: true,
    triggeredFlag: 'door_records_checked',
  },
]

// ==================== I3 激光入口 ====================

export const I3_INTERACTABLES: DungeonInteractable[] = [
  {
    id: 'kaplan',
    name: 'Kaplan — 技术员',
    type: 'npc',
    description: '特安部队技术员，正在尝试破解激光走廊系统。',
    icon: '👤',
    dialogueEventId: 'ev_i3_laser_entrance',
    once: false,
  },
  {
    id: 'laser_console',
    name: '激光控制台',
    type: 'mechanism',
    description: '控制面板上显示"激光系统：运行中"。面板有一个维护端口。',
    icon: '⚡',
    dialogueEventId: 'ev_i3_laser_console',
    once: false,
  },
  {
    id: 'cut_marks',
    name: '切割痕迹',
    type: 'clue',
    description: '金属地面上有深深的切割痕迹，边缘焦黑，散发着焦糊味。',
    icon: '✂',
    dialogueEventId: 'ev_i3_cut_marks',
    once: true,
    triggeredFlag: 'cut_marks_examined',
  },
]

// ==================== F5 培养室 ====================

export const F5_INTERACTABLES: DungeonInteractable[] = [
  {
    id: 'broken_pod',
    name: '破损培养舱',
    type: 'anomaly',
    description: '三个培养罐中有一个已经破裂，培养液流了一地，生物组织不见了。',
    icon: '🧪',
    dialogueEventId: 'ev_f5_broken_pod',
    once: true,
    triggeredFlag: 'broken_pod_examined',
  },
  {
    id: 'lab_terminal',
    name: '实验记录终端',
    type: 'terminal',
    description: '培养室角落的终端，屏幕上滚动着实验数据。',
    icon: '💻',
    dialogueEventId: 'ev_f5_lab_terminal',
    once: true,
    triggeredFlag: 'lab_terminal_checked',
  },
  {
    id: 'vent_anomaly',
    name: '通风管道异常',
    type: 'anomaly',
    description: '天花板上的通风管道传来不规律的刮擦声，似乎有什么东西在里面移动。',
    icon: '🌪',
    dialogueEventId: 'ev_f5_vent_anomaly',
    once: true,
    triggeredFlag: 'vent_anomaly_checked',
  },
]
