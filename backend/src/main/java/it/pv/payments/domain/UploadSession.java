package it.pv.payments.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Traccia una sessione di upload a chunk di un singolo file PDF, cosi' un file
 * di grosse dimensioni puo' essere caricato a pezzi con retry sul singolo chunk
 * invece che in un'unica richiesta che puo' fallire per intero.
 */
@Entity
@Table(name = "upload_sessions")
public class UploadSession {
    @Id
    private String id;

    private String userId;
    private String originalFileName;
    private Long totalSize;
    private Integer totalChunks;
    private Integer chunkSize;

    @ElementCollection
    @CollectionTable(name = "upload_session_chunks", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "chunk_index")
    private Set<Integer> receivedChunks = new HashSet<>();

    private String tempDir;
    private Instant createdAt;
    private boolean completed;
    private String finalStoragePath;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }
    public Long getTotalSize() { return totalSize; }
    public void setTotalSize(Long totalSize) { this.totalSize = totalSize; }
    public Integer getTotalChunks() { return totalChunks; }
    public void setTotalChunks(Integer totalChunks) { this.totalChunks = totalChunks; }
    public Integer getChunkSize() { return chunkSize; }
    public void setChunkSize(Integer chunkSize) { this.chunkSize = chunkSize; }
    public Set<Integer> getReceivedChunks() { return receivedChunks; }
    public void setReceivedChunks(Set<Integer> receivedChunks) { this.receivedChunks = receivedChunks; }
    public String getTempDir() { return tempDir; }
    public void setTempDir(String tempDir) { this.tempDir = tempDir; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public String getFinalStoragePath() { return finalStoragePath; }
    public void setFinalStoragePath(String finalStoragePath) { this.finalStoragePath = finalStoragePath; }
}
