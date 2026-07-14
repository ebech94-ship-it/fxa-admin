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

  username?: string;
  displayName?: string;
  publicId?: string;

  phoneNumbers?: string[];
  country?: string;

  accounts?: {
  real?: {
    balance?: number;
  };
  demo?: {
    balance?: number;
  };

  tournaments?: {
    [tournamentId: string]: {
      name?: string;
      badge?: string;
      startTime?: unknown;
      endTime?: unknown;
      registeredAt?: unknown;
      rebuys?: number;
      balance?: number;
    };
  };
};

  performance?: {
    trades?: number;
    wins?: number;
    losses?: number;
    pnl?: number;
    roi?: number;
    winRate?: number;
  };

  tournaments?: {
  [tournamentId:string]: {
    name?: string;
    badge?: string;
    startTime?: unknown;
    endTime?: unknown;
    registeredAt?: unknown;
    rebuys?: number;
  }
};

  referrals?: {
    total?: number;
    successful?: number;
    points?: number;
  };
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
  username?: string;
  displayName?: string;
  publicId?: string;

  phoneNumbers?: string[];
  phoneHistory?: string[];

  frozen?: boolean;
  joinedTournaments?: unknown[];

  createdAt?: unknown;

 accounts?: {
  real?: {
    balance?: number;
  };
demo?: {
    balance?: number;
  };
  tournaments?: {
    [tournamentId: string]: {
      name?: string;
      badge?: string;
      startTime?: unknown;
      endTime?: unknown;
      registeredAt?: unknown;
      rebuys?: number;
      balance?: number;
    };
  };
};

  performance?: {
    trades?: number;
    wins?: number;
    losses?: number;
    pnl?: number;
    roi?: number;
    winRate?: number;
  };

  referrals?: {
    total?: number;
    successful?: number;
    points?: number;
  };
};

        return {
  id: d.id,

  email: data.email ?? "",

  username:
    data.username ??
    data.displayName ??
    "Unknown",

  displayName:
    data.displayName ?? "",

  publicId:
    data.publicId ?? "",


  phoneNumbers:
    data.phoneNumbers ??
    data.phoneHistory ??
    [],


  balance:
    data.accounts?.real?.balance ?? 0,

accounts:
 data.accounts ?? {},

  frozen:
    data.frozen ?? false,


  joinedTournaments:
    data.joinedTournaments ?? [],


  performance:
    data.performance ?? {
      trades:0,
      wins:0,
      losses:0,
      pnl:0,
      roi:0,
      winRate:0,
    },


  referrals:
    data.referrals ?? {
      total:0,
      successful:0,
      points:0,
    },
tournaments:
    data.accounts?.tournaments ?? {},

  createdAt:
    data.createdAt,
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
const totalBalance = filtered.reduce(
  (sum, u) => sum + Number(u.balance || 0),
  0
);
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

     <div
  style={{
    background: "#111",
    borderRadius: 10,
    overflow: "hidden",
  }}
>
  {/* TABLE HEADER */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "50px 2fr 1fr 1fr",
      padding: 12,
      background: "#1f2937",
      color: "#fff",
      fontWeight: 800,
    }}
  >
    <div>#</div>
    <div>User</div>
    <div style={{ color: "#facc15" }}>Wallet</div>
    <div>Status</div>
  </div>

  {/* TABLE ROWS */}
 {/* TABLE ROWS SCROLL AREA */}
<div
  style={{
    maxHeight: 500,
    overflowY: "auto",
  }}
>
  {filtered.map((u, i) => (
    <div
      key={u.id}
      onClick={() => {
        setSelected(u);
        setOpen(true);
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "50px 2fr 1fr 1fr",
        padding: 12,
        borderBottom: "1px solid #222",
        cursor: "pointer",
        alignItems: "center",
      }}
    >
      <div style={{ color: "#9ca3af" }}>
        {i + 1}
      </div>

      <div style={{ color: "#60a5fa", fontWeight: 700 }}>
        {u.email}
      </div>

      <div style={{ color: "#facc15", fontWeight: 800 }}>
        ${Number(u.balance || 0).toFixed(2)}
      </div>

      <div
        style={{
          color: u.frozen ? "#ef4444" : "#22c55e",
          fontWeight: 800,
        }}
      >
        {u.frozen ? "Frozen" : "Active"}
      </div>
    </div>
  ))}
</div>

  {/* TOTAL FOOTER */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "50px 2fr 1fr 1fr",
      padding: 14,
      background: "#1a1a40",
      fontWeight: 900,
    }}
  >
    <div></div>

    <div style={{ color: "#fff" }}>
      TOTAL USERS: {filtered.length}
    </div>

    <div style={{ color: "#00ffcc" }}>
              ${totalBalance.toFixed(2)}
    </div>

    <div style={{ color: "#fff" }}>
      Treasury
    </div>
  </div>
</div>

      {/* USER DETAIL MODAL */}
{open && selected && (
<div style={modalStyle}>

  <div style={userModalStyle}>

    {/* HEADER */}
    <div style={modalHeaderStyle}>
      <div>
        <h2 style={{margin:0}}>
          👤 {selected.username || "Unknown User"}
        </h2>

        <p style={muted}>
          Public ID: {selected.publicId || "N/A"}
        </p>
      </div>

      <button
        onClick={()=>setOpen(false)}
        style={closeTop}
      >
        ✕
      </button>
    </div>


    {/* SCROLL CONTENT */}
    <div style={modalScroll}>


      {/* IDENTITY CARD */}
      <div style={cardStyle}>
        <h3>🪪 Identity</h3>

        <CopyRow 
          label="Firestore ID"
          value={selected.id}
        />

        <CopyRow 
          label="Email"
          value={selected.email}
        />

        <CopyRow 
          label="Username"
          value={selected.username || "N/A"}
        />

        <CopyRow 
          label="Public ID"
          value={selected.publicId || "N/A"}
        />

      </div>



      {/* CONTACT CARD */}
      <div style={cardStyle}>

        <h3>📱 Telephone Numbers</h3>

        {selected.phoneNumbers?.length ? (
          selected.phoneNumbers.map((p,i)=>
            <CopyRow 
              key={i}
              label={`Phone ${i+1}`}
              value={p}
            />
          )
        ):(
          <p style={muted}>
            No phone history
          </p>
        )}

      </div>




      {/* FINANCE CARD */}
      <div style={cardStyle}>

        <h3>💰 Financial</h3>

        <div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:10
}}
>


<div
style={{
background:"#111827",
padding:15,
borderRadius:12
}}
>

<p style={muted}>
💵 Real Account
</p>

<h2 style={{
color:"#00ffcc",
margin:0
}}>
$
{Number(
selected.accounts?.real?.balance || 0
).toFixed(2)}
</h2>

</div>



<div
style={{
background:"#111827",
padding:15,
borderRadius:12
}}
>

<p style={muted}>
🎮 Demo Account
</p>

<h2 style={{
color:"#60a5fa",
margin:0
}}>
$
{Number(
selected.accounts?.demo?.balance || 0
).toFixed(2)}
</h2>

</div>


</div>

        <p>
          Status:
          <span style={{
            color:selected.frozen
            ?"red"
            :"#22c55e"
          }}>
            {" "}
            {selected.frozen
            ?"Frozen"
            :"Active"}
          </span>
        </p>

      </div>




      {/* PERFORMANCE */}
      <div style={cardStyle}>

        <h3>📈 Trading Performance</h3>

        <Stat 
          title="Trades"
          value={selected.performance?.trades || 0}
        />

        <Stat 
          title="Wins"
          value={selected.performance?.wins || 0}
        />

        <Stat 
          title="Losses"
          value={selected.performance?.losses || 0}
        />

        <Stat 
          title="PNL"
          value={`$${selected.performance?.pnl || 0}`}
        />

        <Stat 
          title="ROI"
          value={`${selected.performance?.roi || 0}%`}
        />

      </div>

{/* TOURNAMENT ENGAGEMENT */}

<div style={cardStyle}>

<h3>🏆 Tournament Engagement</h3>


{
Object.keys(selected.tournaments || {}).length === 0 ? (

<p style={muted}>
No tournaments participated yet
</p>

) : (

Object.entries(selected.tournaments || {})
.map(([id,t])=>(

<div
key={id}
style={{
background:"#111827",
padding:12,
borderRadius:10,
marginBottom:10
}}
>


<h4 style={{
margin:0,
color:"#facc15"
}}>
{t.name || "Tournament"}
</h4>


<p>
🎖 Badge:
{" "}
{t.badge || "Registered"}
</p>


<p>
🔄 Rebuys:
{" "}
<b>
{t.rebuys || 0}
</b>
</p>


<p style={muted}>
Start:
{" "}
{String(t.startTime || "N/A")}
</p>


<p style={muted}>
End:
{" "}
{String(t.endTime || "N/A")}
</p>


</div>

))

)

}

</div>


      {/* REFERRAL */}
      <div style={cardStyle}>

        <h3>🎁 Referral Activity</h3>


        <Stat
          title="Total Referrals"
          value={selected.referrals?.total || 0}
        />


        <Stat
          title="Successful"
          value={selected.referrals?.successful || 0}
        />


        <Stat
          title="Points"
          value={selected.referrals?.points || 0}
        />

      </div>




      {/* BALANCE CONTROL */}
      <div style={cardStyle}>

        <h3>⚙ Wallet Adjustment</h3>


        <select
          value={mode}
          onChange={(e)=>
            setMode(
              e.target.value as "add"|"subtract"
            )
          }
          style={inputStyle}
        >

          <option value="add">
            Add Funds
          </option>

          <option value="subtract">
            Subtract Funds
          </option>

        </select>


        <input
          value={editBalance}
          onChange={(e)=>
            setEditBalance(e.target.value)
          }
          placeholder="Amount"
          style={inputStyle}
        />


        <button
          onClick={updateBalance}
          disabled={loading}
          style={updateBtn}
        >
          {loading
          ?"Updating..."
          :"Update Balance"}
        </button>


      </div>
{/* TRANSACTION HISTORY */}

<div style={cardStyle}>

  <h3>💳 Deposit & Withdrawal History</h3>

  <div
    style={{
      overflowX: "auto",
      marginTop: 10,
    }}
  >

    <table
      style={{
        width: "100%",
        minWidth: 750,
        borderCollapse: "collapse",
        fontSize: 13,
      }}
    >

      <thead>

        <tr
          style={{
            background: "#111827",
          }}
        >
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Phone</th>
          <th>Reference</th>
        </tr>

      </thead>

      <tbody>

        {/* transactions go here */}

      </tbody>

    </table>

  </div>

</div>

    </div>


    <button
      onClick={()=>setOpen(false)}
      style={closeBtn}
    >
      Close User Details
    </button>


  </div>

</div>
)}
    </div>
  );
}
function CopyRow({
label,
value
}:{
label:string;
value:string;
}){

return(
<div style={copyRow}>

<span>
{label}
</span>

<button
onClick={()=>{
navigator.clipboard.writeText(value)
}}
style={copyBtn}
>
📋
</button>

<strong>
{value}
</strong>

</div>
)

}



function Stat({
title,
value
}:{
title:string;
value:string|number;
}){

return(
<div style={statBox}>
<span>{title}</span>
<b>{value}</b>
</div>
)

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

const userModalStyle:React.CSSProperties={
background:"#0b1020",
width:"95%",
maxWidth:520,
maxHeight:"90vh",
borderRadius:20,
padding:20,
color:"#fff",
display:"flex",
flexDirection:"column"
};


const modalScroll:React.CSSProperties={
overflowY:"auto",
paddingRight:5
};


const modalHeaderStyle:React.CSSProperties={
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:15
};


const cardStyle:React.CSSProperties={
background:"#151b35",
borderRadius:15,
padding:15,
marginBottom:12,
boxShadow:"0 5px 20px rgba(0,0,0,.3)"
};


const copyRow:React.CSSProperties={
display:"flex",
gap:10,
alignItems:"center",
marginBottom:8,
fontSize:13
};


const copyBtn:React.CSSProperties={
background:"#2563eb",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
};


const statBox:React.CSSProperties={
display:"flex",
justifyContent:"space-between",
padding:8,
background:"#111827",
borderRadius:8,
marginBottom:5
};


const inputStyle:React.CSSProperties={
width:"100%",
padding:10,
marginTop:8,
borderRadius:8
};


const updateBtn:React.CSSProperties={
width:"100%",
marginTop:10,
padding:12,
background:"#22c55e",
color:"#fff",
border:0,
borderRadius:10,
fontWeight:800
};


const closeBtn:React.CSSProperties={
marginTop:10,
padding:12,
background:"#ef4444",
color:"#fff",
border:0,
borderRadius:10,
fontWeight:800
};


const closeTop:React.CSSProperties={
background:"transparent",
color:"#fff",
border:0,
fontSize:22
};





const muted={
color:"#9ca3af"
};