"use client";

import { getAuth } from "firebase/auth";
import {
  collection,
  onSnapshot,
 
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebaseConfig";

interface Tournament {
  id: string;
  name?: string;

  prizeModel?: "sponsored" | "dynamic";
  prizePool?: number;

  endTime: number;
  startingBalance?: number;

  paidOut?: boolean;
  payoutLocked?: boolean;

  payoutStructure?: {
    rank: number;
    amount: number;
    percentage?: number;
  }[];
}
interface Participant {
  id: string;

  username?: string;
  publicId?: string;

  email?: string;
  phone?: string;

  balance?: number;

  pnl?: number;
  roi?: number;
  winRate?: number;
  trades?: number;

  performance?: {
    wins?: number;
    losses?: number;
    pnl?: number;
    roi?: number;
    trades?: number;
    winRate?: number;
  };
  rebuyInjectedTotal?: number;
  prizeAmount?: number;
  payoutStatus?: "pending" | "paid" | "processing" | "failed";
paidOut?: boolean;
}

// 🔥 FIX: Firestore document types (no `any`)
type TournamentDoc = Omit<Tournament, "id">;
type ParticipantDoc = Omit<Participant, "id">;

export default function TournamentPayoutSection() {
 const API = process.env.NEXT_PUBLIC_API_BASE_URL as string; 


  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);

  const [loadingPayout, setLoadingPayout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

const now = useState(() => Date.now())[0];

const formatNum = (value?: number, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return "0.00";
  return Number(value).toFixed(decimals);
};
  // 🔹 Load finished tournaments

useEffect(() => {
  const unsub = onSnapshot(collection(db, "tournaments"), (snap) => {
    const list: Tournament[] = snap.docs
      .map((d) => {
        const data = d.data() as TournamentDoc;

        return {
          id: d.id,
          ...data,
        };
      })
     .filter((t) => {
  const isEnded = Date.now() > t.endTime;

  console.log("TOURNAMENT CHECK:", {
    id: t.id,
    name: t.name,
    now: Date.now(),
    endTime: t.endTime,
    isEnded,
  });

  return isEnded;
});

    setTournaments(list);
  });

  return () => unsub();
}, []);

  // 🔹 Load participants
  useEffect(() => {
  if (!selectedTournament) return;

 const q = collection(
  db,
  "tournaments",
  selectedTournament.id,
  "participants"
);

 const unsub = onSnapshot(q, (snap) => {
  const startBalance = selectedTournament.startingBalance ?? 0;

  const list: Participant[] = snap.docs.map((d) => {
    const data = d.data() as ParticipantDoc;

    const balance = Number(data.balance ?? 0);
    const rebuy = Number(data.rebuyInjectedTotal ?? 0);

    return {
      id: d.id,
      ...data,
      balance,
      pnl: balance - startBalance - rebuy,
      roi: data.roi ?? data.performance?.roi ?? 0,
      trades: data.trades ?? data.performance?.trades ?? 0,
      winRate: data.winRate ?? data.performance?.winRate ?? 0,
    };
  });

  list.sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));

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

  console.log("FULL PAYOUT REQUEST:", {
    tournamentId: selectedTournament.id,
    user: user.email,
  });

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

   const text = await res.text();
console.log("PAYOUT RESPONSE:", text);

      if (!res.ok) {
        throw new Error(text || "Payout failed");
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
const paySingleParticipant = async (participantId: string) => {
  console.log("PAY CLICKED:", {
  participantId,
  tournamentId: selectedTournament?.id,
});
  if (!selectedTournament) return;

  if (payingId) return; // prevent double click
  setPayingId(participantId);

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    alert("Admin not authenticated");
    return;
  }

  try {
    const token = await user.getIdToken();

    const res = await fetch(
      `${API}/admin/pay-participant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          participantId,
        }),
      }
    );

  const text = await res.text();
console.log("PAY API RESPONSE:", {
  status: res.status,
  body: text,
});

    if (!res.ok) throw new Error(text);

    // 🔥 optimistic UI update
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId
          ? { ...p, payoutStatus: "paid",
paidOut: true }
          : p
      )
    );

    alert("Payment successful");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    alert(message);
  }
};
// 🔥 FIX: fast lookup map so we NEVER depend on .find()
const payoutMap: Record<number, number> = {};

(selectedTournament?.payoutStructure ?? []).forEach((p) => {
  payoutMap[p.rank] =
    selectedTournament?.prizeModel === "dynamic"
      ? ((selectedTournament.prizePool ?? 0) * (p.percentage ?? 0)) / 100
      : p.amount;
});

console.log("PAYOUT MAP:", payoutMap);
console.log("PAYOUT STRUCTURE RAW:", selectedTournament?.payoutStructure);
 
const startBalance = selectedTournament?.startingBalance ?? 0;

const sortedParticipants = [...participants].sort((a, b) => {
  const aPerformance =
    (a.balance ?? 0) -
    startBalance -
    (a.rebuyInjectedTotal ?? 0);

  const bPerformance =
    (b.balance ?? 0) -
    startBalance -
    (b.rebuyInjectedTotal ?? 0);

  return bPerformance - aPerformance;
});

return (
   
    <div style={styles.container}>
      {selectedTournament && (
  <div style={styles.activeTournamentCard}>
    <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>
      🎯 {selectedTournament.name || "Tournament"}
    </div>

    <div style={{ color: "#999", fontSize: 12 }}>
      Status: {selectedTournament.paidOut ? "Paid" : "Pending"}
    </div>

    <div style={{ color: "#999", fontSize: 12 }}>
      Ends: {new Date(selectedTournament.endTime).toLocaleString()}
    </div>

    <div style={{ color: "#999", fontSize: 12 }}>
      Prize Pool:{" "}
      {(selectedTournament?.payoutStructure ?? []).reduce(
  (a, b) => a + (b.amount ?? 0),
  0
)} T
    </div>
  </div>
)}
    <div style={styles.summaryGrid}>

  <div style={styles.summaryCard}>
    <div>Participants</div>
    <strong>{participants.length}</strong>
  </div>

  <div style={styles.summaryCard}>
    <div>Pending</div>
    <strong>
      {participants.filter(p => p.payoutStatus !== "paid").length}
    </strong>
  </div>

  <div style={styles.summaryCard}>
    <div>Paid</div>
    <strong>
      {participants.filter(p => p.payoutStatus === "paid").length}
    </strong>
  </div>

  <div style={styles.summaryCard}>
    <div>Prize Pool</div>
    <strong>
      {selectedTournament?.payoutStructure?.reduce((a, b) => a + b.amount, 0) ?? 0} T
    </strong>
  </div>

  <div style={styles.summaryCard}>
    <div>Processed</div>
    <strong>---</strong>
  </div>

</div>
      <h2 style={styles.title}>🏆 Tournament Payouts</h2>
    {!selectedTournament && (
  <div style={styles.tournamentGrid}>
  {tournaments.map((t) => (
    <div
      key={t.id}
      style={{
        ...styles.tournamentCard,
        border:
          (selectedTournament as Tournament | null)?.id === t.id
            ? "1px solid #3b82f6"
            : "none",
      }}
     onClick={() => {
  console.log("SELECTED TOURNAMENT:", t);
  setSelectedTournament(t);
}}
    >
      <div style={styles.name}>{t.name || "Tournament"}</div>

      <div style={styles.small}>
        Tournament:{" "}
        {now < t.endTime? "🟢 Running" : "🔴 Finished"}
      </div>
<div style={styles.small}>
  Status: {now < t.endTime ? "Running" : "Finished"}
</div>
      <div style={styles.small}>
        Payout: {t.paidOut ? "🟢 Paid" : "🟡 Pending"}
      </div>
    </div>
   ))}
  </div>
)}

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
<div style={styles.tableHeaderRow}>
  <div>🏅 Rank</div>
  <div>👤 Player</div>
  <div>🆔 ID</div>
  <div>💰 Balance</div>
  <div>📈 Performance</div>
  <div>🎁 Prize</div>
  <div>📌 Status</div>
  <div>⚡ Action</div>
</div>
      {sortedParticipants.map((p, i) => {
  const rank = i + 1;
  const payoutAmount = payoutMap[rank] ?? 0;

  console.log("RANK LOOP:", {
    index: i,
    participantId: p.id,
    pnl: p.pnl,
    rank,
  });

  // skip if no payout defined for this rank
 if (rank > (selectedTournament?.payoutStructure?.length ?? 0)) {
  return null;
}

  return (
    <div key={p.id} style={styles.tableRow}>

      <div style={styles.rank}>#{rank}</div>

      <div style={styles.user}>
        {p.username || "Unknown Player"}
        <div style={{ fontSize: 11, color: "#888" }}>
          FXA-ID-{p.id.slice(0, 6)}
        </div>
      </div>

      <div style={styles.publicIdCell}>
        {p.publicId || `FXA-${p.id.slice(0, 6)}`}
      </div>

      <div style={styles.cell}>
        {formatNum(p.balance ?? 0)} T
      </div>

      <div style={styles.performance}>
        {((p.balance ?? 0) -
          (selectedTournament?.startingBalance ?? 0) -
          (p.rebuyInjectedTotal ?? 0)) >= 0
          ? "+"
          : ""}
        {formatNum(
          (p.balance ?? 0) -
          (selectedTournament?.startingBalance ?? 0) -
          (p.rebuyInjectedTotal ?? 0)
        )} T
      </div>

      <div style={styles.amount}>
        {formatNum(payoutAmount)} $
      </div>

      <div
        style={{
          ...styles.statusBadge,
          color:
            p.payoutStatus === "paid"
              ? "#22c55e"
              : p.payoutStatus === "processing"
              ? "#3b82f6"
              : p.payoutStatus === "failed"
              ? "#ef4444"
              : "#facc15",
        }}
      >
        {p.payoutStatus === "paid"
          ? "🟢 Paid"
          : p.payoutStatus === "processing"
          ? "🔵 Processing"
          : p.payoutStatus === "failed"
          ? "🔴 Failed"
          : "🟡 Pending"}
      </div>

      <div style={styles.actions}>
        <button
          style={styles.viewBtn}
          onClick={() => setSelectedParticipant(p)}
        >
          View
        </button>

        <button
          style={styles.payBtn}
          onClick={() => paySingleParticipant(p.id)}
          disabled={p.payoutStatus === "paid" || payingId === p.id}
        >
          {payingId === p.id ? "Paying..." : "Pay"}
        </button>
      </div>

    </div>
  );
})}

        </div>
      )}
      {selectedParticipant && (
  <div style={styles.modalOverlay} onClick={() => setSelectedParticipant(null)}>
    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

      <h3 style={{ color: "#fff", marginBottom: 10 }}>
        Player Details
      </h3>

      <p style={styles.modalText}>Player: {selectedParticipant.username}</p>
      <p style={styles.modalText}>Public ID: FXA-ID-{selectedParticipant.id.slice(0, 6)}</p>

      <p style={styles.modalText}>
        ROI: {selectedParticipant.roi ?? 0}%
      </p>

      <p style={styles.modalText}>
        Win Rate: {selectedParticipant.winRate ?? 0}%
      </p>

      <p style={styles.modalText}>
        Trades: {selectedParticipant.trades ?? 0}
      </p>

      <p style={styles.modalText}>
        Wins: {selectedParticipant.performance?.wins ?? 0}
      </p>

      <p style={styles.modalText}>
        Losses: {selectedParticipant.performance?.losses ?? 0}
      </p>

      <p style={styles.modalText}>
        Balance: {formatNum(selectedParticipant.balance)}
      </p>

      <p style={styles.modalText}>
        Prize: {selectedParticipant.prizeAmount ?? 0}
      </p>

      <button
        style={styles.closeBtn}
        onClick={() => setSelectedParticipant(null)}
      >
        Close
      </button>

    </div>
  </div>
)}
{selectedTournament && (
  <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
    <button
      onClick={() => setSelectedTournament(null)}
      style={styles.backBtn}
    >
      ⬅ Back to Tournaments
    </button>
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

  title: {    color: "#fff",    fontSize: 20,    fontWeight: 900,    marginBottom: 16,
  },

  tournamentCard: {    background: "#12122a",  padding: 14,
    borderRadius: 10,    marginBottom: 10,    cursor: "pointer",
  },

  name: { color: "#fff", fontWeight: 800 },
  small: { color: "#999", fontSize: 12 },

  back: {    marginBottom: 10,    background: "transparent",
    color: "#3b82f6",    border: "none",    cursor: "pointer",
  },

  status: {    color: "#999",    marginBottom: 10,
  },

  bulkBtn: {
    background: "#16a34a",    color: "#fff",
    padding: 12,    borderRadius: 10,    border: "none",    marginBottom: 12,    cursor: "pointer",
    fontWeight: 800,  },
    
    activeTournamentCard: {
  background: "#12122a",
  padding: 14,
  borderRadius: 12,
  marginBottom: 16,
  border: "1px solid #3b82f6",
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
    summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10,
    marginBottom: 16,
  },

  summaryCard: {
    background: "#12122a",
    padding: 12,
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
  },

  tableHeader: {
    color: "#999",
    fontSize: 12,
    marginBottom: 8,
    padding: "6px 10px",
  },

cell: {
  width: 160,
  color: "#bbb",
  paddingLeft: 12,
  display: "flex",
  alignItems: "left",
},
publicIdCell: {
  width: 160,
  color: "#bbb",
  paddingLeft: 5,
  alignItems: "left",
},
  performance: {
    width: 140,
    color: "#00d4ff",
    fontWeight: 700,
  },

  statusBadge: {
    width: 100,
    color: "#facc15",
    fontWeight: 800,
  },

  actions: {
    display: "flex",
    gap: 6,
  },

  viewBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: 6,
    cursor: "pointer",
  },

  payBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: 6,
    cursor: "pointer",
  },
  tableHeaderRow: {
  display: "grid",
  gridTemplateColumns: "80px 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr",
  color: "#999",
  fontSize: 12,
  padding: "8px 10px",
  marginBottom: 6,
},

tableRow: {
  display: "grid",
  gridTemplateColumns: "70px 1.8fr 1fr 1fr 1fr 1fr 1fr 1fr",
  background: "#12122a",
  padding: 10,
  borderRadius: 10,
  marginBottom: 8,
  alignItems: "center",
},
  modalOverlay: {  position: "fixed",  top: 0,  left: 0,  right: 0,
  bottom: 0,  background: "rgba(0,0,0,0.7)",  display: "flex",
  alignItems: "center",  justifyContent: "center",  zIndex: 9999,
},

modal: {  background: "#12122a",  padding: 20,  borderRadius: 12,
  width: 320,},

modalText: {  color: "#bbb",  fontSize: 13,  marginBottom: 6,
},

closeBtn: {  marginTop: 10,  background: "#ef4444",  color: "#fff",
  border: "none",  padding: "8px 12px",  borderRadius: 8,  cursor: "pointer",
},
backBtn: {
  marginTop: 20,
  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
  width: "100%",
  maxWidth: 260,
  boxShadow: "0 6px 18px rgba(59,130,246,0.3)",
},
};