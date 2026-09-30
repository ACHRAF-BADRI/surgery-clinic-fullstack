package com.eclat.clinic.service;

import com.eclat.clinic.config.AppProperties;
import com.eclat.clinic.model.User;
import com.eclat.clinic.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/** Single-use tokens (patient invitation, password reset). Only the hash is stored. */
@Service
public class TokenService {

    private final SecureRandom random = new SecureRandom();
    private final UserRepository users;
    private final AppProperties props;

    public TokenService(UserRepository users, AppProperties props) {
        this.users = users;
        this.props = props;
    }

    /** Generates a token, stores it on the user and returns the link to email. */
    public String issueLink(User user, Duration validity) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        user.setTokenHash(hash(token));
        user.setTokenExpiresAt(Instant.now().plus(validity));
        users.save(user);
        return props.frontendUrl() + "/mot-de-passe?token=" + token;
    }

    public static String hash(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
