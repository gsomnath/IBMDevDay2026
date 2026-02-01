# SpringBoot Code Quality Enhancement Guide

## Technology: SpringBoot
## Category: Enhancement - Code Quality
## Version: 2026

---

## 1. Clean Code Patterns

### Before: Typical Code Smells

```java
// ❌ BAD: Long method, mixed concerns, poor naming
@PostMapping("/order")
public ResponseEntity createOrder(@RequestBody Map<String, Object> data) {
    String email = (String) data.get("email");
    if (email == null || email.isEmpty()) {
        return ResponseEntity.badRequest().body("Email required");
    }
    
    User u = userRepo.findByEmail(email);
    if (u == null) {
        return ResponseEntity.badRequest().body("User not found");
    }
    
    List<Map<String, Object>> items = (List) data.get("items");
    double total = 0;
    for (Map<String, Object> item : items) {
        int qty = (int) item.get("qty");
        double price = (double) item.get("price");
        total += qty * price;
        
        // Check inventory
        Product p = productRepo.findById((Long) item.get("productId")).get();
        if (p.getStock() < qty) {
            return ResponseEntity.badRequest().body("Not enough stock");
        }
        p.setStock(p.getStock() - qty);
        productRepo.save(p);
    }
    
    Order o = new Order();
    o.setUser(u);
    o.setTotal(total);
    o.setCreatedAt(new Date());
    orderRepo.save(o);
    
    // Send email
    try {
        emailService.send(email, "Order created", "Your order total: " + total);
    } catch (Exception e) {
        // ignore
    }
    
    return ResponseEntity.ok(o);
}
```

### After: Clean Code

```java
// ✅ GOOD: Separated concerns, validated input, proper error handling
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Validated
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        OrderResponse order = orderService.createOrder(request);
        return ResponseEntity
                .created(URI.create("/api/v1/orders/" + order.getId()))
                .body(order);
    }
}

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final OrderEventPublisher eventPublisher;
    private final OrderMapper orderMapper;

    @Override
    public OrderResponse createOrder(CreateOrderRequest request) {
        User user = findUserOrThrow(request.getUserId());
        
        validateAndReserveInventory(request.getItems());
        
        Order order = buildOrder(user, request);
        Order savedOrder = orderRepository.save(order);
        
        eventPublisher.publishOrderCreated(savedOrder);
        
        log.info("Created order {} for user {}", savedOrder.getId(), user.getId());
        
        return orderMapper.toResponse(savedOrder);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private void validateAndReserveInventory(List<OrderItemRequest> items) {
        items.forEach(item -> 
            inventoryService.reserveStock(item.getProductId(), item.getQuantity()));
    }

    private Order buildOrder(User user, CreateOrderRequest request) {
        Order order = Order.builder()
                .user(user)
                .status(OrderStatus.PENDING)
                .build();

        request.getItems().forEach(itemRequest -> {
            OrderItem item = orderMapper.toOrderItem(itemRequest);
            order.addItem(item);
        });

        order.calculateTotal();
        return order;
    }
}
```

---

## 2. SOLID Principles Application

### Single Responsibility Principle

```java
// ❌ BAD: Multiple responsibilities
public class UserService {
    public User createUser(UserDTO dto) { ... }
    public void sendWelcomeEmail(User user) { ... }
    public void logUserActivity(User user, String action) { ... }
    public void validateUserData(UserDTO dto) { ... }
}

// ✅ GOOD: Single responsibility each
public class UserService {
    private final UserValidator validator;
    private final UserRepository repository;
    private final UserEventPublisher eventPublisher;
    
    public User createUser(CreateUserRequest request) {
        validator.validate(request);
        User user = userMapper.toEntity(request);
        User saved = repository.save(user);
        eventPublisher.publishUserCreated(saved);
        return saved;
    }
}

public class UserValidator { ... }
public class WelcomeEmailService { ... }
public class UserActivityLogger { ... }
```

### Dependency Inversion Principle

```java
// ✅ GOOD: Depend on abstractions
public interface PaymentGateway {
    PaymentResult process(PaymentRequest request);
}

@Service
@Profile("production")
public class StripePaymentGateway implements PaymentGateway {
    @Override
    public PaymentResult process(PaymentRequest request) {
        // Stripe implementation
    }
}

@Service
@Profile("development")
public class MockPaymentGateway implements PaymentGateway {
    @Override
    public PaymentResult process(PaymentRequest request) {
        // Mock for testing
        return PaymentResult.success();
    }
}

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentGateway paymentGateway; // Injected based on profile
}
```

---

## 3. Exception Handling Improvements

### Custom Exception Hierarchy

```java
// Base exception
public abstract class ApplicationException extends RuntimeException {
    private final ErrorCode errorCode;
    private final HttpStatus httpStatus;
    
    protected ApplicationException(String message, ErrorCode errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }
}

// Specific exceptions
public class ResourceNotFoundException extends ApplicationException {
    public ResourceNotFoundException(String resource, Object id) {
        super(
            String.format("%s not found with id: %s", resource, id),
            ErrorCode.RESOURCE_NOT_FOUND,
            HttpStatus.NOT_FOUND
        );
    }
}

public class BusinessRuleViolationException extends ApplicationException {
    public BusinessRuleViolationException(String message) {
        super(message, ErrorCode.BUSINESS_RULE_VIOLATION, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}

public class InsufficientStockException extends BusinessRuleViolationException {
    public InsufficientStockException(Long productId, int requested, int available) {
        super(String.format(
            "Insufficient stock for product %d: requested %d, available %d",
            productId, requested, available
        ));
    }
}
```

### Global Exception Handler

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<ErrorResponse> handleApplicationException(ApplicationException ex) {
        log.warn("Application exception: {}", ex.getMessage());
        return buildErrorResponse(ex.getHttpStatus(), ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ConstraintViolationException ex) {
        List<FieldError> errors = ex.getConstraintViolations().stream()
                .map(v -> new FieldError(v.getPropertyPath().toString(), v.getMessage()))
                .collect(Collectors.toList());
        
        return ResponseEntity.badRequest()
                .body(ErrorResponse.validationError(errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return buildErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            ErrorCode.INTERNAL_ERROR,
            "An unexpected error occurred"
        );
    }
}
```

---

## 4. Logging Best Practices

### Structured Logging

```java
@Service
@Slf4j
public class OrderService {

    public OrderResponse createOrder(CreateOrderRequest request) {
        // Use MDC for request correlation
        MDC.put("userId", request.getUserId().toString());
        MDC.put("correlationId", UUID.randomUUID().toString());
        
        try {
            log.info("Creating order for user {}", request.getUserId());
            
            Order order = processOrder(request);
            
            log.info("Order created successfully: orderId={}, total={}, items={}",
                    order.getId(),
                    order.getTotal(),
                    order.getItems().size());
            
            return orderMapper.toResponse(order);
            
        } catch (Exception e) {
            log.error("Failed to create order: userId={}, error={}",
                    request.getUserId(),
                    e.getMessage(),
                    e);
            throw e;
        } finally {
            MDC.clear();
        }
    }
}
```

### Logging Configuration

```yaml
# logback-spring.xml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] [%X{correlationId}] %-5level %logger{36} - %msg%n"
  level:
    root: INFO
    com.myapp: DEBUG
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql: TRACE  # Log query parameters
```

---

## 5. Code Quality Checklist

### Method Quality

| Criteria | Good Practice |
|----------|---------------|
| Length | < 20 lines |
| Parameters | < 4 parameters |
| Nesting | < 3 levels |
| Single purpose | One thing per method |
| Naming | Verb + noun (createOrder) |

### Class Quality

| Criteria | Good Practice |
|----------|---------------|
| Length | < 300 lines |
| Dependencies | < 7 injected |
| Cohesion | High (related methods) |
| Coupling | Low (interfaces) |
| Naming | Noun (OrderService) |

---

## 6. Recommended Code Analysis Tools

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.sonarsource.scanner.maven</groupId>
    <artifactId>sonar-maven-plugin</artifactId>
    <version>3.9.1.2184</version>
</plugin>

<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.7.3.0</version>
</plugin>

<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.2.0</version>
</plugin>
```

### Quality Gates

| Metric | Threshold | Action |
|--------|-----------|--------|
| Code coverage | > 80% | Block merge |
| Code smells | 0 new | Warning |
| Security hotspots | 0 | Block merge |
| Duplications | < 3% | Warning |
| Technical debt | < 5% | Review |
