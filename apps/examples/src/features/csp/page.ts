import { mountCspExample } from "./vanilla.js";

const host = document.querySelector<HTMLElement>("#csp-app");

if (!host) {
  throw new Error("CSP standalone example host was not found.");
}

mountCspExample(host);
