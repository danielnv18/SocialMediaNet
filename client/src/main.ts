import { useDark } from "@vueuse/core";
import { createApp } from "vue";
import "vue-sonner/style.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

// Follow the OS color scheme through shadcn's `.dark` class, without persisting a choice.
useDark({ storageKey: null });

createApp(App).use(router).mount("#app");
