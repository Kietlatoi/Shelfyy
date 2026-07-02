package org.example.shelfy.security;

import lombok.Getter;
import org.example.shelfy.entity.User;
import org.example.shelfy.enums.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.UUID;

@Getter
public class UserDetailsImpl implements UserDetails {
    private final Long userId;
    private final UUID publicId;
    private final String email;
    private final String password;
    private final UserStatus status;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(User user, String password, Collection<? extends GrantedAuthority> authorities) {
        this.userId = user.getUserId();
        this.publicId = user.getPublicId();
        this.email = user.getEmail();
        this.password = password;
        this.status = user.getStatus();
        this.authorities = authorities;
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return status != UserStatus.LOCKED; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return status == UserStatus.ACTIVE; }
}
