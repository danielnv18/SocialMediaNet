<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{ title: string; description?: string }>();
</script>

<template>
  <main class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 px-4 py-10">
    <p class="flex items-center gap-2 text-base font-semibold tracking-tight">
      <span class="size-5 rounded-md bg-primary" aria-hidden="true" />
      SocialMedia
    </p>
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-xl">{{ title }}</CardTitle>
        <CardDescription v-if="description">{{ description }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-6">
        <slot />
      </CardContent>
    </Card>
    <div v-if="$slots.footer" class="text-sm text-muted-foreground">
      <slot name="footer" />
    </div>
  </main>
</template>
