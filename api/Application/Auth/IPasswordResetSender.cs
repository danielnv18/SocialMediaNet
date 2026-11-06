using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Application.Auth;

public interface IPasswordResetSender
{
    Task SendAsync(User user, string resetLink, CancellationToken cancellationToken);
}
