"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ROLES = ["owner", "buyer", "broker", "investor", "developer", "architect"] as const;

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<typeof ROLES[number]>("owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { data, error: signUpErr } = await supabaseBrowser.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;
      const token = data.session?.access_token;
      if (!token) {
        // Email confirmation flow — user must verify email before sync.
        setError("Check your email to confirm, then log in.");
        return;
      }
      const res = await fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, name, phone: phone || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "sync failed");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <h1 className="text-4xl font-bold mb-2 text-white">Join ZAAHI</h1>
      <p className="text-gray-500 mb-8">Step {step} of 3</p>

      {step === 1 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-6 text-amber-400">Who are you?</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`p-3 rounded-xl capitalize font-medium transition-all ${
                  role === r ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400">
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-6 text-amber-400">Your details</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full legal name"
            className="w-full p-4 bg-gray-800 text-white rounded-xl mb-3 border border-gray-700 focus:border-amber-500 outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full p-4 bg-gray-800 text-white rounded-xl mb-4 border border-gray-700 focus:border-amber-500 outline-none"
          />
          <button
            onClick={() => name.length > 2 && setStep(3)}
            className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400"
          >
            Next →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-6 text-amber-400">Create account</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-4 bg-gray-800 text-white rounded-xl mb-3 border border-gray-700 focus:border-amber-500 outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            className="w-full p-4 bg-gray-800 text-white rounded-xl mb-4 border border-gray-700 focus:border-amber-500 outline-none"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !email || password.length < 6}
            className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create account →"}
          </button>
        </div>
      )}
    </div>
  );
}
