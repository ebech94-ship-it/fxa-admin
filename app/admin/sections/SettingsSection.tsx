"use client";

import { db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export default function SettingsSection() {
  const [enablePayouts, setEnablePayouts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [saving, setSaving] = useState(false);

  // 🔥 LOAD SETTINGS
  useEffect(() => {
    const loadSettings = async () => {
      const ref = doc(db, "settings", "app");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setEnablePayouts(data.enablePayouts ?? true);
        setMaintenanceMode(data.maintenanceMode ?? false);
      }
    };

    loadSettings();
  }, []);

  // 💾 SAVE SETTINGS
  const saveSettings = async () => {
    setSaving(true);

    try {
      await setDoc(doc(db, "settings", "app"), {
        enablePayouts,
        maintenanceMode,
        updatedAt: serverTimestamp(),
      });

      alert("Settings updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>⚙️ Admin Settings</h2>

      {/* PAYMENTS */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Payments</h3>

        <label style={styles.row}>
          <span>Enable Payout Requests</span>
          <input
            type="checkbox"
            checked={enablePayouts}
            onChange={(e) => setEnablePayouts(e.target.checked)}
          />
        </label>
      </div>

      {/* SYSTEM */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>System</h3>

        <label style={styles.row}>
          <span>Maintenance Mode</span>
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
          />
        </label>

        {maintenanceMode && (
          <p style={styles.warning}>
            ⚠ App will show maintenance mode to users
          </p>
        )}
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        style={styles.saveBtn}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    background: "#0b0b10",
    minHeight: "100vh",
    color: "#fff",
  },

  header: {
    fontSize: 22,
    fontWeight: 900,
    marginBottom: 16,
  },

  card: {
    background: "#1a1a2d",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  cardTitle: {
    color: "#0ff",
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 10,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  warning: {
    color: "#facc15",
    fontSize: 13,
  },

  saveBtn: {
    background: "#0ff",
    color: "#000",
    padding: 12,
    borderRadius: 10,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
  },
};