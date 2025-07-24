import React, { useEffect, useState } from "react";
import { db, storage } from "../backend/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import styles from "./FotoVideoGestionale.module.css";
import Header from "../components/HeaderComponents/Header";

const FotoVideoGestionale: React.FC = () => {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "mediaFotoVideo"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMediaList(docs);
    });
    return () => unsub();
  }, []);

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isVideo = ["mp4", "mov", "webm"].includes(ext || "");
      const path = `fotoVideo/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "mediaFotoVideo"), {
        type: isVideo ? "video" : "image",
        url,
        path,
        createdAt: serverTimestamp(),
      });
    }

    setFiles([]);
    setUploading(false);
  };

  const handleDelete = async (id: string, path: string) => {
    await deleteDoc(doc(db, "mediaFotoVideo", id));
    await deleteObject(ref(storage, path));
  };

  const removeFile = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
  };

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>🎬 Gestionale Foto & Video</h2>

        <div className={styles.uploadSection}>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <button onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? "Caricamento..." : "📤 Carica"}
          </button>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: 15, width: "100%" }}>
            <p style={{ color: "var(--color-gold)", marginBottom: 8, fontWeight: "bold" }}>
              File selezionati:
            </p>
            <ul style={{ listStyle: "none", padding: 0, color: "white", fontSize: "0.95rem" }}>
              {files.map((file, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  📎 {file.name}
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      background: "transparent",
                      color: "crimson",
                      border: "none",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.mediaGrid}>
          {mediaList.map((item) =>
            item.type === "image" ? (
              <div key={item.id} className={styles.card}>
                <img src={item.url} alt="foto" />
                <button onClick={() => handleDelete(item.id, item.path)}>🗑️ Elimina</button>
              </div>
            ) : (
              <div key={item.id} className={styles.card}>
                <video src={item.url} autoPlay loop muted playsInline />
                <button onClick={() => handleDelete(item.id, item.path)}>🗑️ Elimina</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default FotoVideoGestionale;
