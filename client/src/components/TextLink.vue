<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

defineProps<{ to: RouteLocationRaw }>();
</script>

<template>
  <RouterLink
    :to="to"
    class="font-medium text-primary underline-offset-4 dark:text-blue-400 hover:underline focus-visible:underline focus-visible:outline-none"
  >
    <slot />
  </RouterLink>
</template>
