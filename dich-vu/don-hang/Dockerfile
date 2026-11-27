FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd -r -u 10001 app
COPY --from=build /src/target/don-hang.jar app.jar
USER app
EXPOSE 8080
# JVM chạy giờ UTC để mọi mốc thời gian trong CSDL (UTC) đọc ra đúng
ENTRYPOINT ["java", "-Duser.timezone=UTC", "-XX:MaxRAMPercentage=60", "-jar", "app.jar"]
