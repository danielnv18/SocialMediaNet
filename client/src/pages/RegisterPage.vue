<script setup lang="ts">
import { registerSchema } from "@/auth/schemas";
import { register } from "@/auth/session";
import AuthLayout from "@/components/AuthLayout.vue";
import FormAlert from "@/components/FormAlert.vue";
import TextField from "@/components/TextField.vue";
import TextLink from "@/components/TextLink.vue";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useServerForm } from "@/composables/useServerForm";

const { onSubmit, isSubmitting, formErrors } = useServerForm({
  schema: registerSchema,
  initialValues: { userName: "", email: "", password: "", confirmPassword: "" },
  action: ({ userName, email, password }) => register({ userName, email, password }),
});
</script>

<template>
  <AuthLayout title="Create an account" description="Pick a username and you're in.">
    <form class="flex flex-col gap-6" novalidate @submit="onSubmit">
      <FormAlert :messages="formErrors" />
      <FieldGroup>
        <TextField name="userName" label="Username" autocomplete="username" />
        <TextField name="email" label="Email" type="email" autocomplete="email" />
        <TextField name="password" label="Password" type="password" autocomplete="new-password" />
        <TextField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autocomplete="new-password"
        />
      </FieldGroup>
      <p class="-mt-2 text-xs text-muted-foreground">
        Passwords need 6 or more characters with an uppercase letter, a lowercase letter, a number,
        and a symbol.
      </p>
      <Button type="submit" size="lg" :disabled="isSubmitting">
        {{ isSubmitting ? "Creating account…" : "Create account" }}
      </Button>
    </form>
    <template #footer> Already have an account? <TextLink to="/login">Log in</TextLink> </template>
  </AuthLayout>
</template>
