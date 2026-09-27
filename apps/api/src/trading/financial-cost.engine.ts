import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';
import { CostModelType } from 'database';

export interface CostCalculationRequest {
  side: 'BUY' | 'SELL';
  quantity: Prisma.Decimal;
  expectedPrice: Prisma.Decimal;
  costProfile?: {
    brokerageModel: string;
    brokerageValue: Prisma.Decimal;
    exchangeFeeModel: string;
    exchangeFeeValue: Prisma.Decimal;
    taxModel: string;
    taxValue: Prisma.Decimal;
    slippageModel: string;
    slippageValue: Prisma.Decimal;
  } | null;
}

export interface CostBreakdown {
  brokerage: Prisma.Decimal;
  exchangeFees: Prisma.Decimal;
  taxes: Prisma.Decimal;
  slippageCost: Prisma.Decimal;
  otherCosts: Prisma.Decimal;
  totalCosts: Prisma.Decimal;
}

export interface CostCalculationResult {
  executionPrice: Prisma.Decimal;
  breakdown: CostBreakdown;
}

export interface CostProfileConfig {
  name: string;
  description?: string;
  brokerageModel: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'PER_UNIT';
  brokerageValue: Prisma.Decimal;
  exchangeFeeModel: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'PER_UNIT';
  exchangeFeeValue: Prisma.Decimal;
  taxModel: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'PER_UNIT';
  taxValue: Prisma.Decimal;
  slippageModel: 'NONE' | 'FIXED' | 'PERCENTAGE';
  slippageValue: Prisma.Decimal;
  effectiveFrom: Date;
  active: boolean;
}

@Injectable()
export class FinancialCostEngine {
  private calculateComponent(model: string, value: Prisma.Decimal, grossValue: Prisma.Decimal, quantity: Prisma.Decimal): Prisma.Decimal {
    switch (model) {
      case 'PERCENTAGE':
        return grossValue.mul(value).div(100);
      case 'FIXED':
        return value;
      case 'PER_UNIT':
        return quantity.mul(value);
      case 'NONE':
      default:
        return new Prisma.Decimal(0);
    }
  }

  private calculateSlippage(
    side: 'BUY' | 'SELL',
    expectedPrice: Prisma.Decimal,
    slippageModel: string,
    slippageValue: Prisma.Decimal
  ): { executionPrice: Prisma.Decimal; slippageCost: Prisma.Decimal } {
    let executionPrice = expectedPrice;
    let slippageCost = new Prisma.Decimal(0);

    if (slippageModel !== 'NONE') {
      let slippagePerUnit = new Prisma.Decimal(0);
      if (slippageModel === 'FIXED') {
        slippagePerUnit = slippageValue;
      } else if (slippageModel === 'PERCENTAGE') {
        slippagePerUnit = expectedPrice.mul(slippageValue).div(100);
      }

      if (side === 'BUY') {
        executionPrice = expectedPrice.add(slippagePerUnit);
      } else {
        executionPrice = expectedPrice.sub(slippagePerUnit);
        if (executionPrice.lt(0)) executionPrice = new Prisma.Decimal(0);
      }

      slippageCost = expectedPrice.sub(executionPrice).abs().mul(1);
    }

    return { executionPrice, slippageCost };
  }

  calculateCosts(req: CostCalculationRequest): CostCalculationResult {
    const { side, quantity, expectedPrice, costProfile } = req;

    const { executionPrice, slippageCost } = this.calculateSlippage(
      side,
      expectedPrice,
      costProfile?.slippageModel || 'NONE',
      costProfile?.slippageValue || new Prisma.Decimal(0)
    );

    const grossValue = quantity.mul(executionPrice);

    let brokerage = new Prisma.Decimal(0);
    let exchangeFees = new Prisma.Decimal(0);
    let taxes = new Prisma.Decimal(0);
    let otherCosts = new Prisma.Decimal(0);

    if (costProfile) {
      brokerage = this.calculateComponent(costProfile.brokerageModel, costProfile.brokerageValue, grossValue, quantity);
      exchangeFees = this.calculateComponent(costProfile.exchangeFeeModel, costProfile.exchangeFeeValue, grossValue, quantity);
      taxes = this.calculateComponent(costProfile.taxModel, costProfile.taxValue, grossValue, quantity);
    } else {
      brokerage = grossValue.mul(new Prisma.Decimal('0.001'));
    }

    const totalCosts = brokerage.add(exchangeFees).add(taxes).add(otherCosts).add(slippageCost);

    return {
      executionPrice: executionPrice.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
      breakdown: {
        brokerage: brokerage.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
        exchangeFees: exchangeFees.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
        taxes: taxes.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
        slippageCost: slippageCost.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
        otherCosts: otherCosts.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
        totalCosts: totalCosts.toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP),
      },
    };
  }

  getCostProfileFromDb(profile: any): CostCalculationRequest['costProfile'] {
    if (!profile) return null;
    return {
      brokerageModel: profile.brokerageModel,
      brokerageValue: profile.brokerageValue,
      exchangeFeeModel: profile.exchangeFeeModel,
      exchangeFeeValue: profile.exchangeFeeValue,
      taxModel: profile.taxModel,
      taxValue: profile.taxValue,
      slippageModel: profile.slippageModel,
      slippageValue: profile.slippageValue,
    };
  }
}