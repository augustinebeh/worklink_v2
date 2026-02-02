/**
 * 100x Consultant Performance Dashboard
 * Main control interface for pain-point solutions
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Button, Alert, Tag, Table, Statistic, Badge } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  HeartOutlined,
  DashboardOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  SearchOutlined,
  RocketOutlined,
  CalendarOutlined
} from '@ant-design/icons';

const ConsultantPerformance = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [sourcingStatus, setSourcingStatus] = useState(null);
  const [sourcingAnalytics, setSourcingAnalytics] = useState(null);
  const [schedulingStatus, setSchedulingStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadCapacityStatus();
    loadSourcingData();
    loadSchedulingData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/dashboard');
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadCapacityStatus = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/capacity/status');
      const data = await response.json();
      if (data.success) {
        setCapacityStatus(data.data);
        setAlerts(data.data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading capacity status:', error);
    }
  };

  const loadSourcingData = async () => {
    try {
      const [statusResponse, analyticsResponse] = await Promise.all([
        fetch('/api/v1/consultant-performance/sourcing/status'),
        fetch('/api/v1/consultant-performance/sourcing/analytics?days=7')
      ]);

      const statusData = await statusResponse.json();
      const analyticsData = await analyticsResponse.json();

      if (statusData.success) {
        setSourcingStatus(statusData.data);
      }

      if (analyticsData.success) {
        setSourcingAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error('Error loading sourcing data:', error);
    }
  };

  const loadSchedulingData = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/status');
      const data = await response.json();

      if (data.success) {
        setSchedulingStatus(data.data);
      }
    } catch (error) {
      console.error('Error loading scheduling data:', error);
    }
  };

  const handleEmergencyBrake = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/capacity/emergency-brake', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success('Emergency brake activated - All sourcing stopped');
        loadCapacityStatus();
      }
    } catch (error) {
      console.error('Emergency brake failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSourcing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/capacity/resume', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success('Sourcing automation resumed');
        loadCapacityStatus();
      }
    } catch (error) {
      console.error('Resume sourcing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runRetentionCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/retention/run-campaigns', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success(`Retention campaigns completed - ${data.data.totalCandidatesEngaged} candidates engaged`);
      }
    } catch (error) {
      console.error('Retention campaigns failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDailySourcing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/sourcing/run-daily', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success(`Daily sourcing completed - ${data.data.candidatesSourced} candidates found`);
        loadSourcingData(); // Refresh sourcing data
      }
    } catch (error) {
      console.error('Daily sourcing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const emergencyStopSourcing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/sourcing/emergency-stop', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success('Candidate sourcing stopped immediately');
        loadSourcingData();
      }
    } catch (error) {
      console.error('Emergency stop failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeCandidateSourcing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/sourcing/resume', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        Alert.success('Candidate sourcing resumed');
        loadSourcingData();
      }
    } catch (error) {
      console.error('Resume sourcing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runInterviewScheduling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/run-engine', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        Alert.success(`Interview scheduling completed - ${data.data.results?.queueProcessed?.scheduled || 0} interviews scheduled`);
        loadSchedulingData();
      }
    } catch (error) {
      console.error('Interview scheduling failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const emergencyStopScheduling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/emergency-stop', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        Alert.success('Interview scheduling stopped immediately');
        loadSchedulingData();
      }
    } catch (error) {
      console.error('Emergency stop scheduling failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityColor = (utilization) => {
    if (utilization >= 0.9) return '#ff4d4f';
    if (utilization >= 0.8) return '#fa8c16';
    if (utilization >= 0.6) return '#fadb14';
    return '#52c41a';
  };

  const getTierColor = (tier) => {
    const colors = {
      excellent: 'gold',
      good: 'green',
      moderate: 'blue',
      poor: 'orange',
      critical: 'red',
      platinum: 'gold',
      gold: 'orange',
      silver: 'default',
      bronze: 'brown',
      risk: 'red'
    };
    return colors[tier] || 'default';
  };

  if (!dashboardData || !capacityStatus) {
    return <div>Loading 100x Performance Dashboard...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>
          <ThunderboltOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
          100x Consultant Performance Dashboard
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          AI-powered system managing candidate volume, retention, and reliability
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Alert
          message="System Alerts"
          description={
            <ul>
              {alerts.map((alert, index) => (
                <li key={index}>
                  <Badge status={alert.type === 'EMERGENCY' ? 'error' : 'warning'} />
                  {alert.message}
                </li>
              ))}
            </ul>
          }
          type={alerts.some(a => a.type === 'EMERGENCY') ? 'error' : 'warning'}
          style={{ marginBottom: '24px' }}
          showIcon
        />
      )}

      {/* Performance Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Performance Multiplier"
              value={dashboardData.performanceMultiplier?.consultantEquivalent || 1}
              suffix="x"
              valueStyle={{ color: '#3f8600' }}
              prefix={<ThunderboltOutlined />}
            />
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Consultant equivalent performance
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Weekly Capacity"
              value={Math.round(capacityStatus.capacity.weekly.utilization * 100)}
              suffix="%"
              valueStyle={{ color: getCapacityColor(capacityStatus.capacity.weekly.utilization) }}
              prefix={<DashboardOutlined />}
            />
            <Progress
              percent={Math.round(capacityStatus.capacity.weekly.utilization * 100)}
              strokeColor={getCapacityColor(capacityStatus.capacity.weekly.utilization)}
              size="small"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Sourcing Rate"
              value={capacityStatus.recommendedSourcingRate}
              suffix="/day"
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
            <Tag color="blue" style={{ marginTop: '8px' }}>
              {capacityStatus.currentAction.replace(/_/g, ' ').toUpperCase()}
            </Tag>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Candidates"
              value={capacityStatus.capacity.workload.active}
              suffix={`/${150}`}
              valueStyle={{ color: '#722ed1' }}
              prefix={<HeartOutlined />}
            />
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Currently managing
            </p>
          </Card>
        </Col>
      </Row>

      {/* Control Panel */}
      <Card title="System Controls" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Button
              type="danger"
              icon={<StopOutlined />}
              onClick={handleEmergencyBrake}
              loading={loading}
              block
            >
              Emergency Brake
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Stop all candidate sourcing immediately
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleResumeSourcing}
              loading={loading}
              block
            >
              Resume Sourcing
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Resume automated candidate sourcing
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="default"
              icon={<HeartOutlined />}
              onClick={runRetentionCampaigns}
              loading={loading}
              block
            >
              Run Retention Campaigns
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Engage candidates with automated campaigns
            </p>
          </Col>
        </Row>

        {/* Candidate Sourcing Controls */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} sm={8}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={runDailySourcing}
              loading={loading}
              block
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Run Daily Sourcing
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Find new candidates across all platforms
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="danger"
              icon={<StopOutlined />}
              onClick={emergencyStopSourcing}
              loading={loading}
              block
            >
              Stop Sourcing
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Emergency stop all candidate sourcing
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="default"
              icon={<RocketOutlined />}
              onClick={resumeCandidateSourcing}
              loading={loading}
              block
            >
              Resume Sourcing
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Resume automated candidate sourcing
            </p>
          </Col>
        </Row>

        {/* Interview Scheduling Controls */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} sm={8}>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={runInterviewScheduling}
              loading={loading}
              block
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
            >
              Run Interview Scheduling
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Process interview queue and schedule candidates
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="danger"
              icon={<StopOutlined />}
              onClick={emergencyStopScheduling}
              loading={loading}
              block
            >
              Stop Scheduling
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Emergency stop interview scheduling
            </p>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              type="default"
              icon={<CalendarOutlined />}
              onClick={() => window.open('/admin/interview-scheduling', '_blank')}
              block
            >
              Open Calendar
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Full calendar interface and management
            </p>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Capacity Management */}
        <Col xs={24} lg={12}>
          <Card
            title="Capacity Management"
            extra={<SafetyOutlined style={{ color: '#52c41a' }} />}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={Math.round(capacityStatus.capacity.daily.utilization * 100)}
                    strokeColor={getCapacityColor(capacityStatus.capacity.daily.utilization)}
                    width={80}
                  />
                  <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Daily</p>
                  <p style={{ color: '#666', fontSize: '12px' }}>
                    {capacityStatus.capacity.daily.current}/{capacityStatus.capacity.daily.capacity}
                  </p>
                </div>
              </Col>
              <Col xs={12}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={Math.round(capacityStatus.capacity.workload.utilization * 100)}
                    strokeColor={getCapacityColor(capacityStatus.capacity.workload.utilization)}
                    width={80}
                  />
                  <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Workload</p>
                  <p style={{ color: '#666', fontSize: '12px' }}>
                    {capacityStatus.capacity.workload.active}/150
                  </p>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Retention Analytics */}
        <Col xs={24} lg={12}>
          <Card
            title="Retention Analytics"
            extra={<HeartOutlined style={{ color: '#f5222d' }} />}
          >
            {dashboardData.retention?.candidateMetrics && (
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Total Active"
                    value={dashboardData.retention.candidateMetrics.totalActive}
                    prefix={<UserOutlined />}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Avg Engagement"
                    value={dashboardData.retention.candidateMetrics.averageEngagementScore}
                    suffix="/100"
                    valueStyle={{
                      color: dashboardData.retention.candidateMetrics.averageEngagementScore >= 70 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
              </Row>
            )}

            {/* Tier Distribution */}
            {dashboardData.retention?.candidateMetrics?.tierBreakdown && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Engagement Tiers</p>
                {Object.entries(dashboardData.retention.candidateMetrics.tierBreakdown).map(([tier, count]) => (
                  <div key={tier} style={{ marginBottom: '4px' }}>
                    <Tag color={getTierColor(tier)}>{tier.toUpperCase()}</Tag>
                    <span style={{ marginLeft: '8px' }}>{count} candidates</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Candidate Sourcing Analytics */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} lg={12}>
          <Card
            title="Candidate Sourcing"
            extra={<SearchOutlined style={{ color: '#1890ff' }} />}
          >
            {sourcingStatus && (
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Today's Sourced"
                    value={sourcingStatus.todaysCandidatesSourced || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Success Rate"
                    value={sourcingStatus.todaysSuccessRate || 0}
                    suffix="%"
                    valueStyle={{
                      color: sourcingStatus.todaysSuccessRate >= 60 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Active Postings"
                    value={sourcingStatus.activeJobPostings || 0}
                    prefix={<RocketOutlined />}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Pending Queue"
                    value={sourcingStatus.pendingCandidates || 0}
                    prefix={<SearchOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>
            )}

            {/* Platform Performance */}
            {sourcingAnalytics?.platformPerformance && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Platform Performance (7 days)</p>
                {sourcingAnalytics.platformPerformance.slice(0, 3).map((platform) => (
                  <div key={platform.platform} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color="blue">{platform.platform.toUpperCase()}</Tag>
                      <span style={{ fontSize: '12px' }}>
                        {platform.total_candidates} candidates
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Sourcing Trends"
            extra={<ReloadOutlined style={{ color: '#52c41a' }} />}
          >
            {sourcingAnalytics?.summary && (
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Weekly Total"
                    value={sourcingAnalytics.summary.totalCandidatesSourced || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Daily Average"
                    value={sourcingAnalytics.summary.averageDailyCandidates || 0}
                    prefix={<DashboardOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Success Rate"
                    value={Math.round((sourcingAnalytics.summary.successRate || 0) * 100)}
                    suffix="%"
                    valueStyle={{
                      color: sourcingAnalytics.summary.successRate >= 0.6 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Avg Cost"
                    value={(sourcingAnalytics.summary.averageCost || 0).toFixed(2)}
                    prefix="$"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
              </Row>
            )}

            {/* Sourcing Goal Progress */}
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Weekly Goal Progress</p>
              <Progress
                percent={sourcingAnalytics?.summary ?
                  Math.round((sourcingAnalytics.summary.totalCandidatesSourced / 350) * 100) : 0}
                strokeColor="#52c41a"
                trailColor="#f0f0f0"
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Target: 350 candidates/week for 100x performance
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Interview Scheduling Analytics */}
      {schedulingStatus && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={12}>
            <Card
              title="Interview Scheduling"
              extra={<CalendarOutlined style={{ color: '#722ed1' }} />}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Today's Interviews"
                    value={schedulingStatus.todayScheduled || 0}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {schedulingStatus.todayCompleted || 0} completed
                  </p>
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Queue Length"
                    value={schedulingStatus.queueLength || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{
                      color: schedulingStatus.queueLength > 20 ? '#f5222d' : '#52c41a'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {schedulingStatus.highPriorityQueue || 0} high priority
                  </p>
                </Col>
              </Row>

              {/* Capacity Status */}
              <div style={{ marginTop: '16px' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={schedulingStatus.capacity?.dailyRemaining ?
                          Math.round((20 - schedulingStatus.capacity.dailyRemaining) / 20 * 100) : 0}
                        width={60}
                        strokeColor="#722ed1"
                        format={() => schedulingStatus.capacity?.dailyRemaining || 0}
                      />
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>Daily Remaining</p>
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={schedulingStatus.capacity?.weeklyRemaining ?
                          Math.round((100 - schedulingStatus.capacity.weeklyRemaining) / 100 * 100) : 0}
                        width={60}
                        strokeColor="#722ed1"
                        format={() => schedulingStatus.capacity?.weeklyRemaining || 0}
                      />
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>Weekly Remaining</p>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Onboarding Pipeline"
              extra={<DashboardOutlined style={{ color: '#1890ff' }} />}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Pending → Active"
                    value="70%"
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                    suffix="target"
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    SLM conversion rate
                  </p>
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Interview Success"
                    value="85%"
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                    suffix="average"
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Conversion to active
                  </p>
                </Col>
              </Row>

              {/* Pipeline Flow */}
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Onboarding Flow</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
                      {schedulingStatus.queueLength || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
                  </div>
                  <div style={{ color: '#d9d9d9' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                      {schedulingStatus.todayScheduled || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Scheduled</div>
                  </div>
                  <div style={{ color: '#d9d9d9' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                      {schedulingStatus.todayCompleted || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Active</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Reliability Analytics */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card
            title="Reliability Analytics"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadDashboardData}
                size="small"
              >
                Refresh
              </Button>
            }
          >
            {dashboardData.reliability?.tierDistribution && (
              <Table
                dataSource={dashboardData.reliability.tierDistribution.map((tier, index) => ({
                  key: index,
                  ...tier
                }))}
                columns={[
                  {
                    title: 'Reliability Tier',
                    dataIndex: 'tier',
                    key: 'tier',
                    render: (tier) => <Tag color={getTierColor(tier)}>{tier.toUpperCase()}</Tag>
                  },
                  {
                    title: 'Candidates',
                    dataIndex: 'count',
                    key: 'count'
                  },
                  {
                    title: 'Avg Score',
                    dataIndex: 'avg_score',
                    key: 'avg_score',
                    render: (score) => `${Math.round(score)}/100`
                  },
                  {
                    title: 'Predicted Show-up Rate',
                    dataIndex: 'avg_show_up_rate',
                    key: 'avg_show_up_rate',
                    render: (rate) => `${Math.round(rate)}%`
                  }
                ]}
                pagination={false}
                size="small"
              />
            )}

            {dashboardData.reliability?.overallMetrics && (
              <Row gutter={[16, 16]} style={{ marginTop: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '6px' }}>
                <Col xs={6}>
                  <Statistic
                    title="Avg Reliability"
                    value={dashboardData.reliability.overallMetrics.averageReliabilityScore}
                    suffix="/100"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={6}>
                  <Statistic
                    title="Predicted Show-up"
                    value={dashboardData.reliability.overallMetrics.predictedShowUpRate}
                    suffix="%"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={6}>
                  <Statistic
                    title="Actual Show-up"
                    value={dashboardData.reliability.overallMetrics.actualShowUpRate}
                    suffix="%"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={6}>
                  <Statistic
                    title="Prediction Accuracy"
                    value={dashboardData.reliability.overallMetrics.predictionAccuracy}
                    suffix="%"
                    valueStyle={{
                      fontSize: '16px',
                      color: dashboardData.reliability.overallMetrics.predictionAccuracy >= 90 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#666' }}>
        <p>🚀 100x Consultant Performance System | Pain Points Solved ✅</p>
        <p style={{ fontSize: '12px' }}>
          Capacity Management • Retention Automation • Reliability Scoring
        </p>
      </div>
    </div>
  );
};

export default ConsultantPerformance;