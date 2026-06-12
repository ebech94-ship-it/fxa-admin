"use client";

import { getAuth } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebaseConfig";

interface Tournament {
  id: string;
  name?: string;
  endTime: number;
  paidOut?: boolean;
  payoutLocked?: boolean;
  payoutStructure?: { rank: number; amount: number }[];
}

interface Participant {
  id: string;
  username?: string;
  email?: string;
  balance: number;
  performance?: number;
}

// 🔥 FIX: Firestore document types (no `any`)
type TournamentDoc = Omit<Tournament, "id">;
type ParticipantDoc = Omit<Participant, "id">;

export default function TournamentPayoutSection() {
  const API = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);

  const [loadingPayout, setLoadingPayout] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 🔹 Load finished tournaments
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tournaments"), (snap) => {
      const list: Tournament[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as TournamentDoc),
        }))
        .filter((t) => Date.now() > t.endTime);

      setTournaments(list);
    });

    return () => unsub();
  }, []);

  // 🔹 Load participants
  useEffect(() => {
    if (!selectedTournament) return;

    const q = query(
      collection(
        db,
        "tournaments",
        selectedTournament.id,
        "participants"
      ),
      orderBy("performance", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Participant[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ParticipantDoc),
      }));

      setParticipants(list);
    });

    return () => unsub();
  }, [selectedTournament]);

  const processFullPayout = async () => {
    if (!selectedTournament) return;

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Admin not authenticated");
      return;
    }

    setLoadingPayout(true);

    try {
      const token = await user.getIdToken();

      const res = await fetch(
        `${API}/admin/process-tournament-payout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tournamentId: selectedTournament.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payout failed");
      }

      alert("Tournament payout completed");

      setSelectedTournament({
        ...selectedTournament,
        paidOut: true,
        payoutLocked: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      alert(message);
    } finally {
      setLoadingPayout(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏆 Tournament Payouts</h2>

      {!selectedTournament ? (
        <div>
          {tournaments.map((t) => (
            <div
              key={t.id}
              style={styles.tournamentCard}
              onClick={() => setSelectedTournament(t)}
            >
              <div style={styles.name}>
                {t.name || "Tournament"}
              </div>

              <div style={styles.small}>
                Ended: {new Date(t.endTime).toLocaleString()}
              </div>

              <div style={styles.small}>
                Status: {t.paidOut ? "Paid" : "Pending"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedTournament(null)}
            style={styles.back}
          >
            ⬅ Back
          </button>

          <p style={styles.status}>
            Status:{" "}
            {selectedTournament.paidOut
              ? "Completed"
              : selectedTournament.payoutLocked
              ? "Processing"
              : "Pending"}
          </p>

          {!selectedTournament.paidOut && (
            <button
              disabled={processing || loadingPayout}
              onClick={async () => {
                if (processing) return;
                setProcessing(true);
                try {
                  await processFullPayout();
                } finally {
                  setProcessing(false);
                }
              }}
              style={styles.bulkBtn}
            >
              {processing || loadingPayout
                ? "Processing..."
                : "🚀 Process Full Payout"}
            </button>
          )}

          {participants.map((p, i) => {
            const rank = i + 1;

            const payout =
              selectedTournament.payoutStructure?.find(
                (x) => x.rank === rank
              );

            if (!payout) return null;

            return (
              <div key={p.id} style={styles.row}>
                <div style={styles.rank}>#{rank}</div>
                <div style={styles.user}>
                  {p.username || p.email}
                </div>
                <div style={styles.amount}>
                  {payout.amount} $
                </div>
              </div>
            );
          })}
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

  tournamentCard: {
    background: "#12122a",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    cursor: "pointer",
  },

  name: { color: "#fff", fontWeight: 800 },
  small: { color: "#999", fontSize: 12 },

  back: {
    marginBottom: 10,
    background: "transparent",
    color: "#3b82f6",
    border: "none",
    cursor: "pointer",
  },

  status: {
    color: "#999",
    marginBottom: 10,
  },

  bulkBtn: {
    background: "#16a34a",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    border: "none",
    marginBottom: 12,
    cursor: "pointer",
    fontWeight: 800,
  },

  row: {
    display: "flex",
    background: "#12122a",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: "center",
  },

  rank: {
    width: 50,
    color: "#facc15",
    fontWeight: 800,
  },

  user: {
    flex: 1,
    color: "#fff",
  },

  amount: {
    width: 100,
    color: "#22c55e",
    fontWeight: 800,
  },
};