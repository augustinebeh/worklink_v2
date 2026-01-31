/**
 * Referrals API - Enhanced with WhatsApp sharing and tiered bonuses
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get referral dashboard for a candidate
router.get('/dashboard/:candidateId', (req, res) => {
  try {
    const candidate = db.prepare(`
      SELECT id, name, referral_code, referral_tier, total_referral_earnings 
      FROM candidates WHERE id = ?
    `).get(req.params.candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Get referrals made by this candidate
    const referrals = db.prepare(`
      SELECT r.*, c.name as referred_name, c.status as referred_status, 
             c.total_jobs_completed as referred_jobs
      FROM referrals r
      JOIN candidates c ON r.referred_id = c.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.candidateId);

    // Get tiers
    const tiers = db.prepare('SELECT * FROM referral_tiers ORDER BY tier_level').all();
    const currentTier = tiers.find(t => t.tier_level === candidate.referral_tier) || tiers[0];
    const nextTier = tiers.find(t => t.tier_level === candidate.referral_tier + 1);

    // Calculate stats
    const stats = {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter(r => r.status !== 'pending').length,
      pendingBonuses: referrals.filter(r => r.status === 'registered').length,
      totalEarned: candidate.total_referral_earnings || 0,
    };

    // Generate share links
    const baseUrl = process.env.APP_URL || 'https://worklink.app';
    const shareLinks = {
      web: `${baseUrl}/join?ref=${candidate.referral_code}`,
      whatsapp: generateWhatsAppLink(candidate.name, candidate.referral_code, baseUrl),
      telegram: generateTelegramLink(candidate.name, candidate.referral_code, baseUrl),
      sms: generateSMSLink(candidate.name, candidate.referral_code, baseUrl),
    };

    res.json({
      success: true,
      data: {
        referralCode: candidate.referral_code,
        currentTier,
        nextTier,
        stats,
        referrals,
        shareLinks,
        tiers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate WhatsApp share link
function generateWhatsAppLink(referrerName, code, baseUrl) {
  const message = `🎉 Hey! I've been earning extra cash with WorkLink - flexible gig jobs in Singapore!\n\n` +
    `Use my code *${code}* when you sign up and we BOTH get $30 bonus! 💰\n\n` +
    `Join here: ${baseUrl}/join?ref=${code}\n\n` +
    `It's super easy - just sign up, complete 1 job, and get paid!`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// Generate Telegram share link  
function generateTelegramLink(referrerName, code, baseUrl) {
  const message = `🎉 Earn with WorkLink! Use my code ${code} for $30 bonus.\n${baseUrl}/join?ref=${code}`;
  return `https://t.me/share/url?url=${encodeURIComponent(baseUrl + '/join?ref=' + code)}&text=${encodeURIComponent(message)}`;
}

// Generate SMS link
function generateSMSLink(referrerName, code, baseUrl) {
  const message = `Join WorkLink with my code ${code} - we both get $30! ${baseUrl}/join?ref=${code}`;
  return `sms:?body=${encodeURIComponent(message)}`;
}

// Register via referral code
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, referral_code } = req.body;

    // Find referrer
    const referrer = db.prepare('SELECT id, name FROM candidates WHERE referral_code = ?').get(referral_code);
    if (!referrer) {
      return res.status(400).json({ success: false, error: 'Invalid referral code' });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Generate new candidate ID and referral code
    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const newReferralCode = name.split(' ')[0].toUpperCase().slice(0, 4) + 
      Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create candidate
    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, status, source, referral_code, referred_by)
      VALUES (?, ?, ?, ?, 'onboarding', 'referral', ?, ?)
    `).run(id, name, email, phone, newReferralCode, referrer.id);

    // Create referral record
    const refId = 'REF' + Date.now().toString(36).toUpperCase();
    const tier1Bonus = db.prepare('SELECT bonus_amount FROM referral_tiers WHERE tier_level = 1').get();
    
    db.prepare(`
      INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount)
      VALUES (?, ?, ?, 'registered', 1, ?)
    `).run(refId, referrer.id, id, tier1Bonus?.bonus_amount || 30);

    // Notify referrer
    db.prepare(`
      INSERT INTO notifications (candidate_id, type, title, message, data)
      VALUES (?, 'referral', 'New Referral! 🎉', ?, ?)
    `).run(
      referrer.id,
      `${name} just signed up using your code! You'll earn $${tier1Bonus?.bonus_amount || 30} when they complete their first job.`,
      JSON.stringify({ referred_id: id, referred_name: name })
    );

    res.status(201).json({
      success: true,
      data: {
        candidateId: id,
        referralCode: newReferralCode,
        referredBy: referrer.name,
        bonusAmount: tier1Bonus?.bonus_amount || 30,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process referral bonus (called when referred candidate completes a job)
router.post('/process-bonus', (req, res) => {
  try {
    const { candidate_id, job_id } = req.body;

    // Find if this candidate was referred
    const referral = db.prepare(`
      SELECT r.*, c.name as referrer_name 
      FROM referrals r
      JOIN candidates c ON r.referrer_id = c.id
      WHERE r.referred_id = ?
    `).get(candidate_id);

    if (!referral) {
      return res.json({ success: true, message: 'No referral to process' });
    }

    // Update jobs completed count
    const newJobCount = referral.jobs_completed_by_referred + 1;
    db.prepare('UPDATE referrals SET jobs_completed_by_referred = ? WHERE id = ?').run(newJobCount, referral.id);

    // Check tier progression
    const tiers = db.prepare('SELECT * FROM referral_tiers ORDER BY tier_level').all();
    let bonusToAward = 0;
    let newTier = referral.tier;

    for (const tier of tiers) {
      if (newJobCount >= tier.jobs_required && tier.tier_level > referral.tier) {
        // Award tier bonus
        bonusToAward = tier.bonus_amount;
        newTier = tier.tier_level;
      }
    }

    // First job bonus (tier 1)
    if (newJobCount === 1 && referral.status === 'registered') {
      bonusToAward = referral.bonus_amount;
      db.prepare('UPDATE referrals SET status = ? WHERE id = ?').run('bonus_paid', referral.id);
    }

    if (bonusToAward > 0) {
      // Update referral
      db.prepare(`
        UPDATE referrals SET tier = ?, total_bonus_paid = total_bonus_paid + ? WHERE id = ?
      `).run(newTier, bonusToAward, referral.id);

      // Update referrer's earnings
      db.prepare(`
        UPDATE candidates SET 
          total_referral_earnings = total_referral_earnings + ?,
          total_incentives_earned = total_incentives_earned + ?,
          referral_tier = MAX(referral_tier, ?)
        WHERE id = ?
      `).run(bonusToAward, bonusToAward, newTier, referral.referrer_id);

      // Notify referrer
      const tierInfo = tiers.find(t => t.tier_level === newTier);
      db.prepare(`
        INSERT INTO notifications (candidate_id, type, title, message, data)
        VALUES (?, 'referral_bonus', 'Referral Bonus! 💰', ?, ?)
      `).run(
        referral.referrer_id,
        `You earned $${bonusToAward}! ${tierInfo?.description || ''}`,
        JSON.stringify({ bonus: bonusToAward, tier: newTier })
      );
    }

    res.json({
      success: true,
      data: {
        bonusAwarded: bonusToAward,
        newTier,
        totalBonusPaid: referral.total_bonus_paid + bonusToAward,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get referral leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const leaderboard = db.prepare(`
      SELECT c.id, c.name, c.profile_photo, c.referral_tier, c.total_referral_earnings,
             COUNT(r.id) as total_referrals,
             SUM(CASE WHEN r.status != 'pending' THEN 1 ELSE 0 END) as successful_referrals
      FROM candidates c
      LEFT JOIN referrals r ON c.id = r.referrer_id
      GROUP BY c.id
      HAVING total_referrals > 0
      ORDER BY successful_referrals DESC, total_referral_earnings DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate referral code
router.get('/validate/:code', (req, res) => {
  try {
    const referrer = db.prepare(`
      SELECT id, name, profile_photo FROM candidates WHERE referral_code = ?
    `).get(req.params.code);

    if (!referrer) {
      return res.json({ success: true, valid: false });
    }

    const tier1Bonus = db.prepare('SELECT bonus_amount FROM referral_tiers WHERE tier_level = 1').get();

    res.json({
      success: true,
      valid: true,
      data: {
        referrerName: referrer.name,
        referrerPhoto: referrer.profile_photo,
        bonusAmount: tier1Bonus?.bonus_amount || 30,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
