package it.pv.payments.service;

import it.pv.payments.domain.UploadSession;
import it.pv.payments.repository.OrderFileRepository;
import it.pv.payments.repository.UploadSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Gestisce l'upload dei PDF a chunk (cosi' un file grande non deve passare in un'unica richiesta HTTP,
 * che su reti lente/instabili falliva spesso con Firebase Storage) e la scrittura finale su disco.
 *
 * In locale "storage.base-dir" punta a una cartella del progetto; in produzione va puntato al mount
 * del NAS (es. /mnt/nas/pv-stampe) tramite la property/env var STORAGE_BASE_DIR.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final Path baseDir;
    private final Path tempDir;
    private final UploadSessionRepository uploadSessionRepository;
    private final OrderFileRepository orderFileRepository;
    private final it.pv.payments.repository.UserRepository users;
    private final PdfPageCounter pdfPageCounter;

    public FileStorageService(
            @Value("${app.storage.base-dir}") String baseDir,
            @Value("${app.storage.temp-dir}") String tempDir,
            UploadSessionRepository uploadSessionRepository,
            OrderFileRepository orderFileRepository,
            it.pv.payments.repository.UserRepository users,
            PdfPageCounter pdfPageCounter
    ) throws IOException {
        this.baseDir = Path.of(baseDir).toAbsolutePath().normalize();
        this.tempDir = Path.of(tempDir).toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
        Files.createDirectories(this.tempDir);
        this.uploadSessionRepository = uploadSessionRepository;
        this.orderFileRepository = orderFileRepository;
        this.users = users;
        this.pdfPageCounter = pdfPageCounter;
    }

    @org.springframework.transaction.annotation.Transactional
    public UploadSession initUpload(String userId, String originalFileName, long totalSize, int chunkSize) {
        if (originalFileName == null || originalFileName.length() > 200
                || !originalFileName.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")
                || totalSize <= 0 || totalSize > 1024L * 1024 * 1024
                || chunkSize <= 0 || chunkSize > 80 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF o dimensioni upload non validi (massimo 1 GB)");
        }
        users.findLockedById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        // Nessuna quota di volume giornaliera: solo un tetto anti-abuso sul numero di sessioni create
        // in 24h (non sui MB caricati), per evitare che uno script spammi init-upload senza limiti.
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);
        if (uploadSessionRepository.countByUserIdAndCreatedAtGreaterThanEqual(userId, since) >= 1000) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Limite upload giornaliero raggiunto");
        }
        try {
            int totalChunks = (int) ((totalSize + chunkSize - 1) / chunkSize);
            UploadSession session = new UploadSession();
            session.setUserId(userId);
            session.setOriginalFileName(sanitize(originalFileName));
            session.setTotalSize(totalSize);
            session.setTotalChunks(totalChunks);
            session.setChunkSize(chunkSize);
            String dir = UUID.randomUUID().toString();
            Path sessionDir = tempDir.resolve(dir);
            Files.createDirectories(sessionDir);
            session.setTempDir(dir);
            return uploadSessionRepository.save(session);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossibile inizializzare l'upload", e);
        }
    }

    public UploadSession getSession(String sessionId) {
        return uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione di upload non trovata"));
    }

    private UploadSession ownedSession(String sessionId, String userId) {
        UploadSession session = uploadSessionRepository.findLockedById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione non trovata"));
        if (!session.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sessione non accessibile");
        }
        if (session.getCreatedAt().isBefore(Instant.now().minus(24, ChronoUnit.HOURS))) {
            throw new ResponseStatusException(HttpStatus.GONE, "Sessione scaduta");
        }
        return session;
    }

    @org.springframework.transaction.annotation.Transactional
    public void saveChunk(String sessionId, String userId, int chunkIndex, InputStream data) {
        UploadSession session = ownedSession(sessionId, userId);
        if (session.isCompleted() || chunkIndex < 0 || chunkIndex >= session.getTotalChunks()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blocco non valido o upload gia' completato");
        }
        long expected = Math.min(session.getChunkSize(), session.getTotalSize() - (long) chunkIndex * session.getChunkSize());
        Path temporary = null;
        try {
            Path directory = tempDir.resolve(session.getTempDir());
            temporary = Files.createTempFile(directory, "receiving-", ".tmp");
            long received = 0;
            try (OutputStream out = Files.newOutputStream(temporary)) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = data.read(buffer, 0, (int) Math.min(buffer.length, expected - received + 1))) != -1) {
                    received += count;
                    if (received > expected) {
                        throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Blocco troppo grande");
                    }
                    out.write(buffer, 0, count);
                }
            }
            if (received != expected) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dimensione blocco errata");
            }
            Files.move(temporary, directory.resolve("chunk_" + chunkIndex), StandardCopyOption.REPLACE_EXISTING);
            session.getReceivedChunks().add(chunkIndex);
            uploadSessionRepository.save(session);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossibile salvare il blocco", e);
        } finally {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
        }
    }

    /** Idempotente: un retry della risposta persa restituisce lo stesso file. */
    @org.springframework.transaction.annotation.Transactional
    public String completeUpload(String sessionId, String userId) {
        UploadSession session = ownedSession(sessionId, userId);
        if (session.isCompleted()) return session.getFinalStoragePath();
        if (session.getReceivedChunks().size() != session.getTotalChunks()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload incompleto");
        }
        Path finalFile = null;
        try {
            // Deterministico: un retry dopo rollback sostituisce lo stesso file.
            String relativePath = "PDF/" + sanitize(userId) + "/" + session.getId() + "_" + session.getOriginalFileName();
            finalFile = resolve(relativePath);
            Files.createDirectories(finalFile.getParent());
            Path sessionDir = tempDir.resolve(session.getTempDir());
            try (OutputStream out = Files.newOutputStream(finalFile)) {
                for (int i = 0; i < session.getTotalChunks(); i++) {
                    Files.copy(sessionDir.resolve("chunk_" + i), out);
                }
            }
            if (Files.size(finalFile) != session.getTotalSize()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dimensione PDF errata");
            }
            // Unica lettura completa del PDF con PDFBox: il conteggio pagine viene salvato qui e riusato
            // alla creazione dell'ordine (OrderService), cosi' un file grande non va riparsato una seconda volta.
            session.setPageCount(pdfPageCounter.countPages(finalFile));
            session.setCompleted(true);
            session.setFinalStoragePath(relativePath);
            uploadSessionRepository.save(session);
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCommit() { deleteRecursively(sessionDir); }
                    @Override public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) delete(relativePath);
                    }
                });
            return relativePath;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossibile completare l'upload", e);
        } finally {
            if (!session.isCompleted() && finalFile != null) {
                try { Files.deleteIfExists(finalFile); } catch (IOException ignored) { }
            }
        }
    }

    public UploadSession requireOwnedFile(String storagePath, String userId) {
        if (storagePath == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "File non accessibile o upload incompleto");
        }
        return uploadSessionRepository.findByFinalStoragePathAndUserIdAndCompletedTrue(storagePath, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "File non accessibile o upload incompleto"));
    }

    public Path resolve(String relativePath) {
        Path resolved = baseDir.resolve(relativePath).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percorso non valido");
        }
        return resolved;
    }

    public void delete(String relativePath) {
        try {
            Files.deleteIfExists(resolve(relativePath));
        } catch (IOException ignored) {
            // file gia' assente o non cancellabile: non e' un errore bloccante per l'operazione richiesta
        }
    }

    /**
     * Rimuove le sessioni di upload abbandonate (scadute da piu' di 24h) e i relativi chunk temporanei.
     * Senza questa pulizia periodica, un upload di un PDF di grosse dimensioni interrotto a meta'
     * (connessione caduta, tab chiusa) lascia per sempre i chunk gia' caricati sul disco/NAS.
     */
    @Scheduled(initialDelay = 5 * 60_000L, fixedRate = 6 * 60 * 60_000L)
    @org.springframework.transaction.annotation.Transactional
    public void purgeStaleSessions() {
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        var stale = uploadSessionRepository.findCleanupIds(false, cutoff).stream()
                .map(id -> uploadSessionRepository.findLockedById(id).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(session -> !session.isCompleted())
                .toList();

        if (stale.isEmpty()) return;

        for (UploadSession s : stale) {
            deleteRecursively(tempDir.resolve(s.getTempDir()));
            uploadSessionRepository.delete(s);
        }
        log.info("Pulizia upload abbandonati: rimosse {} sessioni scadute", stale.size());
    }

    /**
     * Rimuove i PDF caricati con successo (chunk assemblati sullo storage definitivo) ma mai finiti in un
     * ordine: succede se l'upload va a buon fine ma la creazione dell'ordine fallisce subito dopo (rete,
     * errore server) - l'utente riprova e il file viene ricaricato da capo, lasciando il primo orfano.
     * Soglia piu' breve di quella per le sessioni incomplete: qui il file e' gia' arrivato per intero, quindi
     * se non e' referenziato da nessun ordine dopo 2h non lo sara' piu'.
     */
    @Scheduled(initialDelay = 6 * 60_000L, fixedRate = 6 * 60 * 60_000L)
    @org.springframework.transaction.annotation.Transactional
    public void purgeOrphanedUploads() {
        Instant cutoff = Instant.now().minus(2, ChronoUnit.HOURS);
        var orphaned = uploadSessionRepository.findCleanupIds(true, cutoff).stream()
                .map(id -> uploadSessionRepository.findLockedById(id).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(session -> session.getFinalStoragePath() != null)
                .filter(session -> !orderFileRepository.existsByStoragePath(session.getFinalStoragePath()))
                .toList();

        if (orphaned.isEmpty()) return;

        for (UploadSession s : orphaned) {
            delete(s.getFinalStoragePath());
            uploadSessionRepository.delete(s);
        }
        log.info("Pulizia upload orfani: rimossi {} file mai collegati a un ordine", orphaned.size());
    }

    private void deleteRecursively(Path dir) {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted((a, b) -> b.compareTo(a)).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (IOException ignored) { }
            });
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    private String sanitize(String input) {
        if (input == null) return "file";
        String s = input.replaceAll("[^a-zA-Z0-9._-]", "_");
        return s.isBlank() ? "file" : s;
    }
}
