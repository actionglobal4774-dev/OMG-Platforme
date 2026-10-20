import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: loginUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async (event) => {
    event.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    try {
      await loginUser({ email, password });
      const requestedPath = location.state?.from;
      const destination = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//") && !/^\/(login|register)(\/|\?|#|$)/.test(requestedPath)
        ? requestedPath : "/dashboard";
      navigate(destination, { replace: true });
    } catch (authError) {
      setError(authError?.message || "Connexion impossible.");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-black px-4 text-white">
      <form onSubmit={login} className="w-full max-w-md rounded-2xl border border-omgGold/50 bg-white p-8 text-black shadow-xl">
        <h1 className="mb-6 text-3xl font-bold">OMG Login</h1>
        <p className="mb-5 text-sm text-slate-600">Connexion securisee a votre compte OMG Platform.</p>
        <label htmlFor="login-email" className="mb-1 block text-sm font-semibold">Email</label>
        <input id="login-email" className="mb-3 w-full rounded border p-3" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="login-password" className="mb-1 block text-sm font-semibold">Password</label>
        <input id="login-password" className="mb-3 w-full rounded border p-3" type="password" autoComplete="current-password" minLength={6} required placeholder="6 characters minimum" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="w-full rounded bg-omgGreen p-3 font-bold text-white">Login</button>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/register" className="text-omgGreen">Create account</Link>
          <Link to="/forgot-password" className="text-omgGreen">Forgot password</Link>
        </div>
        <Link to="/" className="mt-5 block text-center text-sm text-slate-600">Back to modules</Link>
      </form>
    </div>
  );
}

export default Login;
