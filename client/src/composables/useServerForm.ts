import { toTypedSchema } from "@vee-validate/zod";
import { type TypedSchema, useForm } from "vee-validate";
import { computed, shallowRef } from "vue";
import type { z } from "zod";
import { ApiError } from "@/lib/api";

/**
 * A VeeValidate form whose submit calls the API. Server errors for fields in the form show
 * under those fields; everything else becomes `formErrors` for an alert.
 */
export function useServerForm<TSchema extends z.ZodType<Record<string, string>>>(options: {
  schema: TSchema;
  initialValues: z.input<TSchema>;
  action: (values: z.output<TSchema>) => Promise<unknown>;
}) {
  type Output = z.output<TSchema>;
  // Every form here is a flat record of strings, which lets server errors address fields by name.
  const form = useForm<Record<string, string>, Output>({
    validationSchema: toTypedSchema(options.schema) as TypedSchema<Record<string, string>, Output>,
    initialValues: options.initialValues,
  });
  const failure = shallowRef<ApiError | null>(null);
  const fieldNames = new Set(Object.keys(options.initialValues));

  const formErrors = computed(() => {
    const error = failure.value;
    if (!error) return [];
    const entries = Object.entries(error.fieldErrors);
    if (entries.length === 0) return [error.detail ?? error.title];
    return entries.filter(([field]) => !fieldNames.has(field)).flatMap(([, messages]) => messages);
  });

  const onSubmit = form.handleSubmit(async (values) => {
    failure.value = null;
    try {
      await options.action(values);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      failure.value = error;
      for (const [field, messages] of Object.entries(error.fieldErrors)) {
        if (fieldNames.has(field)) form.setFieldError(field, messages);
      }
    }
  });

  return { onSubmit, isSubmitting: form.isSubmitting, failure, formErrors };
}
