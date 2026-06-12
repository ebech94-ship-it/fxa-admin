"use client";

import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  user: string;
  amount: number;
  status: string;
};

export default function SystemControlSection() {
  const [frozen, setFrozen] = useState(false);
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  

  const toggleFreeze = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`${API}/admin/toggle-freeze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ freeze: !frozen }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle system");
      }

      setFrozen(!frozen);
      alert(`System ${!frozen ? "frozen" : "unfrozen"}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      alert(message);
    }
  };

useEffect(() => {
  const fetchTransactions = async () => {
    setLoading(true);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`${API}/admin/pending-transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: Transaction[] = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }

      setPendingTxs(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  fetchTransactions();
}, [API]);
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚡ System Control</h2>

      <button
        onClick={toggleFreeze}
        style={{
          ...styles.freezeBtn,
          ...(frozen ? styles.freezeActive : {}),
        }}
      >
        {frozen ? "Unfreeze System" : "Freeze System"}
      </button>

      <h3 style={styles.subTitle}>💰 Pending Transactions</h3>

      {loading ? (
        <p style={{ color: "#fff" }}>Loading...</p>
      ) : (
        <div>
          {pendingTxs.map((t, i) => (
            <div key={t.id} style={styles.row}>
              <div style={styles.index}>{i + 1}.</div>
              <div style={styles.txUser}>{t.user}</div>
              <div style={styles.txAmount}>{t.amount} $</div>
              <div style={styles.txStatus}>{t.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: "#07081a",
    minHeight: "100vh",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 900,
    marginBottom: 16,
  },

  freezeBtn: {
    padding: 12,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 20,
    fontWeight: 800,
  },

  freezeActive: {
    background: "#dc2626",
  },

  subTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },

  row: {
    display: "flex",
    padding: 10,
    background: "#12122a",
    marginBottom: 6,
    borderRadius: 8,
    alignItems: "center",
  },

  index: {
    width: 30,
    color: "#facc15",
    fontWeight: 800,
  },

  txUser: {
    flex: 1,
    color: "#fff",
  },

  txAmount: {
    width: 80,
    color: "#22c55e",
    fontWeight: 800,
  },

  txStatus: {
    width: 80,
    color: "#3b82f6",
    fontWeight: 800,
  },
};