"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";


import TournamentsSection from "./sections/TournamentsSection";
import TournamentCoffersSection from "./sections/TournamentCoffersSection";
import UsersSection from "./sections/UsersSection";
import PaymentsSection from "./sections/PaymentsSection";
import PayoutsSection from "./sections/PayoutsSection";
import TournamentPayoutSection from "./sections/TournamentPayoutSection";
import TreasurySection from "./sections/TreasurySection";
import NotificationsSection from "./sections/NotificationsSection";
import SettingsSection from "./sections/SettingsSection";
import LogsAndActivitySection from "./sections/LogsAndActivitySection";
import SystemControlSection from "./sections/SystemControlSection";

const SECTIONS = [
  "Tournaments",
  "Tournament Coffers",
  "Users",
  "Payments",
  "Payouts",
  "Tournament Payouts",
  "Logs & Activity",
  "System Control",
  "Treasury",
  "Notifications",
  "Settings",
];

export default function AdminDashboard() {
  const [active, setActive] = useState("Treasury");
 
  const [exiting, setExiting] = useState(false);
const [menuOpen, setMenuOpen] = useState(true);

  const router = useRouter();

  useEffect(() => {
  const checkAdmin = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const token = await user.getIdTokenResult();

    if (!token.claims.admin) {
      router.replace("/admin/login");
    }
  };

  checkAdmin();
}, [router]);

  // rest of your file continues unchanged...

  const renderSection = () => {
    switch (active) {
      case "Tournaments":
        return <TournamentsSection />;

      case "Tournament Coffers":
        return <TournamentCoffersSection />;

      case "Users":
        return <UsersSection />;

      case "Payments":
        return <PaymentsSection />;

      case "Payouts":
        return <PayoutsSection />;

      case "Tournament Payouts":
        return <TournamentPayoutSection />;

      case "Treasury":
        return <TreasurySection />;

      case "Notifications":
        return <NotificationsSection />;

      case "Settings":
        return <SettingsSection />;

      case "Logs & Activity":
        return <LogsAndActivitySection />;

      case "System Control":
        return <SystemControlSection />;

      default:
        return <TreasurySection />;
    }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
    <div
  style={{
    ...styles.sidebar,
    transform: menuOpen
      ? "translateX(0)"
      : "translateX(-100%)",
  }}
>
        <div style={styles.scroll}>
          {SECTIONS.map((sec) => (
            <div
              key={sec}
              onClick={() => setActive(sec)}
              style={{
                ...styles.item,
                ...(active === sec ? styles.activeItem : {}),
              }}
            >
              {sec}
            </div>
          ))}

          {/* EXIT BUTTON */}
          <button
            disabled={exiting}
            onClick={async () => {
              if (exiting) return;

              setExiting(true);

            try {
  localStorage.removeItem("isAdmin");

  await auth.signOut();

  window.location.href = "/admin/login";
} catch {
                alert("Exit failed");
                setExiting(false);
              }
            }}
            style={{
              ...styles.exitBtn,
              opacity: exiting ? 0.6 : 1,
            }}
          >
            {exiting ? "Exiting..." : "Exit Admin"}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
   <div style={styles.main}>

<button
  onClick={() => setMenuOpen(!menuOpen)}
  style={styles.menuBtn}
>
  ☰
</button>
        <div style={styles.content}>{renderSection()}</div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#000",
  },

  /* SIDEBAR */
  sidebar: {
  width: 260,
  background: "#111",
  borderRight: "1px solid #222",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  left:0,
  top:0,
  bottom:0,
  zIndex:1000,
  transition:"transform .3s ease",
},
menuBtn:{
  position:"fixed",
  top:15,
  left:15,
  zIndex:1100,
  background:"#222",
  color:"#fff",
  border:"none",
  borderRadius:8,
  padding:"10px 14px",
  fontSize:22,
  cursor:"pointer",
},

  scroll: {
    overflowY: "auto",
    padding: 12,
  },

  item: {
    padding: "12px 10px",
    marginBottom: 6,
    color: "#fff",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 14,
  },

  activeItem: {
    background: "#333",
    borderLeft: "3px solid #4A90E2",
  },

  exitBtn: {
    marginTop: 20,
    width: "100%",
    padding: 12,
    background: "#ff4d67",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  /* MAIN */
  main: {
    flex: 1,
    overflow: "hidden",
  },

  content: {
    padding: 16,
    height: "100%",
    overflowY: "auto",
  },
};