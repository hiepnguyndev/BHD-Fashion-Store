# NotificationService: Laravel 12 trên PHP 8.3, nối SQL Server bằng pdo_sqlsrv.
FROM php:8.3-cli-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends gnupg2 curl ca-certificates unzip git libzip-dev unixodbc-dev \
 && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
 && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
 && apt-get update \
 && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
 && pecl install sqlsrv pdo_sqlsrv \
 && docker-php-ext-enable sqlsrv pdo_sqlsrv \
 && docker-php-ext-install zip pcntl \
 && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /app
# Dựng khung Laravel rồi chép phần của dự án (overlay/) đè lên
RUN composer create-project laravel/laravel:^12.0 . --no-interaction --prefer-dist --no-progress \
 && rm -f .env database/database.sqlite
COPY overlay/ /app/
RUN composer dump-autoload --optimize --no-interaction \
 && chown -R www-data:www-data storage bootstrap/cache

USER www-data
EXPOSE 8080
ENV PHP_CLI_SERVER_WORKERS=4
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
