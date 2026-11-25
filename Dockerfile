FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY frontend/ frontend/
COPY scripts/*.mjs scripts/
COPY backend/src/main/resources/ backend/src/main/resources/
ARG IVME_REVISION=local
RUN cd frontend && npm run build && printf '%s\n' "$IVME_REVISION" > dist/app-version.txt

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml pom.xml
COPY backend/src/ src/
COPY --from=frontend /app/backend/src/main/resources/ src/main/resources/
COPY --from=frontend /app/frontend/dist/ src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-noble
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 ivme && useradd --uid 10001 --gid 10001 --no-create-home ivme
WORKDIR /app
COPY --from=frontend /usr/local/bin/node /usr/local/bin/node
COPY --from=frontend /app/scripts/resource-intake.mjs /app/scripts/learning-resource-contract.mjs /app/scripts/content-taxonomy.mjs scripts/
COPY --from=frontend /app/frontend/package.json /app/frontend/src/resourceMetadata.js frontend/
COPY --from=frontend /app/backend/src/main/resources/content-taxonomy.json backend/src/main/resources/
COPY --from=backend /app/backend/target/hedef-yks.jar app.jar
RUN mkdir -p frontend/src && mv frontend/resourceMetadata.js frontend/src/
USER ivme
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
