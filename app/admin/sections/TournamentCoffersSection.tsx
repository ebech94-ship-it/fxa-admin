"use client";

import { useEffect, useState } from "react";
import { auth } from "../../../lib/firebaseConfig";

interface TournamentCoffer {
  id: string;
  name: string;
  entryFee: number;
  rebuyFee: number;

  registrationCount: number;
  registrationTotal: number;

  rebuyCount: number;
  rebuyTotal: number;

  totalGenerated: number;
}

export default function TournamentCoffersSection() {
  const [coffers, setCoffers] = useState<TournamentCoffer[]>([]);
  const [loading, setLoading] = useState(true);

const API = process.env.NEXT_PUBLIC_API_BASE_URL as string;

  useEffect(() => {
  const fetchCoffers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const res = await fetch(`${API}/admin/tournament/coffers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setCoffers(data.tournaments || []);
    } catch (err) {
      console.error("Coffers fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchCoffers();
}, [API]);

  const skeleton = Array.from({ length: 5 });

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>🏆 Tournament Ledger</h2>

      <div style={styles.tableWrapper}>
        {/* HEADER */}
        <div style={styles.headerRow}>
          {[
            "Tournament",
            "Entry",
            "Reg #",
            "Reg Total",
            "Rebuy Fee",
            "Rebuy #",
            "Rebuy Total",
            "Total",
          ].map((h) => (
            <div key={h} style={styles.headerCell}>
              {h}
            </div>
          ))}
        </div>

        {/* BODY */}
        {loading
          ? skeleton.map((_, i) => (
              <div key={i} style={styles.row}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} style={styles.skeletonCell} />
                ))}
              </div>
            ))
          : coffers.map((t) => (
              <div key={t.id} style={styles.row}>
                <div style={styles.cell}>{t.name}</div>
                <div style={styles.cell}>{t.entryFee}</div>
                <div style={styles.cell}>{t.registrationCount}</div>
                <div style={styles.cell}>{t.registrationTotal}</div>
                <div style={styles.cell}>{t.rebuyFee}</div>
                <div style={styles.cell}>{t.rebuyCount}</div>
                <div style={styles.cell}>{t.rebuyTotal}</div>
                <div style={{ ...styles.cell, color: "#00ffcc" }}>
                  {t.totalGenerated}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: 16,
    background: "#0e0e1a",
    minHeight: "100vh",
  },

  heading: {
    textAlign: "center",
    color: "#00ffcc",
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 16,
  },

  tableWrapper: {
    overflowX: "auto",
  },

  headerRow: {
    display: "flex",
    background: "#1a1a40",
    padding: 10,
  },

  headerCell: {
    width: 140,
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
  },

  row: {
    display: "flex",
    borderBottom: "1px solid #222",
    padding: 10,
  },

  cell: {
    width: 140,
    color: "#fff",
    textAlign: "center",
  },

  skeletonCell: {
    width: 140,
    height: 14,
    background: "#333",
    marginRight: 5,
    borderRadius: 4,
    opacity: 0.4,
  },
};