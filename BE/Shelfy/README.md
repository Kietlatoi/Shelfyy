# Shelfy Backend

Backend Spring Boot for Shelfy, built on top of the existing entity/repository classes in this project.

## Tech stack

- Java 17
- Spring Boot 3.3.5
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL + Flyway
- Cloudinary
- SpringDoc OpenAPI

## Run locally

```bash
cp .env.example .env
docker compose up -d db
mvn spring-boot:run
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Demo account is created by `DataInitializer` on startup:

```text
email: demo@shelfy.app
password: 123456
```

## Main APIs

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- POST `/api/auth/logout`
- GET `/api/users/me`
- PUT `/api/users/me`
- PUT `/api/users/me/password`
- GET `/api/wardrobe/items`
- POST `/api/wardrobe/items`
- GET `/api/wardrobe/stats`
- POST `/api/upload/clothing`
- GET `/api/home`
- GET `/api/events`
- POST `/api/events`
- GET `/api/subscription/plans`
- GET `/api/subscription/me`
- POST `/api/subscription/upgrade`
- POST `/api/trial/generate`
- GET `/api/trial/{jobId}/status`
