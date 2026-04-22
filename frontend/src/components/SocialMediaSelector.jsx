import React, { useEffect, useMemo, useState } from 'react';
import { creator } from '../services/api';

const SocialMediaSelector = ({ creatorId, accounts: providedAccounts, loading: providedLoading, onSelectionChange, onAccountSelect }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Array.isArray(providedAccounts)) {
      setAccounts(providedAccounts);
      setError('');
      return;
    }

    const fetchAccounts = async () => {
      setIsLoading(true);
      setError('');
      setSelectedPlatform('');
      setSelectedAccountId('');

      try {
        const response = await creator.getAccounts();
        const fetchedAccounts = Array.isArray(response?.data?.data) ? response.data.data : [];

        // Keep component reusable when a specific creatorId is provided.
        const filteredByCreator = creatorId
          ? fetchedAccounts.filter((account) => {
              if (!account?.creatorId) return true;
              return String(account.creatorId) === String(creatorId);
            })
          : fetchedAccounts;

        setAccounts(filteredByCreator);
      } catch (fetchError) {
        setError(fetchError?.response?.data?.message || 'Failed to load social accounts.');
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [creatorId, providedAccounts]);

  const platformOptions = useMemo(() => {
    return [...new Set(accounts.map((account) => account.platform).filter(Boolean))];
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!selectedPlatform) return [];
    // Cascading filter: account dropdown depends on selected platform.
    return accounts.filter((account) => account.platform === selectedPlatform);
  }, [accounts, selectedPlatform]);

  const handlePlatformChange = (event) => {
    const nextPlatform = event.target.value;
    setSelectedPlatform(nextPlatform);
    // Reset second dropdown whenever platform changes to avoid stale selection.
    setSelectedAccountId('');

    if (typeof onSelectionChange === 'function') {
      onSelectionChange({ platform: nextPlatform, accountId: '', accountName: '' });
    }
    if (typeof onAccountSelect === 'function') {
      onAccountSelect('');
    }
  };

  const handleAccountChange = (event) => {
    const accountId = event.target.value;
    setSelectedAccountId(accountId);

    const selected = filteredAccounts.find((account) => String(account._id) === String(accountId));
    if (typeof onSelectionChange === 'function') {
      onSelectionChange({
        platform: selectedPlatform,
        accountId: selected?._id || '',
        accountName: selected?.accountName || ''
      });
    }
    if (typeof onAccountSelect === 'function') {
      onAccountSelect(accountId);
    }
  };

  const effectiveLoading = Boolean(providedLoading) || isLoading;

  if (effectiveLoading) {
    return <div className="social-selector"><p className="form-loading">Loading...</p></div>;
  }

  return (
    <div className="social-selector">
      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label className="form-label" htmlFor="platform-select">Platform</label>
        <select
          id="platform-select"
          className="form-select"
          value={selectedPlatform}
          onChange={handlePlatformChange}
          disabled={effectiveLoading || platformOptions.length === 0}
        >
          <option value="">Select a platform</option>
          {platformOptions.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="account-select">Account</label>
        <select
          id="account-select"
          className="form-select"
          value={selectedAccountId}
          onChange={handleAccountChange}
          disabled={!selectedPlatform || effectiveLoading}
        >
          <option value="">Select an account</option>
          {filteredAccounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.accountName || account.username || account.accountId}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SocialMediaSelector;
