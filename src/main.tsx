
  // Quick debug log to confirm the bundle is loaded in the browser
  // (If you don't see this in the browser console, the module isn't loading)
  // eslint-disable-next-line no-console
  console.log('main.tsx loaded', new Date().toISOString());

  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  