<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'login', username: string, squadName: string): void
}>()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const squadName = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  if (!isLogin.value) {
    if (password.value !== confirmPassword.value) {
      errorMsg.value = '两次密码不一致'
      return
    }

    if (!squadName.value || squadName.value.length < 1) {
      errorMsg.value = '请输入小队名字'
      return
    }
  }

  loading.value = true

  try {
    const url = isLogin.value ? '/api/auth/login' : '/api/auth/register'
    const body: any = {
      username: username.value,
      password: password.value,
    }

    if (!isLogin.value) {
      body.email = email.value
      body.squadName = squadName.value
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      errorMsg.value = data.error || '操作失败'
      return
    }

    if (isLogin.value) {
      localStorage.setItem('token', data.token)
      emit('login', username.value, data.player.squadName || '')
    } else {
      successMsg.value = '注册成功，请登录'
      isLogin.value = true
      password.value = ''
      confirmPassword.value = ''
    }
  } catch (e) {
    errorMsg.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMsg.value = ''
  successMsg.value = ''
}
</script>

<template>
  <div class="account-screen">
    <!-- 背景效果 -->
    <div class="starfield"></div>
    <div class="dark-matter"></div>
    <div class="crt-grid"></div>

    <!-- 主神标志 -->
    <div class="lord-god-logo">
      <div class="logo-ring outer"></div>
      <div class="logo-ring inner"></div>
      <div class="logo-core">◉</div>
    </div>

    <div class="account-box">
      <div class="account-header">
        <div class="header-line"></div>
        <h2>{{ isLogin ? '身份验证' : '新成员登记' }}</h2>
        <p>主神空间 // 账户系统</p>
        <div class="header-line"></div>
      </div>

      <form class="account-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>代号</label>
          <input v-model="username" type="text" placeholder="输入代号（3-20字符）" autocomplete="username" />
        </div>

        <div class="form-group">
          <label>密钥</label>
          <input v-model="password" type="password" placeholder="输入密钥（至少6位）" autocomplete="current-password" />
        </div>

        <template v-if="!isLogin">
          <div class="form-group">
            <label>确认密钥</label>
            <input v-model="confirmPassword" type="password" placeholder="再次输入密钥" autocomplete="new-password" />
          </div>

          <div class="form-group">
            <label>小队名称</label>
            <div class="squad-input-wrap">
              <input v-model="squadName" type="text" placeholder="例如：中州" maxlength="10" />
              <span class="squad-suffix">队</span>
            </div>
            <span class="form-hint" v-if="squadName">进入游戏后显示为：{{ squadName }}队</span>
          </div>

          <div class="form-group">
            <label>通讯频率（选填）</label>
            <input v-model="email" type="email" placeholder="用于找回密钥" autocomplete="email" />
          </div>
        </template>

        <div class="error-msg" v-if="errorMsg">
          <span class="error-icon">◉</span> {{ errorMsg }}
        </div>
        <div class="success-msg" v-if="successMsg">
          <span class="success-icon">◉</span> {{ successMsg }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span class="btn-glow"></span>
          <span class="btn-text">{{ loading ? '处理中...' : (isLogin ? '验证身份' : '登记注册') }}</span>
        </button>
      </form>

      <div class="toggle-link">
        <span @click="toggleMode">
          {{ isLogin ? '◆ 没有身份？立即登记' : '◆ 已有身份？立即验证' }}
        </span>
      </div>

      <div class="footer-code">[SYSTEM.AUTH_MODE]</div>
    </div>
  </div>
</template>

<style scoped>
.account-screen {
  position: fixed;
  inset: 0;
  background: #050505;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
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
    radial-gradient(1px 1px at 130px 80px, rgba(176,38,255,0.2), transparent);
  background-repeat: repeat;
  background-size: 800px 160px;
  animation: starfieldDrift 120s linear infinite;
}

.dark-matter {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.06;
  background:
    radial-gradient(ellipse 60% 40% at 15% 20%, rgba(176,38,255,0.3), transparent 60%),
    radial-gradient(ellipse 40% 60% at 85% 80%, rgba(0,240,255,0.2), transparent 55%);
  animation: darkMatterShift 20s ease-in-out infinite;
}

.crt-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

@keyframes starfieldDrift {
  from { background-position: 0 0; }
  to { background-position: 800px 160px; }
}

@keyframes darkMatterShift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
  50% { transform: translate(-20px, 10px) scale(1.05); opacity: 0.08; }
}

/* ==================== 主神标志 ==================== */
.lord-god-logo {
  position: absolute;
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 100px;
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
  width: 100px;
  height: 100px;
  border-top-color: rgba(0,240,255,0.8);
  border-bottom-color: rgba(0,240,255,0.8);
  animation-duration: 4s;
}

.logo-ring.inner {
  width: 70px;
  height: 70px;
  border-left-color: rgba(255,176,0,0.6);
  border-right-color: rgba(255,176,0,0.6);
  animation-duration: 3s;
  animation-direction: reverse;
}

.logo-core {
  font-size: 28px;
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

/* ==================== 账户框 ==================== */
.account-box {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, rgba(13,13,17,0.98), rgba(8,8,12,0.98));
  border: 1px solid rgba(0,240,255,0.2);
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
  padding: 40px;
  width: 440px;
  box-shadow:
    0 0 60px rgba(0,0,0,0.9),
    inset 0 0 60px rgba(0,240,255,0.03);
}

.account-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, #00f0ff, transparent 60%);
  opacity: 0.5;
}

.account-header {
  text-align: center;
  margin-bottom: 32px;
}

.header-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent);
  margin: 12px 0;
}

.account-header h2 {
  font-size: 22px;
  color: #00f0ff;
  margin: 0 0 8px 0;
  text-shadow: 0 0 15px rgba(0,240,255,0.4);
  letter-spacing: 4px;
}

.account-header p {
  font-size: 12px;
  color: #4a5563;
  margin: 0;
  letter-spacing: 2px;
}

/* ==================== 表单 ==================== */
.account-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: #00f0ff;
  letter-spacing: 2px;
}

.form-group input {
  padding: 12px 16px;
  background: rgba(8,8,12,0.9);
  border: 1px solid rgba(0,240,255,0.2);
  color: #d8e0e8;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.form-group input:focus {
  border-color: #00f0ff;
  box-shadow: 0 0 15px rgba(0,240,255,0.2);
}

.form-group input::placeholder {
  color: #4a5563;
}

.squad-input-wrap {
  display: flex;
  align-items: center;
}

.squad-input-wrap input {
  flex: 1;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%, 0 calc(100% - 6px));
}

.squad-suffix {
  padding: 12px 14px;
  background: rgba(0,240,255,0.1);
  border: 1px solid rgba(0,240,255,0.2);
  border-left: none;
  color: #00f0ff;
  font-size: 14px;
  font-weight: 700;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.form-hint {
  font-size: 11px;
  color: #ffb000;
}

.error-msg {
  color: #ff3366;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  background: rgba(255,51,102,0.1);
  border: 1px solid rgba(255,51,102,0.2);
}

.error-icon {
  color: #ff3366;
}

.success-msg {
  color: #39ff14;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  background: rgba(57,255,20,0.1);
  border: 1px solid rgba(57,255,20,0.2);
}

.success-icon {
  color: #39ff14;
}

.submit-btn {
  position: relative;
  padding: 14px;
  background: rgba(0,240,255,0.1);
  border: 1px solid rgba(0,240,255,0.4);
  color: #00f0ff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 4px;
  letter-spacing: 4px;
  overflow: hidden;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
}

.submit-btn:hover:not(:disabled) {
  background: rgba(0,240,255,0.2);
  border-color: #00f0ff;
  box-shadow: 0 0 30px rgba(0,240,255,0.3);
  transform: translateY(-2px);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(0,240,255,0.2) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.submit-btn:hover:not(:disabled) .btn-glow {
  opacity: 1;
  animation: glowSweep 1.5s ease-in-out infinite;
}

@keyframes glowSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.btn-text {
  position: relative;
  z-index: 1;
}

.toggle-link {
  text-align: center;
  margin-top: 20px;
}

.toggle-link span {
  font-size: 12px;
  color: #4a5563;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.toggle-link span:hover {
  color: #00f0ff;
  text-shadow: 0 0 10px rgba(0,240,255,0.5);
}

.footer-code {
  text-align: center;
  margin-top: 20px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: #4a5563;
  letter-spacing: 2px;
}
</style>
