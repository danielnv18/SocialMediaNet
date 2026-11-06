using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using SocialMedia.Api.Domain;

namespace SocialMedia.Api.Infrastructure;

// Concurrent logins for one user race on the row's ConcurrencyStamp. Without a reload and retry,
// the losing lockout-counter write is dropped: a correct login fails, or a wrong guess goes uncounted.
public class AppUserManager(
    AppDbContext db,
    IUserStore<User> store,
    IOptions<IdentityOptions> optionsAccessor,
    IPasswordHasher<User> passwordHasher,
    IEnumerable<IUserValidator<User>> userValidators,
    IEnumerable<IPasswordValidator<User>> passwordValidators,
    ILookupNormalizer keyNormalizer,
    IdentityErrorDescriber errors,
    IServiceProvider services,
    ILogger<UserManager<User>> logger)
    : UserManager<User>(store, optionsAccessor, passwordHasher, userValidators, passwordValidators, keyNormalizer,
        errors, services, logger)
{
    const int MaxAttempts = 5;

    public override Task<IdentityResult> AccessFailedAsync(User user) =>
        RetryOnConcurrencyFailure(user, u => base.AccessFailedAsync(u));

    public override Task<IdentityResult> ResetAccessFailedCountAsync(User user) =>
        RetryOnConcurrencyFailure(user, u => base.ResetAccessFailedCountAsync(u));

    async Task<IdentityResult> RetryOnConcurrencyFailure(User user, Func<User, Task<IdentityResult>> write)
    {
        for (var attempt = 1; ; attempt++)
        {
            var result = await write(user);
            var conflicted = result.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.ConcurrencyFailure));
            if (!conflicted || attempt == MaxAttempts)
                return result;
            await db.Entry(user).ReloadAsync();
        }
    }
}
