package com.eclat.clinic.service;

import com.eclat.clinic.dto.UserDtos.AdminUserCreateRequest;
import com.eclat.clinic.dto.UserDtos.AdminUserUpdateRequest;
import com.eclat.clinic.dto.UserDtos.PageDto;
import com.eclat.clinic.dto.UserDtos.StatusChangeRequest;
import com.eclat.clinic.dto.UserDtos.UserDto;
import com.eclat.clinic.model.AccountStatus;
import com.eclat.clinic.model.Role;
import com.eclat.clinic.model.User;
import com.eclat.clinic.repository.UserRepository;
import com.eclat.clinic.security.AuthUser;
import com.eclat.clinic.web.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAdminService {

    private final UserRepository users;
    private final MongoTemplate mongo;
    private final PasswordEncoder encoder;
    private final PatientService patients;

    public UserAdminService(UserRepository users, MongoTemplate mongo, PasswordEncoder encoder, PatientService patients) {
        this.users = users;
        this.mongo = mongo;
        this.encoder = encoder;
        this.patients = patients;
    }

    public PageDto<UserDto> search(String q, Role role, AccountStatus status, String account, int page, int size) {
        Query query = new Query();
        if (role != null) query.addCriteria(Criteria.where("role").is(role));
        if (status != null) query.addCriteria(Criteria.where("status").is(status));
        if ("with".equals(account)) query.addCriteria(Criteria.where("hasAccount").is(true));
        if ("without".equals(account)) query.addCriteria(Criteria.where("hasAccount").is(false));
        if (q != null && !q.isBlank()) query.addCriteria(PatientService.textCriteria(q));
        long total = mongo.count(query, User.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt")).skip((long) page * size).limit(size);
        return new PageDto<>(mongo.find(query, User.class).stream().map(UserDto::of).toList(), total, page, size);
    }

    public UserDto get(String id) {
        return UserDto.of(load(id));
    }

    public UserDto create(AuthUser me, AdminUserCreateRequest req) {
        String mail = AuthService.normalizeEmail(req.email());
        if (users.existsByEmail(mail)) throw ApiException.conflict("EMAIL_TAKEN", "Cette adresse email est déjà utilisée.");
        User u = new User();
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setEmail(mail);
        u.setPhone(AuthService.blankToNull(req.phone()));
        u.setRole(req.role());
        u.setHasAccount(true);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setCreatedBy(me.id());
        return UserDto.of(users.save(u));
    }

    public UserDto update(String id, AdminUserUpdateRequest req) {
        User u = load(id);
        String mail = AuthService.normalizeEmail(req.email());
        if (mail == null && u.isHasAccount()) {
            throw ApiException.badRequest("EMAIL_REQUIRED", "L'email est obligatoire pour un compte actif.");
        }
        if (mail != null && !mail.equals(u.getEmail()) && users.existsByEmail(mail)) {
            throw ApiException.conflict("EMAIL_TAKEN", "Cette adresse email est déjà utilisée.");
        }
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setEmail(mail);
        u.setPhone(AuthService.blankToNull(req.phone()));
        u.setDateOfBirth(req.dateOfBirth());
        u.setAddress(AuthService.blankToNull(req.address()));
        u.setCity(AuthService.blankToNull(req.city()));
        u.setPostalCode(AuthService.blankToNull(req.postalCode()));
        return UserDto.of(users.save(u));
    }

    public UserDto changeRole(AuthUser me, String id, Role role) {
        User u = load(id);
        if (u.getId().equals(me.id())) throw ApiException.badRequest("SELF", "Vous ne pouvez pas modifier votre propre rôle.");
        if (!u.isHasAccount() && role != Role.PATIENT) {
            throw ApiException.badRequest("NO_ACCOUNT", "Définissez d'abord un mot de passe pour ce patient sans compte.");
        }
        u.setRole(role);
        return UserDto.of(users.save(u));
    }

    public UserDto changeStatus(AuthUser me, String id, StatusChangeRequest req) {
        User u = load(id);
        if (u.getId().equals(me.id())) throw ApiException.badRequest("SELF", "Vous ne pouvez pas restreindre votre propre compte.");
        u.setStatus(req.status());
        u.setRestrictionReason(req.status() == AccountStatus.RESTRICTED ? AuthService.blankToNull(req.reason()) : null);
        return UserDto.of(users.save(u));
    }

    /** Sets a new password; also activates the account of a patient created by the clinic. */
    public UserDto setPassword(String id, String password) {
        User u = load(id);
        if (u.getEmail() == null) {
            throw ApiException.badRequest("EMAIL_REQUIRED", "Ajoutez d'abord une adresse email à cet utilisateur.");
        }
        u.setPasswordHash(encoder.encode(password));
        u.setHasAccount(true);
        u.setTokenHash(null);
        u.setTokenExpiresAt(null);
        return UserDto.of(users.save(u));
    }

    public void delete(AuthUser me, String id) {
        User u = load(id);
        if (u.getId().equals(me.id())) throw ApiException.badRequest("SELF", "Vous ne pouvez pas supprimer votre propre compte.");
        if (u.getRole() == Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw ApiException.badRequest("LAST_ADMIN", "Impossible de supprimer le dernier administrateur.");
        }
        if (u.getRole() == Role.PATIENT) patients.purge(u.getId());
        users.delete(u);
    }

    private User load(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
    }
}
