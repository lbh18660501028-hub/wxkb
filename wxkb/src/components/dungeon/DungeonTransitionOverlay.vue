/**
 * 副本系统 V2 — 主神空间投放过渡特效
 *
 * ==================== 动画三阶段 ====================
 * Phase 1 (0.0s - 0.8s)  数据入侵 & 故障闪烁
 * Phase 2 (0.8s - 2.5s)  量子解构光束 & 校准进度条
 * Phase 3 (2.5s - 3.2s)  闪白 & 像素溶解 & 淡出
 *
 * ==================== 技术说明 ====================
 * 全屏 fixed 定位，z-index: 9999
 * 动画结束后自动 emit('done')，由父组件卸载
 */
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  done: []
}>()

/** 当前动画阶段 */
const phase = ref<1 | 2 | 3>(1)

/** 加载进度（0-100） */
const progress = ref(0)

/** 是否正在闪白 */
const flashing = ref(false)

/** 是否开始淡出 */
const dissolving = ref(false)

/** 组件是否可见 */
const visible = ref(true)

/** 代码雨字符 */
const matrixChars = ref<string[]>([])

/** 左侧数据流 */
const leftDataStream = ref<string[]>([])

/** 右侧数据流 */
const rightDataStream = ref<string[]>([])

/** 定时器引用 */
let timers: ReturnType<typeof setTimeout>[] = []

function addTimer(fn: () => void, delay: number): void {
  timers.push(setTimeout(fn, delay))
}

/** 生成随机代码雨字符 */
function randomMatrixChar(): string {
  const chars = '01ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEF'
  return chars[Math.floor(Math.random() * chars.length)]
}

/** 生成随机数据行 */
function randomDataLine(prefix: string): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
  const segments = [hex(), hex(), hex(), hex()]
  return `[${prefix}] 0x${segments.join(':')}`
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 初始化代码雨（20列 × 12行）
  const cols = 20
  const rows = 12
  matrixChars.value = Array.from({ length: cols * rows }, () => randomMatrixChar())

  // 初始化侧边数据流
  leftDataStream.value = Array.from({ length: 10 }, () => randomDataLine('SYNC'))
  rightDataStream.value = Array.from({ length: 10 }, () => randomDataLine('SCAN'))

  // 代码雨字符刷新（每 80ms 更换一批）
  const matrixTimer = setInterval(() => {
    matrixChars.value = matrixChars.value.map(() => randomMatrixChar())
  }, 80)

  // 侧边数据流刷新
  const dataTimer = setInterval(() => {
    leftDataStream.value = leftDataStream.value.map(() => randomDataLine('SYNC'))
    rightDataStream.value = rightDataStream.value.map(() => randomDataLine('SCAN'))
  }, 120)

  // Phase 1: 数据入侵 (0s - 0.8s)
  addTimer(() => {
    phase.value = 2
  }, 800)

  // Phase 2: 光束阶段 — 进度条填充 (0.8s - 2.5s, 约 1.7s)
  const progressStart = 850
  const progressEnd = 2450
  const progressDuration = progressEnd - progressStart
  const steps = 100
  const stepDelay = progressDuration / steps
  for (let i = 1; i <= steps; i++) {
    addTimer(() => {
      progress.value = i
    }, progressStart + i * stepDelay)
  }

  // Phase 3: 闪白 & 溶解 (2.5s)
  addTimer(() => {
    phase.value = 3
    flashing.value = true
  }, 2500)

  // 开始溶解 (2.7s)
  addTimer(() => {
    flashing.value = false
    dissolving.value = true
  }, 2700)

  // 淡出 (3.0s)
  addTimer(() => {
    visible.value = false
  }, 3000)

  // 完全结束，通知父组件卸载 (3.2s)
  addTimer(() => {
    clearInterval(matrixTimer)
    clearInterval(dataTimer)
    emit('done')
  }, 3200)

  // 清理定时器（组件提前卸载时）
  onUnmounted(() => {
    clearInterval(matrixTimer)
    clearInterval(dataTimer)
    timers.forEach(t => clearTimeout(t))
  })
})
</script>

<template>
  <Transition name="overlay-fade">
    <div v-if="visible" class="transition-overlay" :class="`phase-${phase}`">
      <!-- ==================== Phase 1: 故障背景 ==================== -->
      <div class="glitch-layer" v-if="phase === 1">
        <div class="glitch-bg glitch-shift"></div>
        <div class="glitch-bg glitch-green"></div>
        <div class="glitch-bg glitch-red"></div>
      </div>

      <!-- 警告框（Phase 1） -->
      <div class="warning-frame" v-if="phase === 1">
        <div class="warning-corner top-left"></div>
        <div class="warning-corner top-right"></div>
        <div class="warning-corner bottom-left"></div>
        <div class="warning-corner bottom-right"></div>
        <div class="warning-text">
          <span class="warning-bracket">[</span>
          <span class="warning-label">CRITICAL WARNING</span>
          <span class="warning-colon">:</span>
          <span class="warning-detail">QUANTUM DECONSTRUCTION INITIATED</span>
          <span class="warning-bracket">]</span>
        </div>
      </div>

      <!-- ==================== Phase 2: 光束 ==================== -->
      <template v-if="phase >= 2 && !dissolving">
        <!-- 代码雨光柱 -->
        <div class="beam-container">
          <div class="beam-core">
            <div
              v-for="(char, idx) in matrixChars"
              :key="idx"
              class="matrix-char"
              :style="{
                animationDelay: (idx % 20) * 0.06 + 's',
                animationDuration: (0.8 + (idx % 5) * 0.15) + 's',
              }"
            >
              {{ char }}
            </div>
          </div>
          <div class="beam-glow"></div>
          <div class="beam-edge-left"></div>
          <div class="beam-edge-right"></div>
        </div>

        <!-- 左侧数据流 -->
        <div class="data-stream data-stream-left">
          <div class="data-stream-title">◆ TEMPORAL ANCHOR</div>
          <div
            v-for="(line, idx) in leftDataStream"
            :key="'l' + idx"
            class="data-line"
            :style="{ animationDelay: idx * 0.08 + 's' }"
          >
            {{ line }}
          </div>
          <div class="data-stream-static">
            [ SIGNAL: SECURING TEMPORAL ANCHOR... ]<br>
            [ BIOMETRIC SYNC: 4/4 SQUAD MEMBERS ONLINE ]<br>
            [ TARGET DESTINATION: ZONE_RACCOON_CITY_B3 ]
          </div>
        </div>

        <!-- 右侧数据流 -->
        <div class="data-stream data-stream-right">
          <div class="data-stream-title">◆ QUANTUM SCAN</div>
          <div
            v-for="(line, idx) in rightDataStream"
            :key="'r' + idx"
            class="data-line"
            :style="{ animationDelay: idx * 0.08 + 's' }"
          >
            {{ line }}
          </div>
          <div class="data-stream-static">
            [ WAVELENGTH: 450nm STABLE ]<br>
            [ MASS DECONSTRUCTION: 99.7% ]<br>
            [ LORD_GOD_PROTOCOL: ACTIVE ]
          </div>
        </div>

        <!-- 校准进度条 -->
        <div class="calibration-bar">
          <div class="calibration-label">
            <span class="cal-label-text">QUANTUM CALIBRATION</span>
            <span class="cal-label-value">{{ progress }}%</span>
          </div>
          <div class="cal-track">
            <div class="cal-fill" :style="{ width: progress + '%' }"></div>
            <div class="cal-scan-line" :style="{ left: progress + '%' }"></div>
          </div>
          <div class="calibration-status">
            {{ progress < 30 ? 'ESTABLISHING UPLINK' : progress < 60 ? 'SYNCING BIOMETRICS' : progress < 90 ? 'STABILIZING BEAM' : 'DECONSTRUCTION READY' }}
          </div>
        </div>
      </template>

      <!-- ==================== Phase 3: 闪白 ==================== -->
      <div class="flash-bang" v-if="flashing"></div>

      <!-- 像素溶解粒子 -->
      <div class="dissolve-layer" v-if="dissolving">
        <div
          v-for="i in 48"
          :key="i"
          class="dissolve-particle"
          :style="{
            left: ((i % 8) * 12.5) + '%',
            top: (Math.floor(i / 8) * 16.6) + '%',
            animationDelay: ((i * 7) % 100) * 0.008 + 's',
          }"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ==================== 全屏容器 ==================== */
.transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transition-overlay.phase-3 {
  transition: opacity 0.3s ease-out;
}

/* ==================== Phase 1: 故障背景 ==================== */
.glitch-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.glitch-bg {
  position: absolute;
  inset: 0;
  background: #0a0008;
}

.glitch-shift {
  animation: glitch-shift 0.15s steps(2) infinite;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      rgba(0, 200, 255, 0.03) 1px,
      transparent 2px,
      transparent 4px
    );
}

.glitch-green {
  mix-blend-mode: screen;
  animation: glitch-green 0.2s steps(3) infinite;
  background:
    linear-gradient(90deg, transparent 0%, rgba(0, 255, 100, 0.08) 50%, transparent 100%);
}

.glitch-red {
  mix-blend-mode: screen;
  animation: glitch-red 0.18s steps(3) infinite;
  background:
    linear-gradient(-90deg, transparent 0%, rgba(255, 30, 60, 0.1) 50%, transparent 100%);
}

@keyframes glitch-shift {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-2px, 1px); }
  50%  { transform: translate(2px, -1px); }
  75%  { transform: translate(-1px, 2px); }
  100% { transform: translate(1px, -2px); }
}

@keyframes glitch-green {
  0%, 100% { transform: translate(0, 0); opacity: 0.6; }
  50% { transform: translate(3px, 0); opacity: 0.9; }
}

@keyframes glitch-red {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50% { transform: translate(-3px, 0); opacity: 0.8; }
}

/* 警告框 */
.warning-frame {
  position: relative;
  z-index: 5;
  padding: 24px 48px;
  animation: warning-pulse 0.4s ease-in-out infinite alternate;
}

.warning-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #ff2244;
  filter: drop-shadow(0 0 6px rgba(255, 34, 68, 0.6));
}

.warning-corner.top-left {
  top: 0; left: 0;
  border-right: none; border-bottom: none;
}
.warning-corner.top-right {
  top: 0; right: 0;
  border-left: none; border-bottom: none;
}
.warning-corner.bottom-left {
  bottom: 0; left: 0;
  border-right: none; border-top: none;
}
.warning-corner.bottom-right {
  bottom: 0; right: 0;
  border-left: none; border-top: none;
}

.warning-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 2px;
  white-space: nowrap;
  animation: warning-scan 0.8s ease-out;
}

.warning-bracket {
  color: #ff2244;
  font-weight: bold;
}

.warning-label {
  color: #ff4466;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(255, 34, 68, 0.5);
}

.warning-colon {
  color: #ff2244;
  margin: 0 4px;
}

.warning-detail {
  color: #ff6688;
  text-shadow: 0 0 4px rgba(255, 34, 68, 0.3);
}

@keyframes warning-pulse {
  from { opacity: 0.7; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1.02); }
}

@keyframes warning-scan {
  from {
    clip-path: inset(0 100% 0 0);
    opacity: 0;
  }
  to {
    clip-path: inset(0 0 0 0);
    opacity: 1;
  }
}

/* ==================== Phase 2: 光束 ==================== */
.beam-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  z-index: 3;
  display: flex;
  justify-content: center;
}

.beam-core {
  position: relative;
  width: 360px;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(12, 1fr);
  overflow: hidden;
}

.matrix-char {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: bold;
  color: #00ff88;
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.6);
  animation: matrix-fall linear infinite;
  opacity: 0;
}

@keyframes matrix-fall {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  10% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
    color: #00c8ff;
    text-shadow: 0 0 6px rgba(0, 200, 255, 0.5);
  }
  90% {
    opacity: 0.4;
  }
  100% {
    opacity: 0;
    transform: translateY(40px);
  }
}

.beam-glow {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 200, 255, 0.04) 15%,
    rgba(0, 255, 136, 0.06) 50%,
    rgba(0, 200, 255, 0.04) 85%,
    transparent 100%
  );
  filter: blur(20px);
  animation: beam-breathe 2s ease-in-out infinite;
}

@keyframes beam-breathe {
  0%, 100% { opacity: 0.6; width: 340px; }
  50% { opacity: 1; width: 380px; }
}

.beam-edge-left,
.beam-edge-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 255, 136, 0.8),
    rgba(0, 200, 255, 0.6),
    transparent
  );
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

.beam-edge-left { left: calc(50% - 180px); }
.beam-edge-right { right: calc(50% - 180px); }

/* ==================== 侧边数据流 ==================== */
.data-stream {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  width: 220px;
}

.data-stream-left {
  left: 24px;
}

.data-stream-right {
  right: 24px;
  text-align: right;
}

.data-stream-title {
  font-size: 10px;
  color: #00c8ff;
  letter-spacing: 2px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
  text-shadow: 0 0 4px rgba(0, 200, 255, 0.3);
}

.data-stream-right .data-stream-title {
  color: #00ff88;
  border-bottom-color: rgba(0, 255, 136, 0.2);
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
}

.data-line {
  color: rgba(0, 200, 255, 0.5);
  line-height: 1.6;
  animation: data-flicker 0.3s ease-out;
  opacity: 0.7;
}

.data-stream-right .data-line {
  color: rgba(0, 255, 136, 0.5);
}

@keyframes data-flicker {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 0.7; transform: translateX(0); }
}

.data-stream-static {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(0, 200, 255, 0.15);
  font-size: 10px;
  line-height: 1.8;
  color: rgba(136, 170, 204, 0.6);
}

.data-stream-right .data-stream-static {
  border-top-color: rgba(0, 255, 136, 0.15);
  color: rgba(136, 204, 170, 0.6);
}

/* ==================== 校准进度条 ==================== */
.calibration-bar {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  width: 360px;
}

.calibration-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-family: 'Courier New', monospace;
}

.cal-label-text {
  font-size: 10px;
  color: #00c8ff;
  letter-spacing: 3px;
  text-shadow: 0 0 4px rgba(0, 200, 255, 0.4);
}

.cal-label-value {
  font-size: 16px;
  font-weight: bold;
  color: #00ff88;
  text-shadow: 0 0 6px rgba(0, 255, 136, 0.5);
  font-variant-numeric: tabular-nums;
}

.cal-track {
  position: relative;
  height: 6px;
  background: rgba(0, 200, 255, 0.08);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 1px;
  overflow: hidden;
}

.cal-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(0, 200, 255, 0.8),
    rgba(0, 255, 136, 0.9)
  );
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  transition: width 0.05s linear;
}

.cal-scan-line {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
  transition: left 0.05s linear;
}

.calibration-status {
  margin-top: 6px;
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: rgba(0, 255, 136, 0.5);
  letter-spacing: 2px;
}

/* ==================== Phase 3: 闪白 & 溶解 ==================== */
.flash-bang {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(0, 255, 200, 0.4) 40%,
    rgba(0, 200, 255, 0.1) 70%,
    transparent 100%
  );
  animation: flash-burst 0.2s ease-out forwards;
  pointer-events: none;
}

@keyframes flash-burst {
  0% { opacity: 0; }
  15% { opacity: 1; }
  100% { opacity: 0; }
}

.dissolve-layer {
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}

.dissolve-particle {
  position: absolute;
  width: 12.5%;
  height: 16.6%;
  background: rgba(0, 200, 255, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.2);
  animation: dissolve-out 0.5s ease-out forwards;
}

@keyframes dissolve-out {
  0% {
    opacity: 0.8;
    transform: scale(1) translate(0, 0);
  }
  100% {
    opacity: 0;
    transform: scale(0.2) translate(var(--dx, 0px), var(--dy, -40px));
  }
}

/* ==================== 淡出过渡 ==================== */
.overlay-fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.overlay-fade-leave-to {
  opacity: 0;
}
</style>
