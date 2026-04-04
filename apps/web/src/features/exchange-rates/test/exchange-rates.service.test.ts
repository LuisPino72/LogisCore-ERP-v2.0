import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExchangeRatesService, type ExchangeRatesDb } from "../services/exchange-rates.service";

const mockRates: Record<string, any[]> = {};

const createMockDb = (): ExchangeRatesDb => ({
  listExchangeRates: vi.fn(async (tenantId: string) => {
    return mockRates[tenantId] || [];
  }),
  getActiveRate: vi.fn(async (tenantId: string, fromCurrency: string, toCurrency: string) => {
    const rates = mockRates[tenantId] || [];
    return rates.find(
      (r) =>
        r.fromCurrency === fromCurrency &&
        r.toCurrency === toCurrency &&
        !r.deletedAt
    );
  }),
  createExchangeRate: vi.fn(async (rate: any) => {
    const tenantId = rate.tenantId;
    if (!mockRates[tenantId]) {
      mockRates[tenantId] = [];
    }
    mockRates[tenantId].push(rate);
  })
});

describe("exchange-rates.service", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    Object.keys(mockRates).forEach((key) => {
      delete mockRates[key];
    });
  });

  describe("calculatePriceInBs", () => {
    it("calcula precio en Bs correctamente", () => {
      const service = createExchangeRatesService({ db: mockDb });
      
      const result = service.calculatePriceInBs(10, 480);
      expect(result).toBe(4800);
    });

    it("redondea a 2 decimales", () => {
      const service = createExchangeRatesService({ db: mockDb });
      
      const result = service.calculatePriceInBs(10.5, 485.25);
      expect(result).toBe(5095.13);
    });

    it("maneja precio 0", () => {
      const service = createExchangeRatesService({ db: mockDb });
      
      const result = service.calculatePriceInBs(0, 480);
      expect(result).toBe(0);
    });
  });

  describe("getActiveRate", () => {
    it("retorna tasa activa del tenant", async () => {
      const now = new Date().toISOString();
      mockRates["test-tenant"] = [
        {
          localId: "rate-1",
          tenantId: "test-tenant",
          fromCurrency: "USD",
          toCurrency: "VES",
          rate: 480,
          source: "BCV",
          validFrom: now,
          validTo: "",
          createdAt: now,
          updatedAt: now,
          deletedAt: ""
        }
      ];

      const service = createExchangeRatesService({ db: mockDb });
      const result = await service.getActiveRate("test-tenant", "USD", "VES");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data?.rate).toBe(480);
      }
    });

    it("retorna null si no hay tasa", async () => {
      const service = createExchangeRatesService({ db: mockDb });
      const result = await service.getActiveRate("empty-tenant", "USD", "VES");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeNull();
      }
    });

    it("retorna error si falla DB", async () => {
      const failingDb: ExchangeRatesDb = {
        listExchangeRates: vi.fn(),
        getActiveRate: vi.fn(async () => {
          throw new Error("DB error");
        }),
        createExchangeRate: vi.fn()
      };

      const service = createExchangeRatesService({ db: failingDb });
      const result = await service.getActiveRate("test-tenant", "USD", "VES");

      expect(result.ok).toBe(false);
    });
  });

  describe("fetchAndSaveRates", () => {
    it("hace fetch de la API y guarda tasas", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { fuente: "BCV", nombre: "Dolar BCV", compra: 480, venta: 480 },
          { fuente: "Monitor", nombre: "Dolar Paralelo", compra: 485, venta: 488 }
        ]
      }) as any;

      const service = createExchangeRatesService({ db: mockDb });
      const result = await service.fetchAndSaveRates();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data?.fetched).toBe(2);
      }
    });

    it("retorna error si la API falla", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any;

      const service = createExchangeRatesService({ db: mockDb });
      const result = await service.fetchAndSaveRates();

      expect(result.ok).toBe(false);
    });

    it("ignora tasas con valor 0 o negativo", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { fuente: "BCV", nombre: "Dolar BCV", compra: 0, venta: 0 },
          { fuente: "Monitor", nombre: "Dolar Paralelo", compra: 485, venta: 488 }
        ]
      }) as any;

      const service = createExchangeRatesService({ db: mockDb });
      const result = await service.fetchAndSaveRates();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data?.fetched).toBe(1);
      }
    });
  });
});
