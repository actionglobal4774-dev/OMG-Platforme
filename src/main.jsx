import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./localization/i18n";
import { registerPwa } from "./registerPwa";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerPwa();
