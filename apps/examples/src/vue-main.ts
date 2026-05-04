import "@onegrid/themes/default.css";
import "./styles.css";
import { createApp } from "vue";
import VueWrapperExample from "./features/vue-wrapper/vue.vue";

const app = document.querySelector<HTMLElement>("#vue-app");

if (!app) {
  throw new Error("Vue wrapper example root was not found.");
}

createApp(VueWrapperExample).mount(app);
