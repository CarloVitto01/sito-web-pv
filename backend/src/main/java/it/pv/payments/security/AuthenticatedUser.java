package it.pv.payments.security;

/** Principal minimale estratto dal JWT: evita una query DB ad ogni richiesta solo per sapere chi e' l'utente. */
public record AuthenticatedUser(String userId, String email, String ruolo) {
}
