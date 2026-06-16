"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../../../lib/firebaseConfig";

interface TreasuryData {
  balance: number;
  lastUpdated?: string | number | Date | null;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  username?: string;
  amount: number;
  createdAt?: string | number | Date | null;
}

type Styles = Record<string, React.CSSProperties>;

export default function TreasuryPage() {
  const API_BASE = "https://forexapp2-backend.onrender.com";

  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayedTx, setDisplayedTx] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const glowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    glowRef.current = setInterval(() => {
      setGlow((g) => !g);
    }, 1200);

    return () => {
      if (glowRef.current) clearInterval(glowRef.current);
    };
  }, []);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }, []);

  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        setLoadingTx(true);

        const token = await getToken();
        if (!token) return;

       const [treasuryRes, txRes] = await Promise.all([
  fetch(`${API_BASE}/api/treasury/balances`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
  fetch(`${API_BASE}/admin/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
]);

const treasuryData = await treasuryRes.json();
const txData = await txRes.json();
setTreasury(treasuryData);
        setTransactions(txData || []);
        setDisplayedTx((txData || []).slice(0, 10));
      } catch (e) {
        console.log(e);
      } finally {
        setLoadingTx(false);
      }
    };

    fetchTreasury();
  }, [API_BASE, getToken]);

  const loadMoreTx = () => {
    setDisplayedTx((prev) => {
      const next = transactions.slice(prev.length, prev.length + 10);
      return next.length ? [...prev, ...next] : prev;
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "processing":
        return "#ffcc00";
      case "success":
      case "completed":
        return "#00ff88";
      case "failed":
        return "#ff0044";
      default:
        return "#ccc";
    }
  };

  if (!treasury) {
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* BALANCE CARD */}
      <div
        style={{
          ...styles.balanceCard,
          boxShadow: glow
            ? "0 0 20px rgba(0,255,204,0.3)"
            : "0 0 20px rgba(255,0,150,0.3)",
        }}
      >
        <h3>Treasury Balance (USD)</h3>
        <h1 style={{ color: "#00ffcc" }}>
          ${Number(treasury.balance || 0).toFixed(2)}
        </h1>

        <p style={{ color: "#777" }}>
          Last Updated:{" "}
          {treasury.lastUpdated
            ? new Date(treasury.lastUpdated).toLocaleString()
            : "N/A"}
        </p>
      </div>

      {/* HEADER */}
      <div style={styles.tableHeader}>
        <div style={styles.colType}>Type</div>
        <div style={styles.colStatus}>Status</div>
        <div style={styles.colUser}>User</div>
        <div style={styles.colAmount}>Amount</div>
        <div style={styles.colDate}>Date</div>
      </div>

      {/* LIST */}
      <div
        style={styles.scroll}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
            loadMoreTx();
          }
        }}
      >
        {loadingTx ? (
          <p>Loading...</p>
        ) : (
          displayedTx.map((tx) => (
            <div key={tx.id} style={styles.row}>
              <div style={styles.colType}>{tx.type}</div>
              <div
                style={{
                  ...styles.colStatus,
                  color: getStatusColor(tx.status),
                }}
              >
                {tx.status}
              </div>
              <div style={styles.colUser}>{tx.username || "Unknown"}</div>
              <div style={styles.colAmount}>${tx.amount}</div>
              <div style={styles.colDate}>
                {tx.createdAt
                  ? new Date(tx.createdAt).toLocaleString()
                  : "No date"}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TOTAL */}
      <div style={{ ...styles.row, background: "#1a1a40" }}>
        <div style={styles.colType}>TOTAL</div>
        <div style={styles.colAmount}>
          ${Number(treasury.balance || 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

const styles: Styles = {
  container: { background: "#0e0e1a", minHeight: "100vh", padding: 16 },

  balanceCard: {
    background: "#1a1a2e",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    color: "#fff",
  },

  tableHeader: {
    display: "flex",
    borderBottom: "1px solid #444",
    padding: 8,
    color: "#fff",
    fontWeight: "bold",
  },

  row: {
    display: "flex",
    padding: 8,
    borderBottom: "1px solid #222",
    color: "#fff",
  },

  colType: { flex: 2 },
  colStatus: { flex: 2 },
  colUser: { flex: 3 },
  colAmount: { flex: 2 },
  colDate: { flex: 3 },

  scroll: { maxHeight: 500, overflowY: "auto" },
};