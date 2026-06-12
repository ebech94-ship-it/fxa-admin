"use client";

import { getAuth } from "firebase/auth";
import {  useEffect, useState } from "react";

type Transaction = {
  id: string;
  userId: string;
  username?: string;
  amount: number;
  type: "deposit" | "withdrawal";
  status: "pending" | "completed" | "failed";
  method?: string;
  createdAt?: unknown;
};

export default function PaymentsSection() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL as string;

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

      const data: Transaction[] = await res.json();
      setTransactions(data ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  void loadTransactions();
}, [API_BASE]);

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📊 Deposits Monitor</h2>

      {transactions.length === 0 ? (
        <p style={styles.empty}>No transactions yet</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id} style={styles.card}>
            <div style={styles.username}>{t.username || t.userId}</div>
            <div style={styles.amount}>${t.amount}</div>

            <div style={styles.meta}>
              {t.type} • {t.status}
            </div>

            <div style={styles.meta}>
              Method: {t.method ?? "N/A"}
            </div>

            <div style={styles.meta}>ID: {t.id}</div>
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