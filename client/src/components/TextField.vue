<script setup lang="ts">
import { useField } from "vee-validate";
import { useId } from "vue";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const {
  name,
  label,
  type = "text",
  autocomplete,
} = defineProps<{
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autocomplete: string;
}>();

const id = useId();
const errorId = `${id}-error`;

// Validate on blur, then on every keystroke once the field shows an error, so typing never
// greets the user with a complaint about an answer they haven't finished.
const { value, errorMessage, handleBlur, validate } = useField<string>(() => name, undefined, {
  validateOnValueUpdate: false,
});

function onInput(next: string | number) {
  value.value = String(next);
  if (errorMessage.value) void validate();
}
</script>

<template>
  <Field :data-invalid="errorMessage ? true : undefined">
    <FieldLabel :for="id">{{ label }}</FieldLabel>
    <Input
      :id="id"
      :model-value="value"
      :name="name"
      :type="type"
      :autocomplete="autocomplete"
      :aria-invalid="errorMessage ? true : undefined"
      :aria-describedby="errorMessage ? errorId : undefined"
      @update:model-value="onInput"
      @blur="handleBlur($event, true)"
    />
    <FieldError :id="errorId" :errors="errorMessage ? [errorMessage] : []" />
  </Field>
</template>
