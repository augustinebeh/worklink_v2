/**
 * Performance Scores Component
 * Shows reliability and engagement scores for candidates
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Tag, Button, Spin, Alert } from 'antd';
import {
  StarOutlined,
  HeartOutlined,
  ReloadOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const PerformanceScores = ({ candidateId }) => {
  const [loading, setLoading] = useState(false);
  const [reliabilityData, setReliabilityData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (candidateId) {
      loadPerformanceScores();
    }
  }, [candidateId]);

  const loadPerformanceScores = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load reliability score
      const reliabilityResponse = await fetch(
        `/api/v1/consultant-performance/reliability/calculate/${candidateId}`,
        { method: 'POST' }
      );
      const reliabilityResult = await reliabilityResponse.json();

      if (reliabilityResult.success) {
        setReliabilityData(reliabilityResult.data);
      }

      // Load engagement data from retention analytics
      const retentionResponse = await fetch('/api/v1/consultant-performance/retention/analytics');
      const retentionResult = await retentionResponse.json();

      if (retentionResult.success) {
        // Find this candidate's engagement data (simplified for this component)
        setEngagementData({
          tier: 'good', // Placeholder - in real app would come from API
          score: 75,
          lastActivity: '2 days ago'
        });
      }

    } catch (error) {
      console.error('Error loading performance scores:', error);
      setError('Failed to load performance scores');
    } finally {
      setLoading(false);
    }
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
      bronze: 'volcano',
      risk: 'red'
    };
    return colors[tier] || 'default';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#1890ff';
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#fa8c16';
    return '#f5222d';
  };

  const getTierIcon = (tier) => {
    if (tier === 'platinum' || tier === 'excellent') return <TrophyOutlined />;
    return <StarOutlined />;
  };

  if (error) {
    return (
      <Alert
        message="Performance Scores"
        description={error}
        type="warning"
        showIcon
        action={
          <Button size="small" onClick={loadPerformanceScores}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <Card
      title={
        <span>
          <StarOutlined style={{ marginRight: 8 }} />
          Performance Scores
        </span>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={loadPerformanceScores}
          loading={loading}
        />
      }
      size="small"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
          <p style={{ marginTop: '8px', color: '#666' }}>Calculating performance scores...</p>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* Reliability Score */}
          {reliabilityData && (
            <Col xs={24} sm={12}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={reliabilityData.reliabilityScore}
                  strokeColor={getScoreColor(reliabilityData.reliabilityScore)}
                  width={80}
                  format={() => `${reliabilityData.reliabilityScore}`}
                />
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>Reliability</p>
                  <Tag color={getTierColor(reliabilityData.tier)} icon={getTierIcon(reliabilityData.tier)}>
                    {reliabilityData.tier.toUpperCase()}
                  </Tag>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                    {reliabilityData.predictedShowUpRate}% predicted show-up
                  </p>
                </div>
              </div>
            </Col>
          )}

          {/* Engagement Score */}
          {engagementData && (
            <Col xs={24} sm={12}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={engagementData.score}
                  strokeColor={getScoreColor(engagementData.score)}
                  width={80}
                  format={() => `${engagementData.score}`}
                />
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>Engagement</p>
                  <Tag color={getTierColor(engagementData.tier)} icon={<HeartOutlined />}>
                    {engagementData.tier.toUpperCase()}
                  </Tag>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                    Last activity: {engagementData.lastActivity}
                  </p>
                </div>
              </div>
            </Col>
          )}
        </Row>
      )}

      {/* Performance Insights */}
      {reliabilityData && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: 0, fontWeight: 'bold' }}>
            AI Insights:
          </p>
          <ul style={{ fontSize: '12px', color: '#666', marginTop: '4px', paddingLeft: '16px' }}>
            {reliabilityData.recommendedActions.slice(0, 2).map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {!reliabilityData && !engagementData && !loading && (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          <p>No performance data available</p>
          <p style={{ fontSize: '12px' }}>
            Scores will be calculated after candidate interactions
          </p>
        </div>
      )}
    </Card>
  );
};

export default PerformanceScores;