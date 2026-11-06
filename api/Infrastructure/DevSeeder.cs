using System.Text.RegularExpressions;
using Bogus;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Infrastructure;

public static partial class DevSeeder
{
    public const string Password = "P@ssw0rd!";
    const int UserCount = 100;

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        if (await userManager.Users.AnyAsync())
            return;

        foreach (var userName in UserNames())
        {
            var user = new User { UserName = userName, Email = $"{userName}@example.com", EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(
                    $"Seeding {userName} failed: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }
    }

    static IEnumerable<string> UserNames()
    {
        var faker = new Faker { Random = new Randomizer(42) };
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "dnoyola" };
        while (names.Count < UserCount)
            names.Add(DisallowedUserNameChars().Replace(faker.Internet.UserName(), "").ToLowerInvariant());
        return names;
    }

    [GeneratedRegex("[^a-zA-Z0-9._-]")]
    private static partial Regex DisallowedUserNameChars();
}
