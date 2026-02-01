# SpringBoot Performance Optimization Guide

## Technology: SpringBoot
## Category: Enhancement - Performance
## Version: 2026

---

## 1. Database Performance

### Connection Pool Optimization

```yaml
# Optimal HikariCP configuration
spring:
  datasource:
    hikari:
      # Core settings
      maximum-pool-size: 20          # (CPU cores × 2) + disk spindles
      minimum-idle: 5                 # Keep connections ready
      idle-timeout: 300000            # 5 minutes
      connection-timeout: 20000       # 20 seconds
      max-lifetime: 1800000           # 30 minutes (< DB timeout)
      
      # Performance tuning
      auto-commit: false              # Manage transactions explicitly
      pool-name: HikariPool
      
      # Leak detection
      leak-detection-threshold: 60000 # 1 minute

# Improvement Impact: 30-50% reduction in connection overhead
```

### N+1 Query Problem Solutions

**Problem:**
```java
// BAD: N+1 queries
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    System.out.println(order.getCustomer().getName()); // Extra query per order!
}
```

**Solution 1: JOIN FETCH**
```java
@Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.status = :status")
List<Order> findWithCustomerByStatus(@Param("status") OrderStatus status);
```

**Solution 2: EntityGraph**
```java
@EntityGraph(attributePaths = {"customer", "items"})
List<Order> findByStatus(OrderStatus status);
```

**Solution 3: Batch Fetching**
```java
@Entity
public class Order {
    @OneToMany(mappedBy = "order")
    @BatchSize(size = 25)  // Fetch 25 at a time
    private List<OrderItem> items;
}
```

**Improvement Impact: 80-95% reduction in query count**

### Query Optimization Checklist

| Issue | Solution | Impact |
|-------|----------|--------|
| Missing indexes | Add targeted indexes | 10-100x faster |
| SELECT * | Use projections/DTOs | 20-50% faster |
| N+1 queries | JOIN FETCH / EntityGraph | 80-95% reduction |
| Large result sets | Pagination | Memory efficient |
| Slow aggregations | Database views | 50-80% faster |

---

## 2. Caching Strategies

### Multi-Level Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        // L1: Local cache (Caffeine) - microseconds latency
        CaffeineCacheManager localCache = new CaffeineCacheManager();
        localCache.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(5, TimeUnit.MINUTES));

        // L2: Distributed cache (Redis) - milliseconds latency
        RedisCacheManager redisCache = RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofMinutes(30))
                        .serializeValuesWith(SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer())))
                .build();

        // Composite cache manager
        return new CompositeCacheManager(localCache, redisCache);
    }
}
```

### Caching Best Practices

```java
@Service
@Slf4j
public class ProductService {

    // Cache frequently accessed, rarely changing data
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product findById(Long id) {
        log.info("Fetching product from database: {}", id);
        return productRepository.findById(id).orElse(null);
    }

    // Evict on updates
    @CacheEvict(value = "products", key = "#product.id")
    @CachePut(value = "products", key = "#product.id")
    public Product update(Product product) {
        return productRepository.save(product);
    }

    // Evict related caches
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#id"),
        @CacheEvict(value = "productsByCategory", allEntries = true)
    })
    public void delete(Long id) {
        productRepository.deleteById(id);
    }
}
```

**Improvement Impact: 50-90% reduction in database load**

---

## 3. Response Time Optimization

### Async Processing

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("Async-");
        executor.setRejectedExecutionHandler(new CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}

@Service
public class NotificationService {

    @Async
    public CompletableFuture<Void> sendEmailAsync(String to, String message) {
        // Non-blocking email sending
        emailClient.send(to, message);
        return CompletableFuture.completedFuture(null);
    }
}
```

### Parallel Processing

```java
@Service
public class DashboardService {

    public DashboardDTO getDashboard(Long userId) {
        CompletableFuture<UserStats> statsFuture = 
            CompletableFuture.supplyAsync(() -> getUserStats(userId));
        CompletableFuture<List<Order>> ordersFuture = 
            CompletableFuture.supplyAsync(() -> getRecentOrders(userId));
        CompletableFuture<List<Notification>> notificationsFuture = 
            CompletableFuture.supplyAsync(() -> getNotifications(userId));

        // Wait for all and combine
        return CompletableFuture.allOf(statsFuture, ordersFuture, notificationsFuture)
            .thenApply(v -> DashboardDTO.builder()
                .stats(statsFuture.join())
                .orders(ordersFuture.join())
                .notifications(notificationsFuture.join())
                .build())
            .join();
    }
}
```

**Improvement Impact: 40-70% reduction in response time**

---

## 4. Memory Optimization

### Streaming Large Datasets

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Stream instead of loading all into memory
    @Query("SELECT o FROM Order o WHERE o.createdAt > :date")
    Stream<Order> streamOrdersAfter(@Param("date") LocalDateTime date);
}

@Service
@Transactional(readOnly = true)
public class ExportService {

    public void exportOrders(LocalDateTime since, OutputStream output) {
        try (Stream<Order> orders = orderRepository.streamOrdersAfter(since)) {
            orders.forEach(order -> {
                writeToOutput(order, output);
                entityManager.detach(order); // Free memory
            });
        }
    }
}
```

### Pagination Best Practices

```java
// Keyset pagination (better than offset for large datasets)
@Query("SELECT o FROM Order o WHERE o.id > :lastId ORDER BY o.id LIMIT :limit")
List<Order> findNextPage(@Param("lastId") Long lastId, @Param("limit") int limit);

// Slice for infinite scroll (doesn't count total)
Slice<Order> findByStatus(OrderStatus status, Pageable pageable);
```

**Improvement Impact: 60-80% reduction in memory usage**

---

## 5. JVM Tuning

### Recommended JVM Flags

```bash
# Production JVM settings
JAVA_OPTS="
  -Xms2g -Xmx2g                          # Fixed heap size
  -XX:+UseG1GC                            # G1 garbage collector
  -XX:MaxGCPauseMillis=200                # Target pause time
  -XX:+UseStringDeduplication             # Reduce string memory
  -XX:+HeapDumpOnOutOfMemoryError         # Debug OOM
  -XX:HeapDumpPath=/var/logs/heapdump.hprof
  -XX:+ExitOnOutOfMemoryError             # Fail fast
  -Djava.security.egd=file:/dev/./urandom # Faster startup
"
```

### Memory Configuration Guide

| Heap Size | Use Case | GC Recommendation |
|-----------|----------|-------------------|
| < 4GB | Small services | G1GC |
| 4-32GB | Medium services | G1GC |
| > 32GB | Large services | ZGC or Shenandoah |

---

## 6. Performance Monitoring Checklist

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Response time (p95) | < 200ms | Profile, cache, optimize queries |
| Response time (p99) | < 500ms | Check outliers, timeouts |
| Error rate | < 0.1% | Review error logs |
| CPU usage | < 70% | Scale horizontally |
| Memory usage | < 80% | Check leaks, tune GC |
| DB connection wait | < 10ms | Increase pool size |
| GC pause time | < 200ms | Tune GC settings |
| Thread pool queue | < 100 | Increase pool or scale |

---

## Quick Wins Summary

| Optimization | Effort | Impact | Priority |
|--------------|--------|--------|----------|
| Add database indexes | Low | High | P0 |
| Enable caching | Medium | High | P0 |
| Fix N+1 queries | Medium | High | P0 |
| Connection pool tuning | Low | Medium | P1 |
| Async processing | Medium | Medium | P1 |
| Pagination | Low | Medium | P1 |
| JVM tuning | Low | Medium | P2 |
| Parallel processing | High | Medium | P2 |
