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
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0c;color:#c9a86c;font-family:monospace;font-size:24px;">你选择了关闭。但有些门，一旦打开就再也关不上了。</div>'
}
</script>

<template>
  <div class="login-screen">
    <div class="scan-line"></div>
    
    <div class="dialog-box">
      <div class="dialog-content">
        <div class="prompt-text" v-if="showText">
          <span class="typewriter">{{ typewriterText }}</span>
          <span class="cursor" v-if="!showButtons">|</span>
        </div>
        
        <div class="buttons" v-if="showButtons">
          <button class="choice-btn yes" @click="handleYes">
            <span class="btn-text">YES</span>
          </button>
          <button class="choice-btn no" @click="handleNo">
            <span class="btn-text">NO</span>
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
  background: #0a0a0c;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.scan-line {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.05) 2px,
    rgba(0,0,0,0.05) 4px
  );
  pointer-events: none;
}

.dialog-box {
  background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 60px 80px;
  box-shadow: 0 0 60px rgba(0,0,0,0.8);
  min-width: 700px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.prompt-text {
  font-size: 28px;
  color: #c9a86c;
  text-align: center;
  line-height: 2;
  text-shadow: 0 0 15px rgba(201,168,108,0.5);
}

.typewriter {
  border-right: none;
}

.cursor {
  animation: blink 1s infinite;
  color: #c9a86c;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.buttons {
  display: flex;
  gap: 40px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.choice-btn {
  padding: 20px 80px;
  border: 1px solid #444;
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.choice-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}

.choice-btn.yes {
  border-color: rgba(201,168,108,0.5);
}

.choice-btn.yes:hover {
  background: rgba(201,168,108,0.1);
  border-color: #c9a86c;
  box-shadow: 0 0 30px rgba(201,168,108,0.3);
}

.choice-btn.no {
  border-color: #444;
}

.choice-btn.no:hover {
  background: rgba(255,255,255,0.05);
  border-color: #666;
}

.btn-text {
  font-size: 24px;
  font-weight: 700;
  color: #f0f6fc;
  font-family: 'Courier New', monospace;
}

.choice-btn.yes .btn-text {
  color: #c9a86c;
}
</style>
