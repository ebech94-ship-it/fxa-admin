"use client";

import {
  collection,
  
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */

interface AdminUser {
  id: string;
  email: string;
  balance: number;
  frozen: boolean;
  joinedTournaments: unknown[];
  createdAt?: unknown;
}

/* ---------------- DB ---------------- */


const BACKEND_URL = "https://forexapp2-backend.onrender.com";

/* ---------------- COMPONENT ---------------- */

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  const [editBalance, setEditBalance] = useState("");
  const [mode, setMode] = useState<"add" | "subtract">("add");

  const [loading, setLoading] = useState(false);

  /* ---------------- FIRESTORE ---------------- */

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list: AdminUser[] = snap.docs.map((d) => {
        const data = d.data() as {
          email?: string;
          balance?: number;
          frozen?: boolean;
          joinedTournaments?: unknown[];
          createdAt?: unknown;
        };

        return {
          id: d.id,
          email: data.email ?? "",
          balance: data.balance ?? 0,
          frozen: data.frozen ?? false,
          joinedTournaments: data.joinedTournaments ?? [],
          createdAt: data.createdAt,
        };
      });

      setUsers(list);
      setFiltered(list);
    });

    return () => unsub();
  }, []);

  /* ---------------- SEARCH ---------------- */

  const handleSearch = (text: string) => {
    setSearch(text);

    if (!text) {
      setFiltered(users);
      return;
    }

    const lower = text.toLowerCase();

    setFiltered(
      users.filter((u) => u.email.toLowerCase().includes(lower))
    );
  };

  /* ---------------- UPDATE BALANCE ---------------- */

  const updateBalance = async () => {
    if (!selected) return;

    setLoading(true);

    try {
      const endpoint =
        mode === "add"
          ? `${BACKEND_URL}/admin/add-funds`
          : `${BACKEND_URL}/admin/subtract-funds`;

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.id,
          amount: Number(editBalance),
        }),
      });

      alert("Success");
      setOpen(false);
      setEditBalance("");
    } catch {
      alert("Error updating balance");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: 16, background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff" }}>Users</h1>

      <input
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search users"
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />

      {filtered.map((u, i) => (
        <div
          key={u.id}
          onClick={() => {
            setSelected(u);
            setOpen(true);
          }}
          style={{
            padding: 10,
            background: "#111",
            marginBottom: 8,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {i + 1}. {u.email} — ${u.balance}
        </div>
      ))}

      {/* MODAL */}
      {open && selected && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3>{selected.email}</h3>

            <p>Balance: ${selected.balance}</p>

            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "add" | "subtract")
              }
            >
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>

            <input
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
              placeholder="Amount"
            />

            <button onClick={updateBalance} disabled={loading}>
              {loading ? "Saving..." : "Update"}
            </button>

            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES (TYPED SAFE) ---------------- */

const modalStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const boxStyle: React.CSSProperties = {
  background: "#111",
  padding: 20,
  color: "#fff",
  width: 300,
};