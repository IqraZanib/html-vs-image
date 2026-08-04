'use strict';
class BudgetExceededError extends Error {}

// Simple credit-spend guard: a batch bug cannot silently burn API spend.
class BudgetGuard {
  constructor(ceiling = Infinity) { this.ceiling = ceiling; this._spent = 0; }
  spend(credits) {
    const c = Number(credits) || 0;
    if (this._spent + c > this.ceiling) {
      throw new BudgetExceededError(`budget exceeded: ${this._spent}+${c} > ${this.ceiling}`);
    }
    this._spent += c;
  }
  spent() { return this._spent; }
  remaining() { return this.ceiling === Infinity ? Infinity : Math.max(0, this.ceiling - this._spent); }
}

module.exports = { BudgetGuard, BudgetExceededError };
