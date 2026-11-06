import { expect, type Page, test } from "@playwright/test";

const seeded = { userName: "dnoyola", email: "dnoyola@example.com", password: "P@ssw0rd!" };

const uniqueName = (prefix: string) => `${prefix}${Date.now()}w${test.info().parallelIndex}`;

async function logIn(page: Page, login: string, password: string) {
  await page.getByLabel("Username or email").fill(login);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function fillRegistration(page: Page, userName: string, email: string) {
  await page.getByLabel("Username").fill(userName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("P@ssw0rd!");
  await page.getByLabel("Confirm password").fill("P@ssw0rd!");
  await page.getByRole("button", { name: "Create account" }).click();
}

test("an anonymous visitor to / is sent to log in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login\?redirect=\/$/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("logging in shows home, survives a reload, and logging out ends the session", async ({
  page,
}) => {
  await page.goto("/login");
  await logIn(page, seeded.userName, seeded.password);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(`Signed in as ${seeded.userName}`)).toBeVisible();
  await expect(page.getByText(seeded.email)).toBeVisible();

  await page.reload();
  await expect(page.getByText(`Signed in as ${seeded.userName}`)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?redirect=\/$/);
});

test("logging in by email honors the redirect", async ({ page }) => {
  await page.goto("/login?redirect=%2F");
  await logIn(page, seeded.email, seeded.password);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(`Signed in as ${seeded.userName}`)).toBeVisible();
});

// Uses its own user: a failed attempt on a shared account races other workers' logins for
// Identity's lockout counter and can fail them.
test("a wrong password shows the server's error", async ({ page, request }) => {
  const userName = uniqueName("wrongpw");
  const created = await request.post("/api/auth/register", {
    data: { userName, email: `${userName}@example.com`, password: seeded.password },
  });
  expect(created.status()).toBe(201);

  await page.goto("/login");
  await logIn(page, userName, "Wr0ng-password!");

  await expect(page.getByRole("alert")).toContainText("Invalid username or password.");
  await expect(page).toHaveURL(/\/login/);
});

test("registering a new user lands on home", async ({ page }) => {
  const userName = uniqueName("user");
  await page.goto("/register");

  await fillRegistration(page, userName, `${userName}@example.com`);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(`Signed in as ${userName}`)).toBeVisible();
});

test("registering a taken username shows the error on that field", async ({ page }) => {
  await page.goto("/register");

  await fillRegistration(page, seeded.userName, `${uniqueName("taken")}@example.com`);

  await expect(page.getByLabel("Username")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/is already taken/)).toBeVisible();
});

test("asking for a reset link always shows the same confirmation", async ({ page }) => {
  await page.goto("/forgot-password");

  await page.getByLabel("Email").fill(seeded.email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(
    page.getByText("If an account exists for that email, we've sent a reset link."),
  ).toBeVisible();
});

test("a rejected reset token offers a new link", async ({ page }) => {
  await page.goto(`/reset-password?email=${encodeURIComponent(seeded.email)}&token=bogus`);

  await page.getByLabel("New password", { exact: true }).fill("N3w-P@ssword");
  await page.getByLabel("Confirm new password").fill("N3w-P@ssword");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByRole("alert")).toContainText("This reset link is invalid or has expired.");
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL("/forgot-password");
});
