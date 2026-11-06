/** Punto de entrada de React. Monta la aplicación dentro del elemento #root del HTML. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App className="w-screen max-w-full min-h-screen flex flex-col items-center justify-start text-center" />
  </StrictMode>,
);
