import React from "react";
import { Link } from "react-router-dom";

export default function FeaturePage({ eyebrow, title, description, items = [], actions = [], children }) {
  return (
    <main className="omg-feature-page">
      <section className="omg-feature-hero">
        <p className="omg-feature-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      {items.length > 0 && (
        <section className="omg-feature-grid" aria-label={`${title} overview`}>
          {items.map((item) => (
            <article className="omg-feature-card" key={item}>
              <span className="omg-feature-dot" aria-hidden="true" />
              <p>{item}</p>
            </article>
          ))}
        </section>
      )}

      {children}

      <nav className="omg-feature-actions" aria-label="Page actions">
        {actions.map((action) => (
          <Link className={action.primary ? "omg-feature-button primary" : "omg-feature-button"} to={action.to} key={`${action.to}-${action.label}`}>
            {action.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
