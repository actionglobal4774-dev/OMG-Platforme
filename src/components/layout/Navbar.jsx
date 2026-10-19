import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { getUnreadCount, subscribeNotifications } from "../../services/notificationService";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);

  useEffect(() => subscribeNotifications(() => setUnreadCount(getUnreadCount())), []);

  return (
    <header className="sticky top-0 z-30 border-b border-omgGold/30 bg-black/90 shadow-[0_8px_30px_rgba(0,0,0,.35)] backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <button type="button" onClick={() => navigate("/")} className="flex shrink-0 items-center gap-3 omg-focus">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-omgGold bg-omgGreen/20 text-xs font-black text-omgGold shadow-[0_0_20px_rgba(11,143,60,.45)] sm:h-11 sm:w-11 sm:text-base">
            OMG
          </span>
          <span className="hidden text-left sm:block">
            <span className="block font-bold text-white">OMG Platforme</span>
            <span className="text-xs text-omgGold">{t("tagline")}</span>
          </span>
        </button>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <NavLink to="/" className={({ isActive }) => `hidden text-sm font-semibold md:inline ${isActive ? "text-omgGold" : "text-gray-300 hover:text-white"}`}>
            Modules
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={({ isActive }) => `hidden text-sm font-semibold md:inline ${isActive ? "text-omgGold" : "text-gray-300 hover:text-white"}`}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/settings" className={({ isActive }) => `hidden text-sm font-semibold sm:inline ${isActive ? "text-omgGold" : "text-gray-300 hover:text-white"}`}>
            Settings
          </NavLink>
          <NavLink
            to="/notifications"
            aria-label={`${unreadCount} notifications non lues`}
            className={({ isActive }) => `relative rounded-lg px-2 py-1 text-lg ${isActive ? "text-omgGold" : "text-gray-300 hover:text-white"}`}
          >
            <span aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
          <LanguageSwitcher />
          {user ? (
            <button type="button" onClick={logout} className="shrink-0 rounded bg-omgGreen px-2.5 py-2 text-xs font-semibold text-white omg-focus sm:px-4 sm:text-sm">
              {t("logout")}
            </button>
          ) : (
            <Link to="/login" className="shrink-0 rounded border border-omgGold px-2.5 py-2 text-xs font-semibold text-omgGold omg-focus sm:px-4 sm:text-sm">
              {t("login")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
