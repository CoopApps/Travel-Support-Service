import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import FuelCardStats from './FuelCardStats';
import FuelCardsTable from './FuelCardsTable';
import FuelCardFormModal from './FuelCardFormModal';
import FuelTransactionFormModal from './FuelTransactionFormModal';
import {
  getFuelCards,
  createFuelCard,
  updateFuelCard,
  deleteFuelCard,
  createFuelTransaction,
  getFuelStatistics
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

  const [showCardModal, setShowCardModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingCard, setEditingCard] = useState<FuelCard | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadFuelCards();
      loadStatistics();
    }
  }, [tenantId]);

  const loadFuelCards = async () => {
    try {
      setLoading(true);
      const cards = await getFuelCards(tenantId!);
      setFuelCards(cards);
    } catch (error) {
      console.error('Error loading fuel cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getFuelStatistics(tenantId!);
      setStatsData(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
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
      console.error('Error saving fuel card:', error);
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
    } catch (error) {
      console.error('Error toggling card status:', error);
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
      console.error('Error saving fuel transaction:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadFuelCards(), loadStatistics()]);
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
          <button className="btn btn-primary" onClick={handleAddCard}>
            + Add Fuel Card
          </button>
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
        />
      )}

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
    </div>
  );
};

export default FuelCardsPage;
