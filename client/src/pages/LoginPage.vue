<script setup lang="ts">
import { loginSchema } from "@/auth/schemas";
import { login } from "@/auth/session";
import AuthLayout from "@/components/AuthLayout.vue";
import FormAlert from "@/components/FormAlert.vue";
import TextField from "@/components/TextField.vue";
import TextLink from "@/components/TextLink.vue";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useServerForm } from "@/composables/useServerForm";

// The router moves a newly signed-in user on, honoring `?redirect`.
const { onSubmit, isSubmitting, formErrors } = useServerForm({
  schema: loginSchema,
  initialValues: { login: "", password: "" },
  action: login,
});
</script>

<template>
  <AuthLayout title="Log in" description="Use your username or email.">
    <form class="flex flex-col gap-6" novalidate @submit="onSubmit">
      <FormAlert :messages="formErrors" />
      <FieldGroup>
        <TextField name="login" label="Username or email" autocomplete="username" />
        <TextField
          name="password"
          label="Password"
          type="password"
          autocomplete="current-password"
        />
      </FieldGroup>
      <div class="flex flex-col gap-3">
        <Button type="submit" size="lg" :disabled="isSubmitting">
          {{ isSubmitting ? "Logging in…" : "Log in" }}
        </Button>
        <TextLink to="/forgot-password" class="self-center text-sm">Forgot your password?</TextLink>
      </div>
    </form>
    <template #footer>
      New to SocialMedia? <TextLink to="/register">Create an account</TextLink>
    </template>
  </AuthLayout>
</template>
