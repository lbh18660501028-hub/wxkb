# 副本 V2 TRPG 对话事件改造示例

这份文件写给后续接手本项目的 AI 或工程师，用来说明本次“副本内 TRPG / CRPG 对话事件”改造的思路、边界和新增事件写法。

## 改造边界

本功能只属于副本 V2 事件层，不要借此修改全局角色成长或属性迁移。

不要改：

- `Character.attributes`
- 全局 `Attributes` 类型
- 职业 / 血统 / 装备 / 基因锁属性加成
- 存档迁移
- 战斗伤害公式
- 全局技能定义文件

可以改：

- `src/types/dungeon-v2.ts` 的副本事件类型
- `src/systems/dungeon/dialogue.ts` 的副本对话 adapter
- `src/components/dungeon/DungeonEventPopup.vue` 的事件弹窗 UI
- `src/composables/useDungeonV2.ts` 的副本事件流接入
- `src/data/dungeons/*/events.ts` 的副本事件数据

如果对话检定需要属性，只透传字符串：

```ts
check: {
  skillId: 'medicine',
  attributeId: 'intelligence',
  dc: 3
}
```

不要导入或强依赖全局属性类型。`dialogue.ts` 内部用局部 `unknown` / record 兼容读取角色数据，避免和九属性迁移分支互相踩线。

## 数据流

当前新对话事件通过 `DungeonEvent.dialogue_event` 挂到旧事件系统上。

```txt
data/dungeons/*/events.ts
  -> DungeonEvent.dialogue_event
  -> createPendingEvent()
  -> useDungeonV2.handleEvent()
  -> DungeonEventPopup.vue
  -> resolveDialogueEventOption()
  -> systems/dungeon/dialogue.ts
  -> applyDialogueEffects()
  -> addLog() / state mutation / optional next event or combat
```

旧事件仍使用 `choices`，不要删除旧结构。`DungeonEventPopup.vue` 必须同时兼容：

- 新 TRPG 对话：`event.dialogue_event`
- 旧普通事件：`event.choices`

## 新事件类型核心

主要类型在 `src/types/dungeon-v2.ts`：

```ts
type DialogueOptionVisibility = 'visible' | 'disabled' | 'hidden'
type CheckOutcomeLevel = 'criticalSuccess' | 'success' | 'costlySuccess' | 'failure'

interface DungeonDialogueEvent {
  id: string
  title: string
  sceneText: string
  speaker?: {
    npcId?: string
    name: string
    portrait?: string
    attitude?: string
  }
  lines?: DialogueLine[]
  options: DialogueOption[]
  tags?: string[]
}
```

检定结果分四档：

```ts
if (successCount >= dc + 3) return 'criticalSuccess'
if (successCount >= dc) return 'success'
if (successCount === dc - 1 && allowCostlySuccess) return 'costlySuccess'
return 'failure'
```

如果数据没有配置某一档结果：

- `criticalSuccess` 回退到 `success`
- `costlySuccess` 回退到 `failure`
- `success` / `failure` 使用 adapter 默认文案

## Adapter 职责

`src/systems/dungeon/dialogue.ts` 是隔离层，后续扩展优先加在这里。

它负责：

- `resolveDialogueCheck()`：调用现有 D10 检定，生成 DP、骰子、成功数、结果档位
- `getDialogueOptionState()`：处理选项条件、隐藏和灰显
- `applyDialogueEffects()`：执行副本状态修改和日志
- `resolveDialogueOption()`：统一处理点击选项后的检定、结果、效果、后续事件
- `SKILL_LABELS` / alias：兼容当前十技能 ID 和少量别名

支持的基础 effects：

```ts
set_flag
add_flag
remove_flag
add_item
remove_item
modify_alert
modify_infection
modify_hp
modify_mp
modify_npc_attitude
start_combat
unlock_room
complete_quest
advance_quest
add_log
```

`set_flag` 的处理策略：

- 如果 key 是现有 `state.global` 布尔字段，例如 `laser_disabled`，直接写入该字段。
- 如果 value 是 string / number，写入 `state.global.custom`。
- 其他布尔 flag 写入 `state.player.flags`。

## 最小示例

下面是一个可复制到 `src/data/dungeons/biohazard/events.ts` 的对话事件骨架。

```ts
{
  id: 'ev_example_locked_terminal',
  trigger: { type: 'action_trigger', action_id: 'inspect_terminal' },
  once: true,
  description: '一台仍在运行的终端发出低鸣。',
  dialogue_event: {
    id: 'example_locked_terminal',
    title: '异常终端',
    sceneText: '屏幕上滚动着残缺的权限日志。每隔几秒，红色警告就会覆盖整个界面。',
    speaker: {
      npcId: 'red_queen',
      name: '红后',
      attitude: '冷静 / 监视'
    },
    lines: [
      {
        speaker: '红后',
        emotion: 'calm',
        text: '未经授权的访问会被记录。请离开。'
      }
    ],
    options: [
      {
        id: 'hack_terminal',
        label: '绕过权限',
        description: '尝试从维护端口进入系统。',
        requirements: [
          { type: 'item', key: 'hack_tool', visibleWhenUnmet: true, unmetText: '需要黑客工具' }
        ],
        check: { skillId: 'hacking', dc: 4 },
        allowCostlySuccess: true,
        outcomes: {
          criticalSuccess: {
            text: '你绕开了红后的监控沙箱，顺手复制了一份权限令牌。',
            effects: [
              { type: 'set_flag', key: 'example_terminal_hacked', value: true },
              { type: 'add_item', key: 'security_token' },
              { type: 'modify_alert', value: -5 },
              { type: 'add_log', value: '你获得了一个临时权限令牌。' }
            ]
          },
          success: {
            text: '你成功打开了终端的维护界面。',
            effects: [
              { type: 'set_flag', key: 'example_terminal_hacked', value: true }
            ]
          },
          costlySuccess: {
            text: '终端被打开了，但红后记录了你的接入指纹。',
            effects: [
              { type: 'set_flag', key: 'example_terminal_hacked', value: true },
              { type: 'modify_alert', value: 6 }
            ]
          },
          failure: {
            text: '红色警告占满屏幕，你被强制踢出系统。',
            effects: [
              { type: 'modify_alert', value: 10 }
            ]
          }
        }
      },
      {
        id: 'read_protocol',
        label: '识别公司协议',
        description: '先弄清楚它在保护什么。',
        check: { skillId: 'lore', dc: 3 },
        outcomes: {
          success: {
            text: '你认出这是保护伞公司的旧式安保协议，后续破解会容易一些。',
            effects: [
              { type: 'set_flag', key: 'example_protocol_known', value: true },
              { type: 'add_log', value: '已识别保护伞安保协议。' }
            ]
          },
          failure: {
            text: '协议名被刻意混淆，你暂时看不出门道。'
          }
        }
      },
      {
        id: 'prepared_hack',
        label: '利用已识别协议接入',
        description: '只有先识别协议后才会出现。',
        requirements: [
          { type: 'flag', key: 'example_protocol_known', operator: '==', value: true }
        ],
        check: { skillId: 'hacking', dc: 3 },
        outcomes: {
          success: {
            text: '你利用协议后门完成接入，终端安静下来。',
            effects: [
              { type: 'set_flag', key: 'example_terminal_hacked', value: true },
              { type: 'modify_alert', value: -3 }
            ]
          },
          failure: {
            text: '协议后门已经被红后修补，终端开始反追踪。',
            effects: [
              { type: 'modify_alert', value: 8 }
            ]
          }
        }
      },
      {
        id: 'leave_terminal',
        label: '离开终端',
        outcomes: {},
        directOutcome: {
          text: '你后退一步，终端继续在黑暗中低声运行。',
          effects: [
            { type: 'add_log', value: '你暂时没有处理异常终端。' }
          ]
        }
      }
    ]
  }
}
```

## 后续添加新对话事件的步骤

1. 在对应副本的 `events.ts` 里新增或替换一个 `DungeonEvent`。
2. 给事件添加 `dialogue_event`，保留 `description` 作为旧 UI 和日志兜底。
3. 每个选项优先写清楚 `label`、`description`、`check` 或 `directOutcome`。
4. 有条件的选项使用 `requirements`：
   - 不满足但要灰显：`visibleWhenUnmet: true`
   - 不满足直接隐藏：省略 `visibleWhenUnmet`
5. 所有状态变化都走 `effects`，不要在 UI 组件里直接改运行时状态。
6. 需要连续对话时，在 outcome 里写 `nextEventId`，指向另一个 `DungeonEvent.id`。
7. 不要为了一个事件去新增全局属性、全局技能或存档字段。

## 当前已接入的样例

在 `src/data/dungeons/biohazard/events.ts` 中可以参考：

- `ev_g3_meet_rain`：医疗室受伤 Rain，对应医学 / 感受 / 交际 / 威慑 / 道具选项。
- `ev_g3_rain_symptoms`：Rain 后续症状对话，演示 `nextEventId`。
- `ev_h3_monitor_hack`：红后终端，演示条件灰显、条件隐藏、降 DC 的准备选项。
- `ev_i3_laser_entrance`：Kaplan 激光走廊前犹豫，演示 NPC 态度和副本 flag。

## 构建注意

如果 `npm run build` 报 `reaction`、`vitality`、`spirit`、`immunity`、`attributeBonus` 相关错误，那通常是九属性迁移分支的现有冲突，不属于本对话事件功能。

本功能更适合先用：

```bash
npx vite build
```

确认前端打包无误，再由属性迁移分支统一处理 `vue-tsc` 的全局类型错误。
