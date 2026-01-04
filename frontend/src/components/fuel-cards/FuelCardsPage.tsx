import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import FuelCardStats from './FuelCardStats';
import FuelCardsTable from './FuelCardsTable';
import FuelCardFormModal from './FuelCardFormModal';
import FuelTransactionFormModal from './FuelTransactionFormModal';
import ArchiveFuelCardModal from './ArchiveFuelCardModal';
import BulkImportWizard from './BulkImportWizard';
import ReconciliationDashboard from './ReconciliationDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import BudgetDashboard from './BudgetDashboard';
import {
  getFuelCards,
  getFuelCardsWithFilter,
  createFuelCard,
  updateFuelCard,
  deleteFuelCard,
  createFuelTransaction,
  getFuelStatistics,
  archiveFuelCard,
  unarchiveFuelCard
} from '../../services/fuelCardsApi';
import {
  FuelCard,
  CreateFuelCardDto,
  CreateFuelTransactionDto,
  FuelCardStatsResponse
} from '../../types/fuelCard.types';
import './FuelCards.css';

const FuelCardsPage: React.FC = () => {
  const { tenantId, tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>([]);
  const [statsData, setStatsData] = useState<FuelCardStatsResponse | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'reconciliation' | 'analytics' | 'budget'>('overview');

  // Archive filter state
  const [archivedFilter, setArchivedFilter] = useState<boolean | undefined>(undefined);

  // Modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showBulkImportWizard, setShowBulkImportWizard] = useState(false);
  const [editingCard, setEditingCard] = useState<FuelCard | null>(null);
  const [archivingCard, setArchivingCard] = useState<FuelCard | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadFuelCards();
      loadStatistics();
    }
  }, [tenantId, archivedFilter]);

  const loadFuelCards = async () => {
    try {
      setLoading(true);
      const cards = await getFuelCardsWithFilter(tenantId!, archivedFilter);
      setFuelCards(cards);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getFuelStatistics(tenantId!);
      setStatsData(stats);
    } catch {
      // Error handled silently
    }
  };

  const handleAddCard = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const handleEditCard = (cardId: number) => {
    const card = fuelCards.find(c => c.fuel_card_id === cardId);
    if (card) {
      setEditingCard(card);
      setShowCardModal(true);
    }
  };

  const handleSaveCard = async (cardData: CreateFuelCardDto) => {
    try {
      if (editingCard) {
        await updateFuelCard(tenantId!, editingCard.fuel_card_id, cardData);
      } else {
        await createFuelCard(tenantId!, cardData);
      }
      await loadFuelCards();
      await loadStatistics();
    } catch (error) {
      throw error;
    }
  };

  const handleToggleStatus = async (cardId: number) => {
    try {
      const card = fuelCards.find(c => c.fuel_card_id === cardId);
      if (card) {
        const newStatus = card.status === 'active' ? 'suspended' : 'active';
        await updateFuelCard(tenantId!, cardId, { status: newStatus });
        await loadFuelCards();
      }
    } catch {
      // Error handled silently
    }
  };

  const handleViewDetails = (cardId: number) => {
    const card = fuelCards.find(c => c.fuel_card_id === cardId);
    if (card) {
      alert(`Card Details: ••••${card.card_number_last_four} (${card.provider})\nStatus: ${card.status}\nDriver: ${card.driver_name || 'Unassigned'}`);
    }
  };

  const handleSaveTransaction = async (transactionData: CreateFuelTransactionDto) => {
    try {
      await createFuelTransaction(tenantId!, transactionData);
      await loadFuelCards();
      await loadStatistics();
    } catch (error) {
      throw error;
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadFuelCards(), loadStatistics()]);
  };

  const handleArchiveCard = (cardId: number) => {
    const card = fuelCards.find(c => c.fuel_card_id === cardId);
    if (card) {
      setArchivingCard(card);
      setShowArchiveModal(true);
    }
  };

  const handleConfirmArchive = async (reason: string) => {
    if (archivingCard) {
      try {
        await archiveFuelCard(tenantId!, archivingCard.fuel_card_id, reason);
        await loadFuelCards();
        await loadStatistics();
        setShowArchiveModal(false);
        setArchivingCard(null);
      } catch (error) {
        throw error;
      }
    }
  };

  const handleUnarchiveCard = async (cardId: number) => {
    try {
      await unarchiveFuelCard(tenantId!, cardId);
      await loadFuelCards();
      await loadStatistics();
    } catch {
      // Error handled silently
    }
  };

  const handleBulkImportSuccess = async () => {
    setShowBulkImportWizard(false);
    await loadFuelCards();
    await loadStatistics();
  };

  if (loading && fuelCards.length === 0) {
    return (
      <div className="fuel-cards-container">
        <div className="fuel-cards-loading">
          Loading fuel cards...
        </div>
      </div>
    );
  }

  return (
    <div className="fuel-cards-container">
      {/* Header */}
      <div className="fuel-cards-header">
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Fuel Card Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div className="fuel-cards-header-buttons">
          {activeTab === 'overview' && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowBulkImportWizard(true)}>
                📁 Bulk Import
              </button>
              <button className="btn btn-primary" onClick={handleAddCard}>
                + Add Fuel Card
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📋' },
          { id: 'import', label: 'Bulk Import', icon: '📁' },
          { id: 'reconciliation', label: 'Reconciliation', icon: '🔍' },
          { id: 'analytics', label: 'Analytics', icon: '📊' },
          { id: 'budget', label: 'Budget Monitoring', icon: '💰' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Archive Filter */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>
                Show:
              </label>
              <select
                value={archivedFilter === undefined ? 'all' : archivedFilter ? 'archived' : 'active'}
                onChange={(e) => {
                  const value = e.target.value;
                  setArchivedFilter(value === 'all' ? undefined : value === 'archived');
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Cards</option>
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <FuelCardStats stats={statsData?.stats || null} loading={loading} />

          {/* Fuel Cards Grid */}
          {fuelCards.length === 0 ? (
            <div className="empty-state">
              <div className="fuel-cards-empty-icon" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
                  <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77z"/>
                </svg>
              </div>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                No fuel cards yet.
              </p>
              <button className="btn btn-primary" onClick={handleAddCard}>
                Add Your First Fuel Card
              </button>
            </div>
          ) : (
            <FuelCardsTable
              fuelCards={fuelCards}
              onEdit={handleEditCard}
              onToggleStatus={handleToggleStatus}
              onViewDetails={handleViewDetails}
              onArchive={handleArchiveCard}
              onUnarchive={handleUnarchiveCard}
            />
          )}
        </>
      )}

      {/* Bulk Import Tab */}
      {activeTab === 'import' && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1.5rem' }}>📁</div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>Enhanced Bulk Import</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Import fuel card transactions from CSV files with comprehensive validation and duplicate detection.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowBulkImportWizard(true)}
            style={{ fontSize: '16px', padding: '0.75rem 2rem' }}
          >
            📁 Start Bulk Import Wizard
          </button>
        </div>
      )}

      {/* Reconciliation Tab */}
      {activeTab === 'reconciliation' && <ReconciliationDashboard />}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {/* Budget Monitoring Tab */}
      {activeTab === 'budget' && <BudgetDashboard />}

      {/* Modals */}
      <FuelCardFormModal
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
        card={editingCard}
      />

      <FuelTransactionFormModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSave={handleSaveTransaction}
        fuelCards={fuelCards}
      />

      <ArchiveFuelCardModal
        isOpen={showArchiveModal}
        onClose={() => {
          setShowArchiveModal(false);
          setArchivingCard(null);
        }}
        onConfirm={handleConfirmArchive}
        cardNumber={archivingCard ? `••••${archivingCard.card_number_last_four}` : ''}
      />

      <BulkImportWizard
        isOpen={showBulkImportWizard}
        onClose={() => setShowBulkImportWizard(false)}
        onSuccess={handleBulkImportSuccess}
      />
    </div>
  );
};

export default FuelCardsPage;
