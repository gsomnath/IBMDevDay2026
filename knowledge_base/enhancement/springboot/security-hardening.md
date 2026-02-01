# SpringBoot Security Hardening Guide

## Technology: SpringBoot
## Category: Enhancement - Security
## Version: 2026

---

## 1. Authentication Enhancements

### Secure Password Storage

```java
@Configuration
public class SecurityBeans {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Use Argon2 for new applications (more secure than BCrypt)
        return new Argon2PasswordEncoder(
            16,    // salt length
            32,    // hash length
            1,     // parallelism
            65536, // memory
            3      // iterations
        );
    }
}

// Password validation rules
@Service
public class PasswordValidator {
    
    private static final Pattern STRONG_PASSWORD = Pattern.compile(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$"
    );

    public void validate(String password) {
        if (!STRONG_PASSWORD.matcher(password).matches()) {
            throw new WeakPasswordException(
                "Password must be at least 12 characters with uppercase, " +
                "lowercase, digit, and special character"
            );
        }
        
        // Check against common passwords
        if (commonPasswordChecker.isCommon(password)) {
            throw new WeakPasswordException("Password is too common");
        }
    }
}
```

### Brute Force Protection

```java
@Component
@Slf4j
public class LoginAttemptService {

    private final LoadingCache<String, Integer> attemptsCache;
    private static final int MAX_ATTEMPTS = 5;

    public LoginAttemptService() {
        this.attemptsCache = CacheBuilder.newBuilder()
                .expireAfterWrite(15, TimeUnit.MINUTES)
                .build(new CacheLoader<>() {
                    @Override
                    public Integer load(String key) {
                        return 0;
                    }
                });
    }

    public void loginFailed(String key) {
        int attempts = attemptsCache.getUnchecked(key) + 1;
        attemptsCache.put(key, attempts);
        log.warn("Failed login attempt {} for {}", attempts, key);
    }

    public boolean isBlocked(String key) {
        return attemptsCache.getUnchecked(key) >= MAX_ATTEMPTS;
    }

    public void loginSucceeded(String key) {
        attemptsCache.invalidate(key);
    }
}

// In authentication provider
@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {

    @Override
    public Authentication authenticate(Authentication auth) {
        String ip = getClientIP();
        
        if (loginAttemptService.isBlocked(ip)) {
            throw new AccountLockedException("Too many failed attempts. Try again later.");
        }
        
        try {
            // Authenticate...
            loginAttemptService.loginSucceeded(ip);
            return authentication;
        } catch (BadCredentialsException e) {
            loginAttemptService.loginFailed(ip);
            throw e;
        }
    }
}
```

---

## 2. API Security

### Rate Limiting

```java
@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiter apiRateLimiter() {
        return RateLimiter.of("api",
            RateLimiterConfig.custom()
                .limitRefreshPeriod(Duration.ofMinutes(1))
                .limitForPeriod(100)  // 100 requests per minute
                .timeoutDuration(Duration.ofMillis(500))
                .build()
        );
    }
}

@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitingAspect {

    private final RateLimiter rateLimiter;

    @Around("@annotation(RateLimited)")
    public Object rateLimit(ProceedingJoinPoint joinPoint) throws Throwable {
        String key = getCurrentUserOrIP();
        
        if (!rateLimiter.acquirePermission()) {
            throw new TooManyRequestsException("Rate limit exceeded");
        }
        
        return joinPoint.proceed();
    }
}
```

### Input Validation & Sanitization

```java
@RestController
@Validated
public class UserController {

    @PostMapping("/users")
    public UserResponse createUser(
            @Valid @RequestBody @Sanitized CreateUserRequest request) {
        return userService.create(request);
    }
}

// Custom sanitizer
@Component
public class InputSanitizer {

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("b", "i", "u")
            .toFactory();

    public String sanitize(String input) {
        if (input == null) return null;
        
        // Remove control characters
        String cleaned = input.replaceAll("[\\x00-\\x1F\\x7F]", "");
        
        // Sanitize HTML
        cleaned = POLICY.sanitize(cleaned);
        
        // Trim whitespace
        return cleaned.trim();
    }
}

// Request validation
@Data
public class CreateUserRequest {

    @NotBlank
    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Invalid username format")
    private String username;

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Size(min = 12, max = 100)
    private String password;
}
```

---

## 3. Data Protection

### Field-Level Encryption

```java
@Entity
public class User {

    @Id
    private Long id;

    private String username;

    @Convert(converter = EncryptedStringConverter.class)
    private String ssn;  // Encrypted at rest

    @Convert(converter = EncryptedStringConverter.class)
    private String creditCardNumber;
}

@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute != null ? encryptionService.encrypt(attribute) : null;
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData != null ? encryptionService.decrypt(dbData) : null;
    }
}

@Service
public class EncryptionService {

    @Value("${encryption.key}")
    private String encryptionKey;

    public String encrypt(String plainText) {
        // AES-256-GCM encryption
        SecretKey key = deriveKey(encryptionKey);
        byte[] iv = generateSecureRandom(12);
        
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
        
        byte[] cipherText = cipher.doFinal(plainText.getBytes(UTF_8));
        
        return Base64.getEncoder().encodeToString(concat(iv, cipherText));
    }
}
```

### Audit Logging

```java
@Entity
@EntityListeners(AuditingEntityListener.class)
public class SensitiveData {

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String modifiedBy;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant modifiedAt;
}

// Comprehensive audit log
@Aspect
@Component
@Slf4j
public class AuditAspect {

    @Around("@annotation(Audited)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        String method = joinPoint.getSignature().getName();
        
        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(method)
                .timestamp(Instant.now())
                .ipAddress(getClientIP())
                .build();

        try {
            Object result = joinPoint.proceed();
            auditLog.setStatus("SUCCESS");
            return result;
        } catch (Exception e) {
            auditLog.setStatus("FAILURE");
            auditLog.setErrorMessage(e.getMessage());
            throw e;
        } finally {
            auditLogRepository.save(auditLog);
        }
    }
}
```

---

## 4. Security Headers

```java
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.headers(headers -> headers
            // Prevent clickjacking
            .frameOptions(frame -> frame.deny())
            
            // XSS protection
            .xssProtection(xss -> xss.enable())
            
            // Content type sniffing
            .contentTypeOptions(Customizer.withDefaults())
            
            // HSTS (HTTPS only)
            .httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .maxAgeInSeconds(31536000))
            
            // Content Security Policy
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"))
            
            // Permissions policy
            .permissionsPolicy(permissions -> permissions
                .policy("geolocation=(), microphone=(), camera=()"))
        );
        
        return http.build();
    }
}
```

---

## 5. Secret Management

```yaml
# application.yml - DO NOT store secrets here
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}

jwt:
  secret: ${JWT_SECRET}

# Use HashiCorp Vault
spring:
  cloud:
    vault:
      uri: https://vault.company.com
      authentication: KUBERNETES
      kubernetes:
        role: my-app
        service-account-token-file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

### AWS Secrets Manager Integration

```java
@Configuration
public class SecretsConfig {

    @Bean
    public DataSource dataSource(SecretsManagerClient secretsClient) {
        String secretJson = secretsClient.getSecretValue(
            GetSecretValueRequest.builder()
                .secretId("prod/myapp/database")
                .build()
        ).secretString();
        
        DatabaseCredentials creds = objectMapper.readValue(secretJson, DatabaseCredentials.class);
        
        return DataSourceBuilder.create()
                .url(creds.getUrl())
                .username(creds.getUsername())
                .password(creds.getPassword())
                .build();
    }
}
```

---

## 6. Security Checklist

| Category | Item | Priority |
|----------|------|----------|
| **Authentication** | Strong password policy | P0 |
| | Brute force protection | P0 |
| | MFA support | P1 |
| | Session timeout | P0 |
| **Authorization** | Least privilege | P0 |
| | RBAC implementation | P0 |
| | Resource-level authorization | P1 |
| **Data Protection** | Encryption at rest | P0 |
| | Encryption in transit (TLS 1.3) | P0 |
| | PII masking in logs | P0 |
| **API Security** | Input validation | P0 |
| | Rate limiting | P1 |
| | CORS configuration | P0 |
| **Infrastructure** | Security headers | P1 |
| | Secret management | P0 |
| | Dependency scanning | P0 |
| **Monitoring** | Audit logging | P0 |
| | Security event alerting | P1 |
| | Anomaly detection | P2 |

---

## Common Vulnerabilities & Fixes

| Vulnerability | Risk | Fix |
|--------------|------|-----|
| SQL Injection | Critical | Use parameterized queries |
| XSS | High | Sanitize output, CSP headers |
| CSRF | High | Enable CSRF tokens |
| Broken Auth | Critical | Implement proper session management |
| Sensitive Data Exposure | High | Encrypt PII, mask logs |
| Insecure Deserialization | Critical | Validate input, use safe libraries |
| Insufficient Logging | Medium | Comprehensive audit logs |
