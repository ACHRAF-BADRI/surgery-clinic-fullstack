package com.eclat.clinic.web;

import com.eclat.clinic.dto.DashboardDtos.AdminDashboard;
import com.eclat.clinic.dto.UserDtos.AdminPasswordRequest;
import com.eclat.clinic.dto.UserDtos.AdminUserCreateRequest;
import com.eclat.clinic.dto.UserDtos.AdminUserUpdateRequest;
import com.eclat.clinic.dto.UserDtos.PageDto;
import com.eclat.clinic.dto.UserDtos.RoleChangeRequest;
import com.eclat.clinic.dto.UserDtos.StatusChangeRequest;
import com.eclat.clinic.dto.UserDtos.UserDto;
import com.eclat.clinic.model.AccountStatus;
import com.eclat.clinic.model.Role;
import com.eclat.clinic.security.AuthUser;
import com.eclat.clinic.service.DashboardService;
import com.eclat.clinic.service.UserAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserAdminService users;
    private final DashboardService dashboard;

    public AdminController(UserAdminService users, DashboardService dashboard) {
        this.users = users;
        this.dashboard = dashboard;
    }

    @GetMapping("/dashboard")
    public AdminDashboard dashboard() {
        return dashboard.admin();
    }

    @GetMapping("/users")
    public PageDto<UserDto> list(@RequestParam(required = false) String q,
                                 @RequestParam(required = false) Role role,
                                 @RequestParam(required = false) AccountStatus status,
                                 @RequestParam(required = false) String account,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "20") int size) {
        return users.search(q, role, status, account, Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody AdminUserCreateRequest req) {
        return users.create(me, req);
    }

    @GetMapping("/users/{id}")
    public UserDto get(@PathVariable String id) {
        return users.get(id);
    }

    @PutMapping("/users/{id}")
    public UserDto update(@PathVariable String id, @Valid @RequestBody AdminUserUpdateRequest req) {
        return users.update(id, req);
    }

    @PatchMapping("/users/{id}/role")
    public UserDto role(@AuthenticationPrincipal AuthUser me, @PathVariable String id, @Valid @RequestBody RoleChangeRequest req) {
        return users.changeRole(me, id, req.role());
    }

    @PatchMapping("/users/{id}/status")
    public UserDto status(@AuthenticationPrincipal AuthUser me, @PathVariable String id, @Valid @RequestBody StatusChangeRequest req) {
        return users.changeStatus(me, id, req);
    }

    @PutMapping("/users/{id}/password")
    public UserDto password(@PathVariable String id, @Valid @RequestBody AdminPasswordRequest req) {
        return users.setPassword(id, req.password());
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser me, @PathVariable String id) {
        users.delete(me, id);
    }
}
