# SpringBoot Database Patterns

## Technology: SpringBoot
## Category: Database & JPA
## Version: Spring Data JPA 3.x

---

## 1. Entity Design Patterns

### Base Entity with Auditing

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @Version
    private Long version;
}
```

### Soft Delete Pattern

```java
@Entity
@Table(name = "products")
@SQLDelete(sql = "UPDATE products SET deleted = true, deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted = false")
@Getter
@Setter
public class Product extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "deleted")
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
```

### One-to-Many Relationship

```java
@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order extends BaseEntity {

    @Column(name = "order_number", unique = true, nullable = false)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNumber ASC")
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalAmount;

    // Helper methods for bidirectional relationship
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}
```

## 2. Repository Patterns

### Specification Pattern for Dynamic Queries

```java
public class ProductSpecifications {

    public static Specification<Product> hasName(String name) {
        return (root, query, cb) -> 
            name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<Product> hasCategory(String category) {
        return (root, query, cb) -> 
            category == null ? null : cb.equal(root.get("category"), category);
    }

    public static Specification<Product> priceBetween(BigDecimal min, BigDecimal max) {
        return (root, query, cb) -> {
            if (min == null && max == null) return null;
            if (min == null) return cb.lessThanOrEqualTo(root.get("price"), max);
            if (max == null) return cb.greaterThanOrEqualTo(root.get("price"), min);
            return cb.between(root.get("price"), min, max);
        };
    }

    public static Specification<Product> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }
}

// Usage in Service
@Service
public class ProductService {

    private final ProductRepository repository;

    public Page<Product> search(ProductSearchCriteria criteria, Pageable pageable) {
        Specification<Product> spec = Specification
            .where(ProductSpecifications.hasName(criteria.getName()))
            .and(ProductSpecifications.hasCategory(criteria.getCategory()))
            .and(ProductSpecifications.priceBetween(criteria.getMinPrice(), criteria.getMaxPrice()))
            .and(ProductSpecifications.isActive());

        return repository.findAll(spec, pageable);
    }
}
```

### Projection Pattern

```java
// Interface Projection
public interface ProductSummary {
    Long getId();
    String getName();
    BigDecimal getPrice();
    
    @Value("#{target.price * 1.1}")
    BigDecimal getPriceWithTax();
}

// Class Projection (DTO)
@Data
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    private String name;
    private BigDecimal price;
    private String categoryName;
}

// Repository with Projections
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<ProductSummary> findByCategory(String category);

    @Query("SELECT new com.example.dto.ProductDTO(p.id, p.name, p.price, c.name) " +
           "FROM Product p JOIN p.category c WHERE p.active = true")
    List<ProductDTO> findActiveProductsWithCategory();
}
```

## 3. Transaction Management

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    @Transactional(rollbackFor = Exception.class)
    public Order createOrder(CreateOrderRequest request) {
        // Validate inventory
        for (OrderItemRequest item : request.getItems()) {
            inventoryService.reserveStock(item.getProductId(), item.getQuantity());
        }

        // Create order
        Order order = buildOrder(request);
        order = orderRepository.save(order);

        // Process payment (will rollback order if payment fails)
        paymentService.processPayment(order);

        return order;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOrderAttempt(CreateOrderRequest request, String status) {
        // This runs in a new transaction
        // Won't be rolled back if main transaction fails
    }

    @Transactional(readOnly = true)
    public Order findById(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }
}
```

## 4. Database Migration (Flyway)

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- V2__create_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(12, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

## 5. Connection Pooling (HikariCP)

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
      max-lifetime: 1200000
      pool-name: MyAppPool
      
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
```

---

## Performance Tips

| Tip | Description |
|-----|-------------|
| Use FetchType.LAZY | Always lazy load relationships |
| Batch operations | Use batch_size for bulk inserts |
| Indexes | Add indexes for frequently queried columns |
| Projections | Use DTOs instead of full entities |
| N+1 Problem | Use @EntityGraph or JOIN FETCH |
| Read replicas | Configure for read-heavy workloads |
