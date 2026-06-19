"use client";

import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";

type Log = {
  id: string;
  message: string;
  timestamp: number;
};

type Activity = {
  id: string;
  admin: string;
  action: string;
  timestamp: number;
};

type LogOrActivity = Log | Activity;

export default function LogsAndActivitySection() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;
  const [tab, setTab] = useState<"logs" | "activity">("logs");
  const [logs, setLogs] = useState<Log[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const user = getAuth().currentUser;
        if (!user) return;

        const token = await user.getIdToken();

        const endpoint =
          tab === "logs"
            ? `${API_BASE}/admin/system-logs`
            : `${API_BASE}/admin/activity-history`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Request failed");
        }

        if (cancelled) return;

        if (tab === "logs") {
          setLogs(data ?? []);
        } else {
          setActivities(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unknown error"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, tab]);

  const data: LogOrActivity[] =
    tab === "logs" ? logs : activities;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        📜 System Logs & Admin Activity
      </h2>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tabBtn,
            ...(tab === "logs" ? styles.tabActive : {}),
          }}
          onClick={() => setTab("logs")}
        >
          Audit Logs
        </button>

        <button
          style={{
            ...styles.tabBtn,
            ...(tab === "activity" ? styles.tabActive : {}),
          }}
          onClick={() => setTab("activity")}
        >
          Admin Activity
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <div>
        {data.length === 0 && (
  <div
    style={{
      textAlign: "center",
      color: "#9ca3af",
      padding: 30,
    }}
  >
    {tab === "logs"
      ? "No system logs yet."
      : "No admin activity yet."}
  </div>
)}
          {data.map((item, index) => (
            <div key={item.id} style={styles.row}>
              <div style={styles.index}>
                {index + 1}.
              </div>

              <div style={styles.message}>
                {"message" in item
                  ? item.message
                  : `${item.admin} → ${item.action}`}
              </div>

              <div style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#07081a",
    padding: 16,
    minHeight: "100vh",
  },

  title: {
    fontSize: 20,
    fontWeight: 900,
    color: "#fff",
    marginBottom: 16,
  },

  tabs: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  tabBtn: {
    flex: 1,
    padding: 10,
    background: "#111",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  tabActive: {
    background: "#3b82f6",
  },

  row: {
    display: "flex",
    alignItems: "center",
    padding: 10,
    background: "#12122a",
    marginBottom: 6,
    borderRadius: 8,
  },

  index: {
    width: 30,
    color: "#facc15",
    fontWeight: 800,
  },

  message: {
    flex: 1,
    color: "#fff",
  },

  timestamp: {
    color: "#9ca3af",
    fontSize: 12,
    marginLeft: 10,
  },

  loading: {
    color: "#fff",
    textAlign: "center",
    padding: 20,
  },

  error: {
    color: "#ef4444",
    textAlign: "center",
    padding: 20,
  },
};