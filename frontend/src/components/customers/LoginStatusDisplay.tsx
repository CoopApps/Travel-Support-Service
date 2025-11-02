import { Customer } from '../../types';
import './LoginStatusDisplay.css';

interface LoginStatusDisplayProps {
  customer: Customer;
}

/**
 * Login Status Display - Matching Legacy Design
 *
 * Shows if customer portal login is enabled, username, and last login date
 */
function LoginStatusDisplay({ customer }: LoginStatusDisplayProps) {
  if (customer.is_login_enabled) {
    return (
      <div className="login-status">
        <div className="login-badge login-enabled">
          ✓ ENABLED
        </div>
        {customer.username && (
          <div className="login-username">
            User: {customer.username}
          </div>
        )}
        {customer.last_login && (
          <div className="login-last">
            Last: {new Date(customer.last_login).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="login-status">
      <div className="login-badge login-disabled">
        ✗ DISABLED
      </div>
    </div>
  );
}

export default LoginStatusDisplay;
