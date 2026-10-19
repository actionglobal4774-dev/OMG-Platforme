import React from "react";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("OMG Platform render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#000",
            color: "#fff",
            padding: 24,
            fontFamily: "Inter, Arial, sans-serif"
          }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: "80px auto",
              border: "1px solid #D4AF37",
              borderRadius: 12,
              padding: 24,
              background: "rgba(5, 8, 7, 0.94)"
            }}
          >
            <h1 style={{ color: "#D4AF37", marginTop: 0 }}>OMG Platforme</h1>
            <p style={{ lineHeight: 1.6 }}>
              Une page a rencontre une difficulte d'affichage. Revenez a l'accueil puis ouvrez le module de nouveau.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#/";
                window.location.reload();
              }}
              style={{
                marginTop: 16,
                border: "0",
                borderRadius: 8,
                background: "#0B8F3C",
                color: "#fff",
                padding: "12px 16px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Retour a l'accueil
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
