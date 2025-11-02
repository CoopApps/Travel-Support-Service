import { Customer } from '../../types';
import './PaymentStructureDisplay.css';

interface PaymentStructureDisplayProps {
  customer: Customer;
}

/**
 * Payment Structure Display - Matching Legacy Design
 *
 * Shows payment provider and split payment status
 */
function PaymentStructureDisplay({ customer }: PaymentStructureDisplayProps) {
  if (customer.has_split_payment) {
    return (
      <div className="payment-structure">
        <div className="payment-badge split-payment">
          Split Payment
        </div>
        {customer.provider_split && (
          <div className="payment-providers">
            {Object.entries(customer.provider_split).map(([provider, percentage]) => (
              <div key={provider} className="payment-provider-item">
                {provider}: {percentage}%
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const payingOrg = customer.paying_org || 'Self-Pay';
  const isSelfPay = payingOrg === 'Self-Pay';

  return (
    <div className="payment-structure">
      <div className={`payment-badge ${isSelfPay ? 'self-pay' : 'single-provider'}`}>
        {payingOrg}
      </div>
    </div>
  );
}

export default PaymentStructureDisplay;
