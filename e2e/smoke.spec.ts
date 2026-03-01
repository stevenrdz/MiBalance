import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test("redirect to login when accessing protected dashboard unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("user can sign in and reach dashboard", async ({ page, request }) => {
  test.skip(!supabaseUrl || !anonKey, "Missing Supabase env vars for E2E.");

  const authFailures: string[] = [];
  const authStatuses: string[] = [];
  const consoleErrors: string[] = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("/auth/v1/")) {
      authFailures.push(`${req.url()} => ${req.failure()?.errorText ?? "unknown error"}`);
    }
  });
  page.on("response", (res) => {
    if (res.url().includes("/auth/v1/")) {
      authStatuses.push(`${res.url()} => ${res.status()}`);
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const email = `e2e_${Date.now()}@example.com`;
  const password = "Pango123!";

  const signUpResponse = await request.post(`${supabaseUrl}/auth/v1/signup`, {
    headers: {
      apikey: anonKey!,
      "Content-Type": "application/json"
    },
    data: {
      email,
      password
    }
  });

  expect(signUpResponse.ok()).toBeTruthy();

  await page.goto("/auth/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  } catch {
    throw new Error(
      `Login no redirigió a dashboard. Auth statuses: ${authStatuses.join(" | ")}. Auth failures: ${authFailures.join(" | ")}. Console errors: ${consoleErrors.join(" | ")}`
    );
  }
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
