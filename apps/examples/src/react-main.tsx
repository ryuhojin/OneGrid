import "@onegrid/themes/default.css";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { ReactWrapperExample } from "./features/react-wrapper/react.js";

const app = document.querySelector<HTMLElement>("#react-app");

if (!app) {
  throw new Error("React wrapper example root was not found.");
}

createRoot(app).render(
  <>
    <h1>OneGrid React Wrapper</h1>
    <ReactWrapperExample />
  </>
);
