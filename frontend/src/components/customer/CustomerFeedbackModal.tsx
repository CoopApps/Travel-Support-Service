import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import { feedbackApi } from '../../services/api';

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

function CustomerFeedbackModal({ isOpen, onClose, onSubmitted }: CustomerFeedbackModalProps) {
  const { tenantId } = useTenant();
  const { user } = useAuthStore();
  const customerId = user?.customerId || user?.customer_id;

  const [feedbackType, setFeedbackType] = useState<'feedback' | 'complaint' | 'compliment' | 'suggestion'>('feedback');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // My previous feedback
  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (isOpen && customerId && tenantId) {
      loadMyFeedback();
    }
  }, [isOpen, customerId, tenantId]);

  const loadMyFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const data = await feedbackApi.getCustomerFeedback(tenantId!, customerId);
      setMyFeedback(data || []);
    } catch {
      // Error handled silently
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!subject.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackApi.createFeedback(tenantId!, {
        customerId,
        feedbackType,
        category: category || undefined,
        subject: subject.trim(),
        description: description.trim(),
        severity: feedbackType === 'complaint' ? severity : undefined
      });

      setSuccess(true);
      // Reset form
      setSubject('');
      setDescription('');
      setCategory('');
      setSeverity('medium');

      // Reload feedback list
      await loadMyFeedback();

      if (onSubmitted) {
        onSubmitted();
      }

      // Show success message for 2 seconds then allow continuing
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      investigating: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      complaint: 'bg-red-100 text-red-800',
      feedback: 'bg-blue-100 text-blue-800',
      compliment: 'bg-green-100 text-green-800',
      suggestion: 'bg-purple-100 text-purple-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Feedback & Support</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submission Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit New Feedback</h3>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  Thank you! Your feedback has been submitted successfully.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'complaint', label: 'Complaint', icon: '⚠️' },
                      { value: 'feedback', label: 'Feedback', icon: '💬' },
                      { value: 'compliment', label: 'Compliment', icon: '👍' },
                      { value: 'suggestion', label: 'Suggestion', icon: '💡' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFeedbackType(type.value as any)}
                        className={`px-4 py-2 rounded-md border-2 transition ${
                          feedbackType === type.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category (optional)</option>
                    <option value="service_quality">Service Quality</option>
                    <option value="driver_behavior">Driver Behavior</option>
                    <option value="vehicle_condition">Vehicle Condition</option>
                    <option value="punctuality">Punctuality</option>
                    <option value="booking_system">Booking System</option>
                    <option value="safety">Safety</option>
                    <option value="accessibility">Accessibility</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Severity (only for complaints) */}
                {feedbackType === 'complaint' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="low">Low - Minor issue</option>
                      <option value="medium">Medium - Moderate concern</option>
                      <option value="high">High - Serious issue</option>
                      <option value="critical">Critical - Urgent attention needed</option>
                    </select>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief summary of your feedback"
                    required
                    maxLength={255}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={5}
                    placeholder="Please provide details about your feedback..."
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>

            {/* My Previous Feedback */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Previous Feedback</h3>

              {loadingFeedback ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : myFeedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No previous feedback submitted.</p>
                  <p className="text-sm mt-2">Your feedback history will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {myFeedback.map((item) => (
                    <div key={item.feedback_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(item.feedback_type)}`}>
                            {item.feedback_type}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{item.subject}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      {item.resolution_notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-green-700">Resolution:</p>
                          <p className="text-xs text-gray-600 mt-1">{item.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerFeedbackModal;
