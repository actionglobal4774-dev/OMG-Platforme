import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const register = async (event) => {
    event.preventDefault();
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setError("Complete every field with a valid email and a 6-character password.");
      return;
    }
    try {
      await registerUser({ email, password, displayName: name.trim() });
      navigate("/dashboard", { replace: true });
    } catch (authError) {
      setError(authError?.message || "Creation du compte impossible.");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-black px-4">
      <form onSubmit={register} className="w-full max-w-md rounded-2xl border border-omgGold/50 bg-white p-8 text-black shadow-xl">
        <h1 className="mb-6 text-3xl font-bold">Create OMG Account</h1>
        <p className="mb-5 text-sm text-slate-600">Cree un compte securise OMG Platform avec Firebase.</p>
        <label htmlFor="register-name" className="mb-1 block text-sm font-semibold">Full name</label>
        <input id="register-name" className="mb-3 w-full rounded border p-3" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="register-email" className="mb-1 block text-sm font-semibold">Email</label>
        <input id="register-email" className="mb-3 w-full rounded border p-3" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="register-password" className="mb-1 block text-sm font-semibold">Password</label>
        <input id="register-password" className="mb-3 w-full rounded border p-3" type="password" minLength={6} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="w-full rounded bg-omgGreen p-3 font-bold text-white">Register</button>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/login" className="text-omgGreen">Already registered?</Link>
          <Link to="/" className="text-slate-600">Back to modules</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;
