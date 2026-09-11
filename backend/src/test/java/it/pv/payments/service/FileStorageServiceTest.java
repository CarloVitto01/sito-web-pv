package it.pv.payments.service;

import it.pv.payments.domain.UploadSession;
import it.pv.payments.repository.*;
import java.io.ByteArrayInputStream;
import java.nio.file.*;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FileStorageServiceTest {
    @TempDir Path dir;
    UploadSessionRepository sessions;
    FileStorageService storage;
    UploadSession session;
    @BeforeEach void setup() throws Exception {
        sessions = mock(UploadSessionRepository.class);
        storage = new FileStorageService(dir.resolve("files").toString(), dir.resolve("tmp").toString(), sessions, mock(OrderFileRepository.class), mock(UserRepository.class), mock(PdfPageCounter.class));
        session = new UploadSession(); session.setId("session"); session.setUserId("owner");
        session.setCreatedAt(Instant.now()); session.setTempDir("session");
        session.setTotalSize(4L); session.setChunkSize(4); session.setTotalChunks(1);
        Files.createDirectories(dir.resolve("tmp/session"));
        when(sessions.findLockedById("session")).thenReturn(Optional.of(session));
    }
    @Test void rejectsOtherUsersAndInvalidIndexes() {
        assertThrows(ResponseStatusException.class, () -> storage.saveChunk("session", "other", 0, new ByteArrayInputStream(new byte[4])));
        assertThrows(ResponseStatusException.class, () -> storage.saveChunk("session", "owner", -1, new ByteArrayInputStream(new byte[4])));
        assertTrue(session.getReceivedChunks().isEmpty());
    }
    @Test void rejectsOversizedChunkWithoutRecordingOrRetainingIt() throws Exception {
        assertThrows(ResponseStatusException.class, () -> storage.saveChunk("session", "owner", 0, new ByteArrayInputStream(new byte[5])));
        assertTrue(session.getReceivedChunks().isEmpty());
        try (var files = Files.list(dir.resolve("tmp/session"))) { assertEquals(0, files.count()); }
    }
    @Test void retryReplacesOneChunkWithoutCountingItTwice() throws Exception {
        storage.saveChunk("session", "owner", 0, new ByteArrayInputStream(new byte[]{1,2,3,4}));
        storage.saveChunk("session", "owner", 0, new ByteArrayInputStream(new byte[]{4,3,2,1}));
        assertEquals(1, session.getReceivedChunks().size());
        assertArrayEquals(new byte[]{4,3,2,1}, Files.readAllBytes(dir.resolve("tmp/session/chunk_0")));
    }
    @Test void completionRetryReturnsTheSameFile() {
        session.setCompleted(true); session.setFinalStoragePath("PDF/owner/file.pdf");
        assertEquals("PDF/owner/file.pdf", storage.completeUpload("session", "owner"));
    }
    @Test void rejectsInvalidDimensionsAndTraversal() {
        assertThrows(ResponseStatusException.class, () -> storage.initUpload("owner", "f.pdf", 10, 0));
        assertThrows(ResponseStatusException.class, () -> storage.initUpload("owner", "f.pdf", 301L*1024*1024, 1024));
        assertThrows(ResponseStatusException.class, () -> storage.resolve("../secret"));
    }
    @Test void cannotAttachAnotherUsersFile() {
        when(sessions.findByFinalStoragePathAndUserIdAndCompletedTrue("PDF/other/file.pdf", "owner")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> storage.requireOwnedFile("PDF/other/file.pdf", "owner"));
    }
}
