import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
  ) {}

  private scoped(manager?: EntityManager): Repository<Payment> {
    return manager ? manager.getRepository(Payment) : this.repo;
  }

  create(input: Partial<Payment>): Payment {
    return this.repo.create(input);
  }

  save(p: Payment, manager?: EntityManager): Promise<Payment> {
    return this.scoped(manager).save(p);
  }

  findByProviderRef(providerRef: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { providerRef } });
  }

  findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { bookingId } });
  }
}
