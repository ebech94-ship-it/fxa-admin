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
  updateDoc, addDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebaseConfig";
import Image from "next/image";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ---------------- TYPES ---------------- */

type Notification = {
  id: string;
  message?: string;
  imageUrl?: string;
  status?: "draft" | "published";
  scheduledAt?: unknown;
  createdAt?: unknown;
};
type SupportThread = {
  id: string;
  lastMessage?: string;
  username?: string;
  userEmail?: string;
  phone?: string;
  publicId?: string;
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


  /* ---------------- EDIT STATE ---------------- */
  const [editOpen, setEditOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");


 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
const [scheduleDate, setScheduleDate] = useState("");

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

 const sendNotification = async (saveDraft = false) => {
  if (!message.trim()) return;

  setLoadingNotification(true);

  try {
    console.log("1️⃣ Send button clicked");

    const imageUrl = await uploadImage();
    console.log("2️⃣ Image uploaded successfully:", imageUrl);

    await addDoc(collection(db, "alerts"), {
      type: "admin",
      title: "📢 Admin Announcement",
      message,
      imageUrl,
      status: saveDraft ? "draft" : "published",
      scheduledAt: scheduleDate ? new Date(scheduleDate) : null,
      createdAt: serverTimestamp(),
    });

    console.log("3️⃣ Alert document saved to Firestore");

    setMessage("");
    setScheduleDate("");
    setImageFile(null);
    setImagePreview("");

    console.log("4️⃣ Form reset complete");
  } catch (error) {
    console.error("❌ sendNotification error:", error);
  } finally {
    console.log("5️⃣ Loading finished");
    setLoadingNotification(false);
  }
};
  /* ---------------- SEND REPLY ---------------- */

  const sendReply = async () => {
    if (!replyText.trim() || !activeThread) return;

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
        lastUpdated: new Date().toISOString(),
        status: "open",
      });

      setReplyText("");
    } catch {
      alert("Reply failed");
    } finally {
    
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
const publishNotification = async (id:string) => {

  try {

    await updateDoc(doc(db,"alerts",id),{
      status:"published",
      publishedAt: serverTimestamp(),
    });

  } catch {
    alert("Failed to publish");
  }

};
  const isNotifications = activeTab === "notifications";

  const uploadImage = async () => {
  if (!imageFile) return "";

  const storage = getStorage();

  const imageRef = ref(
    storage,
    `adminAlerts/${Date.now()}-${imageFile.name}`
  );

  await uploadBytes(imageRef, imageFile);

  return await getDownloadURL(imageRef);
};
const handleImageSelect = (file: File) => {
  setImageFile(file);
  setImagePreview(URL.createObjectURL(file));
};

  return (
  <div style={styles.container}>

    <h1 style={styles.header}>
      {isNotifications ? "📢 Global Notifications" : "💬 Support Inbox"}
    </h1>


    {/* TAB SWITCH */}
    <div style={styles.toggleWrap}>

      <button
        style={{
          ...styles.toggleBtn,
          ...(isNotifications ? styles.toggleActive : {})
        }}
        onClick={() => setActiveTab("notifications")}
      >
        Notifications
      </button>


      <button
        style={{
          ...styles.toggleBtn,
          ...(!isNotifications ? styles.toggleActive : {})
        }}
        onClick={() => setActiveTab("support")}
      >
        Support
      </button>

    </div>



    {/* NOTIFICATION CREATOR */}
    {isNotifications && (

      <div style={styles.creator}>

        <textarea
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          placeholder="Write announcement to all users..."
          style={styles.messageBox}
        />


        <div style={styles.toolsRow}>

          <label style={styles.attachBtn}>
            📎 Attach

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e)=>
                e.target.files &&
                handleImageSelect(e.target.files[0])
              }
            />

          </label>


          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e)=>setScheduleDate(e.target.value)}
            style={styles.dateInput}
          />

        </div>



        {imagePreview && (

          <div style={styles.previewBox}>
          
{/* eslint-disable-next-line @next/next/no-img-element */}
        <img
  src={imagePreview}
  alt="preview"
  style={styles.preview}
/>
          </div>

        )}



        <div style={styles.actionRow}>


          <button
            onClick={()=>sendNotification(true)}
            style={styles.draftBtn}
          >
            💾 Save Draft
          </button>



          <button
            onClick={()=>sendNotification(false)}
            disabled={loadingNotification}
            style={styles.sendBtn}
          >
            {loadingNotification
            ?"Sending..."
            :"🚀 Send Global"}

          </button>


        </div>


      </div>

    )}





    {/* NOTIFICATION LIST */}

    {isNotifications && (

      <div>

      {notifications.map((item)=>(

        <div key={item.id} style={styles.card}>


          <div style={styles.status}>
            {item.status === "draft"
            ?"🟡 Draft"
            :"🟢 Published"}
          </div>


         {item.imageUrl && (

  <Image
    src={item.imageUrl}
    alt="announcement"
    width={600}
    height={400}
    style={styles.cardImage}
  />

)}


<p style={styles.msg}>
  {item.message}
</p>



        <div style={styles.cardActions}>

<button
onClick={()=>{
 setSelectedId(item.id);
 setEditMessage(item.message || "");
 setEditOpen(true);
}}
>
✏️ Edit
</button>


{item.status === "draft" && (

<button
onClick={()=>publishNotification(item.id)}
>
🚀 Send Now
</button>

)}


<button
onClick={()=>deleteNotification(item.id)}
>
🗑 Delete
</button>

</div>


        </div>


      ))}

      </div>

    )}
{/* SUPPORT INBOX */}

{!isNotifications && (

<div style={styles.supportList}>

{supportThreads.map((item)=>(

<div key={item.id} style={styles.supportCard}>


<div style={styles.userRow}>

<div style={styles.avatar}>
{(item.username || "U")[0].toUpperCase()}
</div>


<div>

<h3 style={styles.userName}>
{item.username || "Unknown User"}
</h3>

<p style={styles.email}>
📧 {item.userEmail || "No email"}
</p>

<p style={styles.email}>
📱 {item.phone || "No phone"}
</p>

<p style={styles.email}>
🆔 {item.publicId || "No FXA ID"}
</p>
</div>

</div>



<div style={styles.lastMessage}>
{item.lastMessage || "No messages yet"}
</div>



<div style={styles.supportFooter}>


<span style={styles.openBadge}>
🟢 Open
</span>



<button
style={styles.replyBtn}
onClick={()=>setActiveThread(item)}
>
💬 Open Chat
</button>


</div>


</div>


))}



      </div>

    )}
{/* CHAT WINDOW */}

{activeThread && (

<div style={styles.chatModal}>


<div style={styles.chatHeader}>

<div>

<h3>
{activeThread.username || activeThread.userEmail}
</h3>

<p style={{color:"#aaa", fontSize:13}}>
  🆔 {activeThread.publicId || "No FXA ID"}
  <br/>
  📱 {activeThread.phone || "No phone"}
  <br/>
  📧 {activeThread.userEmail || "No email"}
</p>

</div>


<button
style={styles.closeBtn}
onClick={()=>setActiveThread(null)}
>
✕
</button>


</div>





<div style={styles.chatMessages}>


{threadMessages.map((m)=>(


<div
key={m.id}
style={{
...styles.messageBubble,
...(m.sender==="admin"
?styles.adminBubble
:styles.userBubble)
}}
>


{m.text}


</div>


))}


</div>






<div style={styles.replyBox}>


<textarea
value={replyText}
onChange={(e)=>setReplyText(e.target.value)}
placeholder="Type your reply..."
style={styles.replyInput}
/>



<button
onClick={sendReply}
style={styles.sendReplyBtn}
>
➤
</button>


</div>



</div>


)}







    {/* EDIT MODAL */}
{editOpen && (

<div style={styles.modalOverlay}>

<div style={styles.modal}>

        <h3>
          Edit Notification
        </h3>


        <textarea
          value={editMessage}
          onChange={(e)=>setEditMessage(e.target.value)}
          style={styles.input}
        />



        <button
          onClick={updateNotification}
          style={styles.sendBtn}
        >
          Save
        </button>


        <button
          onClick={()=>{
            setEditOpen(false);
            setSelectedId("");
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

container:{
 padding:20,
 background:"#08090c",
 minHeight:"100vh",
},

header:{
 color:"#fff",
 fontSize:26,
 fontWeight:"800",
},


toggleWrap:{
 display:"flex",
 gap:10,
 margin:"20px 0",
},


toggleBtn:{
 flex:1,
 padding:14,
 borderRadius:12,
 border:"none",
 background:"#181b22",
 color:"#aaa",
 fontSize:16,
},


toggleActive:{
 background:"#5b3cff",
 color:"#fff",
},


creator:{
 background:"#11141b",
 padding:18,
 borderRadius:18,
 boxShadow:"0 10px 30px #000",
},


messageBox:{
 width:"100%",
 minHeight:160,
 background:"#090b10",
 color:"#fff",
 borderRadius:15,
 padding:15,
 fontSize:17,
 resize:"none",
},


toolsRow:{
 display:"flex",
 gap:10,
 marginTop:12,
},


attachBtn:{
 background:"#222",
 color:"#fff",
 padding:"12px 18px",
 borderRadius:20,
 cursor:"pointer",
},


dateInput:{
 flex:1,
 background:"#222",
 color:"#fff",
 borderRadius:10,
 padding:10,
},


preview:{
 width:"100%",
 maxHeight:300,
 objectFit:"cover",
 borderRadius:15,
 marginTop:15,
},


actionRow:{
 display:"flex",
 gap:10,
 marginTop:15,
},


sendBtn:{
 flex:1,
 background:"#5b3cff",
 color:"#fff",
 padding:14,
 borderRadius:12,
 border:"none",
 fontWeight:"700",
},


draftBtn:{
 flex:1,
 background:"#ffb020",
 color:"#000",
 padding:14,
 borderRadius:12,
 border:"none",
 fontWeight:"700",
},


card:{
 background:"#151922",
 padding:14,
 borderRadius:15,
 marginTop:15,
},


status:{
 color:"#aaa",
 marginBottom:10,
},


msg:{
 color:"#fff",
 fontSize:16,
 marginTop:10,
 display:"-webkit-box",
 WebkitLineClamp:3,
 WebkitBoxOrient:"vertical",
 overflow:"hidden",
},


cardImage:{
 width:"100%",
 height:300,
 borderRadius:15,
 marginTop:10,
 objectFit:"cover",
 display:"block",
},


cardActions:{
 display:"flex",
 justifyContent:"flex-end",
 gap:10,
 marginTop:15,
},


input:{
 width:"100%",
 minHeight:90,
 background:"#090b10",
 color:"#fff",
},


modal:{
  position:"fixed",
  top:"50%",
  left:"50%",
  transform:"translate(-50%, -50%)",
  width:"calc(100% - 32px)",
  maxWidth:450,
  maxHeight:"85vh",
  overflowY:"auto",
  background:"#151922",
  padding:20,
  borderRadius:20,
  zIndex:2000,
  boxSizing:"border-box",
},


chatBox:{
 maxHeight:250,
 overflowY:"auto",
},
supportList:{
 display:"flex",
 flexDirection:"column",
 gap:15,
},


supportCard:{
 background:"#131722",
 padding:18,
 borderRadius:18,
 border:"1px solid #222",
},


userRow:{
 display:"flex",
 alignItems:"center",
 gap:12,
},


avatar:{
 width:45,
 height:45,
 borderRadius:"50%",
 background:"#5b3cff",
 color:"#fff",
 display:"flex",
 alignItems:"center",
 justifyContent:"center",
 fontWeight:"bold",
},


userName:{
 color:"#fff",
 margin:0,
},


email:{
 color:"#888",
 margin:0,
 fontSize:13,
},


lastMessage:{
 marginTop:15,
 background:"#090b10",
 padding:12,
 borderRadius:12,
 color:"#ddd",
},


supportFooter:{
 display:"flex",
 justifyContent:"space-between",
 alignItems:"center",
 marginTop:15,
},


openBadge:{
 background:"#123b22",
 color:"#5dff91",
 padding:"5px 12px",
 borderRadius:20,
},


replyBtn:{
 background:"#5b3cff",
 color:"#fff",
 border:"none",
 padding:"10px 16px",
 borderRadius:12,
},


chatModal:{
 position:"fixed",
 top:"50%",
 left:"50%",
 transform:"translate(-50%, -50%)",
 width:"calc(100% - 20px)",
 maxWidth:500,
 height:"85vh",
 background:"#0c0f16",
 borderRadius:22,
 display:"flex",
 flexDirection:"column",
 zIndex:3000,
 overflow:"hidden",
},


chatHeader:{
 padding:18,
 background:"#151922",
 color:"#fff",
 display:"flex",
 justifyContent:"space-between",
},


closeBtn:{
 background:"#222",
 color:"#fff",
 border:"none",
 borderRadius:20,
 width:35,
 height:35,
},


chatMessages:{
 flex:1,
 padding:15,
 overflowY:"auto",
},


messageBubble:{
 maxWidth:"75%",
 padding:12,
 marginBottom:12,
 borderRadius:15,
 color:"#fff",
},


userBubble:{
 background:"#222831",
 alignSelf:"flex-start",
},


adminBubble:{
 background:"#5b3cff",
 marginLeft:"auto",
},


replyBox:{
 display:"flex",
 padding:12,
 background:"#151922",
 gap:10,
},


replyInput:{
 flex:1,
 height:50,
 resize:"none",
 background:"#090b10",
 color:"#fff",
 borderRadius:15,
 padding:12,
},


sendReplyBtn:{
 width:55,
 borderRadius:15,
 background:"#5b3cff",
 color:"#fff",
 border:"none",
 fontSize:22,
},
};