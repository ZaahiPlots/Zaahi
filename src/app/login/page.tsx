"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const { error: e } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <h1 className="text-4xl font-bold mb-8 text-white">Sign in to ZAAHI</h1>
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
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
          placeholder="Password"
          className="w-full p-4 bg-gray-800 text-white rounded-xl mb-4 border border-gray-700 focus:border-amber-500 outline-none"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !email || !password}
          className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in →"}
        </button>
        <p className="text-gray-500 text-sm text-center mt-4">
          No account?{" "}
          <Link href="/register" className="text-amber-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
