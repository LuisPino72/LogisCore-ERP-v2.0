import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  private page: Page;
  private emailInput: Locator;
  private passwordInput: Locator;
  private submitButton: Locator;
  private errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.alert-error, [class*="alert-error"], [role="alert"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async waitForRedirect(targetPath: string, timeout = 30000): Promise<void> {
    await this.page.waitForURL(`**${targetPath}`, { timeout });
  }

  async waitForBootstrapComplete(timeout = 60000): Promise<void> {
    await this.page.waitForFunction(() => {
      const state = (window as unknown as { __LOGISCORE_BOOTSTRAP_STATE__?: { bootstrapped: boolean } }).__LOGISCORE_BOOTSTRAP_STATE__;
      return state?.bootstrapped === true;
    }, { timeout });
  }
}