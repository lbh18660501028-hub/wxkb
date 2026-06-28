<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'enter'): void
}>()

const showText = ref(false)
const showButtons = ref(false)
const typewriterText = ref('')
const fullText = '想明白生命的意义吗？想真正的……活着吗？'

onMounted(() => {
  setTimeout(() => {
    showText.value = true
    typeWriter()
  }, 1000)
})

function typeWriter() {
  let i = 0
  const timer = setInterval(() => {
    if (i < fullText.length) {
      typewriterText.value += fullText.charAt(i)
      i++
    } else {
      clearInterval(timer)
      setTimeout(() => {
        showButtons.value = true
      }, 500)
    }
  }, 100)
}

function handleYes() {
  emit('enter')
}

function handleNo() {
  window.close()
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050505;color:#00f0ff;font-family:Microsoft YaHei,PingFang SC,sans-serif;font-size:24px;text-shadow:0 0 20px rgba(0,240,255,0.5);">你选择了关闭。但有些门，一旦打开就再也关不上了。</div>'
}
</script>

<template>
  <div class="login-screen">
    <!-- 背景效果 -->
    <div class="starfield"></div>
    <div class="dark-matter"></div>
    <div class="crt-overlay">
      <div class="scan-line"></div>
      <div class="crt-grid"></div>
    </div>

    <!-- 主神空间标志 -->
    <div class="lord-god-logo">
      <div class="logo-ring outer"></div>
      <div class="logo-ring inner"></div>
      <div class="logo-core">◉</div>
    </div>

    <!-- 对话框 -->
    <div class="dialog-box">
      <div class="dialog-content">
        <div class="prompt-text" v-if="showText">
          <span class="typewriter">{{ typewriterText }}</span>
          <span class="cursor" v-if="!showButtons">▮</span>
        </div>

        <div class="buttons" v-if="showButtons">
          <button class="choice-btn yes" @click="handleYes">
            <span class="btn-glow"></span>
            <span class="btn-text">是</span>
          </button>
          <button class="choice-btn no" @click="handleNo">
            <span class="btn-text">否</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  position: fixed;
  inset: 0;
  background: var(--void-black, #050505);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
}

/* ==================== 背景效果 ==================== */
.starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 40px 70px, rgba(0,240,255,0.3), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.2), transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(176,38,255,0.2), transparent),
    radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.3), transparent),
    radial-gradient(2px 2px at 250px 50px, rgba(0,240,255,0.15), transparent);
  background-repeat: repeat;
  background-size: 800px 160px;
  animation: starfieldDrift 120s linear infinite;
}

.dark-matter {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
  background:
    radial-gradient(ellipse 60% 40% at 15% 20%, rgba(176,38,255,0.3), transparent 60%),
    radial-gradient(ellipse 40% 60% at 85% 80%, rgba(0,240,255,0.2), transparent 55%);
  animation: darkMatterShift 20s ease-in-out infinite;
}

@keyframes starfieldDrift {
  from { background-position: 0 0; }
  to { background-position: 800px 160px; }
}

@keyframes darkMatterShift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.06; }
  50% { transform: translate(-20px, 10px) scale(1.05); opacity: 0.1; }
}

/* ==================== CRT 效果 ==================== */
.crt-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.scan-line {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,240,255,0.03) 2px,
    rgba(0,240,255,0.03) 4px
  );
  animation: scanMove 8s linear infinite;
}

@keyframes scanMove {
  from { transform: translateY(0); }
  to { transform: translateY(4px); }
}

.crt-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* ==================== 主神标志 ==================== */
.lord-god-logo {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-ring {
  position: absolute;
  border: 2px solid rgba(0,240,255,0.3);
  border-radius: 50%;
  animation: ringPulse 3s ease-in-out infinite;
}

.logo-ring.outer {
  width: 120px;
  height: 120px;
  border-top-color: rgba(0,240,255,0.8);
  border-bottom-color: rgba(0,240,255,0.8);
  animation-duration: 4s;
}

.logo-ring.inner {
  width: 80px;
  height: 80px;
  border-left-color: rgba(255,176,0,0.6);
  border-right-color: rgba(255,176,0,0.6);
  animation-duration: 3s;
  animation-direction: reverse;
}

.logo-core {
  font-size: 36px;
  color: #00f0ff;
  text-shadow: 0 0 20px rgba(0,240,255,0.8), 0 0 40px rgba(0,240,255,0.4);
  animation: coreGlow 2s ease-in-out infinite alternate;
}

@keyframes ringPulse {
  0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.6; }
  50% { transform: rotate(180deg) scale(1.05); opacity: 1; }
}

@keyframes coreGlow {
  from { text-shadow: 0 0 20px rgba(0,240,255,0.8), 0 0 40px rgba(0,240,255,0.4); }
  to { text-shadow: 0 0 30px rgba(0,240,255,1), 0 0 60px rgba(0,240,255,0.6); }
}

/* ==================== 对话框 ==================== */
.dialog-box {
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, rgba(13,13,17,0.98), rgba(8,8,12,0.98));
  border: 1px solid rgba(0,240,255,0.2);
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
  padding: 0;
  box-shadow:
    0 0 60px rgba(0,0,0,0.9),
    inset 0 0 60px rgba(0,240,255,0.03);
  min-width: 700px;
  max-width: 800px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(0,240,255,0.05);
  border-bottom: 1px solid rgba(0,240,255,0.15);
}

.header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.5), transparent);
}

.header-text {
  font-size: 14px;
  color: #00f0ff;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0,240,255,0.5);
  white-space: nowrap;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  padding: 60px 48px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(0,240,255,0.1);
  font-size: 12px;
}

.footer-code {
  color: #4a5563;
  font-family: 'Share Tech Mono', monospace;
}

.footer-status {
  color: #39ff14;
  text-shadow: 0 0 10px rgba(57,255,20,0.5);
}

/* ==================== 文字效果 ==================== */
.prompt-text {
  font-size: 32px;
  color: #00f0ff;
  text-align: center;
  line-height: 1.8;
  text-shadow: 0 0 20px rgba(0,240,255,0.5);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.typewriter {
  border-right: none;
}

.cursor {
  animation: blink 0.8s infinite;
  color: #00f0ff;
  font-weight: bold;
  margin-left: 4px;
  text-shadow: 0 0 10px rgba(0,240,255,0.8);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* ==================== 按钮 ==================== */
.buttons {
  display: flex;
  gap: 48px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.choice-btn {
  position: relative;
  padding: 24px 64px;
  border: 1px solid rgba(0,240,255,0.3);
  background: rgba(13,13,17,0.9);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.choice-btn:hover {
  transform: translateY(-3px);
  border-color: rgba(0,240,255,0.6);
  box-shadow: 0 10px 40px rgba(0,240,255,0.2), inset 0 0 30px rgba(0,240,255,0.05);
}

.choice-btn.yes {
  border-color: rgba(0,240,255,0.4);
}

.choice-btn.yes:hover {
  border-color: #00f0ff;
  box-shadow: 0 0 40px rgba(0,240,255,0.3), inset 0 0 40px rgba(0,240,255,0.1);
}

.choice-btn.no {
  border-color: rgba(255,0,51,0.3);
}

.choice-btn.no:hover {
  border-color: rgba(255,0,51,0.6);
  box-shadow: 0 0 40px rgba(255,0,51,0.2), inset 0 0 40px rgba(255,0,51,0.05);
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(0,240,255,0.1) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.choice-btn.yes:hover .btn-glow {
  opacity: 1;
  animation: glowSweep 1.5s ease-in-out infinite;
}

@keyframes glowSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.btn-text {
  font-size: 28px;
  font-weight: 700;
  color: #d8e0e8;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  letter-spacing: 4px;
}

.choice-btn.yes .btn-text {
  color: #00f0ff;
  text-shadow: 0 0 15px rgba(0,240,255,0.6);
}

.choice-btn.no .btn-text {
  color: #ff3366;
}

.btn-sub {
  font-size: 12px;
  color: #4a5563;
  letter-spacing: 2px;
}

.choice-btn:hover .btn-sub {
  color: #8a99aa;
}
</style>
