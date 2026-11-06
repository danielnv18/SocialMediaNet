<script setup lang="ts">
import { CircleCheckIcon } from "@lucide/vue";
import { shallowRef } from "vue";
import { forgotPasswordSchema } from "@/auth/schemas";
import { forgotPassword } from "@/auth/session";
import AuthLayout from "@/components/AuthLayout.vue";
import FormAlert from "@/components/FormAlert.vue";
import TextField from "@/components/TextField.vue";
import TextLink from "@/components/TextLink.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useServerForm } from "@/composables/useServerForm";

const sent = shallowRef(false);

const { onSubmit, isSubmitting, formErrors } = useServerForm({
  schema: forgotPasswordSchema,
  initialValues: { email: "" },
  action: async (values) => {
    await forgotPassword(values);
    sent.value = true;
  },
});
</script>

<template>
  <AuthLayout
    title="Reset your password"
    description="Enter the email on your account and we'll send you a link to choose a new password."
  >
    <Alert v-if="sent">
      <CircleCheckIcon class="text-primary" />
      <AlertDescription>
        If an account exists for that email, we've sent a reset link.
      </AlertDescription>
    </Alert>
    <form v-else class="flex flex-col gap-6" novalidate @submit="onSubmit">
      <FormAlert :messages="formErrors" />
      <TextField name="email" label="Email" type="email" autocomplete="email" />
      <Button type="submit" size="lg" :disabled="isSubmitting">
        {{ isSubmitting ? "Sending link…" : "Send reset link" }}
      </Button>
    </form>
    <template #footer> Remembered it? <TextLink to="/login">Log in</TextLink> </template>
  </AuthLayout>
</template>
