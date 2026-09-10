package it.pv.payments.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Conta le pagine di un PDF leggendo solo i metadati del documento, senza renderizzarlo:
 * evita il carico che il vecchio flusso client-side (react-pdf) metteva sul browser per i PDF di grosse dimensioni,
 * ed e' anche l'unica fonte affidabile per calcolare il prezzo (il client non puo' piu' dichiarare un numero di pagine).
 */
@Service
public class PdfPageCounter {

    public int countPages(Path pdfFile) {
        try (PDDocument doc = Loader.loadPDF(pdfFile.toFile())) {
            return doc.getNumberOfPages();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Il file non e' un PDF valido: " + pdfFile.getFileName());
        }
    }
}
