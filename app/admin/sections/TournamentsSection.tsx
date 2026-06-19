"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import { DocumentData } from "firebase/firestore";

/* ---------------- TYPES ---------------- */

interface Participant {
  id: string;
  username: string;
  balance: number;
   performance: number;
}

interface Payout {
  rank: number;
  amount: number;
}

interface Tournament {
  id: string;
  name: string;
  startingBalance: number;
  prizePool: number;
  payoutStructure?: Payout[];
  entryFee: number;
  rebuyFee?: number;
  durationMinutes: number;
  description: string;
  startTime?: number;
  endTime?: number;
  status: "Upcoming" | "Live" | "Completed";
  participantsCount?: number;
  rules?: string;
  onRegisterInfo?: string;
}

/* ---------------- STATUS ---------------- */

const computeStatus = (
  startTime: number,
  endTime: number
): Tournament["status"] => {
  const now = Date.now();
  if (now < startTime) return "Upcoming";
  if (now >= startTime && now < endTime) return "Live";
  return "Completed";
};

/* ---------------- COMPONENT ---------------- */

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
 const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);

const [participants, setParticipants] = useState<Participant[]>([]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------------- FORM ---------------- */

  const [formName, setFormName] = useState("");
  const [formSB, setFormSB] = useState("1000");
  const [formPrize, setFormPrize] = useState("0");
  const [formEntryFee, setFormEntryFee] = useState("0");
  const [formRebuyFee, setFormRebuyFee] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formDesc, setFormDesc] = useState("");
  const [formRules, setFormRules] = useState("");
  const [formOnRegisterInfo, setFormOnRegisterInfo] = useState("");

  const [startMode, setStartMode] = useState<"now" | "delay">("now");
  const [delayMinutes, setDelayMinutes] = useState("0");

  const [payouts, setPayouts] = useState<Payout[]>([{ rank: 1, amount: 0 }]);

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const q = query(
      collection(db, "tournaments"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as DocumentData;

        const startTime = data.startTime ?? Date.now();
        const endTime =
          data.endTime ??
          startTime + (data.durationMinutes ?? 60) * 60000;

        return {
          id: d.id,
          name: data.name ?? "",
          startingBalance: data.startingBalance ?? 0,
          prizePool: data.prizePool ?? 0,
          payoutStructure: data.payoutStructure ?? [],
          entryFee: data.entryFee ?? 0,
          rebuyFee: data.rebuyFee ?? 0,
          durationMinutes: data.durationMinutes ?? 0,
          description: data.description ?? "",
          startTime,
          endTime,
          status: computeStatus(startTime, endTime),
          participantsCount: data.participantsCount ?? 0,
          rules: data.rules,
          onRegisterInfo: data.onRegisterInfo,
        };
      });

      setTournaments(list);
    });

    return () => unsub();
  }, []);
  useEffect(() => {
  if (!selectedTournament || !leaderboardOpen) return;

  const q = query(
    collection(db, "tournaments", selectedTournament.id, "participants"),
   orderBy("performance", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data() as DocumentData;

      return {
        id: d.id,
        username: data.username ?? "User",
        balance: Number(data.balance ?? 0),
         performance: Number(data.performance ?? 0),
      };
    });

    setParticipants(list);
  });

  return () => unsub();
}, [selectedTournament, leaderboardOpen]);

  /* ---------------- SAVE ---------------- */

  const saveTournament = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const sb = Number(formSB);
      const prize = Number(formPrize);
      const entry = Number(formEntryFee);
      const rebuy =
  formRebuyFee.trim() === ""
    ? entry
    : Math.max(0, Number(formRebuyFee));

      const duration = Number(formDuration);

      const startTime =
        startMode === "now"
          ? Date.now()
          : Date.now() + Number(delayMinutes) * 60000;

      const endTime = startTime + duration * 60000;

// ---------- VALIDATION BLOCK ----------
if (!formName.trim()) {
  alert("Tournament name is required");
  setSaving(false);
  return;
}

if (sb <= 0) {
  alert("Starting balance must be greater than 0");
  setSaving(false);
  return;
}

if (entry < 0) {
  alert("Entry fee cannot be negative");
  setSaving(false);
  return;
}

if (rebuy < 0 || isNaN(rebuy)) {
  alert("Invalid rebuy fee");
  setSaving(false);
  return;
}

if (duration <= 0) {
  alert("Duration must be greater than 0");
  setSaving(false);
  return;
}

if (!Array.isArray(payouts) || payouts.length === 0) {
  alert("Add at least one payout winner");
  setSaving(false);
  return;
}
const safePayouts = payouts
  .sort((a, b) => a.rank - b.rank)
  .map(p => ({
    rank: Number(p.rank),
    amount: Math.max(0, Number(p.amount)),
  }));
      const data = {
        name: formName,
        startingBalance: sb,
        prizePool: prize,
       payoutStructure: safePayouts,
        entryFee: entry,
        rebuyFee: rebuy,
        durationMinutes: duration,
        description: formDesc,
        rules: formRules,
        onRegisterInfo: formOnRegisterInfo,
        startTime,
        endTime,
        status: "live", // ✅ ADD THIS
        createdAt: serverTimestamp(),
      };

      if (editing && selectedTournament) {
        await updateDoc(doc(db, "tournaments", selectedTournament.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "tournaments"), data);
      }

      setModalOpen(false);
      setEditing(false);
      setSelectedTournament(null);
    } catch (e) {
      console.error(e);
      alert("Error saving");
    }

    setSaving(false);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🔥 Tournament Admin</h1>

      <div style={styles.topBar}>
        <input
          style={styles.search}
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button style={styles.createBtn} onClick={() => setModalOpen(true)}>
          + Create
        </button>
      </div>

      {tournaments
  .filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  .map((t) => (
    <div
      key={t.id}
      style={styles.card}
    >
      <h3>{t.name}</h3>
      <p style={{ opacity: 0.7 }}>{t.description}</p>
      <p>👥 {t.participantsCount}</p>

      {/* ✅ ADD BUTTON HERE */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedTournament(t);
          setLeaderboardOpen(true);
        }}
        style={{
          marginTop: 10,
          padding: "6px 10px",
          background: "#6A00FF",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Leaderboard
      </button>
    </div>
  ))}

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalScroll}>
              <h2>{editing ? "Edit" : "Create"} Tournament</h2>

              <Label text="Name" />
              <Input value={formName} set={setFormName} />

              <Label text="Starting Balance" />
              <Input value={formSB} set={setFormSB} />

              <Label text="Prize Pool" />
              <Input value={formPrize} set={setFormPrize} />
              <Label text="Prize Distribution" />

{payouts.map((p, i) => (
  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
    <input
      value={p.rank}
      onChange={(e) => {
        const copy = [...payouts];
        copy[i].rank = Number(e.target.value);
        setPayouts(copy);
      }}
      style={{ flex: 1 }}
    />

    <input
      value={p.amount}
      onChange={(e) => {
        const copy = [...payouts];
        copy[i].amount = Number(e.target.value);
        setPayouts(copy);
      }}
      style={{ flex: 2 }}
    />

    <button
      onClick={() =>
        setPayouts(payouts.filter((_, idx) => idx !== i))
      }
    >
      X
    </button>
  </div>
))}

<button
  onClick={() =>
    setPayouts([...payouts, { rank: payouts.length + 1, amount: 0 }])
  }
  style={{ color: "#6A00FF" }}
>
  + Add Winner
</button>

              <Label text="Entry Fee" />
              <Input value={formEntryFee} set={setFormEntryFee} />

              <Label text="Rebuy Fee" />
              <Input value={formRebuyFee} set={setFormRebuyFee} />

              <Label text="Duration (minutes)" />
              <Input value={formDuration} set={setFormDuration} />

              <Label text="Description" />
              <textarea
                style={styles.textarea}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />

              <Label text="Rules" />
              <textarea
                style={styles.textarea}
                value={formRules}
                onChange={(e) => setFormRules(e.target.value)}
              />

              <Label text="On Register Info" />
              <textarea
                style={styles.textarea}
                value={formOnRegisterInfo}
                onChange={(e) =>
                  setFormOnRegisterInfo(e.target.value)
                }
              />

              <Label text="Start Mode" />
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setStartMode("now")}
                  style={btn(startMode === "now")}
                >
                  Now
                </button>
                <button
                  onClick={() => setStartMode("delay")}
                  style={btn(startMode === "delay")}
                >
                  Delay
                </button>
              </div>

              {startMode === "delay" && (
                <Input value={delayMinutes} set={setDelayMinutes} />
              )}

              <button
                style={styles.saveBtn}
                onClick={saveTournament}
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => setModalOpen(false)}
                style={{ marginTop: 10, color: "#aaa" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {leaderboardOpen && selectedTournament && (
  <div style={{ marginTop: 20, background: "#111", padding: 20 }}>
    <h2>{selectedTournament.name} Leaderboard</h2>

    {participants.length === 0 ? (
      <p style={{ color: "#666" }}>No participants</p>
    ) : (
      participants.map((p, i) => (
        <div key={p.id}>
          #{i + 1} {p.username}
— {p.performance.toFixed(2)}%
        </div>
      ))
    )}

    <button onClick={() => setLeaderboardOpen(false)}>
      Close
    </button>
  </div>
)}
    </div>
  );
}

/* ---------------- HELPERS ---------------- */

const Label = ({ text }: { text: string }) => (
  <div style={{ color: "#bbb", marginTop: 12, marginBottom: 5 }}>
    {text}
  </div>
);

const Input = ({
  value,
  set,
}: {
  value: string;
  set: (v: string) => void;
}) => (
  <input
    value={value}
    onChange={(e) => set(e.target.value)}
    style={styles.input}
  />
);

const btn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: 10,
  background: active ? "#6A00FF" : "#222",
  color: "#fff",
  border: "none",
  borderRadius: 8,
});

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#0b0b0f",
    minHeight: "100vh",
    padding: 20,
    color: "#fff",
  },
  title: { fontSize: 22, fontWeight: "bold" },
  topBar: { display: "flex", gap: 10, marginBottom: 15 },
  search: {
    flex: 1,
    padding: 10,
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
  },
  createBtn: {
    background: "#6A00FF",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
  },
  card: {
    background: "#111",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "95%",
    maxWidth: 500,
    background: "#111",
    borderRadius: 12,
    border: "1px solid #333",
    maxHeight: "90vh",
    display: "flex",
  },
  modalScroll: {
    overflowY: "auto",
    padding: 15,
    width: "100%",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 8,
    background: "#222",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: 8,
  },
  textarea: {
    width: "100%",
    minHeight: 80,
    padding: 10,
    background: "#222",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: 8,
  },
  saveBtn: {
    width: "100%",
    marginTop: 15,
    padding: 12,
    background: "#6A00FF",
    border: "none",
    borderRadius: 8,
    color: "#fff",
  },
};