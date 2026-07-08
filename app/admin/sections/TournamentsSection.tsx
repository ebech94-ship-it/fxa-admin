"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
 
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import { DocumentData, serverTimestamp } from "firebase/firestore";

/* ---------------- TYPES ---------------- */

type Tab = "overview" | "leaderboard";
interface Participant {
  id: string;
  username: string;
  balance: number;
   performance: number;
   rebuyInjectedTotal?: number;
}

interface Payout {
  rank: number;
  amount: number;
   percentage?: number;
}

interface Tournament {
  id: string;
  name: string;
   prizeModel?: "sponsored" | "dynamic";
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
const [activeTab, setActiveTab] = useState<Tab>("overview" as const);

 const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
const [formPrizeMode, setFormPrizeMode] =
  useState<"sponsored" | "pool">("sponsored");

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
const [payoutType, setPayoutType] =
  useState<"amount" | "percentage">("amount");

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
          prizeModel: data.prizeModel ?? "sponsored",
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

  const balance = Number(data.balance ?? 0);
  const startingBalance =
    selectedTournament?.startingBalance ?? 0;

  const rebuyInjectedTotal = Number(data.rebuyInjectedTotal ?? 0);

  const performance =
    balance - startingBalance - rebuyInjectedTotal;

  return {
    id: d.id,
    username: data.username ?? "User",
    balance,
    rebuyInjectedTotal,
    performance,
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
const safePayouts =
payouts
.sort((a,b)=>a.rank-b.rank)
.map(p=>({

rank:Number(p.rank),

amount:
formPrizeMode==="pool" &&
payoutType==="percentage"
?
0
:
Math.max(0,Number(p.amount)),


percentage:
formPrizeMode==="pool" &&
payoutType==="percentage"
?
Math.max(0,Number(p.percentage))
:
0

}));
      const data = {
        name: formName,
        prizeModel:
    formPrizeMode === "pool"
      ? "dynamic"
      : "sponsored",
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
       participantsCount: 0,

  featured: true,
        createdAt: serverTimestamp(),
      };

     if (editing && selectedTournament) {
  await updateDoc(doc(db, "tournaments", selectedTournament.id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
} else {
  // Create the tournament
  const tournamentRef = await addDoc(
    collection(db, "tournaments"),
    data
  );

  // Create an alert for all users
  await addDoc(collection(db, "alerts"), {
  type: "tournament",
  tournamentId: tournamentRef.id,
  title: "🏆 New Tournament Open",
  message: `${formName} is now open for registration.`,
  actionLabel: "Join Now",
  priority: "high",
  createdAt: serverTimestamp(),
});
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
  style={{
    ...styles.card,
    cursor: "pointer",
    padding: 18,
    border: "1px solid #252525",
    background: "linear-gradient(180deg,#171717,#101010)",
  }}
  onClick={() => {
    setSelectedTournament(t);
    setDetailsOpen(true);
    setActiveTab("overview");
  }}
>
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <h3 style={{ margin: 0 }}>{t.name}</h3>

    <span
      style={{
        padding: "4px 10px",
        borderRadius: 30,
        fontSize: 12,
        background:
          t.status === "Live"
            ? "#00c853"
            : t.status === "Upcoming"
            ? "#ff9800"
            : "#555",
      }}
    >
      {t.status}
    </span>
  </div>

  <p
    style={{
      color: "#999",
      marginTop: 10,
      marginBottom: 16,
    }}
  >
    {t.description}
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    }}
  >
    <div>👥 {t.participantsCount} Players</div>

   <div>
💰 {
 t.prizeModel === "dynamic"
 ? "Auto Pool"
 : t.prizePool
}
</div>

    <div>💵 {t.entryFee}</div>

    <div>⏱ {t.durationMinutes} mins</div>
  </div>

  <div
    style={{
      marginTop: 18,
      color: "#8c52ff",
      fontWeight: 600,
    }}
  >
    Tap to view full details →
  </div>
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
<Label text="Prize Model" />

<select
  value={formPrizeMode}
  onChange={(e) =>
    setFormPrizeMode(e.target.value as "sponsored" | "pool")
  }
  style={styles.input}
>
  <option value="sponsored">
    Sponsored Prize Pool
  </option>

  <option value="pool">
    Participant Generated Pool
  </option>
</select>
             <Label text="Prize Pool" />
<Input
  value={formPrizeMode === "sponsored" ? formPrize : "Auto Generated"}
  set={setFormPrize}
/>
         <Label text="Prize Distribution" />

{formPrizeMode === "pool" && ( <select value={payoutType}
onChange={(e)=> setPayoutType( e.target.value as "amount" | "percentage"
 )} style={styles.input}>
<option value="percentage">
Percentage Distribution
</option>
<option value="amount">
Fixed Amount
</option>
</select>
)}
{payouts.map((p,i)=>( <div key={i} style={{ display:"flex",
gap:8, marginBottom:8 }} >
<input value={p.rank} placeholder="Rank" onChange={(e)=>{
const copy=[...payouts];
copy[i].rank =
Number(e.target.value);
setPayouts(copy);
}}
style={{flex:1}}
/>
<input value={ payoutType==="percentage" ? p.percentage ?? ""
: p.amount }
placeholder={ payoutType==="percentage" ? "%"
: "Amount"}
onChange={(e)=>{ const copy=[...payouts];
if(payoutType==="percentage"){ copy[i].percentage =
Number(e.target.value); }

else{
copy[i].amount = Number(e.target.value); }
setPayouts(copy);
}}
style={{flex:2}}
/>
<button onClick={()=> setPayouts( payouts.filter(
(_,idx)=>idx!==i ))}
       >
      X
</button>
</div> 
))}
<button
onClick={()=>setPayouts([...payouts,
{rank:payouts.length+1, amount:0, percentage:0}])
}
style={{color:"#6A00FF"}}
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
     
  <>
{detailsOpen && selectedTournament && (
<div
style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,.82)",
display:"flex",
justifyContent:"center",
alignItems:"center",
zIndex:9999
}}
>

<div
style={{
width:"90%",
maxWidth:900,
maxHeight:"88vh",
overflowY:"auto",
background:"#121212",
borderRadius:24,
border:"1px solid #2b2b2b",
padding:30,
boxShadow:"0 0 40px rgba(0,0,0,.5)",

/* hide scrollbar (modern browsers) */
scrollbarWidth: "none", // Firefox
msOverflowStyle: "none" // IE/Edge old
}}
className="no-scrollbar"
>

<div
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:25
}}
>

<div>

<h2 style={{margin:0,fontSize:28}}>
🏆 {selectedTournament.name}
</h2>
<div style={{ display: "flex", gap: 10, marginTop: 15 }}>
  <button
    onClick={() => setActiveTab("overview")}
    style={{
      flex: 1,
      padding: 10,
      borderRadius: 10,
      background: activeTab === ("overview" as Tab)? "#6A00FF" : "#1e1e1e",
      color: "#fff",
      border: "none",
    }}
  >
    Overview
  </button>

  <button
   onClick={() => setActiveTab("leaderboard" as const)}
    style={{
      flex: 1,
      padding: 10,
      borderRadius: 10,
      background: activeTab === ("leaderboard" as Tab) ? "#6A00FF" : "#1e1e1e",
      color: "#fff",
      border: "none",
    }}
  >
    Leaderboard
  </button>
</div>
<div
style={{
marginTop:8,
display:"inline-block",
padding:"6px 14px",
borderRadius:40,
background:
selectedTournament.status==="Live"
?"#00C853":
selectedTournament.status==="Upcoming"
?"#FF9800":
"#666"
}}
>
{selectedTournament.status}
</div>

</div>

</div>

<hr style={{borderColor:"#242424"}}/>

<h3>Overview</h3>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(2,1fr)",
gap:15,
marginBottom:30
}}
>

<div style={styles.infoBox}>
💰 Prize Pool
<br/>
<b>
{
 selectedTournament.prizeModel === "dynamic"
 ? "Generated From Entries"
 : selectedTournament.prizePool
}
</b>
</div>

<div style={styles.infoBox}>
💵 Entry Fee
<br/>
<b>{selectedTournament.entryFee}</b>
</div>

<div style={styles.infoBox}>
🔁 Rebuy
<br/>
<b>{selectedTournament.rebuyFee}</b>
</div>

<div style={styles.infoBox}>
🏦 Starting Balance
<br/>
<b>{selectedTournament.startingBalance}</b>
</div>

<div style={styles.infoBox}>
👥 Participants
<br/>
<b>{selectedTournament.participantsCount}</b>
</div>

<div style={styles.infoBox}>
⏱ Duration
<br/>
<b>{selectedTournament.durationMinutes} mins</b>
</div>

</div>

<h3>Description</h3>

<div style={styles.sectionBox}>
{selectedTournament.description||"None"}
</div>

<h3>Rules</h3>

<div style={styles.sectionBox}>
{selectedTournament.rules||"None"}
</div>

<h3>Registration Information</h3>

<div style={styles.sectionBox}>
{selectedTournament.onRegisterInfo||"None"}
</div>

<h3>Payout Structure</h3>

<div style={styles.sectionBox}>

{selectedTournament.payoutStructure?.map(p=>(
<div
key={p.rank}
style={{
display:"flex",
justifyContent:"space-between",
padding:"12px 0",
borderBottom:"1px solid #242424"
}}
>

<div>
🏅 Rank {p.rank}
</div>

<div>
{p.amount}
</div>

</div>
))}

</div>
{activeTab === "leaderboard" && (
  <div style={{ marginTop: 20 }}>
    <h3>Leaderboard</h3>

    {participants.length === 0 ? (
      <p style={{ color: "#777" }}>No participants yet</p>
    ) : (
      [...participants]
        .sort((a, b) => b.performance - a.performance)
        .map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid #2a2a2a",
            }}
          >
            <div>
              #{i + 1} {p.username}
            </div>

            <div style={{ color: "#6A00FF" }}>
              {p.performance.toFixed(2)}%
            </div>
          </div>
        ))
    )}
  </div>
)}
<div
style={{
display:"flex",
gap:15,
marginTop:30
}}
>

<button
style={{
flex:1,
padding:14,
background:"#1e1e1e",
border:"1px solid #333",
borderRadius:12,
color:"#fff"
}}
onClick={()=>{setDetailsOpen(false)
;setLeaderboardOpen(true)}}
>
Done
</button>
</div>

</div>
</div>
)}
      
     </>

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