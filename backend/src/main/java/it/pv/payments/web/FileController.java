package it.pv.payments.web;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import it.pv.payments.domain.OrderFile;
import it.pv.payments.repository.OrderFileRepository;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.security.AuthenticatedUser;
import it.pv.payments.security.CurrentUser;
import it.pv.payments.security.JwtService;
import it.pv.payments.service.FileStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.util.Map;

/**
 * Upload dei PDF a chunk: un file grande viene spezzato lato client in blocchi (es. 5MB) inviati uno alla
 * volta, cosi' un errore di rete richiede di ripetere solo il singolo blocco e non l'intero file.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;
    private final OrderFileRepository orderFileRepository;
    private final JwtService jwtService;
    private final AccessGuard accessGuard;

    public FileController(FileStorageService fileStorageService, OrderFileRepository orderFileRepository,
                           JwtService jwtService, AccessGuard accessGuard) {
        this.fileStorageService = fileStorageService;
        this.orderFileRepository = orderFileRepository;
        this.jwtService = jwtService;
        this.accessGuard = accessGuard;
    }

    public record InitUploadRequest(String originalFileName, long totalSize, int chunkSize) {}

    @PostMapping("/upload/init")
    public Map<String, Object> init(@RequestBody InitUploadRequest req) {
        var session = fileStorageService.initUpload(CurrentUser.get().userId(), req.originalFileName(), req.totalSize(), req.chunkSize());
        return Map.of("sessionId", session.getId(), "totalChunks", session.getTotalChunks());
    }

    @PutMapping("/upload/{sessionId}/chunk/{index}")
    public void uploadChunk(@PathVariable String sessionId, @PathVariable int index,
                             jakarta.servlet.http.HttpServletRequest request) throws IOException {
        fileStorageService.saveChunk(sessionId, CurrentUser.get().userId(), index, request.getInputStream());
    }

    @PostMapping("/upload/{sessionId}/complete")
    public Map<String, String> complete(@PathVariable String sessionId) {
        String userLabel = CurrentUser.get().userId();
        String path = fileStorageService.completeUpload(sessionId, userLabel);
        return Map.of("storagePath", path);
    }

    /**
     * Download di un file ordine. Due modi di autorizzarsi:
     * - "token" nella query string: link scoped-a-un-solo-file generato per i messaggi Telegram (che vengono
     *   aperti da un browser senza header Authorization, quindi un JWT normale non basterebbe).
     * - Authorization Bearer (utente loggato): consentito solo se e' il proprietario dell'ordine oppure ha
     *   accesso alla pagina gestionale del formato dell'ordine (o allo storico).
     */
    @GetMapping("/download/{orderFileId}")
    @Transactional(readOnly = true)
    public ResponseEntity<FileSystemResource> download(@PathVariable Long orderFileId,
                                                         @RequestParam(required = false) String token) {
        OrderFile file = orderFileRepository.findById(orderFileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File non trovato"));

        if (!isAuthorizedByToken(orderFileId, token)) {
            requireOwnerOrGestionaleAccess(file);
        }

        var path = fileStorageService.resolve(file.getStoragePath());
        var resource = new FileSystemResource(path);
        if (!resource.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File non trovato su disco");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition.attachment().filename(file.getOriginalFileName(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .body(resource);
    }

    private boolean isAuthorizedByToken(Long orderFileId, String token) {
        if (token == null || token.isBlank()) return false;
        try {
            Claims claims = jwtService.parse(token);
            return "file-download".equals(claims.get("type", String.class))
                    && String.valueOf(orderFileId).equals(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private void requireOwnerOrGestionaleAccess(OrderFile file) {
        AuthenticatedUser user = CurrentUser.getOrNull();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Serve un login o un link valido");
        }
        var order = file.getOrder();
        boolean isOwner = order.getUser() != null && order.getUser().getId().equals(user.userId());
        if (isOwner) return;

        String gestionalePage = "A4".equalsIgnoreCase(order.getTipo()) ? "gestionaleA4" : "gestionaleA3";
        boolean isAdmin = accessGuard.hasPageAccess(user, gestionalePage) || accessGuard.hasPageAccess(user, "storicoDati");
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Non hai accesso a questo file");
        }
    }
}
