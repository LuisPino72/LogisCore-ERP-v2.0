import type { Page, Locator } from '@playwright/test';

export class SalesPage {
  private page: Page;

  private searchInput: Locator;
  private productGrid: Locator;
  private cartItems: Locator;
  private cartTotal: Locator;
  private finalizeButton: Locator;
  private suspendButton: Locator;
  private clearCartButton: Locator;

  private openBoxButton: Locator;
  private warehouseSelect: Locator;

  private addPaymentButton: Locator;
  private paymentMethodSelect: Locator;
  private paymentAmountInput: Locator;

  private suspendedTab: Locator;
  private boxClosingsTab: Locator;

  private boxStatusIndicator: Locator;
  private suspendedCountBadge: Locator;

  private alertError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchInput = page.locator('input[placeholder*="buscar"], input[type="search"]').first();
    this.productGrid = page.locator('[class*="grid"]:has(div[class*="product"]), [class*="bento"]');
    this.cartItems = page.locator('[class*="cart"] li, [class*="cart-item"]');
    this.cartTotal = page.locator('[class*="total"]:has-text("Total"), .total-amount');
    this.finalizeButton = page.locator('button:has-text("Finalizar"), button:has-text("Cobrar")');
    this.suspendButton = page.locator('button:has-text("Suspender")');
    this.clearCartButton = page.locator('button:has-text("Limpiar"), button:has-text("Vaciar")');

    this.openBoxButton = page.locator('button:has-text("Abrir caja"), button:has-text("Abrir Caja")');
    this.warehouseSelect = page.locator('select[name*="warehouse"], [class*="warehouse"] select').first();

    this.addPaymentButton = page.locator('button:has-text("Agregar pago"), button:has-text("Añadir")');
    this.paymentMethodSelect = page.locator('select[name*="method"], [class*="payment"] select').first();
    this.paymentAmountInput = page.locator('input[name*="amount"], input[placeholder*="monto"]').first();

    this.suspendedTab = page.locator('button:has-text("Suspendidas"), [data-tab="suspended"]');
    this.boxClosingsTab = page.locator('button:has-text("Cierres"), [data-tab="closings"]');

    this.boxStatusIndicator = page.locator('[class*="box-status"], [class*="caja"]');
    this.suspendedCountBadge = page.locator('[class*="badge"]:has-text("suspendida")');

    this.alertError = page.locator('.alert-error, [role="alert"], [class*="error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/sales');
  }

  async selectWarehouse(warehouseName: string): Promise<void> {
    await this.warehouseSelect.click();
    await this.page.locator(`option:has-text("${warehouseName}")`).click();
  }

  async searchProduct(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  async addProductToCart(productName: string): Promise<void> {
    await this.productGrid.locator(`button:has-text("${productName}")`).first().click();
  }

  async addProductByClick(productCard: Locator): Promise<void> {
    await productCard.click();
  }

  async updateCartItemQuantity(index: number, quantity: number): Promise<void> {
    const increaseBtn = this.cartItems.nth(index).locator('button:has-text("+")');
    const decreaseBtn = this.cartItems.nth(index).locator('button:has-text("-")');
    
    if (quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        await increaseBtn.click();
      }
    } else {
      await decreaseBtn.click();
    }
  }

  async removeCartItem(index: number): Promise<void> {
    await this.cartItems.nth(index).locator('button:has-text("×"), button:has-text("Eliminar")').click();
  }

  async clearCart(): Promise<void> {
    await this.clearCartButton.click();
  }

  async openBox(openingAmount: number = 0): Promise<void> {
    await this.openBoxButton.click();
    const amountInput = this.page.locator('input[name="openingAmount"], input[placeholder*="monto"]');
    if (await amountInput.isVisible()) {
      await amountInput.fill(openingAmount.toString());
    }
    const confirmButton = this.page.locator('button:has-text("Confirmar"), button:has-text("Abrir")');
    await confirmButton.click();
  }

  async closeBox(): Promise<void> {
    const closeButton = this.page.locator('button:has-text("Cerrar caja"), button:has-text("Cerrar Caja")');
    await closeButton.click();
  }

  async addPayment(method: 'cash' | 'card' | 'transfer' | 'mobile', amount: number, currency: 'VES' | 'USD' = 'VES'): Promise<void> {
    await this.addPaymentButton.click();
    
    if (await this.paymentMethodSelect.isVisible()) {
      await this.paymentMethodSelect.selectOption(method);
    }
    
    if (await this.paymentAmountInput.isVisible()) {
      await this.paymentAmountInput.fill(amount.toString());
    }
    
    const currencySelect = this.page.locator('select[name*="currency"]');
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption(currency);
    }
    
    const confirmButton = this.page.locator('button:has-text("Confirmar"), button:has-text("Agregar")');
    await confirmButton.click();
  }

  async finalizeSale(): Promise<void> {
    await this.finalizeButton.click();
  }

  async suspendSale(notes: string = ''): Promise<void> {
    await this.suspendButton.click();
    const notesInput = this.page.locator('textarea[name*="notes"], input[placeholder*="nota"]');
    if (await notesInput.isVisible() && notes) {
      await notesInput.fill(notes);
    }
    const confirmButton = this.page.locator('button:has-text("Confirmar"), button:has-text("Suspender")');
    await confirmButton.click();
  }

  async getCartTotal(): Promise<string> {
    return this.cartTotal.textContent();
  }

  async isBoxOpen(): Promise<boolean> {
    const text = await this.boxStatusIndicator.textContent();
    return text?.toLowerCase().includes('abierta') ?? false;
  }

  async getSuspendedCount(): Promise<number> {
    const text = await this.suspendedCountBadge.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.alertError.isVisible()) {
      return this.alertError.textContent();
    }
    return null;
  }

  async waitForSaleComplete(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(() => {
      return (window as unknown as { __LOGISCORE_EVENT__?: string }).__LOGISCORE_EVENT__ === 'SALE.COMPLETED';
    }, { timeout });
  }

  async waitForBoxOpen(timeout = 5000): Promise<void> {
    await this.page.waitForFunction(() => {
      const indicator = document.querySelector('[class*="box-status"], [class*="caja"]');
      return indicator?.textContent?.toLowerCase().includes('abierta');
    }, { timeout });
  }

  async waitForError(errorCode: string, timeout = 5000): Promise<void> {
    await this.alertError.waitFor({ state: 'visible', timeout });
    const errorText = await this.alertError.textContent();
    if (!errorText?.includes(errorCode)) {
      throw new Error(`Expected error code ${errorCode} but got: ${errorText}`);
    }
  }
}