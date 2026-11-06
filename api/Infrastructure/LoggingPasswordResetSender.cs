using SocialMedia.Api.Application.Auth;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Infrastructure;

public class LoggingPasswordResetSender(ILogger<LoggingPasswordResetSender> logger) : IPasswordResetSender
{
    public Task SendAsync(User user, string resetLink, CancellationToken cancellationToken)
    {
        logger.LogInformation("Password reset link for {Email}: {ResetLink}", user.Email, resetLink);
        return Task.CompletedTask;
    }
}
