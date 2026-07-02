package org.example.shelfy.security;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.entity.AuthCredential;
import org.example.shelfy.entity.User;
import org.example.shelfy.repository.AuthCredentialRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.repository.UserRoleRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserRepository userRepository;
    private final AuthCredentialRepository authCredentialRepository;
    private final UserRoleRepository userRoleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        AuthCredential credential = authCredentialRepository.findByUserUserId(user.getUserId())
                .orElseThrow(() -> new UsernameNotFoundException("Credential not found"));

        List<GrantedAuthority> authorities = new ArrayList<>();
        user.getUserRoles().forEach(ur -> authorities.add(new SimpleGrantedAuthority("ROLE_" + ur.getRole().getRoleName())));
        userRoleRepository.findPermissionCodesByUserId(user.getUserId())
                .forEach(code -> authorities.add(new SimpleGrantedAuthority(code)));

        return new UserDetailsImpl(user, credential.getPasswordHash(), authorities);
    }
}
