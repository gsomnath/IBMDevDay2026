# SpringBoot Testing Patterns

## Technology: SpringBoot
## Category: Testing
## Version: Spring Boot Test 3.x, JUnit 5

---

## 1. Unit Testing - Service Layer

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserServiceImpl userService;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    private User testUser;
    private UserDTO testUserDTO;
    private CreateUserRequest createRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .status(UserStatus.ACTIVE)
                .build();

        testUserDTO = UserDTO.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .build();

        createRequest = new CreateUserRequest("testuser", "test@example.com", "Password123");
    }

    @Test
    @DisplayName("Should create user successfully")
    void createUser_Success() {
        // Given
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(userMapper.toDTO(any(User.class))).thenReturn(testUserDTO);

        // When
        UserDTO result = userService.create(createRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("test@example.com");

        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getPassword()).isEqualTo("encodedPassword");
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void createUser_DuplicateEmail_ThrowsException() {
        // Given
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        // When/Then
        assertThatThrownBy(() -> userService.create(createRequest))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Email already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should return user when found by ID")
    void findById_UserExists_ReturnsUser() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userMapper.toDTO(testUser)).thenReturn(testUserDTO);

        // When
        Optional<UserDTO> result = userService.findById(1L);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should return empty when user not found")
    void findById_UserNotExists_ReturnsEmpty() {
        // Given
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // When
        Optional<UserDTO> result = userService.findById(99L);

        // Then
        assertThat(result).isEmpty();
    }
}
```

## 2. Integration Testing - Repository

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Should find user by email")
    void findByEmail_ExistingEmail_ReturnsUser() {
        // Given
        User user = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("password")
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(user);

        // When
        Optional<User> found = userRepository.findByEmail("test@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("Should find active users created after date")
    void findActiveUsersCreatedAfter_ReturnsMatchingUsers() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(7);
        
        User activeRecent = createUser("active1", UserStatus.ACTIVE, LocalDateTime.now().minusDays(1));
        User activeOld = createUser("active2", UserStatus.ACTIVE, LocalDateTime.now().minusDays(30));
        User inactiveRecent = createUser("inactive", UserStatus.INACTIVE, LocalDateTime.now().minusDays(1));
        
        entityManager.persist(activeRecent);
        entityManager.persist(activeOld);
        entityManager.persist(inactiveRecent);
        entityManager.flush();

        // When
        List<User> result = userRepository.findActiveUsersCreatedAfter(UserStatus.ACTIVE, cutoffDate);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUsername()).isEqualTo("active1");
    }

    private User createUser(String username, UserStatus status, LocalDateTime createdAt) {
        return User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("password")
                .status(status)
                .createdAt(createdAt)
                .build();
    }
}
```

## 3. Integration Testing - Controller

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class UserControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("POST /api/v1/users - Should create user")
    @WithMockUser(roles = "ADMIN")
    void createUser_ValidRequest_Returns201() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "new@example.com", "Password123", UserRole.USER);

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    @DisplayName("POST /api/v1/users - Should return 400 for invalid request")
    @WithMockUser(roles = "ADMIN")
    void createUser_InvalidRequest_Returns400() throws Exception {
        CreateUserRequest request = new CreateUserRequest("", "invalid-email", "123", null);

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("GET /api/v1/users/{id} - Should return user")
    @WithMockUser
    void getUserById_ExistingUser_Returns200() throws Exception {
        User user = userRepository.save(User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("password")
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/v1/users/{id}", user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @DisplayName("GET /api/v1/users/{id} - Should return 404 for non-existing user")
    @WithMockUser
    void getUserById_NonExistingUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}", 99999L))
                .andExpect(status().isNotFound());
    }
}
```

## 4. WebTestClient for Reactive Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserApiReactiveTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void getAllUsers_ReturnsPagedResult() {
        webTestClient.get()
                .uri("/api/v1/users?page=0&size=10")
                .header("Authorization", "Bearer " + getValidToken())
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.content").isArray()
                .jsonPath("$.totalElements").isNumber();
    }
}
```

## 5. Test Configuration

```java
@TestConfiguration
public class TestConfig {

    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(
                Instant.parse("2026-01-15T10:00:00Z"),
                ZoneId.of("UTC")
        );
    }

    @Bean
    @Primary
    public PasswordEncoder testPasswordEncoder() {
        return new BCryptPasswordEncoder(4); // Faster for tests
    }
}
```

---

## Testing Best Practices

| Practice | Description |
|----------|-------------|
| Use Testcontainers | Real database for integration tests |
| Mock external services | Use WireMock or Mockito |
| Test slices | @WebMvcTest, @DataJpaTest for focused tests |
| Given-When-Then | Clear test structure |
| Descriptive names | @DisplayName for readability |
| Test data builders | Use Builder pattern for test data |
