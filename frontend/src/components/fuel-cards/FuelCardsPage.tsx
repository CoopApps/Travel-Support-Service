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
    <>
      {/* Active/Archived Tabs and Action Buttons - Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        {/* Active/Archived Tabs - Compact Pill Style */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => setArchivedFilter(false)}
            style={{
              padding: '5px 12px',
              background: archivedFilter === false ? 'white' : 'transparent',
              color: archivedFilter === false ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: archivedFilter === false ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Active
          </button>
          <button
            onClick={() => setArchivedFilter(undefined)}
            style={{
              padding: '5px 12px',
              background: archivedFilter === undefined ? 'white' : 'transparent',
              color: archivedFilter === undefined ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: archivedFilter === undefined ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            All
          </button>
          <button
            onClick={() => setArchivedFilter(true)}
            style={{
              padding: '5px 12px',
              background: archivedFilter === true ? 'white' : 'transparent',
              color: archivedFilter === true ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: archivedFilter === true ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Archived
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151'
            }}
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={handleAddCard}
            style={{
              padding: '6px 12px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Fuel Card
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <FuelCardStats stats={statsData?.stats || null} loading={loading} />

      {/* Tab Navigation and Search Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'overview' ? 'white' : 'transparent',
              color: activeTab === 'overview' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'overview' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'import' ? 'white' : 'transparent',
              color: activeTab === 'import' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'import' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'reconciliation' ? 'white' : 'transparent',
              color: activeTab === 'reconciliation' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'reconciliation' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'analytics' ? 'white' : 'transparent',
              color: activeTab === 'analytics' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'analytics' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'budget' ? 'white' : 'transparent',
              color: activeTab === 'budget' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'budget' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Budget Monitoring
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
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
          <div style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>Enhanced Bulk Import</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Import fuel card transactions from CSV files with comprehensive validation and duplicate detection.
          </p>
          <button
            onClick={() => setShowBulkImportWizard(true)}
            style={{
              fontSize: '14px',
              padding: '8px 16px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Start Bulk Import Wizard
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
    </>
  );
};

export default FuelCardsPage;
