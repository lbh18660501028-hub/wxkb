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
    <div class="scan-line"></div>
    
    <div class="account-box">
      <div class="account-header">
        <div class="header-icon">⚡</div>
        <h2>{{ isLogin ? '登录' : '注册' }}</h2>
        <p>主神空间账户系统</p>
      </div>
      
      <form class="account-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名（3-20个字符）" autocomplete="username" />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码（至少6个字符）" autocomplete="current-password" />
        </div>
        
        <template v-if="!isLogin">
          <div class="form-group">
            <label>确认密码</label>
            <input v-model="confirmPassword" type="password" placeholder="请再次输入密码" autocomplete="new-password" />
          </div>
          
          <div class="form-group">
            <label>小队名字</label>
            <div class="squad-input-wrap">
              <input v-model="squadName" type="text" placeholder="例如：中州" maxlength="10" />
              <span class="squad-suffix">队</span>
            </div>
            <span class="form-hint" v-if="squadName">进入游戏后显示为：{{ squadName }}队</span>
          </div>
          
          <div class="form-group">
            <label>邮箱（选填）</label>
            <input v-model="email" type="email" placeholder="用于找回密码" autocomplete="email" />
          </div>
        </template>
        
        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>
        <div class="success-msg" v-if="successMsg">{{ successMsg }}</div>
        
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
      </form>
      
      <div class="toggle-link">
        <span @click="toggleMode">
          {{ isLogin ? '没有账号？立即注册' : '已有账号？立即登录' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-screen {
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

.account-box {
  background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 40px;
  width: 420px;
  box-shadow: 0 0 60px rgba(0,0,0,0.8);
}

.account-header {
  text-align: center;
  margin-bottom: 30px;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.account-header h2 {
  font-size: 24px;
  color: #c9a86c;
  margin: 0 0 8px 0;
}

.account-header p {
  font-size: 12px;
  color: #666;
  margin: 0;
}

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
  color: #888;
}

.form-group input {
  padding: 12px 16px;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 4px;
  color: #f0f6fc;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #c9a86c;
}

.form-group input::placeholder {
  color: #555;
}

.squad-input-wrap {
  display: flex;
  align-items: center;
}

.squad-input-wrap input {
  flex: 1;
  border-radius: 4px 0 0 4px;
}

.squad-suffix {
  padding: 12px 14px;
  background: rgba(201,168,108,0.15);
  border: 1px solid rgba(201,168,108,0.3);
  border-left: none;
  border-radius: 0 4px 4px 0;
  color: #c9a86c;
  font-size: 14px;
  font-weight: 700;
}

.form-hint {
  font-size: 11px;
  color: #c9a86c;
}

.error-msg {
  color: #ff5555;
  font-size: 12px;
  text-align: center;
}

.success-msg {
  color: #50a080;
  font-size: 12px;
  text-align: center;
}

.submit-btn {
  padding: 14px;
  background: rgba(201,168,108,0.1);
  border: 1px solid rgba(201,168,108,0.5);
  border-radius: 4px;
  color: #c9a86c;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  background: rgba(201,168,108,0.2);
  border-color: #c9a86c;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-link {
  text-align: center;
  margin-top: 20px;
}

.toggle-link span {
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-link span:hover {
  color: #c9a86c;
}
</style>
