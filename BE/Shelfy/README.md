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

1. Create a local env file:

```powershell
Copy-Item .env.example .env
```

2. Start PostgreSQL:

```powershell
docker compose up -d db
```

Docker Desktop will show the container as `shelfy-postgres`.

3. Run the Spring Boot app with the same local env values:

```powershell
.\run-local.ps1
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
- GET `/api/events`
- POST `/api/events`
- GET `/api/subscription/plans`
- GET `/api/subscription/me`
- POST `/api/subscription/upgrade`
- POST `/api/trial/generate`
- GET `/api/trial/{jobId}/status`

Weather không còn thuộc Spring Boot. FE gọi Nodejs Service qua `VITE_NODE_API_BASE_URL`; xem `Nodejs/README.md`.
