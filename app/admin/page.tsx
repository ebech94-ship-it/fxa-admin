"use client";

import { useState, useEffect, useRef } from "react";
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
const sidebarRef = useRef<HTMLDivElement>(null);

const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

const menuBtnRef = useRef<HTMLButtonElement>(null);

 useEffect(() => {

  const handleOutside = (e: MouseEvent) => {

    const target = e.target as Node;

    if (
      menuOpen &&
      sidebarRef.current &&
      !sidebarRef.current.contains(target) &&
      !menuBtnRef.current?.contains(target)
    ) {
      setMenuOpen(false);
    }

  };

  document.addEventListener("mousedown", handleOutside);

  return () => {
    document.removeEventListener("mousedown", handleOutside);
  };

}, [menuOpen]);
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
const selectSection = (sec: string) => {
  setActive(sec);

  // close sidebar on phone
  if (window.innerWidth < 768) {
    setMenuOpen(false);
  }
};
  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
  <div
  ref={sidebarRef}
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
              onClick={() => selectSection(sec)}
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
  ref={menuBtnRef}
  onClick={() => setMenuOpen(prev => !prev)}
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
sidebar:{
  width:260,
  background:"#111",
  borderRight:"1px solid #222",
  display:"flex",
  flexDirection:"column",
  position:"fixed",
  left:0,
  top:30,
  bottom:0,
  zIndex:1000,
  transition:"transform .3s ease",
  touchAction:"none",
}, 
menuBtn:{
  position:"fixed",
  top:12,
  left:15,
  zIndex:1100,
  background:"#222",
  color:"#fff",
  border:"none",
  borderRadius:10,
  padding:"12px",
  fontSize:28,
  cursor:"pointer",
  width:55,
  height:55,
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
    fontSize: 18,
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
  paddingTop: 85,
  height: "100%",
  overflowY: "auto",
},
};