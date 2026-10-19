import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendFirebasePasswordReset } from "../../services/firebaseClient";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const resetPassword = async (event) => {
    event.preventDefault();
    try {
      await sendFirebasePasswordReset(email);
      setSubmitted(true);
    } catch (resetError) {
      setError(resetError?.message || "Envoi impossible.");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-black px-4">
      <form onSubmit={resetPassword} className="w-full max-w-md rounded-2xl bg-white p-8 text-black">
        <h1 className="mb-5 text-2xl font-bold">Reset Password</h1>
        {submitted ? (
          <div role="status" className="rounded border border-omgGreen bg-green-50 p-4 text-green-800">
            Si ce compte existe, Firebase a envoye les instructions de reinitialisation.
          </div>
        ) : (
          <>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-semibold">Email</label>
            <input id="reset-email" className="mb-3 w-full rounded border p-3" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" className="w-full rounded bg-omgGreen p-3 font-bold text-white">Reset</button>
          </>
        )}
        <Link to="/login" className="mt-5 block text-center text-sm text-omgGreen">Back to login</Link>
      </form>
    </div>
  );
}

export default ForgotPassword;
