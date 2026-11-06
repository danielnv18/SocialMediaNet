<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { toast } from "vue-sonner";
import { logout, useSession } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";

const session = useSession();
const user = computed(() => (session.value.status === "authenticated" ? session.value.user : null));

const loggingOut = shallowRef(false);

// The router sends the user to /login once the session turns anonymous.
async function onLogOut() {
  loggingOut.value = true;
  try {
    await logout();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    toast.error(error.detail ?? error.title);
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div v-if="user" class="flex min-h-svh flex-col bg-muted/50">
    <header class="border-b bg-background">
      <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <p class="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span class="size-5 rounded-md bg-primary" aria-hidden="true" />
          SocialMedia
        </p>
        <Button variant="outline" :disabled="loggingOut" @click="onLogOut">
          {{ loggingOut ? "Logging out…" : "Log out" }}
        </Button>
      </div>
    </header>
    <main class="mx-auto w-full max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Signed in as {{ user.userName }}</CardTitle>
          <CardDescription>{{ user.email }}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  </div>
</template>
