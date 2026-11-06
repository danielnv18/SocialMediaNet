using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Application.Auth;

public record RegisterRequest(string UserName, string Email, string Password);

public record LoginRequest(string Login, string Password);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Email, string Token, string NewPassword);

public record UserDto(Guid Id, string UserName, string Email)
{
    public static UserDto From(User user) => new(user.Id, user.UserName!, user.Email!);
}
