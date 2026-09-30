package com.eclat.clinic.repository;

import com.eclat.clinic.model.AccountStatus;
import com.eclat.clinic.model.Role;
import com.eclat.clinic.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByTokenHash(String tokenHash);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    List<User> findByRole(Role role);

    List<User> findByRoleAndStatus(Role role, AccountStatus status);

    long countByRole(Role role);

    long countByStatus(AccountStatus status);

    long countByRoleAndHasAccount(Role role, boolean hasAccount);

    long countByRoleAndCreatedAtAfter(Role role, Instant after);

    List<User> findByCreatedAtAfter(Instant after);

    List<User> findTop6ByOrderByCreatedAtDesc();

    List<User> findTop6ByLastLoginAtNotNullOrderByLastLoginAtDesc();
}
