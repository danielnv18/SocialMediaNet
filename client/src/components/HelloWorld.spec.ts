import { mount } from "@vue/test-utils";
import { expect, test } from "vite-plus/test";
import HelloWorld from "./HelloWorld.vue";

test("renders", () => {
  const wrapper = mount(HelloWorld);
  expect(wrapper.find("h1").exists()).toBe(true);
});
