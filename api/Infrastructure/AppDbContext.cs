using Microsoft.EntityFrameworkCore;

namespace SocialMedia.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // Add DbSet<T> properties for your entities here.
}
