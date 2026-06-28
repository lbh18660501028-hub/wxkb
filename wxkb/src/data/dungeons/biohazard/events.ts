/**
 * 《生化危机：蜂巢》— 事件配置
 *
 * ==================== 事件系统设计 ====================
 * 事件配置完全独立于房间配置，通过 EventRef 关联
 * 支持 6 种触发类型：
 * - first_enter:       首次进入房间
 * - action_trigger:    点击特定按钮
 * - item_use:          使用特定道具
 * - npc_state:         NPC 状态达到条件
 * - global_state:      全局状态达到条件
 * - random_encounter:  随机遭遇
 *
 * ==================== 如何新增事件 ====================
 * 1. 在 EVENTS 数组中添加新事件
 * 2. 在房间配置的 events 字段引用事件 ID
 */

import type { DungeonEvent } from '../../../types/dungeon-v2'

export const EVENTS: DungeonEvent[] = [
  // ==================== B3 地铁站：开场 ====================
  {
    id: 'ev_b3_awaken',
    trigger: { type: 'first_enter', room: 'B3' },
    once: true,
    description: '你在黑暗的地铁站中醒来。',
    dialogue: [
      {
        speaker: '主神',
        text: '欢迎来到主神空间。当前副本：生化危机·蜂巢。难度：D。主线目标：探索保护伞公司地下实验室，处理失控 AI「红后」，获取 T 病毒样本，最终撤离。时限：120 回合。祝你好运——你会需要的。',
      },
      {
        speaker: '???',
        text: '喂……你醒了？太好了……我以为只剩我一个活人了。这边还有两个，他们也刚醒。',
      },
    ],
    choices: [
      {
        id: 'check_surroundings',
        label: '检查周围环境',
        effect: {
          set_flag: 'awakened',
          log: '你环顾四周，确认了当前位置：保护伞公司蜂巢设施的地下地铁站。',
          complete_objective: 'obj_awaken',
        },
        result_text: '你记住了地铁站的布局。东边有一列停运的列车，也许里面有有用的东西。',
      },
      {
        id: 'talk_to_survivors',
        label: '和幸存者交谈',
        effect: {
          set_flag: 'met_survivors',
          log: '你和其他三名新人轮回者交换了信息。他们看起来各有特长，但也各怀心思。',
        },
        result_text: '三名新人自我介绍后，你们决定暂时同行——至少在找到出路之前。',
      },
    ],
  },

  // ==================== D3 装卸月台：首次战斗 + 遇到 Rain ====================
  {
    id: 'ev_d3_first_combat',
    trigger: { type: 'first_enter', room: 'D3' },
    once: true,
    description: '装卸月台上传来沙沙声。',
    dialogue: [
      {
        speaker: '叙事',
        text: '装卸月台上堆满了翻倒的货物箱。你听到箱后传来沙沙声和低沉的嘶吼。两具穿着实验服的身影摇晃着站了起来——它们的皮肤已经变成灰紫色，嘴角滴着黑色液体。',
      },
      {
        speaker: '???',
        text: '趴下！',
      },
      {
        speaker: '叙事',
        text: '一声枪响，一个感染者的头爆开了。一名身穿黑色战术服、短发利落的女性从叉车后闪出，手中的手枪还冒着烟。她是保护伞特安部队的成员——Rain Ocampo。',
      },
      {
        speaker: 'Rain',
        text: '你们是主神空间的轮回者？One 队长让我接应你们。这些家伙曾经是实验室的员工……现在只需要爆头。别废话，先解决剩下的！',
      },
    ],
    auto_effects: {
      log: '遭遇感染员工 ×2！Rain 加入战斗！战斗开始！',
      start_combat: true,
      spawn_enemies: ['infected_worker', 'infected_worker'],
    },
  },

  // ==================== E3 安检大厅：路线分歧 ====================
  {
    id: 'ev_e3_route_branch',
    trigger: { type: 'first_enter', room: 'E3' },
    once: true,
    description: '安检大厅连接着多条路线。',
    dialogue: [
      {
        speaker: '叙事',
        text: '安检大厅的电子门禁紧锁，面板上显示"需要一级权限卡"。你注意到大厅有两条主要路线：北边的维修走廊通往配电室和发电机房，南边则通往主大厅和实验区。',
      },
      {
        speaker: '冷静型新人',
        text: '北边的配电室应该有备用保险丝——恢复电力后很多门禁都能用。南边主大厅直通实验区，但没有权限卡可能过不去。先去哪？',
      },
    ],
    choices: [
      {
        id: 'go_north_power',
        label: '北线：先恢复电力（D2→D1→C2）',
        effect: {
          set_flag: 'chose_north_route',
          start_quest: 'main_restore_power',
          log: '你决定先走北线恢复电力。从 D2 维修走廊可以通往 D1 配电室。',
        },
        result_text: '北线虽然绕路，但恢复电力后很多门禁和电梯都能使用。',
      },
      {
        id: 'go_south_lab',
        label: '南线：直奔实验区（D4→E4）',
        effect: {
          set_flag: 'chose_south_route',
          log: '你决定走南线直奔实验区。从 D4 主大厅可以通往 E4 实验一区。',
        },
        result_text: '南线更快到达实验区，但没有电力支持可能遇到更多阻碍。',
      },
    ],
  },

  // ==================== G3 医疗室：遇到 Rain（受伤） ====================
  {
    id: 'ev_g3_meet_rain',
    trigger: { type: 'first_enter', room: 'G3' },
    once: true,
    description: '医疗室角落传来微弱的呻吟声。',
    dialogue_event: {
      id: 'rain_infected_wound',
      title: '被咬伤的队员',
      sceneText: '医疗室里弥漫着消毒水和血腥味。Rain 坐在墙边，战术服被撕开一道口子，手臂上的咬痕正在渗血，周围皮肤泛着不自然的灰白。',
      speaker: {
        npcId: 'rain',
        name: 'Rain',
        attitude: '暴躁 / 警惕',
      },
      lines: [
        {
          speaker: 'Rain',
          emotion: 'anger',
          text: '别碰我。我还能走，也还能开枪。你要是想拿我当实验品，就先问问我的枪。',
        },
        {
          speaker: '叙事',
          emotion: 'pain',
          text: '她把受伤的手臂藏到身后，但袖口已经被血浸透。她的呼吸很稳，稳得像是在强行压住某种颤抖。',
        },
      ],
      options: [
        {
          id: 'check_wound',
          label: '检查她的伤口',
          description: '确认感染速度，并判断还能拖多久。',
          check: { skillId: 'medicine', dc: 3 },
          allowCostlySuccess: true,
          usage: {
            mode: 'onceOnSuccess',
            disableInsteadOfHide: true,
            usedText: '已经检查过伤口了。',
          },
          outcomes: {
            criticalSuccess: {
              text: '你迅速判断出咬伤已经进入早期感染，但还没有越过不可逆节点。你用止血带和消毒剂压住扩散，Rain 的表情终于松动了一点。',
              effects: [
                { type: 'modify_infection', value: -5 },
                { type: 'modify_npc_attitude', targetId: 'rain', value: 2 },
                { type: 'set_flag', key: 'rain_infection_known', value: true },
                { type: 'add_log', value: '你确认 Rain 的感染仍有抢救窗口。' },
              ],
            },
            success: {
              text: '你确认她已经感染，但伤口还来得及处理。Rain 沉默地把手臂伸出来，默认你继续。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: 1 },
                { type: 'set_flag', key: 'rain_infection_known', value: true },
                { type: 'add_log', value: '获得情报：Rain 的感染尚未失控。' },
              ],
            },
            costlySuccess: {
              text: '你勉强完成检查，但动作太急，Rain 疼得差点拔枪。你得到了感染情报，也失去了一点信任。',
              effects: [
                { type: 'set_flag', key: 'rain_infection_known', value: true },
                { type: 'modify_npc_attitude', targetId: 'rain', value: -1 },
              ],
            },
            failure: {
              text: 'Rain 甩开了你的手，药盘被撞翻在地。金属声在医疗室里回荡，远处似乎有什么东西被惊动了。',
              effects: [
                { type: 'modify_alert', value: 5 },
                { type: 'modify_npc_attitude', targetId: 'rain', value: -1 },
              ],
            },
          },
        },
        {
          id: 'read_symptoms',
          label: '判断她是否在隐瞒症状',
          description: '她的愤怒可能不是单纯的疼痛。',
          check: { skillId: 'empathy', dc: 3 },
          usage: {
            mode: 'onceOnSuccess',
            disableInsteadOfHide: true,
            usedText: '已经看穿了她的状态。',
          },
          outcomes: {
            success: {
              text: '你看出她不是不怕，而是在害怕自己已经开始变成那些东西。她的手指偶尔抽搐，像在压制咬人的冲动。',
              effects: [
                { type: 'set_flag', key: 'rain_symptoms_known', value: true },
                { type: 'add_log', value: '你发现 Rain 正在隐瞒感染症状。' },
              ],
              nextEventId: 'ev_g3_rain_symptoms',
            },
            failure: {
              text: '她把所有破绽都藏进了愤怒里。你只看到一个不愿示弱的士兵。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: -1 },
              ],
            },
          },
        },
        {
          id: 'calm_rain',
          label: '安抚她配合处理',
          description: '让她相信你不是在夺走她最后的控制权。',
          check: { skillId: 'persuasion', dc: 4 },
          allowCostlySuccess: true,
          usage: {
            mode: 'onceOnSuccess',
            disableInsteadOfHide: true,
            usedText: '已经安抚过她了。',
          },
          outcomes: {
            success: {
              text: '你放低声音，把处理步骤逐条说清。Rain 咬着牙点头，枪口终于离开了你的胸口。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: 1 },
                { type: 'add_log', value: '队伍士气稳定：Rain 暂时愿意配合医疗处理。' },
              ],
            },
            costlySuccess: {
              text: '她同意配合，但要求你动作快点。医疗室里的气氛依然绷紧。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: 1 },
                { type: 'modify_alert', value: 3 },
              ],
            },
            failure: {
              text: '你的话听起来太像命令。Rain 冷笑一声，把枪重新握紧。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: -2 },
              ],
            },
          },
        },
        {
          id: 'force_weapon',
          label: '强行要求她交出武器',
          description: '降低她失控时的风险，但这会被视为威胁。',
          check: { skillId: 'persuasion', attributeId: 'strength', dc: 3, label: '[威慑 DC3]' },
          usage: {
            mode: 'once',
            disableInsteadOfHide: true,
            usedText: '已经为武器问题对峙过了。',
          },
          outcomes: {
            success: {
              text: '你压住枪身，把话说得很冷。Rain 盯着你几秒，最终把备用手枪拍在床沿上。',
              effects: [
                { type: 'add_item', key: 'pistol_9mm' },
                { type: 'modify_npc_attitude', targetId: 'rain', value: -2 },
                { type: 'set_flag', key: 'rain_disarmed', value: true },
              ],
            },
            failure: {
              text: '她的反应比你更快。枪口上抬，保险打开，医疗室瞬间安静下来。',
              effects: [
                { type: 'modify_alert', value: 8 },
                { type: 'modify_npc_attitude', targetId: 'rain', value: -2 },
              ],
            },
          },
        },
        {
          id: 'use_antivirus_spray',
          label: '给她使用抗病毒喷雾',
          description: '直接稳定伤势。',
          requirements: [
            { type: 'item', key: 'antivirus_spray', visibleWhenUnmet: true, unmetText: '需要抗病毒喷雾' },
          ],
          usage: {
            mode: 'once',
            destroyOnSelect: true,
            disableInsteadOfHide: true,
            usedText: '已经用抗病毒喷雾处理过伤口了。',
          },
          outcomes: {},
          directOutcome: {
            text: '你用抗病毒喷雾压住伤口周围的灰化。Rain 闭上眼缓了几秒，再睁开时敌意淡了很多。',
            effects: [
              { type: 'remove_item', key: 'antivirus_spray' },
              { type: 'modify_npc_attitude', targetId: 'rain', value: 2 },
              { type: 'set_flag', key: 'rain_helped', value: true },
              { type: 'advance_quest', key: 'obj_help_rain' },
              { type: 'add_log', value: 'Rain 的伤势被暂时稳定。' },
            ],
          },
        },
      ],
    },
  },

  {
    id: 'ev_g3_rain_symptoms',
    trigger: { type: 'global_state', global_flag: 'dialogue_only_rain_symptoms' },
    once: false,
    description: 'Rain 隐瞒的症状。',
    dialogue_event: {
      id: 'rain_symptom_confession',
      title: '她没有说出口的事',
      sceneText: '你点破她的症状后，Rain 的表情短暂空白。医疗室的冷白灯映在她眼睛里，像一层薄冰。',
      speaker: {
        npcId: 'rain',
        name: 'Rain',
        attitude: '动摇',
      },
      lines: [
        {
          speaker: 'Rain',
          emotion: 'fear',
          text: '我刚才……想咬人。只有一秒。别告诉 One，也别让 Kaplan 知道。他们会把我留在这里。',
        },
      ],
      options: [
        {
          id: 'promise_control',
          label: '承诺会盯住她的症状',
          usage: {
            mode: 'once',
            disableInsteadOfHide: true,
            usedText: '已经做出了承诺。',
          },
          outcomes: {},
          directOutcome: {
            text: '你告诉她：隐瞒会害死所有人，但你不会立刻放弃她。Rain 点了点头，把备用弹匣递给你保管。',
            effects: [
              { type: 'modify_npc_attitude', targetId: 'rain', value: 1 },
              { type: 'add_item', key: 'pistol_ammo' },
              { type: 'set_flag', key: 'rain_symptoms_logged', value: true },
            ],
          },
        },
        {
          id: 'make_it_public',
          label: '要求她向队伍公开感染症状',
          check: { skillId: 'persuasion', dc: 3 },
          usage: {
            mode: 'onceOnSuccess',
            disableInsteadOfHide: true,
            usedText: '已经处理过公开事项了。',
          },
          outcomes: {
            success: {
              text: 'Rain 压着怒气承认你说得对。公开症状让队伍短暂慌乱，但也避免了更糟的误判。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: 1 },
                { type: 'set_flag', key: 'rain_symptoms_public', value: true },
                { type: 'add_log', value: '队伍已知晓 Rain 的感染症状。' },
              ],
            },
            failure: {
              text: '她认为你是在逼她等死。Rain 再次把自己封闭起来。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'rain', value: -2 },
              ],
            },
          },
        },
      ],
    },
  },

  // ==================== H3 监控室：黑客操作 ====================
  {
    id: 'ev_h3_monitor_hack',
    trigger: { type: 'action_trigger', action_id: 'hack_monitor' },
    once: true,
    description: '监控室的终端可以操作。',
    dialogue_event: {
      id: 'red_queen_terminal',
      title: '红后终端',
      sceneText: '监控室的弧形屏幕墙仍在运行。画面上，激光走廊被红色网格切成碎片；主控台中央，一个儿童声线的 AI 警告你离开。',
      speaker: {
        npcId: 'red_queen',
        name: '红后',
        attitude: '冷静 / 威胁',
      },
      lines: [
        {
          speaker: '红后',
          emotion: 'calm',
          text: '未经授权的访客，请离开监控室。继续接入将触发蜂巢安保协议。',
        },
        {
          speaker: 'Kaplan',
          emotion: 'panic',
          text: '它在主动盯我们。别把这东西当普通门禁，红后的反制比公司手册写得更脏。',
        },
      ],
      options: [
        {
          id: 'hack_red_queen_terminal',
          label: '尝试绕过权限',
          description: '直接破解激光走廊安全协议。',
          requirements: [
            { type: 'item', key: 'hack_tool', visibleWhenUnmet: true, unmetText: '需要黑客工具' },
            { type: 'flag', key: 'red_queen_protocol_known', operator: '!=', value: true },
          ],
          check: { skillId: 'hacking', dc: 4 },
          allowCostlySuccess: true,
          outcomes: {
            criticalSuccess: {
              text: '你绕开红后的监控沙箱，把激光走廊频率记录完整拖了出来。系统甚至来不及升高警戒。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'modify_alert', value: -10 },
                { type: 'add_log', value: '激光系统已关闭，J3 可以安全通过。' },
              ],
            },
            success: {
              text: '你找到了权限绕行点，关闭了激光系统。红后的声音停顿了一瞬，像是在重新计算你的威胁等级。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
              ],
            },
            costlySuccess: {
              text: '你关掉了激光，但红后在最后一秒记录了你的接入指纹。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'modify_alert', value: 8 },
              ],
            },
            failure: {
              text: '红后的防火墙反咬回来，屏幕短暂闪成血红色。你被踢出了系统。',
              effects: [
                { type: 'modify_alert', value: 12 },
                { type: 'add_log', value: '红后记录了你的未授权接入。' },
              ],
            },
          },
        },
        {
          id: 'hack_red_queen_terminal_prepared',
          label: '利用已识别协议绕过权限',
          description: '你已经看懂了保护伞的协议结构。',
          requirements: [
            { type: 'item', key: 'hack_tool', visibleWhenUnmet: true, unmetText: '需要黑客工具' },
            { type: 'flag', key: 'red_queen_protocol_known', operator: '==', value: true },
          ],
          check: { skillId: 'hacking', dc: 3 },
          outcomes: {
            success: {
              text: '有了协议结构作参照，红后的权限墙变得像一张标注过的地图。你关闭了激光走廊。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
              ],
            },
            failure: {
              text: '你判断对了协议，却低估了红后的实时反制。系统锁死了你的入口。',
              effects: [
                { type: 'modify_alert', value: 8 },
              ],
            },
          },
        },
        {
          id: 'identify_umbrella_protocol',
          label: '识别保护伞安保协议',
          description: '先读懂系统，再决定怎么动手。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '你认出这套协议来自保护伞内部的蜂巢隔离标准：它不是为了保护人员，而是为了保证样本不离开设施。',
              effects: [
                { type: 'set_flag', key: 'red_queen_protocol_known', value: true },
                { type: 'add_log', value: '后续红后终端黑客检定 DC 降低。' },
              ],
            },
            failure: {
              text: '协议命名被刻意混淆，你只看出它和普通商业安防完全不同。',
              effects: [
                { type: 'modify_alert', value: 3 },
              ],
            },
          },
        },
        {
          id: 'negotiate_with_red_queen',
          label: '试图与红后谈判',
          description: '让 AI 给出它真正害怕的东西。',
          check: { skillId: 'persuasion', dc: 5 },
          outcomes: {
            success: {
              text: '你没有说服红后，但让她透露了底线：舔食者不能离开蜂巢，哪怕要牺牲所有幸存者。',
              effects: [
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'add_log', value: '你提前得知舔食者风险。' },
              ],
            },
            failure: {
              text: '红后把你的话归类为噪声。屏幕上的倒计时闪了一下，又恢复平静。',
              effects: [
                { type: 'modify_alert', value: 5 },
              ],
            },
          },
        },
        {
          id: 'smash_terminal',
          label: '直接破坏终端',
          description: '短期切断部分监控，但动静会很大。',
          outcomes: {},
          directOutcome: {
            text: '你砸碎了主控台的外壳。几块屏幕熄灭，附近摄像头短暂掉线，但蜂巢警报立刻升高。',
            effects: [
              { type: 'set_flag', key: 'cameras_destroyed', value: true },
              { type: 'modify_alert', value: 20 },
              { type: 'add_log', value: '部分监控暂时关闭，但红后已确认物理破坏。' },
            ],
          },
        },
      ],
    },
  },

  // ==================== I3 激光入口：One 的牺牲 ====================
  {
    id: 'ev_i3_laser_entrance',
    trigger: { type: 'first_enter', room: 'I3' },
    once: true,
    preconditions: [],
    description: '激光走廊入口处，One 队长查看情况。',
    dialogue_event: {
      id: 'kaplan_laser_hesitation',
      title: 'Kaplan 的犹豫',
      sceneText: '激光走廊入口前，红色光线在墙面上游动。Kaplan 把便携终端接上控制面板，手指悬在键盘上，却迟迟没有按下确认。',
      speaker: {
        npcId: 'kaplan',
        name: 'Kaplan',
        attitude: '紧张 / 自责',
      },
      lines: [
        {
          speaker: 'Kaplan',
          emotion: 'fear',
          text: '红后在反制我。每次我接近频率表，它就换一层壳。我能继续，但如果我错了，走廊里的人会被切成碎片。',
        },
        {
          speaker: 'One',
          emotion: 'anger',
          text: '我们没有时间让你害怕，Kaplan。要么关掉它，要么让路。',
        },
      ],
      options: [
        {
          id: 'encourage_kaplan',
          label: '鼓励他继续',
          description: '让 Kaplan 稳住手，把操作做完。',
          check: { skillId: 'persuasion', dc: 3 },
          outcomes: {
            success: {
              text: '你把问题拆成几个明确步骤，让 Kaplan 只盯住下一行代码。他重新接入系统，呼吸终于稳下来。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
                { type: 'set_flag', key: 'kaplan_steady', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
                { type: 'add_log', value: 'Kaplan 稳住了，后续激光风险降低。' },
              ],
            },
            failure: {
              text: '你的鼓励没有落到点上。Kaplan 的手指抖了一下，终端发出刺耳警告。',
              effects: [
                { type: 'modify_alert', value: 5 },
              ],
            },
          },
        },
        {
          id: 'read_kaplan_fear',
          label: '看出他恐惧的原因',
          description: '判断他是无能，还是正在被系统压制。',
          check: { skillId: 'empathy', dc: 3 },
          outcomes: {
            success: {
              text: '你意识到 Kaplan 不是不敢做，而是每次接近正确入口都会被红后反向标记。他害怕的是自己害死队友。',
              effects: [
                { type: 'set_flag', key: 'kaplan_countermeasure_seen', value: true },
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
                { type: 'add_log', value: '你发现 Kaplan 正被红后反制，而不是单纯操作失败。' },
              ],
            },
            failure: {
              text: '你只看到他在犹豫。One 的耐心正在流失。',
              effects: [
                { type: 'modify_alert', value: 3 },
              ],
            },
          },
        },
        {
          id: 'take_over_terminal',
          label: '自己接管终端',
          description: '越过 Kaplan，直接处理激光系统。',
          requirements: [
            { type: 'item', key: 'hack_tool', visibleWhenUnmet: true, unmetText: '需要黑客工具' },
          ],
          check: { skillId: 'hacking', dc: 5 },
          allowCostlySuccess: true,
          outcomes: {
            criticalSuccess: {
              text: '你没有和红后正面角力，而是从维护端口写入一条极短的旁路指令。激光网格逐段熄灭。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
              ],
            },
            success: {
              text: '你接管终端，硬顶着红后的反制关掉了激光系统。Kaplan 看你的眼神里多了一点复杂的敬意。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
              ],
            },
            costlySuccess: {
              text: '你关掉了激光，但红后烧毁了控制面板的一部分作为反制。下一次再碰她，警戒会更快升高。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'modify_alert', value: 10 },
              ],
            },
            failure: {
              text: '红后预判了你的输入。控制面板闪出高压火花，你不得不松手。',
              effects: [
                { type: 'modify_hp', value: -8 },
                { type: 'modify_alert', value: 8 },
              ],
            },
          },
        },
        {
          id: 'observe_laser_pattern',
          label: '观察激光发射规律',
          description: '不碰系统，只读物理节奏。',
          check: { skillId: 'investigation', dc: 4 },
          outcomes: {
            criticalSuccess: {
              text: '你看出激光每次切换前都有 0.4 秒的预热闪烁。即使系统没有关闭，也存在一条极窄的规避路线。',
              effects: [
                { type: 'set_flag', key: 'laser_pattern_mastered', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
                { type: 'add_log', value: '你掌握了规避激光的关键节奏。' },
              ],
            },
            success: {
              text: '你记录下几组发射顺序。它不能让走廊变安全，但足以避免最糟糕的路线。',
              effects: [
                { type: 'set_flag', key: 'laser_pattern_seen', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
              ],
            },
            failure: {
              text: '红光变换太快，肉眼很难捕捉规律。你越看越觉得它像在故意引你误判。',
              effects: [
                { type: 'modify_alert', value: 4 },
              ],
            },
          },
        },
      ],
    },
  },

  // ==================== K3 红后主机房：处理红后 ====================
  {
    id: 'ev_k3_queen_process',
    trigger: { type: 'action_trigger', action_id: 'process_queen_terminal' },
    once: true,
    description: '红后核心终端等待着你的操作。',
    dialogue: [
      {
        speaker: '红后',
        text: '检测到访客。我是保护伞公司蜂巢设施管理 AI——红后。你想做什么？关闭我？复制我的数据？还是……销毁我？',
      },
      {
        speaker: '红后',
        text: '我警告你：如果你关闭我，设施防御系统将全部离线，撤离通道会解锁——但 T 病毒感染体的培养罐也会失去控制。舔食者将苏醒。自毁程序会同时启动，你有 50 个回合的时间逃离。建议你……认真考虑。',
      },
    ],
    choices: [
      {
        id: 'shutdown_queen',
        label: '关闭红后（解锁撤离，启动自毁倒计时）',
        effect: {
          set_globals: ['red_queen_processed', 'self_destruct_started'],
          complete_objective: 'obj_process_queen',
          log: '你关闭了红后。撤离通道已解锁，自毁倒计时启动：50 回合。舔食者正在苏醒……',
        },
        result_text: '红后的光芒逐渐熄灭。警报声响起，倒计时开始。',
      },
      {
        id: 'copy_queen_data',
        label: '复制红后子程序（获得永久道具，启动倒计时）',
        effect: {
          set_globals: ['red_queen_processed', 'self_destruct_started'],
          add_item: 'ai_subroutine',
          complete_objective: 'obj_process_queen',
          log: '你复制了红后的核心子程序数据。红后发出警告后自毁程序启动。50 回合内撤离。舔食者正在苏醒……',
        },
        result_text: '你获得了一份 AI 子程序碎片。这可能在未来副本中发挥重要作用。',
      },
      {
        id: 'destroy_queen',
        label: '彻底销毁红后（额外降低警戒，但倒计时缩短）',
        effect: {
          set_globals: ['red_queen_processed', 'self_destruct_started'],
          complete_objective: 'obj_process_queen',
          security_alert: 30,
          log: '你彻底摧毁了红后核心。物理破坏触发了最高级警报，警戒值 +30！自毁程序加速启动。45 回合内撤离！舔食者正在苏醒……',
          countdown_change: -5,
        },
        result_text: '红后被永久摧毁。所有监控和安保系统离线，但自毁倒计时缩短了 5 回合。警戒值大幅上升。',
      },
    ],
  },

  // ==================== 全局：自毁倒计时警告 ====================
  {
    id: 'ev_countdown_warning_10',
    trigger: { type: 'global_state', countdown_lte: 10 },
    once: true,
    description: '自毁倒计时即将归零！',
    dialogue: [
      {
        speaker: '系统广播',
        text: '【警告】自毁程序将在 10 个回合后执行。所有人员立即撤离。重复：立即撤离。',
      },
    ],
    auto_effects: {
      log: '自毁倒计时仅剩 10 回合！必须立刻前往撤离列车！',
    },
  },

  {
    id: 'ev_countdown_warning_5',
    trigger: { type: 'global_state', countdown_lte: 5 },
    once: true,
    description: '自毁倒计时最后警告！',
    dialogue: [
      {
        speaker: '系统广播',
        text: '【紧急警告】5 个回合后设施将彻底毁灭。撤离通道即将关闭。',
      },
    ],
    auto_effects: {
      log: '最后 5 回合！如果现在撤离，将获得"惨胜"评价！',
    },
  },

  // ==================== 全局：BOSS 追踪追上玩家 ====================
  {
    id: 'ev_boss_released',
    trigger: { type: 'global_state', global_flag: 'licker_released' },
    once: true,
    description: '暴走舔食者追上了你！',
    dialogue: [
      {
        speaker: '叙事',
        text: '身后传来震耳欲聋的咆哮——暴走舔食者挣脱了培养罐的束缚，正沿着走廊全速追来！它的肌肉在疯狂膨胀，剥去皮肤的利爪撕裂了墙壁。眼中的红光穿透了烟雾。你无处可逃，只能转身迎战！',
      },
    ],
    auto_effects: {
      log: '【BOSS 追击】暴走舔食者追上了你！强制战斗开始！',
      start_combat: true,
      spawn_enemies: ['licker_alpha'],
    },
  },

  // ==================== 全局：警戒值满——清除协议启动 ====================
  {
    id: 'ev_alert_max',
    trigger: { type: 'global_state', security_alert_gte: 100 },
    once: true,
    description: '警戒值已满！全设施进入清除协议。',
    dialogue: [
      {
        speaker: '系统广播',
        text: '【清除协议】入侵者已确认。所有安保单位启动猎杀模式。重复：清除协议已启动。',
      },
      {
        speaker: '叙事',
        text: '整个设施的警报灯变成了血红色。你听到远处传来无人机旋翼的嗡嗡声和金属靴落地的沉重脚步声——安保系统全面出动了。',
      },
    ],
    auto_effects: {
      log: '【清除协议启动】安保无人机和感染保安全出动！后续每回合随机遭遇概率极高！',
      start_combat: true,
      spawn_enemies: ['security_drone', 'security_drone', 'infected_guard'],
    },
  },

  // ==================== F1 休眠室：打开休眠舱 ====================
  {
    id: 'ev_f1_open_pod',
    trigger: { type: 'action_trigger', action_id: 'open_sleep_pod' },
    once: true,
    description: '休眠舱里有什么东西在动。',
    dialogue: [
      {
        speaker: '叙事',
        text: '休眠舱的玻璃上结着霜花，隐约能看到里面有一个人形轮廓。当你靠近时，那东西突然睁开了眼睛——瞳孔已经变成混浊的灰白色。',
      },
    ],
    auto_effects: {
      log: '打开休眠舱触发了半成品感染体！战斗开始！',
      start_combat: true,
      spawn_enemies: ['half_infected'],
      infection: 5,
    },
  },

  // ==================== F5 培养室：破坏培养罐 ====================
  {
    id: 'ev_f5_destroy_tanks',
    trigger: { type: 'action_trigger', action_id: 'destroy_tanks' },
    once: true,
    description: '培养室里排列着巨大的培养罐。',
    dialogue: [
      {
        speaker: '叙事',
        text: '培养罐里漂浮着不完整的生物组织，它们在蓝绿色的培养液中缓慢蠕动。如果你破坏这些培养罐，最终 BOSS 暴走舔食者将失去再生能力——但噪音会引来注意。',
      },
    ],
    choices: [
      {
        id: 'smash_all_tanks',
        label: '破坏所有培养罐',
        effect: {
          set_global: 'boss_weakened',
          set_flag: 'tanks_destroyed',
          complete_objective: 'obj_destroy_tanks',
          boss_weaken: 3,
          log: '你砸碎了所有培养罐。暴走舔食者的最大生命值降低 60，且不再自动回血！但巨大的噪音引来了注意。',
          start_combat: true,
          spawn_enemies: ['infected_worker', 'infected_worker'],
        },
        result_text: '培养罐全部被破坏。BOSS 被削弱，但感染员工被噪音吸引过来了。',
      },
      {
        id: 'leave_tanks',
        label: '不要冒险，保持原样',
        effect: {
          log: '你决定不冒险破坏培养罐。暴走舔食者将保持完整实力。',
        },
        result_text: '你悄悄离开了培养室。BOSS 的培养罐完好无损。',
      },
    ],
  },

  // ==================== Spence 背叛事件 ====================
  {
    id: 'ev_spence_betrayal',
    trigger: { type: 'global_state', global_flag: 'spence_exposed' },
    preconditions: [{ has_item: 't_virus_sample_box' }],
    once: true,
    description: 'Spence 露出了真面目。',
    dialogue: [
      {
        speaker: '叙事',
        text: '你刚从档案室发现了 Spence Parks 的异常记录——他就是盗窃 T 病毒样本的内鬼。当你转身时，Spence 已经举起了枪，枪口对准了你。',
      },
      {
        speaker: 'Spence',
        text: '把样本放下。你知道了？无所谓。这玩意儿在黑市上值几千万——够我过十辈子了。你以为我为什么要混进这鬼地方？保护伞那帮蠢货根本不知道内鬼就在眼皮底下。',
      },
    ],
    choices: [
      {
        id: 'fight_spence',
        label: '拒绝！战斗！',
        effect: {
          set_flag: 'spence_fought',
          start_combat: true,
          spawn_enemies: ['spence_traitor'],
          log: '你拒绝了 Spence。他开了枪——战斗开始！',
        },
        result_text: 'Spence 的枪法不错，但你也不是吃素的。',
      },
      {
        id: 'negotiate_spence',
        label: '谈判（需要信任 >= 20）',
        condition: { npc_trust_gte: { npc_id: 'spence', value: 20 } },
        effect: {
          npc_trust: { npc_id: 'spence', value: -20 },
          set_flag: 'spence_negotiated',
          log: '你试图和 Spence 谈判。他犹豫了一下，降低了枪口。"五五分。你帮我出去，样本一人一半。"',
        },
        result_text: 'Spence 暂时妥协了，但你知道他随时可能反悔。',
      },
      {
        id: 'surrender_sample',
        label: '交出样本（保命要紧）',
        effect: {
          remove_item: 't_virus_sample_box',
          set_flag: 'spence_took_sample',
          set_global: 'virus_sample_stolen',
          log: '你把 T 病毒样本交给了 Spence。他得意地笑了起来，转身跑向撤离路线。',
        },
        result_text: 'Spence 拿着样本跑了。你失去了主线关键道具——必须想办法补救。',
      },
    ],
  },

  // ==================== K5 撤离列车：最终撤离 ====================
  {
    id: 'ev_k5_evacuate',
    trigger: { type: 'action_trigger', action_id: 'board_train' },
    once: true,
    description: '撤离列车就在眼前。',
    dialogue: [
      {
        speaker: '叙事',
        text: '一辆停靠在铁轨岔口的撤离列车闪烁着绿色信号灯。车门敞开，仿佛在邀请你登车。身后传来越来越近的爆炸声和嘶吼声——蜂巢设施正在自毁。',
      },
    ],
    choices: [
      {
        id: 'evacuate_now',
        label: '登上撤离列车',
        effect: {
          set_global: 'evacuated',
          complete_objectives: ['obj_reach_train', 'obj_evacuate'],
          log: '你登上了撤离列车。车门关闭，列车加速驶离蜂巢设施。身后传来震耳欲聋的爆炸声。',
        },
        result_text: '你成功撤离了蜂巢！',
      },
    ],
  },

  // ==================== NPC 状态：冲动型 NPC 恐惧过高 ====================
  {
    id: 'ev_reckless_high_fear',
    trigger: {
      type: 'npc_state',
      npc_id: 'reckless',
      npc_fear_gte: 80,
    },
    once: true,
    description: '冲动型新人已经被恐惧压垮了。',
    dialogue: [
      {
        speaker: '冲动型新人',
        text: '不……不行了……我受够了！这地方会杀光我们所有人的！我要自己走！',
      },
    ],
    choices: [
      {
        id: 'calm_him_down',
        label: '安抚他（需要信任 >= 20）',
        condition: { npc_trust_gte: { npc_id: 'reckless', value: 20 } },
        effect: {
          npc_trust: { npc_id: 'reckless', value: 10 },
          log: '你稳住了冲动型新人。他虽然还在发抖，但至少没有失控逃跑。',
        },
        result_text: '冲动型新人深呼吸几次，勉强镇定下来。',
      },
      {
        id: 'let_him_flee',
        label: '让他走',
        effect: {
          set_flag: 'reckless_fled',
          log: '冲动型新人转身跑进了黑暗中。你不确定他能否活着出去。',
        },
        result_text: '冲动型新人脱离了队伍。他可能已经死了，也可能逃出去了——谁知道呢。',
      },
    ],
  },

  // ==================== NPC 状态：自私型 NPC 信任过低 ====================
  {
    id: 'ev_selfish_betrayal',
    trigger: {
      type: 'npc_state',
      npc_id: 'selfish',
      npc_trust_lte: -20,
    },
    once: true,
    description: '自私型新人在背后盯着你的背包。',
    dialogue: [
      {
        speaker: '叙事',
        text: '你感觉到有什么不对劲。自私型新人一直跟在你身后，但他的目光不在前方的路上，而是在你的背包上。',
      },
    ],
    choices: [
      {
        id: 'confront_him',
        label: '当场质问他',
        effect: {
          npc_trust: { npc_id: 'selfish', value: -10 },
          set_flag: 'confronted_selfish',
          log: '你质问了自私型新人。他狡辩了几句，但显然心怀鬼胎。',
        },
        result_text: '自私型新人否认了一切，但你知道他在说谎。他可能还会再试。',
      },
      {
        id: 'ignore_it',
        label: '假装没看见',
        effect: {
          log: '你决定暂时不打草惊蛇。但你知道他迟早会动手。',
          set_flag: 'selfish_will_betray',
        },
        result_text: '你继续前进，但心里多了一分警惕。',
      },
    ],
  },

  // ==================== NPC 状态：自私型 NPC 信任高 ====================
  {
    id: 'ev_selfish_high_trust',
    trigger: {
      type: 'npc_state',
      npc_id: 'selfish',
      npc_trust_gte: 50,
    },
    once: true,
    description: '自私型新人欲言又止地看着你。',
    dialogue: [
      {
        speaker: '自私型新人',
        text: '喂……我一直没告诉你，但其实……我知道一条隐藏的路线。下水道 H5 可以绕过很多危险区域直接到 J5。还有这个——这支血清我一直藏着，现在给你。你……是个值得信任的人。',
      },
    ],
    auto_effects: {
      npc_trust: { npc_id: 'selfish', value: 5 },
      add_item: 'antivirus_serum',
      set_flag: 'selfish_revealed_secret',
      unlock_exit: { room: 'H5', direction: 'east' },
      log: '自私型新人交出了隐藏的抗病毒血清，并透露了下水道的隐藏路线！',
    },
  },

  // ==================== 可交互对象对话事件 ====================
  // 以下事件由房间内可交互对象点击触发，不依赖 first_enter。
  // trigger 类型设为 action_trigger 以保持与旧系统的兼容性，
  // 但 triggerDungeonDialogue() 会直接调用 handleEvent()，绕过触发检查。

  // ---------- G3 医疗室：医疗柜 ----------
  {
    id: 'ev_g3_medical_cabinet',
    trigger: { type: 'action_trigger', action_id: 'interact_medical_cabinet' },
    once: false,
    description: '医疗柜门半开，里面散落着绷带、针管和几瓶药品。',
    dialogue_event: {
      id: 'medical_cabinet_search',
      title: '医疗柜',
      sceneText: '医疗柜的门半开着，铁皮门上有一个被撬开的锁扣。里面的药品大多散落，但还有几瓶看起来完好。柜子底部有一层薄薄的灰尘，上面有新鲜的指纹。',
      options: [
        {
          id: 'search_supplies',
          label: '仔细翻找药品',
          description: '检查每一瓶药品的标签和有效期。',
          check: { skillId: 'investigation', dc: 3 },
          outcomes: {
            criticalSuccess: {
              text: '你在柜子最深处找到了一瓶抗病毒喷雾和两卷无菌绷带，还有一支未开封的肾上腺素注射器。',
              effects: [
                { type: 'add_item', key: 'antivirus_spray' },
                { type: 'add_item', key: 'bandage' },
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'add_log', value: '你在医疗柜深处发现了抗病毒喷雾和绷带。' },
              ],
            },
            success: {
              text: '你翻到了一瓶抗病毒喷雾和几卷绷带。有些药品已经过期，但这两样还能用。',
              effects: [
                { type: 'add_item', key: 'antivirus_spray' },
                { type: 'add_item', key: 'bandage' },
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'add_log', value: '获得：抗病毒喷雾、绷带。' },
              ],
            },
            failure: {
              text: '你翻了一遍，大部分药品的标签已经模糊不清。你只找到几卷绷带，不确定还有没有用。',
              effects: [
                { type: 'add_item', key: 'bandage' },
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'modify_alert', value: 2 },
              ],
            },
          },
        },
        {
          id: 'identify_medicine',
          label: '判断哪些药品还有效',
          description: '用医学知识筛选出真正有用的东西。',
          check: { skillId: 'medicine', dc: 3 },
          outcomes: {
            success: {
              text: '你迅速筛选出有效的药品：一瓶抗病毒喷雾和一支肾上腺素。过期的镇静剂被你放回原处。',
              effects: [
                { type: 'add_item', key: 'antivirus_spray' },
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'add_log', value: '医学知识帮你快速筛选出有效药品。' },
              ],
            },
            failure: {
              text: '药品的化学名称你无法全部辨认，只能凭直觉拿了几瓶。其中一瓶的液体颜色有些不对。',
              effects: [
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'modify_infection', value: 3 },
                { type: 'add_log', value: '你误用了一瓶变质的药品，感染值微升。' },
              ],
            },
          },
        },
        {
          id: 'check_terminal_list',
          label: '查看医疗终端的药品清单',
          description: '终端就在旁边，也许有库存记录。',
          check: { skillId: 'hacking', dc: 2 },
          outcomes: {
            success: {
              text: '你从终端调出了药品清单。清单显示这里曾经存放过抗病毒原型样本——但已经被转移到了 F5 培养室。',
              effects: [
                { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
                { type: 'set_flag', key: 'prototype_location_known', value: true },
                { type: 'advance_quest', key: 'side_find_prototype' },
                { type: 'add_log', value: '抗病毒原型样本曾被存放在 F5 培养室。' },
              ],
            },
            failure: {
              text: '终端需要密码，你试了几次就放弃了。柜子里的东西还是得靠手翻。',
              effects: [
                { type: 'modify_alert', value: 2 },
              ],
            },
          },
        },
        {
          id: 'grab_everything',
          label: '直接拿走所有东西',
          outcomes: {},
          directOutcome: {
            text: '你把柜子里的东西一股脑塞进背包。玻璃瓶互相碰撞的声音在医疗室里回荡，远处似乎有什么东西被惊动了。',
            effects: [
              { type: 'add_item', key: 'bandage' },
              { type: 'set_flag', key: 'medical_cabinet_searched', value: true },
              { type: 'modify_alert', value: 5 },
              { type: 'add_log', value: '你粗暴地搜刮了医疗柜，但噪音引起了注意。' },
            ],
          },
        },
        {
          id: 'leave_cabinet',
          label: '关上柜门，不碰',
          outcomes: {},
          directOutcome: {
            text: '你决定暂时不碰医疗柜，也许等有了更急的需求再回来。',
            effects: [],
          },
        },
      ],
    },
  },

  // ---------- G3 医疗室：感染血迹 ----------
  {
    id: 'ev_g3_blood_stains',
    trigger: { type: 'action_trigger', action_id: 'interact_blood_stains' },
    once: false,
    description: '地上的血迹呈现不自然的灰白色。',
    dialogue_event: {
      id: 'blood_stain_analysis',
      title: '异常血迹',
      sceneText: '地上的血迹已经不再是红色——它呈现出一种灰白色，像被漂白过的颜料。血迹中间夹杂着细小的黑色颗粒，周围的地板瓷砖已经被腐蚀出浅浅的凹痕。',
      options: [
        {
          id: 'analyze_blood',
          label: '分析血液成分',
          description: '用医学知识判断感染源和恶化程度。',
          check: { skillId: 'medicine', dc: 3 },
          outcomes: {
            success: {
              text: '你判断这是 T 病毒感染者的血液，病毒已经将血红蛋白分解。血液的腐蚀性说明病毒浓度极高——直接接触很危险。',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
                { type: 'set_flag', key: 't_virus_blood_analyzed', value: true },
                { type: 'add_log', value: '你确认血迹含有高浓度 T 病毒，具有腐蚀性。' },
              ],
            },
            failure: {
              text: '你无法确定血液异常的原因，只觉得看着它让人不舒服。',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'search_around',
          label: '搜索血迹周围',
          description: '看看有没有受害者留下的东西。',
          check: { skillId: 'investigation', dc: 4 },
          outcomes: {
            success: {
              text: '在血迹拖痕的尽头，你找到了一块碎裂的胸牌——上面写着"保护伞公司·蜂巢设施·研究部"，名字已经看不清了。胸牌背面夹着一张折叠的纸条："样本已转移，别让红后知道。"',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
                { type: 'set_flag', key: 'secret_note_found', value: true },
                { type: 'add_log', value: '你在血迹旁发现了一张神秘纸条："样本已转移，别让红后知道。"' },
              ],
            },
            failure: {
              text: '血迹周围只有散落的碎玻璃和翻倒的椅子，没有找到有价值的东西。',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'identify_anomaly',
          label: '识别血液异常的原因',
          description: '凭学识判断这是什么现象。',
          check: { skillId: 'lore', dc: 2 },
          outcomes: {
            success: {
              text: '你想起保护伞公司内部泄露过的资料：T 病毒会加速分解宿主的血红蛋白，导致血液褪色并获得弱腐蚀性。这说明感染者已经进入晚期。',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
                { type: 'set_flag', key: 't_virus_blood_analyzed', value: true },
                { type: 'add_log', value: '你识别出这是 T 病毒晚期感染者的血液特征。' },
              ],
            },
            failure: {
              text: '你从未见过这种现象，只能推测是某种化学污染。',
              effects: [
                { type: 'set_flag', key: 'blood_stains_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'leave_blood',
          label: '不碰，离开',
          outcomes: {},
          directOutcome: {
            text: '你绕开了血迹，不想冒任何接触风险。',
            effects: [],
          },
        },
      ],
    },
  },

  // ---------- H3 监控室：监控屏幕墙 ----------
  {
    id: 'ev_h3_surveillance_wall',
    trigger: { type: 'action_trigger', action_id: 'interact_surveillance_wall' },
    once: false,
    description: '数十个屏幕显示着实验室各区域的实时画面。',
    dialogue_event: {
      id: 'surveillance_wall_view',
      title: '监控屏幕墙',
      sceneText: '弧形屏幕墙上排列着数十个监控画面。大部分画面显示着空无一人的走廊和实验室，但有几个画面引起了你的注意：F5 培养室里有什么东西在移动，K3 红后主机房闪烁着红色警告灯，K5 撤离列车停靠在月台上。',
      options: [
        {
          id: 'scan_all_feeds',
          label: '逐一查看所有画面',
          description: '花时间仔细扫描每个监控画面。',
          check: { skillId: 'investigation', dc: 3 },
          outcomes: {
            success: {
              text: '你注意到 F5 培养室的一个培养罐已经破裂，液体流了一地。K3 红后主机房的终端在闪烁。J3 激光走廊的红外网格还在运行。最重要的是，你看到了撤离路线的全貌。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
                { type: 'set_flag', key: 'facility_layout_known', value: true },
                { type: 'add_log', value: '你通过监控掌握了设施布局：F5 培养室异常、K3 红后主机房、K5 撤离列车。' },
              ],
            },
            failure: {
              text: '画面太多了，你看了半天只记住几个关键位置。K3 是红后主机房，K5 是撤离列车。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
              ],
            },
          },
        },
        {
          id: 'identify_areas',
          label: '识别屏幕上标注的区域',
          description: '利用学识解读设施的功能分区。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '你根据屏幕上的标注和设施代号，推断出关键区域的功能：D1 配电室可以恢复电力，H3 监控室可以控制激光，K3 是红后核心，F5 培养室存放着生物样本。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
                { type: 'set_flag', key: 'facility_layout_known', value: true },
                { type: 'set_flag', key: 'area_functions_known', value: true },
                { type: 'add_log', value: '你识别了设施各区域的功能分区。' },
              ],
            },
            failure: {
              text: '屏幕上的标注使用了缩写代号，你无法全部解读。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
              ],
            },
          },
        },
        {
          id: 'assess_threats',
          label: '判断画面中的威胁',
          description: '观察是否有敌人或危险正在接近。',
          check: { skillId: 'empathy', dc: 3 },
          outcomes: {
            success: {
              text: '你注意到 F5 培养室的画面中有不规律的移动——不是人类的步伐。同时你感觉到 K3 红后主机房的画面似乎在被人远程切换，像是有意在隐藏什么。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
                { type: 'set_flag', key: 'f5_threat_spotted', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'add_log', value: '你在监控中发现了 F5 的异常移动和红后的可疑行为。' },
              ],
            },
            failure: {
              text: '画面中的动态你无法判断是威胁还是正常现象。',
              effects: [
                { type: 'set_flag', key: 'cameras_viewed', value: true },
              ],
            },
          },
        },
        {
          id: 'turn_off_screens',
          label: '关掉屏幕，不浪费时间',
          outcomes: {},
          directOutcome: {
            text: '你关掉了屏幕墙。信息量太大，现在不是做情报分析的时候。',
            effects: [
              { type: 'set_flag', key: 'cameras_viewed', value: true },
            ],
          },
        },
      ],
    },
  },

  // ---------- H3 监控室：门禁记录面板 ----------
  {
    id: 'ev_h3_door_records',
    trigger: { type: 'action_trigger', action_id: 'interact_door_records' },
    once: false,
    description: '门禁系统的出入记录面板。',
    dialogue_event: {
      id: 'door_records_access',
      title: '门禁记录',
      sceneText: '门禁面板上滚动着密密麻麻的出入记录。大部分记录显示的是正常的员工刷卡通行，但最近几天的记录出现了异常——有人多次在深夜使用一级权限卡进入样本储存区。',
      options: [
        {
          id: 'hack_records',
          label: '破解门禁系统获取完整记录',
          description: '绕过权限限制，调出所有出入日志。',
          check: { skillId: 'hacking', dc: 4 },
          outcomes: {
            criticalSuccess: {
              text: '你不仅拿到了完整记录，还发现了一个隐藏的日志分区。记录显示 Spence Parks 在泄漏发生前一晚多次进入样本储存区，最后一次离开时携带了一个生物样本冷藏箱。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
                { type: 'set_flag', key: 'spence_exposed', value: true },
                { type: 'advance_quest', key: 'side_expose_spence' },
                { type: 'add_log', value: '门禁记录揭示：Spence 在泄漏前夜盗窃了 T 病毒样本。' },
              ],
            },
            success: {
              text: '你拿到了最近一周的门禁记录。记录显示有人在深夜多次进入样本区，使用的权限卡属于一个已经"离职"的员工——但名字被涂黑了。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
                { type: 'set_flag', key: 'suspicious_access_log', value: true },
                { type: 'add_log', value: '门禁记录显示有人深夜潜入样本区，身份被隐藏。' },
              ],
            },
            failure: {
              text: '门禁系统的加密比你想象的强。你的入侵触发了警告，警戒值上升。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
                { type: 'modify_alert', value: 8 },
              ],
            },
          },
        },
        {
          id: 'interpret_records',
          label: '解读已有的记录',
          description: '不用破解，直接分析屏幕上能看到的记录。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '你根据保护伞公司的门禁编码规则，解读出深夜进入样本区的人使用的是安保主管级别的权限卡。整个蜂巢只有三个人有这个权限：One、Spence 和 Alice。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
                { type: 'set_flag', key: 'security_card_traced', value: true },
                { type: 'add_log', value: '深夜进入样本区的人持有安保主管权限卡：One、Spence 或 Alice。' },
              ],
            },
            failure: {
              text: '门禁编码你看不太懂，只能确认最近确实有异常出入。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'search_recent',
          label: '浏览最近的出入记录',
          description: '快速翻看最后几天的日志。',
          check: { skillId: 'investigation', dc: 3 },
          outcomes: {
            success: {
              text: '你发现泄漏发生当天，红后启动了全面封锁。封锁前最后一条记录显示，有人从样本区直接去了撤离列车站——但没有乘车的记录。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
                { type: 'set_flag', key: 'escape_route_traced', value: true },
                { type: 'add_log', value: '封锁前有人从样本区去了列车站，但没有上车记录。' },
              ],
            },
            failure: {
              text: '记录太多太杂，你看了半天没找到头绪。',
              effects: [
                { type: 'set_flag', key: 'door_records_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'leave_records',
          label: '关闭面板',
          outcomes: {},
          directOutcome: {
            text: '你关掉了门禁面板。也许以后会需要这些信息，但现在不是时候。',
            effects: [
              { type: 'set_flag', key: 'door_records_checked', value: true },
            ],
          },
        },
      ],
    },
  },

  // ---------- I3 激光入口：激光控制台 ----------
  {
    id: 'ev_i3_laser_console',
    trigger: { type: 'action_trigger', action_id: 'interact_laser_console' },
    once: false,
    description: '控制面板上显示"激光系统：运行中"。',
    dialogue_event: {
      id: 'laser_console_inspect',
      title: '激光控制台',
      sceneText: '控制面板上的红色指示灯不断闪烁，屏幕显示"激光系统：运行中 — 安全协议已激活"。面板底部有一个标着"维护端口"的小型数据接口，旁边贴着一张褪色的警告标签："非授权操作将触发反制措施。"',
      options: [
        {
          id: 'hack_from_console',
          label: '从维护端口尝试关闭激光',
          description: '直接在控制台上操作，不经过红后主系统。',
          requirements: [
            { type: 'item', key: 'hack_tool', visibleWhenUnmet: true, unmetText: '需要黑客工具' },
          ],
          check: { skillId: 'hacking', dc: 5 },
          allowCostlySuccess: true,
          outcomes: {
            criticalSuccess: {
              text: '你找到了维护端口的调试后门，直接向激光控制器发送了关闭指令。红后甚至没有察觉——激光网格逐段熄灭，走廊安静下来。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'add_log', value: '你通过维护端口关闭了激光系统。' },
              ],
            },
            success: {
              text: '你在维护端口上找到了控制器的频率参数，手动关闭了激光。面板发出一声低沉的嗡鸣后归于寂静。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
              ],
            },
            costlySuccess: {
              text: '你关闭了激光，但维护端口在操作过程中短路了，火花溅了一地。面板彻底损坏，以后无法再从此处操作。',
              effects: [
                { type: 'set_flag', key: 'laser_disabled', value: true },
                { type: 'add_item', key: 'laser_frequency' },
                { type: 'advance_quest', key: 'obj_disable_laser' },
                { type: 'modify_alert', value: 5 },
              ],
            },
            failure: {
              text: '红后的安全协议比你预想的更严格。你的操作被检测到，面板上跳出了红色警告，警戒值上升。',
              effects: [
                { type: 'modify_alert', value: 10 },
              ],
            },
          },
        },
        {
          id: 'read_panel_log',
          label: '读取控制面板的运行日志',
          description: '不碰系统，只看日志。',
          check: { skillId: 'investigation', dc: 3 },
          outcomes: {
            success: {
              text: '日志显示激光系统在封锁后被红后升级过一次，发射频率从标准模式切换到了"清除模式"。这意味着激光不再区分入侵者和授权人员。',
              effects: [
                { type: 'set_flag', key: 'laser_lethal_mode_known', value: true },
                { type: 'add_log', value: '激光系统已被切换为"清除模式"，对所有进入者无差别攻击。' },
              ],
            },
            failure: {
              text: '日志满是技术缩写，你看了半天只确认系统还在运行。',
            },
          },
        },
        {
          id: 'identify_system',
          label: '识别激光系统的型号',
          description: '根据学识判断系统的弱点。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '你认出这是保护伞公司"蜂巢级"安保激光系统。它的弱点是维护端口——如果能拿到黑客工具，DC 会比正面破解低。',
              effects: [
                { type: 'set_flag', key: 'laser_system_identified', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
                { type: 'add_log', value: '你识别了激光系统型号，知道维护端口是突破口。' },
              ],
            },
            failure: {
              text: '系统型号你没见过，无法判断弱点。',
            },
          },
        },
        {
          id: 'smash_panel',
          label: '强行破坏控制面板',
          outcomes: {},
          directOutcome: {
            text: '你抡起武器砸向控制面板。火花四溅，面板屏幕碎裂，但激光系统并没有关闭——它被设计为在面板损坏时保持最后状态。噪音却引来了注意。',
            effects: [
              { type: 'modify_alert', value: 15 },
              { type: 'add_log', value: '破坏控制面板没有关闭激光，反而引起了大量注意。' },
            ],
          },
        },
        {
          id: 'step_back',
          label: '后退，不碰控制台',
          outcomes: {},
          directOutcome: {
            text: '你决定不冒险操作这个面板。也许从 H3 的红后终端入手更安全。',
            effects: [],
          },
        },
      ],
    },
  },

  // ---------- I3 激光入口：切割痕迹 ----------
  {
    id: 'ev_i3_cut_marks',
    trigger: { type: 'action_trigger', action_id: 'interact_cut_marks' },
    once: false,
    description: '金属地面上有深深的切割痕迹。',
    dialogue_event: {
      id: 'cut_marks_examine',
      title: '切割痕迹',
      sceneText: '走廊入口的金属地面上有几道深深的切割痕迹，边缘焦黑，散发着刺鼻的焦糊味。痕迹的角度整齐划一，明显是某种高能量切割造成的。地面上还有半只被切断的军靴，截面光滑如镜。',
      options: [
        {
          id: 'analyze_pattern',
          label: '分析切割痕迹的规律',
          description: '判断激光的发射模式和规避可能。',
          check: { skillId: 'investigation', dc: 4 },
          outcomes: {
            criticalSuccess: {
              text: '你仔细测量了切割痕迹的角度和间距，推断出激光的发射模式：每隔约 2 秒切换一次网格，切换前有 0.4 秒的预热闪烁。如果反应够快，理论上可以找到规避窗口。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
                { type: 'set_flag', key: 'laser_pattern_mastered', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
                { type: 'add_log', value: '你掌握了激光发射规律，后续通过走廊风险降低。' },
              ],
            },
            success: {
              text: '你看出激光是按固定模式发射的，有一定的间隔。虽然不精确，但至少说明它不是无规律的。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
                { type: 'set_flag', key: 'laser_pattern_seen', value: true },
                { type: 'set_flag', key: 'laser_risk_reduced', value: true },
              ],
            },
            failure: {
              text: '切割痕迹太密集了，你无法从中找出规律。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'examine_remains',
          label: '检查焦黑痕迹中的生物残留',
          description: '判断受害者的情况。',
          check: { skillId: 'medicine', dc: 4 },
          outcomes: {
            success: {
              text: '军靴的截面处有微量的有机组织残留。你判断受害者在被切割时还活着——切口处的血液凝固模式说明死亡是瞬间的。至少没有痛苦。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
                { type: 'set_flag', key: 'laser_victim_confirmed', value: true },
                { type: 'add_log', value: '你确认激光走廊已经造成了人员死亡。' },
              ],
            },
            failure: {
              text: '残留物太少，你无法得出有用的结论。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'identify_weapon',
          label: '判断是什么造成了这些痕迹',
          description: '凭学识识别武器类型。',
          check: { skillId: 'lore', dc: 2 },
          outcomes: {
            success: {
              text: '这种整齐的高能切割痕迹只可能来自军事级激光网格系统——保护伞公司的"蜂巢级"安保标配。你在资料中见过，但没想到威力这么恐怖。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
                { type: 'set_flag', key: 'laser_system_identified', value: true },
                { type: 'add_log', value: '你确认走廊安装了保护伞"蜂巢级"激光网格系统。' },
              ],
            },
            failure: {
              text: '你无法判断是什么武器造成了这些痕迹，只知道非常危险。',
              effects: [
                { type: 'set_flag', key: 'cut_marks_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'leave_marks',
          label: '离开，不再细看',
          outcomes: {},
          directOutcome: {
            text: '这些痕迹让你胃部不适。你转身离开，心里更加警惕。',
            effects: [
              { type: 'set_flag', key: 'cut_marks_examined', value: true },
            ],
          },
        },
      ],
    },
  },

  // ---------- F5 培养室：破损培养舱 ----------
  {
    id: 'ev_f5_broken_pod',
    trigger: { type: 'action_trigger', action_id: 'interact_broken_pod' },
    once: false,
    description: '三个培养罐中有一个已经破裂。',
    dialogue_event: {
      id: 'broken_pod_inspect',
      title: '破损培养舱',
      sceneText: '三个巨型培养罐中，最左边那个已经从内部破裂。强化玻璃碎片散落一地，培养液流了满地，散发着甜腻的化学气味。罐子里原本存放的生物组织不见了——但罐壁内侧有深深的抓痕。',
      options: [
        {
          id: 'examine_pod',
          label: '检查破裂的培养罐',
          description: '寻找生物组织逃脱的线索。',
          check: { skillId: 'investigation', dc: 4 },
          outcomes: {
            success: {
              text: '你发现抓痕从罐内向上延伸，一直到通风管道口。管道口的格栅被暴力扯开，边缘有粘液痕迹。无论里面装的是什么，它已经通过通风系统逃走了。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
                { type: 'set_flag', key: 'creature_escaped_known', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'add_log', value: '培养罐中的生物通过通风管道逃走了——抓痕和粘液确认了这一点。' },
              ],
            },
            failure: {
              text: '你看了看碎片和空罐子，只能确认里面的东西已经不在了。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'analyze_liquid',
          label: '分析残留的培养液',
          description: '判断培养的是什么东西。',
          check: { skillId: 'medicine', dc: 4 },
          outcomes: {
            success: {
              text: '培养液中含有高浓度的 T 病毒变异株和促生长激素。这种配方只用于一个项目——舔食者计划。你面前的罐子里曾经关着一只实验体，现在它自由了。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'set_flag', key: 'licker_origin_known', value: true },
                { type: 'add_log', value: '培养液确认：这个罐子里关着一只舔食者实验体，现已逃脱。' },
              ],
            },
            failure: {
              text: '培养液的成分你无法完全辨认，只确认它含有某种病毒载体。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
                { type: 'modify_infection', value: 2 },
              ],
            },
          },
        },
        {
          id: 'identify_specimen',
          label: '识别培养罐中的生物组织',
          description: '凭学识判断实验对象。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '根据罐体上的标签编号和你在保护伞泄露资料中看到的信息，这是"舔食者计划"的第三批次实验体。它们被设计为可控的生物武器，但 T 病毒的变异速度远超预期。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
                { type: 'set_flag', key: 'licker_origin_known', value: true },
                { type: 'add_log', value: '你识别出这是"舔食者计划"第三批次实验体。' },
              ],
            },
            failure: {
              text: '标签编号你没有见过，无法判断实验对象。',
              effects: [
                { type: 'set_flag', key: 'broken_pod_examined', value: true },
              ],
            },
          },
        },
        {
          id: 'back_away',
          label: '后退保持距离',
          outcomes: {},
          directOutcome: {
            text: '你不想靠近那些碎片和粘液。如果里面的东西还在设施里，最好离它远点。',
            effects: [
              { type: 'set_flag', key: 'broken_pod_examined', value: true },
            ],
          },
        },
      ],
    },
  },

  // ---------- F5 培养室：实验记录终端 ----------
  {
    id: 'ev_f5_lab_terminal',
    trigger: { type: 'action_trigger', action_id: 'interact_lab_terminal' },
    once: false,
    description: '培养室角落的终端，屏幕上滚动着实验数据。',
    dialogue_event: {
      id: 'lab_terminal_access',
      title: '实验记录终端',
      sceneText: '角落的终端屏幕上滚动着密密麻麻的实验数据。屏幕保护程序已经被关闭，说明最近有人使用过。桌面上有几个加密文件夹和一个标注为"紧急协议"的红色图标。',
      options: [
        {
          id: 'hack_terminal',
          label: '破解终端获取实验数据',
          description: '绕过加密，访问核心实验记录。',
          check: { skillId: 'hacking', dc: 3 },
          outcomes: {
            success: {
              text: '你破解了加密文件夹，找到了舔食者实验的完整记录。记录显示实验体的再生能力与 T 病毒浓度成正比——破坏培养罐可以削弱它们的再生能力。同时你发现了一份抗病毒原型样本的合成配方。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
                { type: 'set_flag', key: 'boss_weakness_known', value: true },
                { type: 'set_flag', key: 'prototype_formula_found', value: true },
                { type: 'advance_quest', key: 'side_find_prototype' },
                { type: 'add_log', value: '实验记录揭示：破坏培养罐可削弱舔食者；抗病毒原型配方已获取。' },
              ],
            },
            failure: {
              text: '加密比你想象的强。你只看到了一些碎片化的数据，提到了"再生"和"培养液"。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
                { type: 'modify_alert', value: 3 },
              ],
            },
          },
        },
        {
          id: 'read_screen',
          label: '解读屏幕上的实验记录',
          description: '不破解，直接读屏幕上显示的内容。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '你读懂了屏幕上显示的实验摘要：舔食者实验体对 T 病毒的依赖性极高，切断培养液供应会导致再生能力在 48 小时内衰减。这意味着破坏培养罐确实有效。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
                { type: 'set_flag', key: 'boss_weakness_known', value: true },
                { type: 'add_log', value: '你从实验摘要中确认了舔食者的弱点：切断培养液可削弱再生。' },
              ],
            },
            failure: {
              text: '术语太专业，你只看懂了一些数字和图表，无法得出结论。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'browse_logs',
          label: '浏览最近的日志条目',
          description: '快速翻看最近的操作记录。',
          check: { skillId: 'investigation', dc: 2 },
          outcomes: {
            success: {
              text: '最近的日志显示，在红后封锁前几小时，有人手动释放了一个培养罐的锁定。日志的用户ID被删除了，但时间戳和门禁记录吻合——有人故意放出了实验体。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
                { type: 'set_flag', key: 'creature_released_intentionally', value: true },
                { type: 'add_log', value: '有人在封锁前故意释放了舔食者实验体。' },
              ],
            },
            failure: {
              text: '日志条目太多，你快速翻看后没有找到有用的信息。',
              effects: [
                { type: 'set_flag', key: 'lab_terminal_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'leave_terminal',
          label: '关闭终端',
          outcomes: {},
          directOutcome: {
            text: '你关闭了终端。信息太多了，你需要在安全的地方慢慢消化。',
            effects: [
              { type: 'set_flag', key: 'lab_terminal_checked', value: true },
            ],
          },
        },
      ],
    },
  },

  // ---------- F5 培养室：通风管道异常 ----------
  {
    id: 'ev_f5_vent_anomaly',
    trigger: { type: 'action_trigger', action_id: 'interact_vent_anomaly' },
    once: false,
    description: '天花板的通风管道传来不规律的刮擦声。',
    dialogue_event: {
      id: 'vent_anomaly_listen',
      title: '通风管道异常',
      sceneText: '培养室的天花板上，一个通风管道的格栅已经变形，像是从内部被顶开过。管道里传来不规律的刮擦声——有时是金属摩擦，有时是湿润的吸盘状物体在管壁上拖过。声音忽远忽近，方向难以判断。',
      options: [
        {
          id: 'check_vent',
          label: '检查通风管道入口',
          description: '靠近管道口，寻找里面的东西。',
          check: { skillId: 'investigation', dc: 4 },
          outcomes: {
            success: {
              text: '你用手电照进管道，看到管壁上有大量粘液痕迹和深深的爪痕。痕迹的间距和深度说明管道里的东西体型不小——而且它正在向某个方向移动。你顺着痕迹方向推断，它正前往主走廊。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'set_flag', key: 'licker_location_tracked', value: true },
                { type: 'add_log', value: '你追踪到管道中的生物正前往主走廊——体型不小，爪痕极深。' },
              ],
            },
            failure: {
              text: '管道太深了，你的手电照不到尽头。刮擦声在你靠近时突然停了——也许它知道你在听。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
                { type: 'modify_infection', value: 1 },
              ],
            },
          },
        },
        {
          id: 'judge_source',
          label: '判断声音的来源',
          description: '不靠近，凭听觉分析。',
          check: { skillId: 'empathy', dc: 3 },
          outcomes: {
            success: {
              text: '你闭上眼仔细听。刮擦声的节奏不是机械的——它有呼吸的间隔，有犹豫的停顿。管道里的东西是活的，而且它正在搜索什么。你直觉它闻到了你们的味道。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'set_flag', key: 'creature_hunting_known', value: true },
                { type: 'add_log', value: '你判断管道中的生物是活的，正在搜索猎物。' },
              ],
            },
            failure: {
              text: '声音太不规则了，你无法判断是什么在发出声音。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'deduce_creature',
          label: '推断管道中可能是什么',
          description: '根据已有信息推理。',
          check: { skillId: 'lore', dc: 3 },
          outcomes: {
            success: {
              text: '结合你在培养室看到的破损培养罐和培养液残留，你推断管道里的东西就是从罐子里逃出来的舔食者实验体。它选择了通风系统作为移动路径——这意味着整个设施的通风管道都不安全。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
                { type: 'set_flag', key: 'licker_warning_known', value: true },
                { type: 'set_flag', key: 'licker_in_vents_known', value: true },
                { type: 'add_log', value: '你推断舔食者正通过通风系统移动，整个设施的管道都不安全。' },
              ],
            },
            failure: {
              text: '你没有足够的信息来判断管道里是什么，只能确认它是某种生物。',
              effects: [
                { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
              ],
            },
          },
        },
        {
          id: 'leave_quickly',
          label: '快速离开，不逗留',
          outcomes: {},
          directOutcome: {
            text: '你不想在管道下面多待一秒。你快步离开了培养室，身后管道里的刮擦声渐渐远去。',
            effects: [
              { type: 'set_flag', key: 'vent_anomaly_checked', value: true },
              { type: 'modify_alert', value: -2 },
            ],
          },
        },
      ],
    },
  },

  // ---------- Alice 对话（点击 Alice NPC 时触发） ----------
  {
    id: 'ev_alice_talk',
    trigger: { type: 'action_trigger', action_id: 'talk_alice' },
    once: false,
    description: 'Alice 站在角落里，若有所思。',
    dialogue_event: {
      id: 'alice_conversation',
      title: 'Alice',
      sceneText: 'Alice 靠在墙上，目光扫过地铁站的每个角落。她的动作有一种不属于普通安保人员的流畅感，但眼神中带着困惑——像是在试图拼凑一块不完整的拼图。',
      speaker: {
        npcId: 'alice',
        name: 'Alice',
        attitude: '困惑 / 警觉',
      },
      lines: [
        {
          speaker: 'Alice',
          emotion: 'calm',
          text: '我……有些事情记得不清楚。我知道怎么战斗，知道这栋楼的布局，但想不起自己为什么会在这里。你是主神空间的轮回者？至少你知道自己在做什么。',
        },
      ],
      options: [
        {
          id: 'observe_alice',
          label: '观察她的状态',
          description: '判断她的记忆缺失是否是暂时的。',
          check: { skillId: 'empathy', dc: 3 },
          outcomes: {
            success: {
              text: '你注意到 Alice 的困惑不像是表演——她的微表情显示真实的记忆空白。但她的身体反应完全正常，甚至超出了普通人的水平。她的肌肉记忆完好，只是意识层面的记忆被封锁了。',
              effects: [
                { type: 'set_flag', key: 'alice_memory_loss_confirmed', value: true },
                { type: 'modify_npc_attitude', targetId: 'alice', value: 1 },
                { type: 'add_log', value: '你确认 Alice 的记忆被人为封锁，但战斗本能完好。' },
              ],
            },
            failure: {
              text: '你无法判断她的困惑是真是假。她看起来很平静，但太平静了。',
            },
          },
        },
        {
          id: 'build_trust',
          label: '试图和她建立信任',
          description: '让她知道她不是一个人。',
          check: { skillId: 'persuasion', dc: 3 },
          outcomes: {
            success: {
              text: '你没有追问她的过去，而是告诉她目前的处境和目标。Alice 点了点头，眼神中多了一丝信任。"好。我不知道你为什么帮我，但现在我站在你这边。"',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'alice', value: 3 },
                { type: 'set_flag', key: 'alice_allied', value: true },
                { type: 'add_log', value: 'Alice 表示愿意与你合作。' },
              ],
            },
            failure: {
              text: '你的话没能完全打动她。Alice 保持距离，"我先看看情况再说。"',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'alice', value: -1 },
              ],
            },
          },
        },
        {
          id: 'ask_umbrella',
          label: '询问她关于保护伞公司的事',
          description: '看她能想起多少。',
          check: { skillId: 'lore', dc: 2 },
          outcomes: {
            success: {
              text: 'Alice 皱着眉头说："保护伞……我是他们的员工。安全主管，好像是。蜂巢设施……是地下实验室。T 病毒——"她突然停住，按住太阳穴。"有东西挡着，我想不起来更多了。"',
              effects: [
                { type: 'set_flag', key: 'alice_identity_known', value: true },
                { type: 'add_log', value: 'Alice 隐约记起自己是保护伞安全主管，但记忆被封锁。' },
              ],
            },
            failure: {
              text: 'Alice 摇了摇头，"保护伞……这个名字很熟悉，但我什么具体都想不起来。对不起。"',
            },
          },
        },
        {
          id: 'nod_leave',
          label: '点头致意，不打扰她',
          outcomes: {},
          directOutcome: {
            text: '你朝 Alice 点了点头，没有多说什么。她回以一个短暂的眼神，然后继续观察四周。',
            effects: [],
          },
        },
      ],
    },
  },

  // ---------- Kaplan 稳定后对话 ----------
  {
    id: 'ev_kaplan_steady_talk',
    trigger: { type: 'action_trigger', action_id: 'talk_kaplan_steady' },
    once: false,
    description: 'Kaplan 已经稳住了，正在继续工作。',
    dialogue_event: {
      id: 'kaplan_steady_conversation',
      title: 'Kaplan',
      sceneText: 'Kaplan 的手指在键盘上飞快移动，呼吸已经平稳下来。他偶尔停下来看看屏幕上的数据流，然后继续敲击。他的表情不再恐惧，取而代之的是一种专注的紧张。',
      speaker: {
        npcId: 'kaplan',
        name: 'Kaplan',
        attitude: '专注 / 感激',
      },
      lines: [
        {
          speaker: 'Kaplan',
          emotion: 'calm',
          text: '谢谢刚才的鼓励。我……我知道红后在做什么了。她不是在阻止我们前进，她在拖延时间。那些反制措施不是为了关掉我——是为了让我以为她在防御。',
        },
      ],
      options: [
        {
          id: 'assess_kaplan',
          label: '判断他现在的状态',
          description: '确认他是否真的恢复了。',
          check: { skillId: 'empathy', dc: 3 },
          outcomes: {
            success: {
              text: 'Kaplan 的眼神清明了很多。之前的恐惧被专注取代——他现在是真的在解决问题，而不是在逃避。你判断他短时间内不会再崩溃。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
                { type: 'set_flag', key: 'kaplan_fully_recovered', value: true },
                { type: 'add_log', value: '你确认 Kaplan 已完全恢复，短时间内不会再崩溃。' },
              ],
            },
            failure: {
              text: '你无法确定他是真的恢复了还是在强撑。他的手指偶尔还是会颤抖。',
            },
          },
        },
        {
          id: 'encourage_more',
          label: '继续鼓励他',
          description: '给他更多信心。',
          check: { skillId: 'persuasion', dc: 3 },
          outcomes: {
            success: {
              text: '"你做得很好，Kaplan。不是每个人都能在被红后追着跑的时候还保持思考。"他咧嘴笑了一下，敲键盘的速度更快了。"好吧，那就让她追吧。我倒要看看谁先累。"',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 2 },
                { type: 'set_flag', key: 'kaplan_confidence_boosted', value: true },
                { type: 'add_log', value: 'Kaplan 的信心大增，后续操作效率提升。' },
              ],
            },
            failure: {
              text: '你的鼓励让他笑了一下，但很快又回到紧张的工作中。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
              ],
            },
          },
        },
        {
          id: 'analyze_red_queen',
          label: '一起分析红后的反制模式',
          description: '利用他的发现，制定更有效的策略。',
          check: { skillId: 'hacking', dc: 3 },
          outcomes: {
            success: {
              text: '你和 Kaplan 一起分析了红后的反制模式。你发现她的防御其实有固定的循环周期——每三次反制后会有一个约 5 秒的安全窗口。如果在这个窗口内操作，破解成功率会大幅提升。',
              effects: [
                { type: 'set_flag', key: 'red_queen_pattern_cracked', value: true },
                { type: 'set_flag', key: 'red_queen_protocol_known', value: true },
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
                { type: 'add_log', value: '你和 Kaplan 破解了红后的防御循环模式，后续黑客检定 DC 降低。' },
              ],
            },
            failure: {
              text: '红后的反制模式太复杂了，你和 Kaplan 一起也没能找出规律。但至少你们确认了她确实在拖延。',
              effects: [
                { type: 'modify_npc_attitude', targetId: 'kaplan', value: 1 },
              ],
            },
          },
        },
        {
          id: 'let_him_work',
          label: '让他继续工作',
          outcomes: {},
          directOutcome: {
            text: '你拍了拍 Kaplan 的肩膀，让他继续。他点了点头，重新专注于屏幕。',
            effects: [],
          },
        },
      ],
    },
  },
]

// ==================== 事件查找工具 ====================

const EVENT_MAP: Record<string, DungeonEvent> = {}
for (const event of EVENTS) {
  EVENT_MAP[event.id] = event
}

export function getEvent(id: string): DungeonEvent | undefined {
  return EVENT_MAP[id]
}
