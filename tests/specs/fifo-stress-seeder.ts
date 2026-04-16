import Dexie from "dexie";

export interface SeederConfig {
  tenantId: string;
  warehouseId: string;
  productsCount: number;
  lotsPerProduct: number;
  varianceCostPercent: number;
}

const DEFAULT_CONFIG: SeederConfig = {
  tenantId: "test-tenant-stress",
  warehouseId: "test-warehouse-001",
  productsCount: 5,
  lotsPerProduct: 10,
  varianceCostPercent: 20
};

export interface SeededProduct {
  localId: string;
  name: string;
  sku: string;
  isWeighted: boolean;
  lots: SeededLot[];
}

export interface SeededLot {
  localId: string;
  productLocalId: string;
  warehouseLocalId: string;
  quantity: number;
  unitCost: number;
  status: "active" | "consumed";
  createdAt: string;
  sourceType: string;
}

export class DbSeeder {
  private db: Dexie;
  private config: SeederConfig;

  constructor(db: Dexie, config: Partial<SeederConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async seed(): Promise<SeededProduct[]> {
    const products: SeededProduct[] = [];

    for (let i = 0; i < this.config.productsCount; i++) {
      const product = await this.seedProduct(i);
      products.push(product);
    }

    await this.verifyFifoOrder(products);
    
    return products;
  }

  private async seedProduct(index: number): Promise<SeededProduct> {
    const productLocalId = crypto.randomUUID();
    const isWeighted = index % 2 === 0;
    const baseCost = 10.00 + (index * 5);
    const lots: SeededLot[] = [];

    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 6);

    for (let lotIdx = 0; lotIdx < this.config.lotsPerProduct; lotIdx++) {
      const costVariation = (Math.random() * 2 - 1) * (this.config.varianceCostPercent / 100);
      const unitCost = Number((baseCost * (1 + costVariation)).toFixed(4));
      const quantity = Number((50 + Math.random() * 100).toFixed(isWeighted ? 4 : 0));

      const lotCreatedAt = new Date(baseDate);
      lotCreatedAt.setDate(lotCreatedAt.getDate() + lotIdx * 5);

      const lot: SeededLot = {
        localId: crypto.randomUUID(),
        productLocalId,
        warehouseLocalId: this.config.warehouseId,
        quantity,
        unitCost,
        status: "active",
        createdAt: lotCreatedAt.toISOString(),
        sourceType: "purchase_receiving"
      };

      lots.push(lot);

      await this.db.table("inventory_lots").add({
        localId: lot.localId,
        tenantId: this.config.tenantId,
        productLocalId: lot.productLocalId,
        warehouseLocalId: lot.warehouseLocalId,
        quantity: lot.quantity,
        unitCost: lot.unitCost,
        status: lot.status,
        createdAt: lot.createdAt,
        updatedAt: lot.createdAt,
        sourceType: lot.sourceType,
        deletedAt: null
      });
    }

    await this.db.table("products").add({
      localId: productLocalId,
      tenantId: this.config.tenantId,
      name: `Producto Test ${index + 1}`,
      sku: `SKU-TEST-${String(index + 1).padStart(4, "0")}`,
      description: `Producto generado para stress test FIFO`,
      isWeighted,
      isSerialized: false,
      isTaxable: true,
      unitOfMeasure: isWeighted ? "kg" : "un",
      visible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });

    return {
      localId: productLocalId,
      name: `Producto Test ${index + 1}`,
      sku: `SKU-TEST-${String(index + 1).padStart(4, "0")}`,
      isWeighted,
      lots
    };
  }

  private async verifyFifoOrder(products: SeededProduct[]): Promise<void> {
    for (const product of products) {
      const lots = await this.db
        .table("inventory_lots")
        .where({ productLocalId: product.localId, status: "active" })
        .sortBy("createdAt");

      const sortedByDate = [...lots].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (let i = 0; i < sortedByDate.length; i++) {
        if (lots[i].localId !== sortedByDate[i].localId) {
          throw new Error(
            `FIFO Order Violation: Los lotes para ${product.name} no están ordenados por createdAt`
          );
        }
      }

      const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
      const avgCost = lots.reduce((sum, lot) => sum + lot.unitCost * lot.quantity, 0) / totalQuantity;

      console.log(
        `[FIFO VERIFIED] ${product.name}: ${lots.length} lotes, ` +
        `Total Qty: ${totalQuantity.toFixed(4)}, Avg Cost: ${avgCost.toFixed(4)}`
      );
    }
  }

  async verifyConsumption(
    productLocalId: string,
    consumedLots: { localId: string; quantity: number; unitCost: number }[]
  ): Promise<{ isCorrect: boolean; totalCost: number; expectedCost: number; variance: number }> {
    const activeLots = await this.db
      .table("inventory_lots")
      .where({ productLocalId, status: "active" })
      .sortBy("createdAt");

    const expectedFirstLot = activeLots[0];
    const actualFirstConsumed = consumedLots[0];

    const isCorrect = expectedFirstLot?.localId === actualFirstConsumed?.localId;

    const totalCost = consumedLots.reduce(
      (sum, lot) => sum + lot.quantity * lot.unitCost,
      0
    );

    const expectedCost = consumedLots.reduce(
      (sum, lot, idx) => sum + lot.quantity * activeLots[idx]?.unitCost,
      0
    );

    const variance = Math.abs(totalCost - expectedCost);

    return {
      isCorrect,
      totalCost: Number(totalCost.toFixed(4)),
      expectedCost: Number(expectedCost.toFixed(4)),
      variance: Number(variance.toFixed(4))
    };
  }

  async cleanup(): Promise<void> {
    await this.db.table("inventory_lots").where({ tenantId: this.config.tenantId }).delete();
    await this.db.table("products").where({ tenantId: this.config.tenantId }).delete();
  }
}

export async function createStressTestData(db: Dexie): Promise<SeederConfig> {
  const seeder = new DbSeeder(db);
  await seeder.seed();
  return seeder.config;
}