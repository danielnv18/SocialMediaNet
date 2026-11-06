<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { resetPasswordSchema } from "@/auth/schemas";
import { resetPassword } from "@/auth/session";
import AuthLayout from "@/components/AuthLayout.vue";
import FormAlert from "@/components/FormAlert.vue";
import TextField from "@/components/TextField.vue";
import TextLink from "@/components/TextLink.vue";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useServerForm } from "@/composables/useServerForm";

const route = useRoute();
const router = useRouter();

const queryString = (key: string) => {
  const value = route.query[key];
  return typeof value === "string" ? value : "";
};
const email = computed(() => queryString("email"));
const token = computed(() => queryString("token"));
const linkIsComplete = computed(() => email.value !== "" && token.value !== "");

const { onSubmit, isSubmitting, failure, formErrors } = useServerForm({
  schema: resetPasswordSchema,
  initialValues: { newPassword: "", confirmPassword: "" },
  action: async ({ newPassword }) => {
    await resetPassword({ email: email.value, token: token.value, newPassword });
    toast.success("Password updated. Log in with your new password.");
    await router.push("/login");
  },
});

const linkRejected = computed(() => failure.value?.fieldErrors.token !== undefined);
</script>

<template>
  <AuthLayout title="Choose a new password">
    <FormAlert
      v-if="!linkIsComplete"
      :messages="['This reset link is missing its email or token.']"
    >
      <TextLink to="/forgot-password">Request a new link</TextLink>
    </FormAlert>
    <form v-else class="flex flex-col gap-6" novalidate @submit="onSubmit">
      <FormAlert :messages="formErrors">
        <TextLink v-if="linkRejected" to="/forgot-password">Request a new link</TextLink>
      </FormAlert>
      <FieldGroup>
        <Field>
          <FieldLabel for="reset-email">Email</FieldLabel>
          <Input
            id="reset-email"
            :model-value="email"
            type="email"
            autocomplete="username"
            readonly
            class="bg-muted text-muted-foreground"
          />
        </Field>
        <TextField
          name="newPassword"
          label="New password"
          type="password"
          autocomplete="new-password"
        />
        <TextField
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autocomplete="new-password"
        />
      </FieldGroup>
      <Button type="submit" size="lg" :disabled="isSubmitting">
        {{ isSubmitting ? "Updating password…" : "Update password" }}
      </Button>
    </form>
    <template #footer>
      <TextLink to="/login">Back to log in</TextLink>
    </template>
  </AuthLayout>
</template>
