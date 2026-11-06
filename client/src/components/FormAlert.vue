<script setup lang="ts">
import { CircleAlertIcon } from "@lucide/vue";
import { Alert, AlertDescription } from "@/components/ui/alert";

defineProps<{ messages: readonly string[] }>();
</script>

<template>
  <Alert v-if="messages.length > 0" variant="destructive">
    <CircleAlertIcon />
    <AlertDescription class="[&_p:not(:last-child)]:mb-1">
      <p v-for="message in messages" :key="message">{{ message }}</p>
      <slot />
    </AlertDescription>
  </Alert>
</template>
