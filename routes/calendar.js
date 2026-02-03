const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, '../data/worklink.db'));

// Initialize calendar tables
const initCalendarTables = () => {
  // Availability table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL DEFAULT 'admin',
      day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
      start_time TEXT NOT NULL, -- HH:MM format
      end_time TEXT NOT NULL, -- HH:MM format
      is_active BOOLEAN DEFAULT 1,
      buffer_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(admin_id, day_of_week, start_time, end_time)
    )
  `);

  // Special dates/overrides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_special_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL DEFAULT 'admin',
      date TEXT NOT NULL, -- YYYY-MM-DD format
      type TEXT NOT NULL, -- holiday, blocked, custom, vacation
      title TEXT NOT NULL,
      description TEXT,
      is_available BOOLEAN DEFAULT 0,
      custom_hours TEXT, -- JSON array of {start, end} objects
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(admin_id, date)
    )
  `);

  // Interviews table (extend existing or create new)
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT,
      admin_id TEXT NOT NULL DEFAULT 'admin',
      scheduled_datetime TEXT NOT NULL, -- ISO string
      duration_minutes INTEGER DEFAULT 30,
      interview_type TEXT DEFAULT 'video', -- video, phone, in-person
      status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled
      meeting_link TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Calendar settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL DEFAULT 'admin',
      timezone TEXT DEFAULT 'Asia/Singapore',
      default_buffer_minutes INTEGER DEFAULT 15,
      auto_confirm_interviews BOOLEAN DEFAULT 0,
      notification_preferences TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(admin_id)
    )
  `);
};

// Initialize tables
initCalendarTables();

// Helper function to get day of week from date string
const getDayOfWeek = (dateString) => {
  return new Date(dateString).getDay();
};

// Helper function to format time
const formatTime = (datetime) => {
  return new Date(datetime).toTimeString().slice(0, 5);
};

// Get availability for date range
router.get('/availability', (req, res) => {
  try {
    const { start_date, end_date, timezone = 'Asia/Singapore' } = req.query;
    const admin_id = req.user?.id || 'admin';

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required'
      });
    }

    // Get weekly availability patterns
    const weeklyAvailability = db.prepare(`
      SELECT * FROM calendar_availability
      WHERE admin_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(admin_id);

    // Get special dates that override weekly patterns
    const specialDates = db.prepare(`
      SELECT * FROM calendar_special_dates
      WHERE admin_id = ? AND date BETWEEN ? AND ?
    `).all(admin_id, start_date, end_date);

    // Generate availability slots for the date range
    const availabilitySlots = [];
    const currentDate = new Date(start_date);
    const endDate = new Date(end_date);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      // Check for special date override
      const specialDate = specialDates.find(sd => sd.date === dateString);

      if (specialDate) {
        if (specialDate.is_available && specialDate.custom_hours) {
          const customHours = JSON.parse(specialDate.custom_hours);
          customHours.forEach(slot => {
            const slotDateTime = new Date(`${dateString}T${slot.start}:00`);
            availabilitySlots.push({
              datetime: slotDateTime.toISOString(),
              is_available: true,
              is_blocked: false,
              notes: specialDate.title,
              buffer_minutes: 0,
              source: 'special_date'
            });
          });
        }
      } else {
        // Use weekly pattern
        const dayAvailability = weeklyAvailability.filter(wa => wa.day_of_week === dayOfWeek);

        dayAvailability.forEach(slot => {
          const slotDateTime = new Date(`${dateString}T${slot.start_time}:00`);
          const endDateTime = new Date(`${dateString}T${slot.end_time}:00`);

          // Generate hourly slots within the availability window
          const currentSlot = new Date(slotDateTime);
          while (currentSlot < endDateTime) {
            availabilitySlots.push({
              datetime: currentSlot.toISOString(),
              is_available: true,
              is_blocked: false,
              notes: '',
              buffer_minutes: slot.buffer_minutes,
              source: 'weekly_pattern'
            });
            currentSlot.setHours(currentSlot.getHours() + 1);
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: availabilitySlots
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
});

// Update weekly availability
router.post('/availability/weekly', (req, res) => {
  try {
    const { weeklySchedule, bufferTime = 15 } = req.body;
    const admin_id = req.user?.id || 'admin';

    // Clear existing weekly availability
    db.prepare('DELETE FROM calendar_availability WHERE admin_id = ?').run(admin_id);

    // Insert new weekly schedule
    const insertStmt = db.prepare(`
      INSERT INTO calendar_availability
      (admin_id, day_of_week, start_time, end_time, buffer_minutes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    for (const [dayName, slots] of Object.entries(weeklySchedule)) {
      const dayOfWeek = dayMap[dayName];
      if (dayOfWeek !== undefined && slots.length > 0) {
        for (const slot of slots) {
          insertStmt.run(admin_id, dayOfWeek, slot.start, slot.end, bufferTime);
        }
      }
    }

    res.json({
      success: true,
      message: 'Weekly availability updated successfully'
    });
  } catch (error) {
    console.error('Update weekly availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update weekly availability'
    });
  }
});

// Get scheduled interviews
router.get('/interviews', (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const admin_id = req.user?.id || 'admin';

    let query = `
      SELECT * FROM calendar_interviews
      WHERE admin_id = ?
    `;
    const params = [admin_id];

    if (start_date && end_date) {
      query += ` AND DATE(scheduled_datetime) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_datetime ASC`;

    const interviews = db.prepare(query).all(...params);

    // Add display formatting
    const formattedInterviews = interviews.map(interview => ({
      ...interview,
      scheduled_date: interview.scheduled_datetime.split('T')[0],
      scheduled_time: formatTime(interview.scheduled_datetime),
      displayTime: {
        date: new Date(interview.scheduled_datetime).toLocaleDateString('en-SG', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        }),
        time: formatTime(interview.scheduled_datetime),
        full: new Date(interview.scheduled_datetime).toLocaleString('en-SG', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }));

    res.json({
      success: true,
      data: formattedInterviews
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews'
    });
  }
});

// Schedule new interview
router.post('/interviews', (req, res) => {
  try {
    const {
      candidate_id,
      candidate_name,
      candidate_email,
      datetime,
      duration = 30,
      interview_type = 'video',
      notes = ''
    } = req.body;
    const admin_id = req.user?.id || 'admin';

    if (!candidate_name || !datetime) {
      return res.status(400).json({
        success: false,
        message: 'candidate_name and datetime are required'
      });
    }

    // Check for conflicts
    const existingInterview = db.prepare(`
      SELECT id FROM calendar_interviews
      WHERE admin_id = ? AND scheduled_datetime = ? AND status != 'cancelled'
    `).get(admin_id, datetime);

    if (existingInterview) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    const result = db.prepare(`
      INSERT INTO calendar_interviews
      (candidate_id, candidate_name, candidate_email, admin_id, scheduled_datetime,
       duration_minutes, interview_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      candidate_id,
      candidate_name,
      candidate_email,
      admin_id,
      datetime,
      duration,
      interview_type,
      notes
    );

    const newInterview = db.prepare(`
      SELECT * FROM calendar_interviews WHERE id = ?
    `).get(result.lastInsertRowid);

    res.json({
      success: true,
      data: newInterview,
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview'
    });
  }
});

// Reschedule interview
router.put('/interviews/:id/reschedule', (req, res) => {
  try {
    const { id } = req.params;
    const { new_datetime } = req.body;
    const admin_id = req.user?.id || 'admin';

    if (!new_datetime) {
      return res.status(400).json({
        success: false,
        message: 'new_datetime is required'
      });
    }

    // Check for conflicts
    const existingInterview = db.prepare(`
      SELECT id FROM calendar_interviews
      WHERE admin_id = ? AND scheduled_datetime = ? AND status != 'cancelled' AND id != ?
    `).get(admin_id, new_datetime, id);

    if (existingInterview) {
      return res.status(409).json({
        success: false,
        message: 'New time slot is already booked'
      });
    }

    const result = db.prepare(`
      UPDATE calendar_interviews
      SET scheduled_datetime = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND admin_id = ?
    `).run(new_datetime, id, admin_id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    const updatedInterview = db.prepare(`
      SELECT * FROM calendar_interviews WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      data: updatedInterview,
      message: 'Interview rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule interview'
    });
  }
});

// Cancel interview
router.put('/interviews/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    const admin_id = req.user?.id || 'admin';

    const result = db.prepare(`
      UPDATE calendar_interviews
      SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND admin_id = ?
    `).run(`Cancelled: ${reason}`, id, admin_id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    res.json({
      success: true,
      message: 'Interview cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel interview'
    });
  }
});

// Manage special dates
router.get('/special-dates', (req, res) => {
  try {
    const admin_id = req.user?.id || 'admin';

    const specialDates = db.prepare(`
      SELECT * FROM calendar_special_dates
      WHERE admin_id = ?
      ORDER BY date ASC
    `).all(admin_id);

    res.json({
      success: true,
      data: specialDates.map(date => ({
        ...date,
        custom_hours: date.custom_hours ? JSON.parse(date.custom_hours) : []
      }))
    });
  } catch (error) {
    console.error('Get special dates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch special dates'
    });
  }
});

router.post('/special-dates', (req, res) => {
  try {
    const { specialDates } = req.body;
    const admin_id = req.user?.id || 'admin';

    // Clear existing special dates
    db.prepare('DELETE FROM calendar_special_dates WHERE admin_id = ?').run(admin_id);

    // Insert new special dates
    if (specialDates && specialDates.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO calendar_special_dates
        (admin_id, date, type, title, description, is_available, custom_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const date of specialDates) {
        const isAvailable = date.type === 'custom';
        const customHours = date.customHours && date.customHours.length > 0
          ? JSON.stringify(date.customHours)
          : null;

        insertStmt.run(
          admin_id,
          date.date,
          date.type,
          date.title,
          date.description || '',
          isAvailable ? 1 : 0,
          customHours
        );
      }
    }

    res.json({
      success: true,
      message: 'Special dates updated successfully'
    });
  } catch (error) {
    console.error('Update special dates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update special dates'
    });
  }
});

module.exports = router;