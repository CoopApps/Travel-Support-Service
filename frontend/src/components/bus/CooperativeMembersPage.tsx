import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserPlus, Search, Edit, DollarSign, CheckCircle, XCircle, Award, Calendar } from 'lucide-react';

interface CooperativeMember {
  member_id: number;
  tenant_id: number;
  customer_id: number;
  customer_name?: string;
  membership_number: string;
  membership_type: 'founding' | 'standard' | 'associate';
  membership_start_date: string;
  membership_end_date?: string;
  is_active: boolean;
  voting_rights: boolean;
  share_capital_invested: number;
  dividend_eligible: boolean;
  created_at: string;
}

interface MemberFormData {
  customer_id: number | '';
  membership_type: 'founding' | 'standard' | 'associate';
  membership_start_date: string;
  voting_rights: boolean;
  share_capital_invested: number;
  dividend_eligible: boolean;
}

const CooperativeMembersPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [members, setMembers] = useState<CooperativeMember[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<CooperativeMember | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    customer_id: '',
    membership_type: 'standard',
    membership_start_date: new Date().toISOString().split('T')[0],
    voting_rights: true,
    share_capital_invested: 0,
    dividend_eligible: true,
  });

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/cooperative/members`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch members');

        const data = await response.json();
        setMembers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [tenantId]);

  // Fetch customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/customers`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };

    if (showAddDialog || editingMember) {
      fetchCustomers();
    }
  }, [tenantId, showAddDialog, editingMember]);

  const handleAddMember = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/cooperative/members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) throw new Error('Failed to add member');

      const newMember = await response.json();
      setMembers([...members, newMember]);
      setShowAddDialog(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/cooperative/members/${editingMember.member_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) throw new Error('Failed to update member');

      const updatedMember = await response.json();
      setMembers(members.map(m => m.member_id === updatedMember.member_id ? updatedMember : m));
      setEditingMember(null);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (memberId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/cooperative/members/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: !currentStatus })
        }
      );

      if (!response.ok) throw new Error('Failed to toggle member status');

      const updatedMember = await response.json();
      setMembers(members.map(m => m.member_id === updatedMember.member_id ? updatedMember : m));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      membership_type: 'standard',
      membership_start_date: new Date().toISOString().split('T')[0],
      voting_rights: true,
      share_capital_invested: 0,
      dividend_eligible: true,
    });
  };

  const openEditDialog = (member: CooperativeMember) => {
    setEditingMember(member);
    setFormData({
      customer_id: member.customer_id,
      membership_type: member.membership_type,
      membership_start_date: member.membership_start_date.split('T')[0],
      voting_rights: member.voting_rights,
      share_capital_invested: parseFloat(member.share_capital_invested.toString()),
      dividend_eligible: member.dividend_eligible,
    });
  };

  const getMembershipBadgeColor = (type: string) => {
    switch (type) {
      case 'founding':
        return 'bg-purple-100 text-purple-800';
      case 'standard':
        return 'bg-blue-100 text-blue-800';
      case 'associate':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.membership_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || member.membership_type === filterType;
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && member.is_active) ||
      (filterActive === 'inactive' && !member.is_active);

    return matchesSearch && matchesType && matchesActive;
  });

  const stats = {
    total: members.length,
    active: members.filter(m => m.is_active).length,
    founding: members.filter(m => m.membership_type === 'founding').length,
    totalCapital: members.reduce((sum, m) => sum + parseFloat(m.share_capital_invested.toString()), 0),
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Cooperative Members</h1>
          <p className="text-gray-600 mt-2">
            Manage members, voting rights, and share capital
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.active} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Founding Members</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.founding}</div>
            <p className="text-xs text-gray-600 mt-1">Special voting rights</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Share Capital</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalCapital.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">Total invested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dividend Eligible</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.dividend_eligible && m.is_active).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Can receive dividends</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by membership number or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Membership Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="founding">Founding</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="associate">Associate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members List</CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Member #</th>
                  <th className="text-left p-3 font-semibold">Customer</th>
                  <th className="text-left p-3 font-semibold">Type</th>
                  <th className="text-left p-3 font-semibold">Share Capital</th>
                  <th className="text-left p-3 font-semibold">Joined</th>
                  <th className="text-left p-3 font-semibold">Rights</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.member_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{member.membership_number}</td>
                      <td className="p-3">{member.customer_name || 'N/A'}</td>
                      <td className="p-3">
                        <Badge className={getMembershipBadgeColor(member.membership_type)}>
                          {member.membership_type}
                        </Badge>
                      </td>
                      <td className="p-3">£{parseFloat(member.share_capital_invested.toString()).toFixed(2)}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(member.membership_start_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {member.voting_rights && (
                            <Badge variant="outline" className="text-xs">Vote</Badge>
                          )}
                          {member.dividend_eligible && (
                            <Badge variant="outline" className="text-xs">Dividend</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {member.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(member)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(member.member_id, member.is_active)}
                          >
                            {member.is_active ? (
                              <XCircle className="h-3 w-3 text-red-600" />
                            ) : (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog open={showAddDialog || !!editingMember} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingMember(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Member' : 'Add New Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update member details and preferences'
                : 'Add a new cooperative member with voting and dividend rights'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={formData.customer_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customer_id} value={customer.customer_id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Membership Type</Label>
                <Select
                  value={formData.membership_type}
                  onValueChange={(value: any) => setFormData({ ...formData, membership_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founding">Founding (Special Rights)</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="associate">Associate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.membership_start_date}
                  onChange={(e) => setFormData({ ...formData, membership_start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capital">Share Capital Invested (£)</Label>
              <Input
                id="capital"
                type="number"
                min="0"
                step="0.01"
                value={formData.share_capital_invested}
                onChange={(e) => setFormData({ ...formData, share_capital_invested: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="voting"
                  checked={formData.voting_rights}
                  onChange={(e) => setFormData({ ...formData, voting_rights: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="voting" className="cursor-pointer">
                  Voting Rights (can vote on cooperative decisions)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dividend"
                  checked={formData.dividend_eligible}
                  onChange={(e) => setFormData({ ...formData, dividend_eligible: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="dividend" className="cursor-pointer">
                  Dividend Eligible (can receive surplus distributions)
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingMember(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editingMember ? handleUpdateMember : handleAddMember}>
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CooperativeMembersPage;
