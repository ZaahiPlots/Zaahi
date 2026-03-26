"use client";
import { useState } from "react";
import Link from "next/link";
export default function Register() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [role, setRole] = useState("owner");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <h1 className="text-4xl font-bold mb-2 text-white">Join ZAAHI</h1>
      <p className="text-gray-500 mb-8">Step {step} of 3</p>
      {step === 1 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-6 text-amber-400">Who are you?</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {["owner","buyer","broker","investor","developer","architect"].map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`p-3 rounded-xl capitalize font-medium transition-all ${role===r ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400">Next →</button>
        </div>
      )}
      {step === 2 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-6 text-amber-400">Your name</h2>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Full legal name" className="w-full p-4 bg-gray-800 text-white rounded-xl mb-4 border border-gray-700 focus:border-amber-500 outline-none" />
          <button onClick={() => name.length > 2 && setStep(3)} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400">Next →</button>
        </div>
      )}
      {step === 3 && (
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
          <div className="text-6xl mb-4">🐱</div>
          <h2 className="text-xl font-bold mb-2 text-white">Welcome, {name}!</h2>
          <p className="text-gray-400 mb-6">Cat is ready to guide you through your first steps in ZAAHI.</p>
          <Link href="/dashboard" className="block py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400">Enter Platform →</Link>
        </div>
      )}
    </div>
  );
}
