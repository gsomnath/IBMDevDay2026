# SpringBoot Scalability Patterns Guide

## Technology: SpringBoot
## Category: Enhancement - Scalability
## Version: 2026

---

## 1. Horizontal Scaling Patterns

### Stateless Application Design

```java
// ❌ BAD: Stateful - won't work with multiple instances
@RestController
public class CartController {
    private Map<String, Cart> sessionCarts = new HashMap<>();  // Instance-local state
}

// ✅ GOOD: Stateless - scales horizontally
@RestController
@RequiredArgsConstructor
public class CartController {
    
    private final RedisTemplate<String, Cart> cartCache;  // Shared state

    @GetMapping("/cart")
    public Cart getCart(@RequestHeader("X-Session-Id") String sessionId) {
        return cartCache.opsForValue().get("cart:" + sessionId);
    }

    @PostMapping("/cart/items")
    public Cart addItem(@RequestHeader("X-Session-Id") String sessionId,
                        @RequestBody CartItem item) {
        Cart cart = getOrCreateCart(sessionId);
        cart.addItem(item);
        cartCache.opsForValue().set("cart:" + sessionId, cart, Duration.ofHours(24));
        return cart;
    }
}
```

### Session Externalization

```yaml
# application.yml
spring:
  session:
    store-type: redis
    redis:
      flush-mode: on_save
      namespace: spring:session
    timeout: 30m
```

```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)
public class SessionConfig {

    @Bean
    public RedisSerializer<Object> springSessionDefaultRedisSerializer() {
        return new GenericJackson2JsonRedisSerializer();
    }
}
```

---

## 2. Event-Driven Architecture

### Message Queue Integration

```java
// Producer - Fire and forget
@Service
@RequiredArgsConstructor
public class OrderService {

    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(buildOrder(request));
        
        // Async processing via message queue
        rabbitTemplate.convertAndSend(
            "orders.exchange",
            "order.created",
            new OrderCreatedEvent(order.getId(), order.getUserId())
        );
        
        return order;
    }
}

// Consumer - Scales independently
@Component
@Slf4j
public class OrderEventConsumer {

    @RabbitListener(queues = "order.processing.queue", concurrency = "5-10")
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Processing order: {}", event.getOrderId());
        
        // Heavy processing: inventory, payment, notifications
        inventoryService.reserve(event);
        paymentService.process(event);
        notificationService.notify(event);
    }
}
```

### Kafka for High Throughput

```java
@Configuration
public class KafkaConfig {

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        config.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        config.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        return new DefaultKafkaProducerFactory<>(config);
    }
}

@Service
public class EventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CompletableFuture<SendResult<String, Object>> publish(String topic, Object event) {
        return kafkaTemplate.send(topic, event.getId().toString(), event);
    }
}

// Consumer with parallel processing
@KafkaListener(
    topics = "orders",
    groupId = "order-processor",
    concurrency = "3"
)
public void consume(ConsumerRecord<String, OrderEvent> record) {
    processOrder(record.value());
}
```

---

## 3. Circuit Breaker & Resilience

```java
@Configuration
public class ResilienceConfig {

    @Bean
    public CircuitBreakerConfig circuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
                .slidingWindowSize(10)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .slowCallRateThreshold(50)
                .slowCallDurationThreshold(Duration.ofSeconds(2))
                .build();
    }

    @Bean
    public RetryConfig retryConfig() {
        return RetryConfig.custom()
                .maxAttempts(3)
                .waitDuration(Duration.ofMillis(500))
                .exponentialBackoffMultiplier(2)
                .retryExceptions(IOException.class, TimeoutException.class)
                .ignoreExceptions(BusinessException.class)
                .build();
    }
}

@Service
@RequiredArgsConstructor
public class ExternalApiService {

    private final RestTemplate restTemplate;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;

    public ExternalData fetchData(String id) {
        return Decorators.ofSupplier(() -> callExternalApi(id))
                .withCircuitBreaker(circuitBreaker)
                .withRetry(retry)
                .withFallback(Arrays.asList(
                        CallNotPermittedException.class,
                        TimeoutException.class
                ), e -> getFallbackData(id))
                .get();
    }

    private ExternalData getFallbackData(String id) {
        // Return cached or default data
        return cache.get(id, () -> ExternalData.empty());
    }
}
```

---

## 4. Database Scaling

### Read Replicas

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {
        
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put(DataSourceType.PRIMARY, primary);
        targetDataSources.put(DataSourceType.REPLICA, replica);
        
        RoutingDataSource routingDataSource = new RoutingDataSource();
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(primary);
        
        return routingDataSource;
    }
}

public class RoutingDataSource extends AbstractRoutingDataSource {
    
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                ? DataSourceType.REPLICA
                : DataSourceType.PRIMARY;
    }
}

// Usage - reads go to replica
@Service
public class UserService {

    @Transactional(readOnly = true)  // Routes to replica
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional  // Routes to primary
    public User save(User user) {
        return userRepository.save(user);
    }
}
```

### Database Sharding

```java
@Configuration
public class ShardingConfig {

    @Bean
    public ShardingDataSource shardingDataSource() {
        Map<String, DataSource> dataSourceMap = new HashMap<>();
        dataSourceMap.put("shard0", createDataSource("jdbc:postgresql://shard0:5432/db"));
        dataSourceMap.put("shard1", createDataSource("jdbc:postgresql://shard1:5432/db"));
        dataSourceMap.put("shard2", createDataSource("jdbc:postgresql://shard2:5432/db"));
        
        // Shard by user_id
        TableShardingStrategy strategy = new UserIdShardingStrategy();
        
        return ShardingDataSource.builder()
                .dataSources(dataSourceMap)
                .tableShardingStrategy(strategy)
                .build();
    }
}

public class UserIdShardingStrategy implements TableShardingStrategy {
    
    @Override
    public String getShardKey(Object userId) {
        int shardNumber = Math.abs(userId.hashCode() % 3);
        return "shard" + shardNumber;
    }
}
```

---

## 5. Caching at Scale

### Distributed Caching with Redis Cluster

```yaml
spring:
  redis:
    cluster:
      nodes:
        - redis-node-1:6379
        - redis-node-2:6379
        - redis-node-3:6379
      max-redirects: 3
    lettuce:
      pool:
        max-active: 50
        max-idle: 10
        min-idle: 5
```

### Cache-Aside Pattern

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository repository;
    private final RedisTemplate<String, Product> cache;
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    public Product findById(Long id) {
        String cacheKey = "product:" + id;
        
        // Check cache first
        Product cached = cache.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }
        
        // Cache miss - load from database
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        // Populate cache
        cache.opsForValue().set(cacheKey, product, CACHE_TTL);
        
        return product;
    }

    @Transactional
    public Product update(Long id, UpdateProductRequest request) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        // Update entity
        productMapper.update(request, product);
        Product saved = repository.save(product);
        
        // Invalidate cache
        cache.delete("product:" + id);
        
        return saved;
    }
}
```

---

## 6. Auto-Scaling Configuration

### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

### Custom Metrics for Scaling

```java
@Component
public class CustomMetrics {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger activeConnections;
    private final Counter requestCounter;

    public CustomMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.activeConnections = meterRegistry.gauge("app.connections.active", new AtomicInteger(0));
        this.requestCounter = meterRegistry.counter("app.requests.total");
    }

    public void connectionOpened() {
        activeConnections.incrementAndGet();
    }

    public void connectionClosed() {
        activeConnections.decrementAndGet();
    }

    public void requestProcessed() {
        requestCounter.increment();
    }
}
```

---

## Scaling Decision Matrix

| Traffic | Database | Solution |
|---------|----------|----------|
| < 1K RPS | Single DB | Vertical scale, caching |
| 1K-10K RPS | Read replicas | Horizontal app scale, Redis |
| 10K-100K RPS | Sharding | Microservices, Kafka, sharded DB |
| > 100K RPS | Distributed | Multi-region, CDN, edge caching |

## Scalability Checklist

| Item | Priority | Status |
|------|----------|--------|
| Stateless application | P0 | |
| External session storage | P0 | |
| Database connection pooling | P0 | |
| Caching layer (Redis) | P0 | |
| Read replicas | P1 | |
| Message queue for async | P1 | |
| Circuit breakers | P1 | |
| Auto-scaling configured | P1 | |
| Database sharding | P2 | |
| Multi-region deployment | P2 | |
