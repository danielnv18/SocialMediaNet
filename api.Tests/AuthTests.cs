using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Tests;

[Collection(ApiCollection.Name)]
public class AuthTests(ApiFactory factory)
{
    const string SeedPassword = "P@ssw0rd!";

    [Fact]
    public async Task Seed_creates_100_example_users_including_dnoyola()
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var seeded = await users.Users.Where(u => u.Email!.EndsWith("@example.com")).ToListAsync();

        Assert.Equal(100, seeded.Count);
        Assert.Equal(100, seeded.Select(u => u.NormalizedUserName).Distinct().Count());
        Assert.All(seeded, u => Assert.True(u.EmailConfirmed));
        var dnoyola = Assert.Single(seeded, u => u.UserName == "dnoyola");
        Assert.Equal("dnoyola@example.com", dnoyola.Email);

        var other = seeded.First(u => u.UserName != "dnoyola");
        var login = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/login", new { login = other.UserName, password = SeedPassword });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Theory]
    [InlineData("dnoyola")]
    [InlineData("dnoyola@example.com")]
    public async Task Login_by_username_or_email_starts_a_session(string login)
    {
        var client = factory.CreateSessionClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new { login, password = SeedPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("sm.session=") && c.Contains("httponly"));
        Assert.Equal(("dnoyola", "dnoyola@example.com"), await ReadUser(response));

        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal(("dnoyola", "dnoyola@example.com"), await ReadUser(me));
    }

    [Fact]
    public async Task Login_with_wrong_password_is_unauthorized()
    {
        var response = await factory.CreateSessionClient()
            .PostAsJsonAsync("/api/auth/login", new { login = "dnoyola", password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Invalid username or password.", (await ReadJson(response)).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Login_for_unknown_user_is_unauthorized()
    {
        var response = await factory.CreateSessionClient()
            .PostAsJsonAsync("/api/auth/login", new { login = "nobody-here", password = SeedPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Repeated_failed_logins_lock_the_account()
    {
        var (userName, _) = await RegisterNewUser(factory.CreateSessionClient());
        var client = factory.CreateSessionClient();

        for (var attempt = 0; attempt < 5; attempt++)
            await client.PostAsJsonAsync("/api/auth/login", new { login = userName, password = "wrong-password" });
        var response = await client.PostAsJsonAsync("/api/auth/login", new { login = userName, password = SeedPassword });

        Assert.Equal((HttpStatusCode)429, response.StatusCode);
    }

    [Fact]
    public async Task Me_without_a_session_is_unauthorized()
    {
        var response = await factory.CreateSessionClient().GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_ends_the_session()
    {
        var client = factory.CreateSessionClient();
        await client.PostAsJsonAsync("/api/auth/login", new { login = "dnoyola", password = SeedPassword });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var logout = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
    }

    [Fact]
    public async Task Register_creates_the_user_and_starts_a_session()
    {
        var client = factory.CreateSessionClient();
        var userName = UniqueUserName();

        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { userName, email = $"{userName}@test.invalid", password = SeedPassword });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal((userName, $"{userName}@test.invalid"), await ReadUser(response));
        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal((userName, $"{userName}@test.invalid"), await ReadUser(me));
    }

    [Fact]
    public async Task Register_with_taken_username_reports_the_userName_field()
    {
        var response = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/register",
            new { userName = "dnoyola", email = $"{UniqueUserName()}@test.invalid", password = SeedPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True((await ReadJson(response)).GetProperty("errors").TryGetProperty("userName", out _));
    }

    [Fact]
    public async Task Register_with_missing_fields_reports_each_field()
    {
        var response = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/register",
            new { userName = "", email = "  " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await ReadJson(response)).GetProperty("errors");
        Assert.Equal(["email", "password", "userName"], errors.EnumerateObject().Select(p => p.Name).Order());
    }

    [Fact]
    public async Task Forgot_password_for_unknown_email_is_accepted_and_sends_nothing()
    {
        var email = $"{UniqueUserName()}@test.invalid";

        var response = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/forgot-password", new { email });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Null(factory.ResetSender.LinkFor(email));
    }

    [Fact]
    public async Task Reset_password_with_emailed_link_replaces_the_password()
    {
        var (userName, email) = await RegisterNewUser(factory.CreateSessionClient());
        const string newPassword = "N3w-P@ssw0rd!";

        var forgot = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.Accepted, forgot.StatusCode);
        var link = new Uri(factory.ResetSender.LinkFor(email) ?? throw new Xunit.Sdk.XunitException("no reset link sent"));
        Assert.Equal("http://localhost:5173/reset-password", link.GetLeftPart(UriPartial.Path));
        var query = QueryHelpers.ParseQuery(link.Query);
        Assert.Equal(email, query["email"].ToString());

        var reset = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/reset-password",
            new { email, token = query["token"].ToString(), newPassword });

        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        var withNew = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/login", new { login = userName, password = newPassword });
        Assert.Equal(HttpStatusCode.OK, withNew.StatusCode);
        var withOld = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/login", new { login = userName, password = SeedPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, withOld.StatusCode);
    }

    public static TheoryData<string> BogusTokens => new()
    {
        "bogus",
        WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes("not-a-real-token")),
    };

    [Theory]
    [MemberData(nameof(BogusTokens))]
    public async Task Reset_password_with_bogus_token_reports_the_token_field(string token)
    {
        var response = await factory.CreateSessionClient().PostAsJsonAsync("/api/auth/reset-password",
            new { email = "dnoyola@example.com", token, newPassword = "N3w-P@ssw0rd!" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var tokenErrors = (await ReadJson(response)).GetProperty("errors").GetProperty("token");
        Assert.Equal("This reset link is invalid or has expired.", tokenErrors[0].GetString());
    }

    static string UniqueUserName() => $"user{Guid.NewGuid():N}"[..16];

    static async Task<(string UserName, string Email)> RegisterNewUser(HttpClient client)
    {
        var userName = UniqueUserName();
        var email = $"{userName}@test.invalid";
        var response = await client.PostAsJsonAsync("/api/auth/register", new { userName, email, password = SeedPassword });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (userName, email);
    }

    static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    static async Task<(string?, string?)> ReadUser(HttpResponseMessage response)
    {
        var json = await ReadJson(response);
        Assert.True(Guid.TryParse(json.GetProperty("id").GetString(), out _));
        return (json.GetProperty("userName").GetString(), json.GetProperty("email").GetString());
    }
}
