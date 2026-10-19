import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/layout/Navbar";
import FredChat from "../../components/fred509/FredChat";
import { modules } from "../../data/modules";

function Home() {
  const { t } = useTranslation();
  const payflow = modules.find((module) => module.id === "payflow");
  const otherModules = modules.filter((module) => module.id !== "payflow");
  const PayflowIcon = payflow.icon;

  return (
    <div
      className="omg-shell min-h-screen text-white"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 10%, rgba(11,143,60,.24), transparent 440px), radial-gradient(circle at 12% 85%, rgba(212,175,55,.16), transparent 360px), #000",
        color: "#fff"
      }}
    >
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-10" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 16px 96px" }}>
        <section className="text-center" style={{ textAlign: "center" }}>
          <div
            className="mx-auto mb-6 h-36 w-36 rounded-full"
            style={{
              width: 144,
              height: 144,
              margin: "0 auto 24px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #D4AF37, #000)",
              boxShadow: "0 0 45px rgba(11,143,60,.8), inset 0 0 28px rgba(212,175,55,.55)"
            }}
          />
          <h1 className="text-4xl font-black tracking-wide text-omgGold md:text-6xl" style={{ margin: 0, color: "#D4AF37", fontSize: "clamp(38px, 7vw, 68px)", fontWeight: 900 }}>
            OMG PLATFORME
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-omgGreen" style={{ margin: "14px auto 0", maxWidth: 720, color: "#0B8F3C", fontSize: 18 }}>
            {t("tagline", { defaultValue: "11 modules. Une seule plateforme mondiale." })}
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-gray-300 md:text-base" style={{ margin: "18px auto 0", maxWidth: 820, color: "#d1d5db", lineHeight: 1.7 }}>
            {t("home_mission")}
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <Link
            to={payflow.route}
            className="omg-card omg-payflow-core block rounded-3xl p-6 text-center text-white omg-focus"
            style={{ textDecoration: "none" }}
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-omgGold text-4xl text-omgGold">
              <PayflowIcon />
            </div>
            <h2 className="mt-4 text-3xl font-black text-omgGold">{t(payflow.nameKey, { defaultValue: payflow.name })}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-200">{t(`${payflow.id}_subtitle`, { defaultValue: payflow.subtitle })}</p>
            <span className="mt-4 inline-flex rounded-full border border-omgGold/70 px-4 py-2 text-sm font-bold text-omgGold">
              {t("payment")} central
            </span>
          </Link>
        </section>

        <section
          className="omg-module-grid mt-10"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
            marginTop: 40
          }}
        >
          {otherModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.route}
                className="omg-card omg-module-card group rounded-xl p-5 transition hover:-translate-y-1 hover:border-omgGreen omg-focus"
                style={{
                  display: "block",
                  minHeight: 130,
                  border: "1.5px solid rgba(212,175,55,.72)",
                  borderRadius: 12,
                  padding: 20,
                  color: "#fff",
                  textDecoration: "none",
                  background: "rgba(5,8,7,.92)",
                  boxShadow: "0 0 22px rgba(11,143,60,.15)"
                }}
              >
                <div className="flex items-start gap-4" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-omgGold text-2xl text-omgGreen"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      border: "1px solid #D4AF37",
                      borderRadius: 10,
                      color: "#0B8F3C",
                      fontSize: 24
                    }}
                  >
                    <Icon />
                  </div>
                  <div>
                    <h2 className="font-bold text-white group-hover:text-omgGold" style={{ margin: 0, color: "#fff", fontWeight: 800 }}>
                      {t(module.nameKey, { defaultValue: module.name })}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400" style={{ margin: "8px 0 0", color: "#a3a3a3", fontSize: 14, lineHeight: 1.45 }}>
                      {t(`${module.id}_subtitle`, { defaultValue: module.subtitle })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

      </main>
      <FredChat moduleId="platform" compact />
      <footer className="border-t border-omgGold/20 px-4 py-6 text-center text-sm text-gray-400">
        Contact: actionglobal4774@gmail.com | +1 617 615 5360
      </footer>
    </div>
  );
}

export default Home;
