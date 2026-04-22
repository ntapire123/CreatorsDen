import React, { useMemo, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import MetricCard from '../components/MetricCard';
import PlatformChart from '../components/PlatformChart';
import AddAccountForm from '../components/AddAccountForm';
import SocialMediaSelector from '../components/SocialMediaSelector';
import StatsGraph from '../components/StatsGraph';
import useApi from '../hooks/useApi';
import { creator } from '../services/api';

const CreatorDashboardView = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState(null);
  
  // Creator profile state
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  
  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState('');
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create creator profile
  const handleCreateProfile = async () => {
    try {
      const response = await creator.createProfile({
        name: user.email.split('@')[0], // Default name from email
        bio: 'Content creator'
      });

      setCreatorProfile(response?.data?.data || null);
      setProfileError(null);
      setNotification({
        type: 'success',
        message: 'Creator profile created successfully!'
      });
    } catch (error) {
      console.error('Error creating creator profile:', error);
      setNotification({
        type: 'error',
        message: 'Failed to create profile'
      });
    }
  };

  // Fetch creator profile first
  useEffect(() => {
    const fetchCreatorProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await creator.getProfile();
        setCreatorProfile(response?.data?.data || null);
        setProfileError(null);
      } catch (error) {
        if (error?.response?.status === 404) {
          setCreatorProfile(null);
          setProfileError('No Creator Found');
        } else {
          setProfileError('Error loading profile');
        }
        console.error('Error fetching creator profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    if (token && user?.role === 'creator') {
      fetchCreatorProfile();
    }
  }, [token, user]);

  const { data: accountsData, loading: accountsLoading, refetch: refetchAccounts } = useApi(
    creatorProfile ? creator.getAccounts : null
  );

  // Update account list when fetched
  useEffect(() => {
    if (accountsData) {
      const accounts = Array.isArray(accountsData)
        ? accountsData
        : Array.isArray(accountsData?.data)
          ? accountsData.data
          : [];
      setConnectedAccounts(accounts);
      setActiveAccountId((prevSelected) => {
        if (!prevSelected) return accounts[0]?._id || '';
        const stillExists = accounts.some((account) => account._id === prevSelected);
        return stillExists ? prevSelected : (accounts[0]?._id || '');
      });
    }
  }, [accountsData]);

  // Handle OAuth success/error messages from URL parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');

    if (success) {
      setNotification({
        type: 'success',
        message: `${platform} account connected successfully!`
      });
      // Clean up URL
      setSearchParams({});
    } else if (error) {
      setNotification({
        type: 'error',
        message: `Failed to connect ${platform}: ${error}`
      });
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Handle account addition
  const handleAccountAdded = (newAccountData) => {
    setNotification({
      type: 'success',
      message: `${newAccountData.account.platform} account added successfully!`
    });
    refetchAccounts();
  };

  // Calculate aggregated metrics
  const displayedAccounts = useMemo(() => {
    if (!activeAccountId) return connectedAccounts;
    return connectedAccounts.filter((account) => account._id === activeAccountId);
  }, [connectedAccounts, activeAccountId]);

  const aggregatedMetrics = useMemo(() => {
    if (!displayedAccounts.length) {
      return { totalFollowers: 0, totalViews: 0, totalGrowth24h: 0, totalAccounts: 0 };
    }

    const totalFollowers = displayedAccounts.reduce((sum, account) =>
      sum + (account.todayStats?.followers || 0), 0
    );
    
    const totalViews = displayedAccounts.reduce((sum, account) =>
      sum + (account.todayStats?.totalViews || 0), 0
    );
    
    const totalGrowth24h = displayedAccounts.reduce((sum, account) =>
      sum + (account.todayStats?.growth24h || 0), 0
    );

    return {
      totalFollowers,
      totalViews,
      totalGrowth24h,
      totalAccounts: displayedAccounts.length
    };
  }, [displayedAccounts]);

  // Platform distribution data
  const platformDistribution = useMemo(() => {
    const distribution = {};
    displayedAccounts.forEach(account => {
      const platform = account.platform;
      if (!distribution[platform]) {
        distribution[platform] = {
          platform,
          totalViews: 0,
          totalLikes: 0
        };
      }
      distribution[platform].totalViews += account?.todayStats?.totalViews || 0;
      distribution[platform].totalLikes += account?.todayStats?.totalLikes || 0;
    });
    return Object.values(distribution);
  }, [displayedAccounts]);

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Handle account deletion
  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to remove this account?')) {
      return;
    }

    try {
      await creator.deleteAccount(accountId);
      setNotification({
        type: 'success',
        message: 'Account removed successfully'
      });
      refetchAccounts();
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to remove account'
      });
    }
  };

  return (
    <div className="page-container">
      {/* Notification */}
      {notification && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            backgroundColor: notification.type === 'success' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(255, 68, 68, 0.1)',
            border: `1px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            color: notification.type === 'success' ? 'var(--success)' : 'var(--danger)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Loading State */}
      {profileLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading your creator profile...</div>
        </div>
      )}

      {/* No Creator Profile Found */}
      {profileError === 'No Creator Found' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>No Creator Profile Found</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            You don't have a creator profile yet. Create one to start tracking your social media accounts.
          </p>
          <button
            onClick={handleCreateProfile}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Create My Profile
          </button>
        </div>
      )}

      {/* Profile Error */}
      {profileError && profileError !== 'No Creator Found' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Error Loading Profile</h2>
          <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
            {profileError}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Dashboard Content - Only show if profile exists */}
      {creatorProfile && !profileError && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              Welcome back, {creatorProfile.name}!
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Track your social media performance and grow your audience
            </p>
            <div style={{ marginTop: '1rem', maxWidth: '420px' }}>
              <SocialMediaSelector
                creatorId={creatorProfile?._id}
                accounts={connectedAccounts}
                loading={accountsLoading}
                onAccountSelect={setActiveAccountId}
              />
            </div>
          </div>

          {/* Add Account Section - Admin Only */}
          {user?.role === 'admin' && <AddAccountForm onAccountAdded={handleAccountAdded} />}

          {/* Metrics Overview */}
          <div className="grid-premium" style={{ marginBottom: '2rem' }}>
        <MetricCard
          title="Total Followers"
          value={aggregatedMetrics.totalFollowers.toLocaleString()}
          icon="👥"
          loading={accountsLoading}
        />
        <MetricCard
          title="Total Views"
          value={aggregatedMetrics.totalViews.toLocaleString()}
          icon="👁️"
          loading={accountsLoading}
        />
        <MetricCard
          title="Connected Accounts"
          value={aggregatedMetrics.totalAccounts}
          icon="🔗"
          loading={accountsLoading}
        />
        <MetricCard
          title="Views Growth (24h)"
          value={`+${aggregatedMetrics.totalGrowth24h.toLocaleString()}`}
          icon="📈"
          loading={accountsLoading}
        />
      </div>

      {/* Charts Section */}
      {connectedAccounts.length > 0 && (
        <div className="section-gap">
          <div className="grid-premium">
            <StatsGraph
              accountId={activeAccountId}
            />
            <PlatformChart data={platformDistribution} loading={accountsLoading} />
          </div>
        </div>
      )}

      {/* Connected Accounts List */}
      {connectedAccounts.length > 0 && (
        <div className="card-premium" style={{ marginTop: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1.5rem',
            color: 'var(--text-primary)'
          }}>
            Connected Accounts
          </h3>
          <div style={{ 
            display: 'grid', 
            gap: '1rem',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))'
          }}>
            {connectedAccounts.map((account) => (
              <div
                key={account._id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <img
                  src={account.profileImage || `https://ui-avatars.com/api/?name=${account.username}&background=random`}
                  alt={account.username}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    {account.username}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)',
                    marginBottom: '0.25rem'
                  }}>
                    {account.platform}
                  </div>
                  {account.todayStats && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {account.todayStats.followers?.toLocaleString() || 0} followers
                      {account.todayStats.totalViews && (
                        <span> • {account.todayStats.totalViews.toLocaleString()} views</span>
                      )}
                      <span style={{ color: 'var(--success)' }}>
                        {` • +${(account.todayStats.growth24h || 0).toLocaleString()} (24h)`}
                      </span>
                    </div>
                  )}
                </div>
                {/* Delete button - Admin Only */}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteAccount(account._id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--danger)',
                      color: 'var(--danger)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {connectedAccounts.length === 0 && !accountsLoading && (
        <div className="card-premium" style={{ 
          textAlign: 'center', 
          padding: '3rem',
          marginTop: '2rem'
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            opacity: 0.5
          }}>
            📊
          </div>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '0.5rem',
            color: 'var(--text-primary)'
          }}>
            No Accounts Connected Yet
          </h3>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '1.5rem'
          }}>
            Connect your social media accounts above to start tracking your analytics
          </p>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <CreatorDashboardView />;
};

export default DashboardPage;
