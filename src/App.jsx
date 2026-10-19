import React, { useEffect } from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { FredProvider } from "./context/FredContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import OfflineBanner from "./components/common/OfflineBanner";
import CloudDataBridge from "./components/common/CloudDataBridge";
import { initializePushNotifications, removePushNotificationListeners } from "./services/pushNotificationService";

function App() {
  useEffect(() => {
    initializePushNotifications().catch((error) => {
      console.warn("Notifications push indisponibles.", error?.message);
    });
    return () => {
      removePushNotificationListeners().catch(() => null);
    };
  }, []);

  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <FredProvider>
            <AppErrorBoundary>
              <CloudDataBridge />
              <OfflineBanner />
              <AppRoutes />
            </AppErrorBoundary>
          </FredProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
