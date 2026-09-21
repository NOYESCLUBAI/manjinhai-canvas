import { AuthProvider } from "./auth/AuthProvider";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import "./workspace.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<AuthProvider><App /></AuthProvider>);
