/**
 * 《生化危机：蜂巢》— 任务配置
 *
 * ==================== 任务清单 ====================
 * 主线任务 (7):
 * 1. main_awaken          — 苏醒
 * 2. main_enter_lab       — 进入实验室
 * 3. main_restore_power   — 恢复备用电力
 * 4. main_get_sample      — 取得 T 病毒样本
 * 5. main_pass_laser      — 通过激光走廊
 * 6. main_process_queen   — 处理红后
 * 7. main_evacuate        — 撤离
 *
 * 支线任务 (6):
 * 1. side_save_rain       — 救下 Rain Ocampo
 * 2. side_find_prototype  — 寻找抗病毒原型样本
 * 3. side_get_secrets     — 取得保护伞公司机密档案
 * 4. side_destroy_tanks   — 破坏培养罐
 * 5. side_kill_licker     — 猎杀舔食者
 * 6. side_save_rookie     — 救下冲动型新人轮回者
 *
 * ==================== 如何新增任务 ====================
 * 1. 在 mainQuests 或 sideQuests 中添加新条目
 * 2. 在房间配置的 quest_hooks 中引用任务 ID
 * 3. 在 conditional_actions 中通过 complete_objective 推进任务
 */

import type { QuestConfig } from '../../../types/dungeon-v2'

// ==================== 主线任务 ====================

export const MAIN_QUESTS: QuestConfig[] = [
  {
    id: 'main_awaken',
    type: 'main',
    title: '苏醒',
    description: '在地铁站醒来，了解当前状况，寻找出路。',
    status: 'available',
    objectives: [
      {
        id: 'obj_awaken',
        description: '在地铁站检查周围环境',
        status: 'available',
        trigger_actions: ['inspect_start'],
      },
    ],
    reward: '了解副本基本操作',
  },
  {
    id: 'main_enter_lab',
    type: 'main',
    title: '进入实验室',
    description: '穿过装卸月台和安检大厅，进入实验室主体区域。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_pass_security',
        description: '通过安检大厅（蓝色权限卡或黑客）',
        status: 'available',
        trigger_actions: ['pass_security', 'hack_security'],
      },
    ],
    reward: '进入实验室主体',
  },
  {
    id: 'main_restore_power',
    type: 'main',
    title: '恢复备用电力',
    description: '在配电室取得备用保险丝，到发电机房恢复电力。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_get_fuse',
        description: '在配电室取得备用保险丝',
        status: 'available',
        trigger_actions: ['get_fuse'],
      },
      {
        id: 'obj_restore_power',
        description: '在发电机房插入保险丝恢复电力',
        status: 'available',
        trigger_actions: ['restore_power'],
      },
    ],
    reward: '电力恢复，解锁更多区域',
  },
  {
    id: 'main_get_sample',
    type: 'main',
    title: '取得 T 病毒样本',
    description: '在样本库取得 T 病毒样本。后续可选择直接取走、销毁、标记或冷藏。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_get_sample',
        description: '在样本库处理 T 病毒样本',
        status: 'available',
        trigger_actions: ['take_virus_sample', 'destroy_virus_sample', 'freeze_virus_sample', 'mark_sample'],
      },
    ],
    reward: 'T 病毒样本箱',
  },
  {
    id: 'main_pass_laser',
    type: 'main',
    title: '通过激光走廊',
    description: '在监控室获取激光频率记录并关闭激光，然后通过激光走廊。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_disable_laser',
        description: '在监控室关闭激光系统',
        status: 'available',
        trigger_actions: ['disable_laser'],
      },
      {
        id: 'obj_pass_laser',
        description: '安全通过激光走廊',
        status: 'available',
        trigger_actions: ['pass_laser_corridor'],
      },
    ],
    reward: '进入红后主机房区域',
  },
  {
    id: 'main_process_queen',
    type: 'main',
    title: '处理红后',
    description: '在红后主机房处理红后，开启自毁倒计时。可选择关闭、说服、复制或攻击。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_process_queen',
        description: '处理红后',
        status: 'available',
        trigger_actions: ['shutdown_queen', 'persuade_queen', 'copy_queen', 'attack_queen'],
      },
    ],
    reward: '开启撤离通道，自毁倒计时启动',
  },
  {
    id: 'main_evacuate',
    type: 'main',
    title: '撤离',
    description: '在自毁倒计时归零前抵达撤离列车。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_reach_train',
        description: '抵达撤离列车',
        status: 'available',
        trigger_actions: ['reach_evac_train'],
      },
      {
        id: 'obj_evacuate',
        description: '登上撤离列车撤离',
        status: 'available',
        trigger_actions: ['evacuate'],
      },
    ],
    reward: '完成副本',
  },
]

// ==================== 支线任务 ====================

export const SIDE_QUESTS: QuestConfig[] = [
  {
    id: 'side_save_rain',
    type: 'side',
    title: '救下 Rain Ocampo',
    description: '在医疗室救助受伤的 Rain Ocampo，并保护她撤离。Rain 被 T 病毒感染，需要抗病毒喷雾或医疗包稳定伤势。',
    status: 'available',
    objectives: [
      {
        id: 'obj_help_rain',
        description: '给 Rain 使用抗病毒喷雾或医疗包',
        status: 'available',
        trigger_actions: ['help_rain'],
      },
      {
        id: 'obj_rain_survive',
        description: 'Rain 存活至撤离',
        status: 'available',
        trigger_actions: ['rain_evacuated'],
      },
    ],
    reward: '抗病毒血清配方残页，Rain 信任度提升',
  },
  {
    id: 'side_find_prototype',
    type: 'side',
    title: '寻找抗病毒原型样本',
    description: '在 G3 医疗室发现抗病毒原型记录后，前往 H6 医生办公室获取索引，到 G4 冷冻室找到样本，G5 获取实验记录，最终对 Rain 使用。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_check_medical_terminal',
        description: '在 G3 医疗室检查终端，发现抗病毒原型记录',
        status: 'available',
        trigger_actions: ['check_medical_terminal'],
      },
      {
        id: 'obj_get_prototype_index',
        description: '在 H6 医生办公室获取抗病毒原型索引',
        status: 'available',
        trigger_actions: ['get_prototype_index'],
      },
      {
        id: 'obj_get_prototype_sample',
        description: '在 G4 冷冻室找到抗病毒原型样本',
        status: 'available',
        trigger_actions: ['get_prototype_sample'],
      },
      {
        id: 'obj_get_infection_record',
        description: '在 G5 动物实验室获取感染实验反应记录',
        status: 'available',
        trigger_actions: ['get_infection_record'],
      },
      {
        id: 'obj_use_prototype_on_rain',
        description: '对 Rain 使用抗病毒原型样本',
        status: 'available',
        trigger_actions: ['use_prototype_on_rain'],
      },
    ],
    reward: 'Rain 感染值 -60，抗病毒血清配方残页，T 病毒抗体数据',
  },
  {
    id: 'side_get_secrets',
    type: 'side',
    title: '取得保护伞公司机密档案',
    description: '在 E1 资料库或 I6 档案室找到并带走保护伞公司的机密数据盘。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_find_archive',
        description: '找到公司机密档案',
        status: 'available',
        trigger_actions: ['find_data_disc', 'find_company_secrets'],
      },
    ],
    reward: '保护伞公司机密档案（永久道具），红后说服条件之一',
  },
  {
    id: 'side_destroy_tanks',
    type: 'side',
    title: '破坏培养罐',
    description: '在 I4 生物罐区破坏控制阀，在 F5 培养室破坏培养罐，削弱最终 BOSS 舔食者。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_destroy_valve',
        description: '破坏 I4 生物罐区控制阀',
        status: 'available',
        trigger_actions: ['destroy_i4_valve'],
      },
      {
        id: 'obj_destroy_tanks',
        description: '破坏 F5 培养室的所有培养罐',
        status: 'available',
        trigger_actions: ['destroy_culture_tanks'],
      },
    ],
    reward: '舔食者最大生命值降低，不再自动回血',
  },
  {
    id: 'side_kill_licker',
    type: 'side',
    title: '猎杀舔食者',
    description: '在变异巢穴找到并消灭舔食者。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_kill_licker',
        description: '消灭舔食者',
        status: 'available',
        trigger_actions: ['kill_licker'],
      },
    ],
    reward: '变异细胞残片，额外奖励点',
  },
  {
    id: 'side_save_rookie',
    type: 'side',
    title: '救下冲动型新人轮回者',
    description: '在激光入口阻止冲动型新人强闯激光走廊，救下其性命。',
    status: 'locked',
    objectives: [
      {
        id: 'obj_stop_rookie',
        description: '在激光入口阻止冲动型新人',
        status: 'available',
        trigger_actions: ['stop_reckless_npc'],
      },
    ],
    reward: 'NPC 信任度大幅提升，获得隐藏情报',
  },
]

// ==================== 导出全部任务 ====================

export const ALL_QUESTS: QuestConfig[] = [...MAIN_QUESTS, ...SIDE_QUESTS]
