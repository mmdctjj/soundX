<script setup lang="ts">
import { WebDavMusicScanner } from "@soundx/core"
import { http } from "./services"

const scanner = new WebDavMusicScanner('music', '', 'admin', '123456')

const init = async () => {
  console.log('scanner')
  const res = await scanner.scanAllMusic()
  console.log(res)
  http('/v1/user/list')
}
</script>

<template>
  <div>
    <button @click="init">开始刮削</button>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
