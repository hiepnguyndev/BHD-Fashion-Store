FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY SanPham.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 DOTNET_EnableDiagnostics=0
COPY --from=build /out .
# thư mục ảnh dùng chung với Nginx; tạo sẵn để volume kế thừa quyền ghi của người dùng app
RUN mkdir -p /du-lieu/anh && chown -R $APP_UID /du-lieu
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "SanPham.dll"]
