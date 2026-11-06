using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Application.Auth;

public static class AuthEndpoints
{
    const string InvalidCredentials = "Invalid username or password.";
    const string LockedOut = "Too many failed attempts. Try again later.";
    const string InvalidResetLink = "This reset link is invalid or has expired.";

    static readonly string[] PasswordErrorCodes =
    [
        nameof(IdentityErrorDescriber.PasswordTooShort),
        nameof(IdentityErrorDescriber.PasswordRequiresUniqueChars),
        nameof(IdentityErrorDescriber.PasswordRequiresNonAlphanumeric),
        nameof(IdentityErrorDescriber.PasswordRequiresDigit),
        nameof(IdentityErrorDescriber.PasswordRequiresLower),
        nameof(IdentityErrorDescriber.PasswordRequiresUpper),
    ];

    static readonly Dictionary<string, string> RegisterErrorFields = new Dictionary<string, string>
    {
        [nameof(IdentityErrorDescriber.DuplicateUserName)] = "userName",
        [nameof(IdentityErrorDescriber.InvalidUserName)] = "userName",
        [nameof(IdentityErrorDescriber.DuplicateEmail)] = "email",
        [nameof(IdentityErrorDescriber.InvalidEmail)] = "email",
    }.Concat(PasswordErrorCodes.Select(code => KeyValuePair.Create(code, "password"))).ToDictionary();

    static readonly Dictionary<string, string> ResetErrorFields =
        PasswordErrorCodes.ToDictionary(code => code, _ => "newPassword");

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/logout", Logout);
        group.MapGet("/me", Me).RequireAuthorization();
        group.MapPost("/forgot-password", ForgotPassword);
        group.MapPost("/reset-password", ResetPassword);

        return app;
    }

    static async Task<Results<Created<UserDto>, ValidationProblem>> Register(
        RegisterRequest request, UserManager<User> users, SignInManager<User> signIn)
    {
        if (MissingFields(("userName", request.UserName), ("email", request.Email), ("password", request.Password))
            is { } missing)
            return missing;

        var user = new User { UserName = request.UserName, Email = request.Email };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return ToValidationProblem(result, RegisterErrorFields);

        await signIn.SignInAsync(user, isPersistent: true);
        return TypedResults.Created("/api/auth/me", UserDto.From(user));
    }

    static async Task<Results<Ok<UserDto>, ValidationProblem, ProblemHttpResult>> Login(
        LoginRequest request, UserManager<User> users, SignInManager<User> signIn)
    {
        if (MissingFields(("login", request.Login), ("password", request.Password)) is { } missing)
            return missing;

        var user = request.Login.Contains('@')
            ? await users.FindByEmailAsync(request.Login)
            : await users.FindByNameAsync(request.Login);
        if (user is null)
            return TypedResults.Problem(InvalidCredentials, statusCode: StatusCodes.Status401Unauthorized);

        var result = await signIn.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return TypedResults.Problem(LockedOut, statusCode: StatusCodes.Status429TooManyRequests);
        if (!result.Succeeded)
            return TypedResults.Problem(InvalidCredentials, statusCode: StatusCodes.Status401Unauthorized);

        return TypedResults.Ok(UserDto.From(user));
    }

    static async Task<NoContent> Logout(SignInManager<User> signIn)
    {
        await signIn.SignOutAsync();
        return TypedResults.NoContent();
    }

    static async Task<Results<Ok<UserDto>, UnauthorizedHttpResult>> Me(ClaimsPrincipal principal, UserManager<User> users)
    {
        var user = await users.GetUserAsync(principal);
        return user is null ? TypedResults.Unauthorized() : TypedResults.Ok(UserDto.From(user));
    }

    static async Task<Results<Accepted, ValidationProblem>> ForgotPassword(
        ForgotPasswordRequest request,
        UserManager<User> users,
        IPasswordResetSender sender,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (MissingFields(("email", request.Email)) is { } missing)
            return missing;

        var user = await users.FindByEmailAsync(request.Email);
        if (user is not null)
        {
            var baseUrl = configuration["Client:BaseUrl"]
                ?? throw new InvalidOperationException("Client:BaseUrl is not configured.");
            var token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(user)));
            var link = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={token}";
            await sender.SendAsync(user, link, cancellationToken);
        }

        return TypedResults.Accepted((string?)null);
    }

    static async Task<Results<NoContent, ValidationProblem>> ResetPassword(
        ResetPasswordRequest request, UserManager<User> users)
    {
        if (MissingFields(("email", request.Email), ("token", request.Token), ("newPassword", request.NewPassword))
            is { } missing)
            return missing;

        var user = await users.FindByEmailAsync(request.Email);
        if (user is null || DecodeToken(request.Token) is not { } token)
            return InvalidResetLinkProblem();

        var result = await users.ResetPasswordAsync(user, token, request.NewPassword);
        if (result.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.InvalidToken)))
            return InvalidResetLinkProblem();
        if (!result.Succeeded)
            return ToValidationProblem(result, ResetErrorFields);

        return TypedResults.NoContent();
    }

    static ValidationProblem InvalidResetLinkProblem() =>
        TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["token"] = [InvalidResetLink] });

    static string? DecodeToken(string token)
    {
        try
        {
            return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    static ValidationProblem? MissingFields(params (string Field, string? Value)[] fields)
    {
        var errors = fields
            .Where(f => string.IsNullOrWhiteSpace(f.Value))
            .ToDictionary(f => f.Field, _ => new[] { "This field is required." });
        return errors.Count == 0 ? null : TypedResults.ValidationProblem(errors);
    }

    static ValidationProblem ToValidationProblem(IdentityResult result, Dictionary<string, string> fieldByCode)
    {
        var errors = result.Errors
            .GroupBy(e => fieldByCode.GetValueOrDefault(e.Code, string.Empty), e => e.Description)
            .ToDictionary(g => g.Key, g => g.ToArray());
        return TypedResults.ValidationProblem(errors);
    }
}
