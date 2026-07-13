"use client";

import { getAuth } from "firebase/auth";
import {  useEffect, useState } from "react";

type Transaction = {
  id: string;
  userId: string;
 username?: string;
publicId?: string;
  amount: number;
  type: "deposit" | "withdrawal";
  status: "pending" | "completed" | "failed";
  method?: string;
  createdAt?: unknown;
};

export default function PaymentsSection() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;
  const [transactions, setTransactions] = useState<Transaction[]>([]);

 useEffect(() => {
 const loadTransactions = async () => {
  try {
    const user = getAuth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    const res = await fetch(
      `${API_BASE}/admin/transactions?type=deposit`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    console.log("RAW API RESPONSE:", data);

    const list =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
        ? data.transactions
        : Array.isArray(data?.data)
        ? data.data
        : [];

    setTransactions(list);
  } catch (err) {
    console.error("Fetch error:", err);
    setTransactions([]);
  }
};
  void loadTransactions();
}, [API_BASE]);
console.log("transactions =", transactions);
console.log("type =", typeof transactions);
  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📊 Deposits Monitor</h2>

      {transactions.length === 0 ? (
        <p style={styles.empty}>No transactions yet</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id} style={styles.card}>
          <div style={styles.username}>
  {t.publicId || t.username || t.userId || "Unknown"}
</div>
            <div style={styles.amount}>
  ${Number(t.amount || 0).toFixed(2)}
</div>

            <div style={styles.meta}>
              {t.type} • {t.status}
            </div>

            <div style={styles.meta}>
              Method: {t.method ?? "N/A"}
            </div>

     <div style={styles.meta}>ID: {t.id}</div>
<div style={styles.meta}>Public ID: {t.publicId || "N/A"}</div>
<div style={styles.meta}>
  User: {t.publicId || t.username || t.userId || "Unknown"}
</div>
          </div>
        ))
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: "#07070a",
    minHeight: "100vh",
  },
  header: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 800,
    textAlign: "center",
    marginBottom: 12,
  },
  card: {
    background: "#111",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  username: { color: "#fff", fontWeight: 700 },
  amount: { color: "#7cf", fontWeight: 600 },
  meta: { color: "#aaa", fontSize: 12 },
  empty: { color: "#666", textAlign: "center", marginTop: 20 },
};