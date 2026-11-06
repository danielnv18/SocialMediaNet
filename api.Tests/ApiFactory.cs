using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using SocialMedia.Api.Application.Auth;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"socialmedia-tests-{Guid.NewGuid():N}.db");

    public CapturingPasswordResetSender ResetSender { get; } = new();

    public HttpClient CreateSessionClient() => CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_dbPath}");
        builder.ConfigureTestServices(services => services.AddSingleton<IPasswordResetSender>(ResetSender));
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        SqliteConnection.ClearAllPools();
        foreach (var file in new[] { _dbPath, $"{_dbPath}-shm", $"{_dbPath}-wal" })
            File.Delete(file);
    }
}

public sealed class CapturingPasswordResetSender : IPasswordResetSender
{
    readonly ConcurrentDictionary<string, string> _linksByEmail = new(StringComparer.OrdinalIgnoreCase);

    public Task SendAsync(User user, string resetLink, CancellationToken cancellationToken)
    {
        _linksByEmail[user.Email!] = resetLink;
        return Task.CompletedTask;
    }

    public string? LinkFor(string email) => _linksByEmail.GetValueOrDefault(email);
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "Api";
}
