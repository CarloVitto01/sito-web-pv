package it.pv.payments.repository;

import it.pv.payments.domain.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UploadSessionRepository extends JpaRepository<UploadSession, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select s from UploadSession s where s.id = :id")
    java.util.Optional<UploadSession> findLockedById(@org.springframework.data.repository.query.Param("id") String id);
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(s.totalSize), 0) from UploadSession s where s.userId = :userId and s.createdAt >= :since")
    long bytesUploadedSince(@org.springframework.data.repository.query.Param("userId") String userId,
                           @org.springframework.data.repository.query.Param("since") java.time.Instant since);
    @org.springframework.data.jpa.repository.Query("select s.id from UploadSession s where s.completed = :completed and s.createdAt < :cutoff")
    java.util.List<String> findCleanupIds(@org.springframework.data.repository.query.Param("completed") boolean completed,
                                        @org.springframework.data.repository.query.Param("cutoff") java.time.Instant cutoff);
    long countByUserIdAndCreatedAtGreaterThanEqual(String userId, java.time.Instant since);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<UploadSession> findByFinalStoragePathAndUserIdAndCompletedTrue(String path, String userId);

}
