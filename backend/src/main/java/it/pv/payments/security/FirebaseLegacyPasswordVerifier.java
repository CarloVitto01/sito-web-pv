package it.pv.payments.security;

import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Verifica una password in chiaro contro un hash generato da Firebase Auth ("modified scrypt", parametri
 * specifici del progetto), usata SOLO per il primo login degli utenti migrati da Firebase: se la verifica
 * riesce, AuthService converte subito la password in BCrypt e questi dati legacy non servono piu'.
 *
 * Algoritmo (uguale per tutti i progetti Firebase, i parametri numerici/chiavi sono invece specifici del
 * progetto e si ottengono da "firebase auth:export" / Firebase Console > Authentication > Password Hash Parameters):
 *   derivedKey = scrypt(password, salt || saltSeparator, N=2^memCost, r=rounds, p=1, dkLen=64)
 *   hash = AES-256-CTR_encrypt(key=derivedKey[0:32], iv=16 byte a zero, plaintext=signerKey)
 * e "hash" (base64) deve combaciare col passwordHash esportato per l'utente. L'IV e' fisso (non deriva
 * dalla scrypt key, a differenza di molte guide non ufficiali in giro) - verificato contro il vettore di
 * test pubblico di https://github.com/JaakkoL/firebase-scrypt-python.
 */
@Component
public class FirebaseLegacyPasswordVerifier {

    private final byte[] signerKey;
    private final byte[] saltSeparator;
    private final int rounds;
    private final int memCost;

    public FirebaseLegacyPasswordVerifier(
            @Value("${app.firebase-legacy.signer-key:}") String signerKeyBase64,
            @Value("${app.firebase-legacy.salt-separator:}") String saltSeparatorBase64,
            @Value("${app.firebase-legacy.rounds:8}") int rounds,
            @Value("${app.firebase-legacy.mem-cost:14}") int memCost
    ) {
        this.signerKey = signerKeyBase64.isBlank() ? new byte[0] : Base64.getDecoder().decode(signerKeyBase64);
        this.saltSeparator = saltSeparatorBase64.isBlank() ? new byte[0] : Base64.getDecoder().decode(saltSeparatorBase64);
        this.rounds = rounds;
        this.memCost = memCost;
    }

    public boolean isConfigured() {
        return signerKey.length > 0;
    }

    /**
     * @param password      password in chiaro inserita dall'utente al login
     * @param saltBase64    campo "salt" dell'utente nell'export di Firebase Auth
     * @param storedHashBase64 campo "passwordHash" dell'utente nell'export di Firebase Auth
     */
    public boolean verify(String password, String saltBase64, String storedHashBase64) {
        if (!isConfigured() || saltBase64 == null || storedHashBase64 == null) return false;
        try {
            byte[] salt = Base64.getDecoder().decode(saltBase64);
            byte[] storedHash = Base64.getDecoder().decode(storedHashBase64);

            byte[] combinedSalt = new byte[salt.length + saltSeparator.length];
            System.arraycopy(salt, 0, combinedSalt, 0, salt.length);
            System.arraycopy(saltSeparator, 0, combinedSalt, salt.length, saltSeparator.length);

            byte[] derivedKey = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), combinedSalt,
                    1 << memCost, rounds, 1, 64);

            byte[] aesKey = new byte[32];
            System.arraycopy(derivedKey, 0, aesKey, 0, 32);
            byte[] iv = new byte[16]; // fisso, tutto zero

            Cipher cipher = Cipher.getInstance("AES/CTR/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(aesKey, "AES"), new IvParameterSpec(iv));
            byte[] computedHash = cipher.doFinal(signerKey);

            return MessageDigest.isEqual(computedHash, storedHash);
        } catch (Exception e) {
            return false;
        }
    }
}
