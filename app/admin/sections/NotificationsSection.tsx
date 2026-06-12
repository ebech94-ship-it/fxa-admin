"use client";

import { getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebaseConfig";

/* ---------------- TYPES ---------------- */

type Notification = {
  id: string;
  message?: string;
  createdAt?: unknown;
};

type SupportThread = {
  id: string;
  lastMessage?: string;
  username?: string;
  userEmail?: string;
};

type ThreadMessage = {
  id: string;
  text: string;
  sender: "admin" | "user";
  createdAt?: unknown;
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;

/* ---------------- COMPONENT ---------------- */

export default function NotificationsSection() {
  const [message, setMessage] = useState("");
  const [loadingNotification, setLoadingNotification] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);

  const [activeTab, setActiveTab] = useState<"notifications" | "support">(
    "notifications"
  );

  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);

  const [replyText, setReplyText] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);

  /* ---------------- EDIT STATE ---------------- */
  const [editOpen, setEditOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");

  /* ---------------- NOTIFICATIONS ---------------- */

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("createdAt", "desc"));

    return onSnapshot(q, (snap) => {
      const data: Notification[] = snap.docs.map((d) => {
        const raw = d.data() as Omit<Notification, "id">;
        return { id: d.id, ...raw };
      });

      setNotifications(data);
    });
  }, []);

  /* ---------------- SUPPORT THREADS ---------------- */

  useEffect(() => {
    const q = query(
      collection(db, "supportThreads"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      const data: SupportThread[] = snap.docs.map((d) => {
        const raw = d.data() as Omit<SupportThread, "id">;
        return { id: d.id, ...raw };
      });

      setSupportThreads(data);
    });
  }, []);

  /* ---------------- THREAD MESSAGES ---------------- */

  useEffect(() => {
    if (!activeThread) return;

    const q = query(
      collection(db, "supportThreads", activeThread.id, "messages"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const data: ThreadMessage[] = snap.docs.map((d) => {
        const raw = d.data() as Omit<ThreadMessage, "id">;
        return { id: d.id, ...raw };
      });

      setThreadMessages(data);
    });
  }, [activeThread]);

  /* ---------------- SEND NOTIFICATION ---------------- */

  const sendNotification = async () => {
    if (!message.trim()) return;

    setLoadingNotification(true);

    try {
      const user = getAuth().currentUser;
      if (!user) return alert("Not logged in");

      const token = await user.getIdToken();

      await fetch(`${API_URL}/admin/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      setMessage("");
    } catch {
      alert("Failed to send notification");
    } finally {
      setLoadingNotification(false);
    }
  };

  /* ---------------- SEND REPLY ---------------- */

  const sendReply = async () => {
    if (!replyText.trim() || !activeThread) return;

    setLoadingReply(true);

    try {
      const user = getAuth().currentUser;
      if (!user) return alert("Not logged in");

      const token = await user.getIdToken();

      await fetch(`${API_URL}/admin/reply-support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: activeThread.id,
          message: replyText,
        }),
      });

      await updateDoc(doc(db, "supportThreads", activeThread.id), {
        lastMessage: replyText,
        lastUpdated: serverTimestamp(),
        status: "open",
      });

      setReplyText("");
    } catch {
      alert("Reply failed");
    } finally {
      setLoadingReply(false);
    }
  };

  /* ---------------- DELETE ---------------- */

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, "alerts", id));
  };

  /* ---------------- UPDATE NOTIFICATION ---------------- */

  const updateNotification = async () => {
    if (!selectedId || !editMessage.trim()) return;

    try {
      await updateDoc(doc(db, "alerts", selectedId), {
        message: editMessage,
      });

      setEditOpen(false);
      setSelectedId("");
      setEditMessage("");
    } catch {
      alert("Failed to update notification");
    }
  };

  const isNotifications = activeTab === "notifications";

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
        {isNotifications ? "Notifications" : "Support Inbox"}
      </h1>

      {/* TOGGLE */}
      <div style={styles.toggleWrap}>
        <button
          style={{
            ...styles.toggleBtn,
            ...(isNotifications ? styles.toggleActive : {}),
          }}
          onClick={() => setActiveTab("notifications")}
        >
          Notifications
        </button>

        <button
          style={{
            ...styles.toggleBtn,
            ...(!isNotifications ? styles.toggleActive : {}),
          }}
          onClick={() => setActiveTab("support")}
        >
          Support
        </button>
      </div>

      {/* SEND NOTIFICATION */}
      {isNotifications && (
        <div style={styles.sendBox}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={styles.input}
            placeholder="Write notification..."
          />

          <button
            onClick={sendNotification}
            style={styles.sendBtn}
            disabled={loadingNotification}
          >
            {loadingNotification ? "Sending..." : "Send"}
          </button>
        </div>
      )}

      {/* LIST */}
      <div>
        {isNotifications
          ? notifications.map((item) => (
              <div key={item.id} style={styles.card}>
                <p style={styles.msg}>{item.message}</p>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => {
                      setSelectedId(item.id);
                      setEditMessage(item.message || "");
                      setEditOpen(true);
                    }}
                  >
                    Edit
                  </button>

                  <button onClick={() => deleteNotification(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          : supportThreads.map((item) => (
              <div key={item.id} style={styles.card}>
                <p style={styles.msg}>{item.lastMessage}</p>

                <button onClick={() => setActiveThread(item)}>
                  Reply
                </button>
              </div>
            ))}
      </div>

      {/* REPLY MODAL */}
      {activeThread && (
        <div style={styles.modal}>
          <h3>
            Reply to {activeThread.username || activeThread.userEmail}
          </h3>

          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {threadMessages.map((m) => (
              <p key={m.id}>
                {m.sender === "admin"
                  ? `You: ${m.text}`
                  : `User: ${m.text}`}
              </p>
            ))}
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={styles.input}
          />

          <button onClick={sendReply} disabled={loadingReply}>
            {loadingReply ? "Sending..." : "Send Reply"}
          </button>

          <button onClick={() => setActiveThread(null)}>
            Close
          </button>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && (
        <div style={styles.modal}>
          <h3 style={{ color: "#fff" }}>Edit Notification</h3>

          <textarea
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            style={styles.input}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={updateNotification} style={styles.sendBtn}>
              Save
            </button>

            <button
              onClick={() => {
                setEditOpen(false);
                setSelectedId("");
                setEditMessage("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 20, background: "#0d0d0f", minHeight: "100vh" },
  header: { color: "#fff", fontSize: 24, fontWeight: 700 },

  toggleWrap: { display: "flex", gap: 10, margin: "15px 0" },
  toggleBtn: {
    flex: 1,
    padding: 10,
    background: "#1b1b20",
    color: "#888",
    border: "none",
  },
  toggleActive: { background: "#4e2cff", color: "#fff" },

  sendBox: {
    background: "#1b1b20",
    padding: 15,
    borderRadius: 10,
  },

  input: {
    width: "100%",
    minHeight: 80,
    background: "#131317",
    color: "#fff",
    marginBottom: 10,
  },

  sendBtn: {
    background: "#4e2cff",
    color: "#fff",
    padding: 10,
    border: "none",
  },

  card: {
    background: "#1a1a1f",
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
  },

  msg: { color: "#fff" },

  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },

  modal: {
    position: "fixed",
    top: 50,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1e1e24",
    padding: 20,
    width: 400,
  },
};