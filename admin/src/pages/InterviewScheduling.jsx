/**
 * Interview Scheduling & Calendar Management
 * AI-powered interview scheduling system with calendar view
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar, Card, Row, Col, Button, Table, Tag, Statistic, Badge,
  Modal, Form, TimePicker, DatePicker, Select, Alert, Tooltip,
  Progress, Popover
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  StopOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  TeamOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InterviewScheduling = () => {
  const [loading, setLoading] = useState(false);
  const [schedulingStatus, setSchedulingStatus] = useState(null);
  const [schedulingAnalytics, setSchedulingAnalytics] = useState(null);
  const [calendarData, setCalendarData] = useState({ interviews: [], availability: [] });
  const [interviewQueue, setInterviewQueue] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); // 'availability', 'schedule', 'queue'
  const [form] = Form.useForm();

  useEffect(() => {
    loadSchedulingData();
    loadCalendarData();
    loadInterviewQueue();
  }, []);

  const loadSchedulingData = async () => {
    try {
      const [statusResponse, analyticsResponse] = await Promise.all([
        fetch('/api/v1/consultant-performance/scheduling/status'),
        fetch('/api/v1/consultant-performance/scheduling/analytics?days=7')
      ]);

      const statusData = await statusResponse.json();
      const analyticsData = await analyticsResponse.json();

      if (statusData.success) {
        setSchedulingStatus(statusData.data);
      }

      if (analyticsData.success) {
        setSchedulingAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error('Error loading scheduling data:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      const startDate = moment().format('YYYY-MM-DD');
      const endDate = moment().add(14, 'days').format('YYYY-MM-DD');

      const response = await fetch(
        `/api/v1/consultant-performance/scheduling/calendar?start_date=${startDate}&end_date=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setCalendarData(data.data);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadInterviewQueue = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/queue');
      const data = await response.json();

      if (data.success) {
        setInterviewQueue(data.data.queue);
      }
    } catch (error) {
      console.error('Error loading interview queue:', error);
    }
  };

  const runSchedulingEngine = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/run-engine', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        Alert.success(`Scheduling engine completed - ${data.data.results?.queueProcessed?.scheduled || 0} interviews scheduled`);
        loadSchedulingData();
        loadCalendarData();
        loadInterviewQueue();
      }
    } catch (error) {
      console.error('Scheduling engine failed:', error);
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
      console.error('Emergency stop failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeScheduling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/resume', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        Alert.success('Interview scheduling resumed');
        loadSchedulingData();
      }
    } catch (error) {
      console.error('Resume scheduling failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (values) => {
    try {
      const response = await fetch('/api/v1/consultant-performance/scheduling/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: values.date.format('YYYY-MM-DD'),
          startTime: values.timeRange[0].format('HH:mm'),
          endTime: values.timeRange[1].format('HH:mm'),
          isAvailable: values.isAvailable,
          slotType: values.slotType || 'interview'
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.success('Availability updated successfully');
        setModalVisible(false);
        form.resetFields();
        loadCalendarData();
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const getCalendarCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dayInterviews = calendarData.interviews.filter(interview =>
      interview.scheduled_date === dateStr
    );

    if (dayInterviews.length === 0) return null;

    const completed = dayInterviews.filter(i => i.status === 'completed').length;
    const scheduled = dayInterviews.filter(i => i.status === 'scheduled').length;
    const noShows = dayInterviews.filter(i => i.status === 'no_show').length;

    return (
      <div style={{ fontSize: '11px' }}>
        {scheduled > 0 && (
          <div style={{ color: '#1890ff' }}>📅 {scheduled} scheduled</div>
        )}
        {completed > 0 && (
          <div style={{ color: '#52c41a' }}>✅ {completed} completed</div>
        )}
        {noShows > 0 && (
          <div style={{ color: '#f5222d' }}>❌ {noShows} no-show</div>
        )}
      </div>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'blue',
      confirmed: 'green',
      completed: 'success',
      cancelled: 'default',
      no_show: 'error'
    };
    return colors[status] || 'default';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'default',
      normal: 'blue',
      high: 'orange',
      urgent: 'red'
    };
    return colors[urgency] || 'default';
  };

  const queueColumns = [
    {
      title: 'Candidate',
      dataIndex: 'candidate_name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.candidate_email}
          </div>
        </div>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority',
      render: (score) => (
        <Progress
          percent={Math.round(score * 100)}
          size="small"
          strokeColor={score > 0.7 ? '#52c41a' : score > 0.4 ? '#faad14' : '#f5222d'}
          showInfo={false}
        />
      )
    },
    {
      title: 'Urgency',
      dataIndex: 'urgency_level',
      key: 'urgency',
      render: (urgency) => (
        <Tag color={getUrgencyColor(urgency)}>
          {urgency.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Attempts',
      dataIndex: 'contact_attempts',
      key: 'attempts',
      render: (attempts) => (
        <Badge count={attempts} style={{ backgroundColor: attempts > 2 ? '#f5222d' : '#52c41a' }} />
      )
    },
    {
      title: 'Added',
      dataIndex: 'added_at',
      key: 'added',
      render: (date) => moment(date).format('MMM DD, HH:mm')
    }
  ];

  const todaysInterviews = calendarData.interviews.filter(interview =>
    interview.scheduled_date === moment().format('YYYY-MM-DD')
  );

  if (!schedulingStatus) {
    return <div>Loading Interview Scheduling System...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>
          <CalendarOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
          AI Interview Scheduling System
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Automated interview scheduling with calendar management and AI-powered queue processing
        </p>
      </div>

      {/* Control Panel */}
      <Card title="Scheduling Controls" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={runSchedulingEngine}
              loading={loading}
              block
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Run Scheduling Engine
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Process queue and schedule interviews
            </p>
          </Col>

          <Col xs={24} sm={6}>
            <Button
              type="danger"
              icon={<StopOutlined />}
              onClick={emergencyStopScheduling}
              loading={loading}
              block
            >
              Emergency Stop
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Stop all scheduling activities
            </p>
          </Col>

          <Col xs={24} sm={6}>
            <Button
              type="default"
              icon={<PlayCircleOutlined />}
              onClick={resumeScheduling}
              loading={loading}
              block
            >
              Resume Scheduling
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Resume automatic scheduling
            </p>
          </Col>

          <Col xs={24} sm={6}>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={() => {
                setModalType('availability');
                setModalVisible(true);
              }}
              block
            >
              Update Availability
            </Button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Modify calendar availability
            </p>
          </Col>
        </Row>
      </Card>

      {/* Status Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Today's Interviews"
              value={schedulingStatus.todayScheduled || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {schedulingStatus.todayCompleted || 0} completed
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Interview Queue"
              value={schedulingStatus.queueLength || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {schedulingStatus.highPriorityQueue || 0} high priority
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Daily Capacity"
              value={schedulingStatus.capacity?.dailyRemaining || 0}
              suffix={`/20`}
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color: (schedulingStatus.capacity?.dailyRemaining || 0) < 5 ? '#f5222d' : '#52c41a'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Remaining slots today
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Weekly Capacity"
              value={schedulingStatus.capacity?.weeklyRemaining || 0}
              suffix="/100"
              prefix={<UserOutlined />}
              valueStyle={{
                color: (schedulingStatus.capacity?.weeklyRemaining || 0) < 20 ? '#f5222d' : '#52c41a'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Remaining slots this week
            </p>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Calendar View */}
        <Col xs={24} lg={16}>
          <Card title="Interview Calendar" extra={<CalendarOutlined />}>
            <Calendar
              value={selectedDate}
              onSelect={setSelectedDate}
              dateCellRender={getCalendarCellRender}
              headerRender={({ value, onChange }) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <h3>{value.format('MMMM YYYY')}</h3>
                  <div>
                    <Button
                      size="small"
                      onClick={() => onChange(value.clone().subtract(1, 'month'))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      onClick={() => onChange(moment())}
                      style={{ margin: '0 8px' }}
                    >
                      Today
                    </Button>
                    <Button
                      size="small"
                      onClick={() => onChange(value.clone().add(1, 'month'))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            />

            {/* Today's Schedule */}
            {todaysInterviews.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4>Today's Interviews ({todaysInterviews.length})</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {todaysInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {interview.candidate_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {interview.scheduled_time} • {interview.duration_minutes} min
                        </div>
                      </div>
                      <Tag color={getStatusColor(interview.status)}>
                        {interview.status.toUpperCase()}
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Interview Queue */}
        <Col xs={24} lg={8}>
          <Card
            title="Interview Queue"
            extra={<TeamOutlined />}
            style={{ height: 'fit-content' }}
          >
            <div style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Waiting"
                    value={interviewQueue.filter(q => q.queue_status === 'waiting').length}
                    valueStyle={{ fontSize: '24px', color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="High Priority"
                    value={interviewQueue.filter(q => q.urgency_level === 'high').length}
                    valueStyle={{ fontSize: '24px', color: '#f5222d' }}
                  />
                </Col>
              </Row>
            </div>

            <Table
              dataSource={interviewQueue.slice(0, 10)}
              columns={queueColumns}
              pagination={false}
              size="small"
              scroll={{ y: 400 }}
              rowKey="id"
            />

            {interviewQueue.length > 10 && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <Button size="small" type="link">
                  View All {interviewQueue.length} in Queue
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Performance Analytics */}
      {schedulingAnalytics && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={12}>
            <Card title="Scheduling Performance (7 days)">
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Completion Rate"
                    value={Math.round(schedulingAnalytics.summary.completionRate * 100)}
                    suffix="%"
                    valueStyle={{
                      color: schedulingAnalytics.summary.completionRate >= 0.8 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="No-Show Rate"
                    value={Math.round(schedulingAnalytics.summary.noShowRate * 100)}
                    suffix="%"
                    valueStyle={{
                      color: schedulingAnalytics.summary.noShowRate <= 0.1 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Conversion Rate"
                    value={Math.round(schedulingAnalytics.summary.conversionRate * 100)}
                    suffix="%"
                    valueStyle={{
                      color: schedulingAnalytics.summary.conversionRate >= 0.6 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Avg Duration"
                    value={Math.round(schedulingAnalytics.summary.avgDuration)}
                    suffix="min"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Weekly Trends">
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {schedulingAnalytics.dailyBreakdown.map((day) => (
                  <div
                    key={day.date}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <span>{moment(day.date).format('MMM DD')}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {day.completed}/{day.total_scheduled}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {day.no_shows} no-shows
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Availability Modal */}
      <Modal
        title="Update Availability"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={updateAvailability}
          initialValues={{
            isAvailable: true,
            slotType: 'interview'
          }}
        >
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="Time Range"
            rules={[{ required: true, message: 'Please select time range' }]}
          >
            <RangePicker.TimePicker
              style={{ width: '100%' }}
              format="HH:mm"
              minuteStep={30}
            />
          </Form.Item>

          <Form.Item name="isAvailable" label="Available">
            <Select>
              <Option value={true}>Available for interviews</Option>
              <Option value={false}>Not available</Option>
            </Select>
          </Form.Item>

          <Form.Item name="slotType" label="Slot Type">
            <Select>
              <Option value="interview">Interview</Option>
              <Option value="break">Break</Option>
              <Option value="blocked">Blocked</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Availability
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InterviewScheduling;