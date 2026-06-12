"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../lib/firebaseConfig";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  

const handleSubmit = async () => {
  setLoading(true);

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 👇 ADD THIS BLOCK RIGHT HERE
    console.log("UID:", cred.user.uid);

    const token = await cred.user.getIdTokenResult(true);

    console.log("CLAIMS:", token.claims);

    // admin check AFTER logs
    if (!token.claims.admin) {
      alert("You are not an admin");
      return;
    }

    router.push("/admin");
  } catch (err) {
    console.error(err);
    alert("Login failed");
  } finally {
    setLoading(false);
  }
};
  

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>🔐 Admin Login</h1>

        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleSubmit} style={styles.button}>
          {loading ? "Checking..." : "Login"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
  },
  box: {
    width: 320,
    padding: 24,
    background: "#111",
    borderRadius: 12,
    textAlign: "center",
    border: "1px solid #333",
  },
  title: {
    color: "#fff",
    marginBottom: 16,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
    border: "1px solid #444",
    background: "#000",
    color: "#fff",
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#22c55e",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};