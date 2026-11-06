<script setup lang="ts">
import { RouterView } from "vue-router";
import { Toaster } from "@/components/ui/sonner";
</script>

<template>
  <RouterView />
  <Toaster class="font-sans!" position="top-center" rich-colors />
</template>
