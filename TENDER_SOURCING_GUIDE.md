# Singapore Ad-Hoc Manpower Tender Sourcing Guide 2026

## Overview
This guide covers how to automate sourcing for ad-hoc manpower tenders in Singapore, covering both Government and Private sector portals.

---

## 1. Government Sector Portals (High Volume)

The Singapore government is the largest buyer of ad-hoc manpower (admin, security, cleaners, temp staff).

### Essential Portals

| Portal | URL | Description | Priority |
|--------|-----|-------------|----------|
| **GeBIZ** | gebiz.gov.sg | All public sector tenders over $6,000 | 🔴 Essential |
| **SESAMi (Ariba)** | sesami.sg | GLCs: Singtel, SATS, SIA | 🟠 High |
| **PSA Singapore** | singaporepsa.com | Port-related manpower | 🟡 Medium |
| **Town Councils** | emservices.com.sg | Conservancy and estate workers | 🟡 Medium |

### GeBIZ Tips
- Register as a vendor first
- Use RSS feed + Zapier for automatic monitoring
- Strong anti-bot protection - don't try to scrape directly
- RSS URL: `https://www.gebiz.gov.sg/rss/opportunities.xml`

---

## 2. Private Sector Portals (B2B Marketplace)

Private companies use e-procurement platforms rather than public boards.

| Portal | URL | Description | Priority |
|--------|-----|-------------|----------|
| **TenderBoard** | tenderboard.biz | HeritageSG, Gardens by the Bay, NGOs | 🟠 High |
| **SAP Business Network** | ariba.com | MNCs (Banks, Pharma) | 🟡 Medium |
| **Coupa Supplier Portal** | supplier.coupa.com | Tech and finance firms | 🟡 Medium |

### Private Sector Tips
- Register company profiles to be "discoverable"
- TenderBoard lists "Open" deals anyone can bid on
- Usually need invitation for specific RFQs, but profiles help

---

## 3. Automatic Scraping Solutions

### Option A: Done-for-You Aggregators (Recommended)

| Service | URL | Features | Cost |
|---------|-----|----------|------|
| **SingaporeTenders.com** | singaporetenders.com | Categorizes "Supply of Manpower" tenders | Subscription |
| **Tender Impulse** | tenderimpulse.com | Strong Singapore-specific daily feed | Subscription |
| **BidsInfo** | bidsinfo.com | Track contract AWARDS (competitor expiry) | Subscription |

### Option B: Build Your Own (No-Code)

| Tool | URL | How to Use | Cost |
|------|-----|------------|------|
| **Browse AI** | browse.ai | Train robot by clicking on GeBIZ results | Free tier |
| **Zapier** | zapier.com | Connect GeBIZ RSS to Google Sheets/CRM | Free tier |
| **Make.com** | make.com | Alternative to Zapier with more options | Free tier |

### Browse AI Setup (2 minutes)
1. Go to GeBIZ search results
2. Install Browse AI extension
3. Click elements to "train" the robot
4. Set hourly monitoring schedule
5. Connect to Slack or Email for alerts

### GeBIZ RSS + Zapier Setup
1. Get GeBIZ RSS feed URL
2. Create Zapier account
3. New Zap: RSS → Google Sheets
4. Filter by keywords
5. Optional: Add to your CRM

---

## 4. Search Keywords for Scrapers

Use these EXACT strings in your alerts:

### Essential Keywords
```
"Supply of Manpower Services"
"Provision of Temporary Staff"
"Invitation to Quote for Admin Support"
"Ad-hoc Event Support"
"Term Contract for Labour"
```

### Additional Keywords
```
"Outsourced Manpower"
"Temporary Administrative"
"Customer Service Officers"
"Event Crew"
"Ushers"
```

---

## 5. 2026 Competitive Intelligence Strategy

### Contract Expiry Poaching

The GeBIZ Award Notices section is your best intelligence target.

**Strategy:**
1. Set scraper to watch Awards section for "Manpower"
2. When a 2-year contract is awarded to a competitor
3. Set calendar reminder for **18 months** from award date
4. That's when the new tender will be published
5. Be ready to bid immediately

### Using BidsInfo
- Track all manpower contract awards
- Identify which competitors won what
- Predict when contracts will renew
- Build pipeline of upcoming opportunities

---

## 6. Quick Action Checklist

### Week 1: Setup
- [ ] Register on GeBIZ as vendor
- [ ] Register on SESAMi (SAP Ariba)
- [ ] Create TenderBoard account
- [ ] Sign up for SingaporeTenders.com alerts
- [ ] Set up Zapier + GeBIZ RSS

### Week 2: Monitoring
- [ ] Configure keyword alerts on all platforms
- [ ] Set up Slack/Email notifications
- [ ] Review first batch of tenders
- [ ] Identify high-priority opportunities

### Ongoing
- [ ] Daily: Check aggregator emails (5 min)
- [ ] Weekly: Review Award Notices for competitor wins
- [ ] Monthly: Update keyword list based on results
- [ ] Quarterly: Review win rates and adjust strategy

---

## 7. Integration with Worklink v2

Your Worklink platform now includes:

1. **BPO Dashboard** (`/bpo`)
   - Pipeline view of all tracked tenders
   - AI-powered recommendations
   - Portal directory with direct links

2. **AI Automation** (`/ai-automation`)
   - GeBIZ scraper (simulated)
   - Tender analysis with win probability
   - Job posting generator
   - Candidate outreach tools

3. **Tender Portals Tab**
   - Government portals list
   - Private portals list
   - Aggregator tools
   - Scraping setup guides

4. **Keywords Tab**
   - Copy-paste ready keywords
   - One-click copy all

---

## Support

For questions about the Worklink v2 platform or this sourcing strategy, refer to:
- `AI_AUTOMATION_GUIDE.md` - Technical setup
- BPO Dashboard in admin portal - Live tracking

Last updated: January 2026
