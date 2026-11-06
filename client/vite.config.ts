import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
  },
  plugins: lazyPlugins(() => [vue()]),
});
