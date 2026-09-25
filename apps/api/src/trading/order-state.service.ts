import { Injectable, BadRequestException } from '@nestjs/common';

export type OrderStatus = 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED';

@Injectable()
export class OrderStateService {
  private validTransitions: Record<OrderStatus, OrderStatus[]> = {
    'PENDING': ['OPEN', 'REJECTED'],
    'OPEN': ['FILLED', 'CANCELLED'],
    'FILLED': [],
    'CANCELLED': [],
    'REJECTED': [],
  };

  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const allowed = this.validTransitions[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(`Invalid order status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  canTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const allowed = this.validTransitions[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }
}
