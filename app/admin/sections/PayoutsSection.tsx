"use client";

import { getAuth } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type Payout = {
  id: string;
  userName: string;
  amount: number;
  method?: string;
  wallet?: string;
  status: "locked" | "processing" | "success" | "failed" | "refunded" | "cancelled";
};

const statusColor = (status: Payout["status"]) => {
  switch (status) {
    case "locked":
      return "#ffb020";
    case "processing":
      return "#4fc3f7";
    case "success":
      return "#00e676";
    case "failed":
      return "#ff5252";
    case "refunded":
      return "#ba68c8";
    case "cancelled":
      return "#9e9e9e";
    default:
      return "#777";
  }
};

export default function PayoutsSection() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const auth = getAuth();

  /* ---------------- FETCH PAYOUTS ---------------- */

  const fetchPayouts = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const res = await fetch(
        `${API_BASE}/admin/transactions?type=withdrawal&status=locked`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: Payout[] = await res.json();
      setPayouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Payout fetch error:", err);
    }
  }, [API_BASE, auth]);

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPayouts();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchPayouts]);

  /* ---------------- ACTIONS ---------------- */

  const action = async (
    route: string,
    payload: Record<string, unknown>
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      await fetch(`${API_BASE}${route}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      await fetchPayouts();
    } catch (err) {
      console.error("Payout action error:", err);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>🔥 Withdrawal Control Center</h2>

      {payouts.length === 0 ? (
        <p style={styles.empty}>No active payouts</p>
      ) : (
        payouts.map((p) => (
          <div
            key={p.id}
            style={{
              ...styles.card,
              borderColor: statusColor(p.status),
            }}
          >
            <div style={styles.topRow}>
              <div style={styles.name}>{p.userName}</div>

              <div
                style={{
                  background: statusColor(p.status),
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#000",
                }}
              >
                {p.status.toUpperCase()}
              </div>
            </div>

            <div style={styles.amount}>{p.amount} FRS</div>

            <div style={styles.meta}>Method: {p.method ?? "N/A"}</div>
            <div style={styles.meta}>Wallet: {p.wallet ?? "N/A"}</div>
            <div style={styles.meta}>ID: {p.id}</div>

            <div style={styles.actions}>
              {p.status === "locked" && (
                <>
                  <button
                    style={{ ...styles.btn, background: "#00c853" }}
                    onClick={() =>
                      action("/admin/approve-withdrawal", {
                        transactionId: p.id,
                      })
                    }
                  >
                    Approve
                  </button>

                  <button
                    style={{ ...styles.btn, background: "#ff1744" }}
                    onClick={() =>
                      action("/admin/reject-withdrawal", {
                        transactionId: p.id,
                      })
                    }
                  >
                    Reject
                  </button>
                </>
              )}

              {p.status === "failed" && (
                <button
                  style={{ ...styles.btn, background: "#ff9100" }}
                  onClick={() =>
                    action("/admin/retry-payout", {
                      transactionId: p.id,
                    })
                  }
                >
                  Retry
                </button>
              )}

              <button
                style={{ ...styles.btn, background: "#00e676" }}
                onClick={() =>
                  action("/admin/force-payout-status", {
                    transactionId: p.id,
                    status: "success",
                  })
                }
              >
                Force OK
              </button>

              <button
                style={{ ...styles.btn, background: "#d50000" }}
                onClick={() =>
                  action("/admin/force-payout-status", {
                    transactionId: p.id,
                    status: "failed",
                  })
                }
              >
                Force Fail
              </button>
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
    background: "#050508",
    minHeight: "100vh",
  },

  header: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 900,
    textAlign: "center",
    marginBottom: 16,
  },

  card: {
    background: "#0f0f14",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#222",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  name: {
    color: "#fff",
    fontWeight: 800,
  },

  amount: {
    color: "#7cf",
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
  },

  meta: {
    color: "#999",
    fontSize: 12,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  btn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
};