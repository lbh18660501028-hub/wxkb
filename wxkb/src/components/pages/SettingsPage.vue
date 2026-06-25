<script setup lang="ts">
import { ref } from 'vue'
const sound = ref(true)
const autoBattle = ref(false)
const notification = ref(true)
</script>

<template>
  <div class="card-panel">
    <div class="card-header"><span class="card-title">⚙️ 系统设置</span></div>
    <div class="card-body">
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">
          <span style="font-size:9px;">游戏音效</span>
          <label style="position:relative;width:40px;height:20px;cursor:pointer;">
            <input type="checkbox" v-model="sound" style="opacity:0;width:0;height:0;">
            <span :style="{ position:'absolute',inset:0,background:sound?'var(--color-accent-gold)':'#444',borderRadius:'10px',transition:'0.3s' }"></span>
          </label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">
          <span style="font-size:9px;">自动战斗</span>
          <label style="position:relative;width:40px;height:20px;cursor:pointer;">
            <input type="checkbox" v-model="autoBattle" style="opacity:0;width:0;height:0;">
            <span :style="{ position:'absolute',inset:0,background:autoBattle?'var(--color-accent-gold)':'#444',borderRadius:'10px',transition:'0.3s' }"></span>
          </label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">
          <span style="font-size:9px;">消息通知</span>
          <label style="position:relative;width:40px;height:20px;cursor:pointer;">
            <input type="checkbox" v-model="notification" style="opacity:0;width:0;height:0;">
            <span :style="{ position:'absolute',inset:0,background:notification?'var(--color-accent-gold)':'#444',borderRadius:'10px',transition:'0.3s' }"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
