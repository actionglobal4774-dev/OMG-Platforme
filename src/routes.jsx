import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";

const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const AuthStepPage = lazy(() => import("./pages/auth/AuthStepPage"));
const Dashboard = lazy(() => import("./pages/user/Dashboard"));
const Settings = lazy(() => import("./pages/user/Settings"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Notifications = lazy(() => import("./pages/user/Notifications"));
const AIAssistant = lazy(() => import("./pages/user/AIAssistant"));
const NotFound = lazy(() => import("./pages/public/NotFound"));
const SystemStatePage = lazy(() => import("./pages/system/SystemStatePage"));
const PayPalReturnPage = lazy(() => import("./pages/payment/PayPalReturnPage"));
const MonCashReturnPage = lazy(() => import("./pages/payment/MonCashReturnPage"));
const StripeReturnPage = lazy(() => import("./pages/payment/StripeReturnPage"));

const PayflowDashboard = lazy(() => import("./modules/payflow/PayflowDashboard"));
const PayflowSectionPage = lazy(() => import("./modules/payflow/PayflowSectionPage"));
const MailportDashboard = lazy(() => import("./modules/mailport/MailportDashboard"));
const MailportSectionPage = lazy(() => import("./modules/mailport/MailportSectionPage"));
const StoreDashboard = lazy(() => import("./modules/store/StoreDashboard"));
const StoreSectionPage = lazy(() => import("./modules/store/StoreSectionPage"));
const RemainingModuleSectionPage = lazy(() => import("./modules/RemainingModuleSectionPage"));
const PropertyDashboard = lazy(() => import("./modules/property/PropertyDashboard"));
const RestaurantDashboard = lazy(() => import("./modules/restaurant/RestaurantDashboard"));
const SchoolDashboard = lazy(() => import("./modules/school/SchoolDashboard"));
const CityDashboard = lazy(() => import("./modules/city/CityDashboard"));
const HealthDashboard = lazy(() => import("./modules/health/HealthDashboard"));
const HealthSectionPage = lazy(() => import("./modules/health/HealthSectionPage"));
const TravelDashboard = lazy(() => import("./modules/travel/TravelDashboard"));
const TravelSectionPage = lazy(() => import("./modules/travel/TravelSectionPage"));
const UniversityDashboard = lazy(() => import("./modules/university/UniversityDashboard"));
const TaxDashboard = lazy(() => import("./modules/taxpro/TaxDashboard"));
const AdminDashboard = lazy(() => import("./modules/administration/AdminDashboard"));

function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#000",
        color: "#D4AF37",
        fontFamily: "Inter, Arial, sans-serif",
        textAlign: "center",
        padding: 24
      }}
    >
      <div>
        <strong style={{ display: "block", fontSize: 28 }}>OMG Platforme</strong>
        <span style={{ color: "#0B8F3C", display: "block", marginTop: 10 }}>
          Chargement du module...
        </span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/splash" element={<AuthStepPage />} />
        <Route path="/onboarding" element={<AuthStepPage />} />
        <Route path="/welcome" element={<AuthStepPage />} />
        <Route path="/select-language" element={<AuthStepPage />} />
        <Route path="/select-country" element={<AuthStepPage />} />
        <Route path="/select-user-type" element={<AuthStepPage />} />
        <Route path="/verify-phone" element={<AuthStepPage />} />
        <Route path="/verify-email" element={<AuthStepPage />} />
        <Route path="/kyc-verification" element={<AuthStepPage />} />
        <Route path="/biometric-login" element={<AuthStepPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />

        <Route path="/access-denied" element={<SystemStatePage />} />
        <Route path="/loading" element={<SystemStatePage />} />
        <Route path="/error" element={<SystemStatePage />} />
        <Route path="/success" element={<SystemStatePage />} />
        <Route path="/empty" element={<SystemStatePage />} />
        <Route path="/maintenance" element={<SystemStatePage />} />
        <Route path="/offline" element={<SystemStatePage />} />
        <Route path="/paypal-return" element={<PayPalReturnPage />} />
        <Route path="/paypal-cancel" element={<PayPalReturnPage cancelled />} />
        <Route path="/moncash-return" element={<MonCashReturnPage />} />
        <Route path="/stripe-return" element={<StripeReturnPage />} />
        <Route path="/stripe-cancel" element={<StripeReturnPage cancelled />} />
        <Route path="/not-found" element={<NotFound />} />

        <Route path="/payflow" element={<ProtectedRoute><PayflowDashboard /></ProtectedRoute>} />
        <Route path="/mailport" element={<ProtectedRoute><MailportDashboard /></ProtectedRoute>} />
        <Route path="/store" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
        <Route path="/property" element={<ProtectedRoute><PropertyDashboard /></ProtectedRoute>} />
        <Route path="/restaurant-hotel-traiteur" element={<ProtectedRoute><RestaurantDashboard /></ProtectedRoute>} />
        <Route path="/school" element={<ProtectedRoute><SchoolDashboard /></ProtectedRoute>} />
        <Route path="/city-administration" element={<ProtectedRoute><CityDashboard /></ProtectedRoute>} />
        <Route path="/health-care" element={<ProtectedRoute><HealthDashboard /></ProtectedRoute>} />
        <Route path="/travel" element={<ProtectedRoute><TravelDashboard /></ProtectedRoute>} />
        <Route path="/university-integration" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>} />
        <Route path="/usa-tax-pro" element={<ProtectedRoute><TaxDashboard /></ProtectedRoute>} />
        <Route path="/platform-administration" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        <Route path="/restaurant" element={<Navigate to="/restaurant-hotel-traiteur" replace />} />
        <Route path="/city" element={<Navigate to="/city-administration" replace />} />
        <Route path="/health" element={<Navigate to="/health-care" replace />} />
        <Route path="/travel-agency" element={<Navigate to="/travel" replace />} />
        <Route path="/university" element={<Navigate to="/university-integration" replace />} />
        <Route path="/administration" element={<Navigate to="/platform-administration" replace />} />

        <Route path="/payflow/:section" element={<ProtectedRoute><PayflowSectionPage /></ProtectedRoute>} />
        <Route path="/mailport/parcels/:parcelId" element={<ProtectedRoute><MailportSectionPage parcelDetail /></ProtectedRoute>} />
        <Route path="/mailport/:section" element={<ProtectedRoute><MailportSectionPage /></ProtectedRoute>} />
        <Route path="/store/:section" element={<ProtectedRoute><StoreSectionPage /></ProtectedRoute>} />
        <Route path="/property/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="property" /></ProtectedRoute>} />
        <Route path="/restaurant-hotel-traiteur/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="restaurant" /></ProtectedRoute>} />
        <Route path="/school/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="school" /></ProtectedRoute>} />
        <Route path="/city-administration/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="city" /></ProtectedRoute>} />
        <Route path="/health-care/:section" element={<ProtectedRoute><HealthSectionPage /></ProtectedRoute>} />
        <Route path="/travel/:section" element={<ProtectedRoute><TravelSectionPage /></ProtectedRoute>} />
        <Route path="/university-integration/:section" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>} />
        <Route path="/usa-tax-pro/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="taxpro" /></ProtectedRoute>} />
        <Route path="/platform-administration/:section" element={<ProtectedRoute><RemainingModuleSectionPage moduleId="administration" /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
