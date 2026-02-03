/**
 * Multilingual Conversation Engine
 * Handles automatic language detection and culturally adapted FOMO strategies
 */

class MultilingualConversationEngine {
  constructor() {
    // Supported languages with regional variants
    this.supportedLanguages = {
      'en': {
        name: 'English',
        regions: ['SG', 'US', 'UK', 'AU'],
        defaultRegion: 'SG',
        confidence: 0.95
      },
      'zh': {
        name: 'Chinese',
        regions: ['CN', 'TW', 'SG', 'HK'],
        variants: ['simplified', 'traditional'],
        defaultRegion: 'SG',
        defaultVariant: 'simplified',
        confidence: 0.88
      },
      'ms': {
        name: 'Malay',
        regions: ['MY', 'SG', 'ID'],
        defaultRegion: 'SG',
        confidence: 0.85
      },
      'ta': {
        name: 'Tamil',
        regions: ['IN', 'SG', 'LK'],
        defaultRegion: 'SG',
        confidence: 0.82
      },
      'hi': {
        name: 'Hindi',
        regions: ['IN'],
        defaultRegion: 'IN',
        confidence: 0.80
      }
    };

    // Cultural adaptation parameters for FOMO strategies
    this.culturalAdaptations = {
      'en-SG': {
        fomoStyle: 'professional_urgent',
        socialProofEmphasis: 'statistics',
        urgencyTone: 'polite_firm',
        timeFormat: '24h',
        currencyFormat: 'SGD',
        workCulture: 'efficiency_focused',
        personalSpace: 'moderate',
        hierarchyAwareness: 'medium'
      },
      'zh-SG': {
        fomoStyle: 'community_pressure',
        socialProofEmphasis: 'peer_comparison',
        urgencyTone: 'respectful_persistent',
        timeFormat: '24h',
        currencyFormat: 'SGD',
        workCulture: 'relationship_focused',
        personalSpace: 'high',
        hierarchyAwareness: 'high'
      },
      'ms-SG': {
        fomoStyle: 'opportunity_based',
        socialProofEmphasis: 'community_success',
        urgencyTone: 'warm_encouraging',
        timeFormat: '12h',
        currencyFormat: 'SGD',
        workCulture: 'harmony_focused',
        personalSpace: 'moderate',
        hierarchyAwareness: 'medium'
      },
      'ta-SG': {
        fomoStyle: 'family_benefit',
        socialProofEmphasis: 'success_stories',
        urgencyTone: 'respectful_urgent',
        timeFormat: '12h',
        currencyFormat: 'SGD',
        workCulture: 'family_focused',
        personalSpace: 'moderate',
        hierarchyAwareness: 'high'
      }
    };

    // Language-specific conversation templates
    this.multilingualTemplates = new Map();
    this.initializeLanguageTemplates();

    // Cultural FOMO strategies
    this.culturalFOMOStrategies = new Map();
    this.initializeCulturalStrategies();
  }

  /**
   * Detect language from candidate profile and conversation context
   */
  async detectLanguage(candidateId, conversationContext = {}) {
    const candidate = await this.getCandidateProfile(candidateId);
    const detectionSources = [];

    // 1. Check explicit language preference
    if (candidate.languagePreference) {
      detectionSources.push({
        source: 'explicit_preference',
        language: candidate.languagePreference,
        confidence: 0.95
      });
    }

    // 2. Analyze candidate name patterns
    const nameLanguage = this.detectLanguageFromName(candidate.name);
    if (nameLanguage) {
      detectionSources.push({
        source: 'name_analysis',
        language: nameLanguage.language,
        confidence: nameLanguage.confidence
      });
    }

    // 3. Detect from conversation messages
    if (conversationContext.messages && conversationContext.messages.length > 0) {
      const messageLanguage = await this.detectLanguageFromMessages(conversationContext.messages);
      if (messageLanguage) {
        detectionSources.push({
          source: 'message_analysis',
          language: messageLanguage.language,
          confidence: messageLanguage.confidence
        });
      }
    }

    // 4. Geographic inference
    const geoLanguage = this.inferLanguageFromLocation(candidate.location);
    if (geoLanguage) {
      detectionSources.push({
        source: 'geographic_inference',
        language: geoLanguage.language,
        confidence: geoLanguage.confidence
      });
    }

    // 5. Phone number analysis
    if (candidate.phone) {
      const phoneLanguage = this.detectLanguageFromPhone(candidate.phone);
      if (phoneLanguage) {
        detectionSources.push({
          source: 'phone_analysis',
          language: phoneLanguage.language,
          confidence: phoneLanguage.confidence
        });
      }
    }

    // Combine detection sources with weighted confidence
    const languageScores = this.calculateLanguageScores(detectionSources);
    const primaryLanguage = this.selectPrimaryLanguage(languageScores);

    return {
      primaryLanguage: primaryLanguage.language,
      region: primaryLanguage.region,
      confidence: primaryLanguage.confidence,
      detectionSources,
      fallbackLanguages: this.getFallbackLanguages(languageScores),
      culturalContext: this.getCulturalContext(primaryLanguage)
    };
  }

  /**
   * Generate culturally adapted conversation based on detected language
   */
  async generateCulturallyAdaptedConversation(candidateId, messageType, baseTemplate, languageDetection) {
    const cultureKey = `${languageDetection.primaryLanguage}-${languageDetection.region}`;
    const culturalAdaptation = this.culturalAdaptations[cultureKey] || this.culturalAdaptations['en-SG'];

    // Get language-specific template
    const languageTemplate = this.getLanguageTemplate(
      languageDetection.primaryLanguage,
      messageType,
      baseTemplate
    );

    // Apply cultural FOMO strategies
    const culturalFOMO = await this.applyCulturalFOMO(
      candidateId,
      languageTemplate,
      culturalAdaptation,
      languageDetection
    );

    // Localize content (currency, time, cultural references)
    const localizedContent = await this.localizeContent(
      culturalFOMO,
      languageDetection.primaryLanguage,
      languageDetection.region,
      culturalAdaptation
    );

    return {
      type: 'culturally_adapted',
      language: languageDetection.primaryLanguage,
      region: languageDetection.region,
      culturalStrategy: culturalAdaptation.fomoStyle,
      content: localizedContent.content,
      metadata: {
        candidateId,
        originalTemplate: baseTemplate.type,
        culturalAdaptations: culturalAdaptation,
        localizationApplied: localizedContent.localizationApplied,
        confidence: languageDetection.confidence
      }
    };
  }

  /**
   * Apply cultural FOMO strategies based on cultural context
   */
  async applyCulturalFOMO(candidateId, template, culturalAdaptation, languageDetection) {
    const strategy = this.culturalFOMOStrategies.get(culturalAdaptation.fomoStyle);

    if (!strategy) {
      return template; // Return original if no strategy found
    }

    const culturalContext = {
      workCulture: culturalAdaptation.workCulture,
      socialProofType: culturalAdaptation.socialProofEmphasis,
      urgencyTone: culturalAdaptation.urgencyTone,
      personalSpace: culturalAdaptation.personalSpace,
      hierarchyLevel: culturalAdaptation.hierarchyAwareness
    };

    return await strategy.apply(template, culturalContext, candidateId);
  }

  /**
   * Initialize language-specific templates
   */
  initializeLanguageTemplates() {
    // English templates
    this.multilingualTemplates.set('en', {
      welcome: {
        urgent: "🚨 **PRIORITY ACCESS** - {firstName}!\n\n⚡ **BREAKING**: Only {slotsRemaining} interview slots remain for this week!",
        friendly: "Hi {firstName}! 👋 Welcome to WorkLink!\n\nYour account is being reviewed by our team.",
        professional: "Dear {firstName},\n\nThank you for your interest in WorkLink opportunities."
      },
      scheduling: {
        urgent: "**⏰ IMMEDIATE ACTION REQUIRED**: Type \"**BOOK NOW**\" to claim your priority slot",
        friendly: "Would you like to schedule a quick 15-minute verification call?",
        professional: "We would like to arrange a brief interview to discuss suitable opportunities."
      }
    });

    // Chinese templates (Simplified)
    this.multilingualTemplates.set('zh', {
      welcome: {
        urgent: "🚨 **优先通道** - {firstName}！\n\n⚡ **紧急通知**：本周仅剩 {slotsRemaining} 个面试名额！",
        friendly: "你好 {firstName}！👋 欢迎来到WorkLink！\n\n我们的团队正在审核您的账户。",
        professional: "尊敬的 {firstName}，\n\n感谢您对WorkLink职业机会的关注。"
      },
      scheduling: {
        urgent: "**⏰ 立即行动**：输入 \"**立即预约**\" 来锁定您的优先名额",
        friendly: "您是否愿意安排一个15分钟的简短验证通话？",
        professional: "我们希望安排一次简短面试来讨论合适的机会。"
      }
    });

    // Malay templates
    this.multilingualTemplates.set('ms', {
      welcome: {
        urgent: "🚨 **AKSES KEUTAMAAN** - {firstName}!\n\n⚡ **PENTING**: Hanya {slotsRemaining} slot temu duga tersisa untuk minggu ini!",
        friendly: "Hai {firstName}! 👋 Selamat datang ke WorkLink!\n\nAkaun anda sedang disemak oleh pasukan kami.",
        professional: "Yang dihormati {firstName},\n\nTerima kasih atas minat anda terhadap peluang di WorkLink."
      },
      scheduling: {
        urgent: "**⏰ TINDAKAN SEGERA DIPERLUKAN**: Taip \"**TEMPAH SEKARANG**\" untuk menuntut slot keutamaan anda",
        friendly: "Adakah anda ingin menjadualkan panggilan pengesahan selama 15 minit?",
        professional: "Kami ingin mengatur temu duga ringkas untuk membincangkan peluang yang sesuai."
      }
    });

    // Tamil templates
    this.multilingualTemplates.set('ta', {
      welcome: {
        urgent: "🚨 **முன்னுரிமை அணுகல்** - {firstName}!\n\n⚡ **அவசர அறிவிப்பு**: இந்த வாரத்திற்கு {slotsRemaining} நேர்காணல் இடங்கள் மட்டுமே மீதமுள்ளன!",
        friendly: "வணக்கம் {firstName}! 👋 WorkLink-க்கு வரவேற்கிறோம்!\n\nஉங்கள் கணக்கு எங்கள் குழுவால் மதிப்பாய்வு செய்யப்படுகிறது.",
        professional: "மதிப்பிற்குரிய {firstName},\n\nWorkLink வாய்ப்புகளில் உங்கள் ஆர்வத்திற்கு நன்றி."
      },
      scheduling: {
        urgent: "**⏰ உடனடி நடவடிக்கை தேவை**: உங்கள் முன்னுரிமை இடத்தைப் பெற \"**இப்போது முன்பதிவு செய்யுங்கள்**\" என்று தட்டச்சு செய்யுங்கள்",
        friendly: "15 நிமிட சரிபார்ப்பு அழைப்பை திட்டமிட விரும்புகிறீர்களா?",
        professional: "பொருத்தமான வாய்ப்புகளைப் பற்றி விவாதிக்க ஒரு சுருக்கமான நேர்காணலை ஏற்பாடு செய்ய விரும்புகிறோம்."
      }
    });
  }

  /**
   * Initialize cultural FOMO strategies
   */
  initializeCulturalStrategies() {
    // Professional urgent (English Singapore)
    this.culturalFOMOStrategies.set('professional_urgent', {
      apply: async (template, context, candidateId) => {
        return {
          ...template,
          content: template.content
            .replace(/🚨/g, '⚡')
            .replace(/BREAKING/g, 'URGENT UPDATE')
            + "\n\n**Professional Development Opportunity**: Fast-track your career advancement."
        };
      }
    });

    // Community pressure (Chinese)
    this.culturalFOMOStrategies.set('community_pressure', {
      apply: async (template, context, candidateId) => {
        return {
          ...template,
          content: template.content
            + "\n\n**同事推荐**: 已有50+位专业人士通过我们的平台获得了更好的职位。\n**社区见证**: 加入成功专业人士的行列！"
        };
      }
    });

    // Opportunity based (Malay)
    this.culturalFOMOStrategies.set('opportunity_based', {
      apply: async (template, context, candidateId) => {
        return {
          ...template,
          content: template.content
            + "\n\n**Peluang Terbatas**: Jangan lepaskan peluang ini untuk meningkatkan kerjaya anda.\n**Kejayaan Komuniti**: Sertai mereka yang telah berjaya!"
        };
      }
    });

    // Family benefit (Tamil)
    this.culturalFOMOStrategies.set('family_benefit', {
      apply: async (template, context, candidateId) => {
        return {
          ...template,
          content: template.content
            + "\n\n**குடும்ப நல்வாழ்வு**: உங்கள் குடும்பத்தின் எதிர்காலத்தைப் பாதுகாக்கவும்.\n**வெற்றிக் கதைகள்**: பல குடும்பங்கள் நமது மூலம் சிறந்த வாய்ப்புகளைப் பெற்றுள்ளனர்."
        };
      }
    });
  }

  /**
   * Detect language from candidate name patterns
   */
  detectLanguageFromName(name) {
    const namePatterns = {
      'zh': {
        patterns: [/[\u4e00-\u9fff]/, /^[A-Z][a-z]+ [A-Z][a-z]+$/, /^(Wang|Li|Zhang|Liu|Chen|Yang|Huang|Zhao|Wu|Zhou)/],
        confidence: 0.8
      },
      'ms': {
        patterns: [/^(Muhammad|Ahmad|Ali|Hassan|Nur|Siti|Fatimah|Aminah)/, /bin |bte |binti /],
        confidence: 0.75
      },
      'ta': {
        patterns: [/^(Raj|Kumar|Murugan|Selvam|Priya|Lakshmi|Kavitha|Meera)/, /[\u0b80-\u0bff]/],
        confidence: 0.7
      },
      'hi': {
        patterns: [/^(Raj|Amit|Suresh|Priya|Sunita|Kavita|Ravi|Deepak)/, /[\u0900-\u097f]/],
        confidence: 0.65
      }
    };

    for (const [lang, config] of Object.entries(namePatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(name)) {
          return {
            language: lang,
            confidence: config.confidence
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect language from conversation messages
   */
  async detectLanguageFromMessages(messages) {
    const candidateMessages = messages.filter(m => m.sender === 'candidate');
    if (candidateMessages.length === 0) return null;

    const text = candidateMessages.map(m => m.content).join(' ');
    return this.analyzeTextLanguage(text);
  }

  /**
   * Analyze text to determine language
   */
  analyzeTextLanguage(text) {
    const languageIndicators = {
      'zh': {
        patterns: [/[\u4e00-\u9fff]/, /是|不是|我|你|他|她|的|在|有|没有/],
        commonWords: ['是', '不', '我', '你', '的', '有', '会', '要', '可以', '什么'],
        confidence: 0.9
      },
      'ms': {
        patterns: [/\b(saya|anda|dia|tidak|adalah|dengan|untuk|dari|ke|di)\b/i],
        commonWords: ['saya', 'anda', 'tidak', 'adalah', 'dengan', 'untuk', 'dari', 'ke', 'di', 'yang'],
        confidence: 0.85
      },
      'ta': {
        patterns: [/[\u0b80-\u0bff]/, /\b(நான்|நீங்கள்|அவர்|இல்லை|உள்ளது|உடன்|மற்றும்)\b/],
        commonWords: ['நான்', 'நீங்கள்', 'அவர்', 'இல்லை', 'உள்ளது', 'உடன்', 'மற்றும்'],
        confidence: 0.85
      },
      'hi': {
        patterns: [/[\u0900-\u097f]/, /\b(मैं|आप|वह|नहीं|है|के साथ|और|से|को|में)\b/],
        commonWords: ['मैं', 'आप', 'वह', 'नहीं', 'है', 'के', 'और', 'से', 'को', 'में'],
        confidence: 0.8
      }
    };

    const scores = {};

    for (const [lang, config] of Object.entries(languageIndicators)) {
      let score = 0;

      // Pattern matching
      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * 0.5;
        }
      }

      // Common words
      for (const word of config.commonWords) {
        if (text.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        scores[lang] = {
          score,
          confidence: Math.min(config.confidence, score / 10)
        };
      }
    }

    if (Object.keys(scores).length === 0) return null;

    const bestMatch = Object.entries(scores)
      .sort(([,a], [,b]) => b.score - a.score)[0];

    return {
      language: bestMatch[0],
      confidence: bestMatch[1].confidence
    };
  }

  /**
   * Infer language from location/country
   */
  inferLanguageFromLocation(location) {
    if (!location) return null;

    const locationLanguageMap = {
      'singapore': { language: 'en', region: 'SG', confidence: 0.6 },
      'malaysia': { language: 'ms', region: 'MY', confidence: 0.7 },
      'china': { language: 'zh', region: 'CN', confidence: 0.9 },
      'taiwan': { language: 'zh', region: 'TW', confidence: 0.9 },
      'hong kong': { language: 'zh', region: 'HK', confidence: 0.8 },
      'india': { language: 'hi', region: 'IN', confidence: 0.5 }
    };

    const locationLower = location.toLowerCase();
    for (const [loc, config] of Object.entries(locationLanguageMap)) {
      if (locationLower.includes(loc)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Detect language from phone number patterns
   */
  detectLanguageFromPhone(phone) {
    const phonePatterns = {
      '+65': { language: 'en', region: 'SG', confidence: 0.6 }, // Singapore
      '+60': { language: 'ms', region: 'MY', confidence: 0.7 }, // Malaysia
      '+86': { language: 'zh', region: 'CN', confidence: 0.8 }, // China
      '+886': { language: 'zh', region: 'TW', confidence: 0.8 }, // Taiwan
      '+852': { language: 'zh', region: 'HK', confidence: 0.8 }, // Hong Kong
      '+91': { language: 'hi', region: 'IN', confidence: 0.5 }  // India
    };

    for (const [prefix, config] of Object.entries(phonePatterns)) {
      if (phone.startsWith(prefix)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Calculate weighted language scores from multiple sources
   */
  calculateLanguageScores(detectionSources) {
    const weights = {
      'explicit_preference': 1.0,
      'message_analysis': 0.9,
      'name_analysis': 0.7,
      'phone_analysis': 0.6,
      'geographic_inference': 0.4
    };

    const languageScores = {};

    for (const source of detectionSources) {
      const weight = weights[source.source] || 0.5;
      const weightedScore = source.confidence * weight;

      if (!languageScores[source.language]) {
        languageScores[source.language] = {
          totalScore: 0,
          sources: []
        };
      }

      languageScores[source.language].totalScore += weightedScore;
      languageScores[source.language].sources.push(source);
    }

    return languageScores;
  }

  /**
   * Select primary language based on weighted scores
   */
  selectPrimaryLanguage(languageScores) {
    if (Object.keys(languageScores).length === 0) {
      return {
        language: 'en',
        region: 'SG',
        confidence: 0.5
      };
    }

    const sortedLanguages = Object.entries(languageScores)
      .sort(([,a], [,b]) => b.totalScore - a.totalScore);

    const primaryLang = sortedLanguages[0][0];
    const primaryScore = sortedLanguages[0][1];

    // Determine region based on sources
    const regionSources = primaryScore.sources.filter(s => s.region);
    const primaryRegion = regionSources.length > 0
      ? regionSources[0].region
      : this.supportedLanguages[primaryLang]?.defaultRegion || 'SG';

    return {
      language: primaryLang,
      region: primaryRegion,
      confidence: Math.min(1.0, primaryScore.totalScore)
    };
  }

  /**
   * Get language template with fallback
   */
  getLanguageTemplate(language, messageType, baseTemplate) {
    const langTemplates = this.multilingualTemplates.get(language);

    if (langTemplates && langTemplates[messageType]) {
      const templateVariant = langTemplates[messageType][baseTemplate.tone] ||
                             langTemplates[messageType]['friendly'];

      return {
        ...baseTemplate,
        content: templateVariant
      };
    }

    // Fallback to English
    const englishTemplates = this.multilingualTemplates.get('en');
    const fallbackTemplate = englishTemplates[messageType]?.[baseTemplate.tone] ||
                             englishTemplates[messageType]?.['friendly'] ||
                             baseTemplate.content;

    return {
      ...baseTemplate,
      content: fallbackTemplate
    };
  }

  /**
   * Localize content for specific region/culture
   */
  async localizeContent(template, language, region, culturalAdaptation) {
    let content = template.content;
    const localizationApplied = [];

    // Currency localization
    if (content.includes('$')) {
      const currencySymbol = this.getCurrencySymbol(culturalAdaptation.currencyFormat);
      content = content.replace(/\$([0-9,]+)/g, `${currencySymbol}$1`);
      localizationApplied.push('currency');
    }

    // Time format localization
    if (culturalAdaptation.timeFormat === '24h') {
      content = content.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (match, hours, minutes, meridiem) => {
        let hour24 = parseInt(hours);
        if (meridiem.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (meridiem.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${minutes}`;
      });
      localizationApplied.push('time_format');
    }

    // Cultural greeting adjustments
    if (culturalAdaptation.hierarchyAwareness === 'high') {
      content = content.replace(/Hi (\w+)!/g, 'Dear $1,');
      localizationApplied.push('greeting_formality');
    }

    return {
      content,
      localizationApplied
    };
  }

  /**
   * Helper methods
   */

  getCurrencySymbol(currencyFormat) {
    const currencySymbols = {
      'SGD': 'S$',
      'MYR': 'RM',
      'CNY': '¥',
      'INR': '₹',
      'USD': '$'
    };
    return currencySymbols[currencyFormat] || '$';
  }

  getCulturalContext(languageData) {
    return this.culturalAdaptations[`${languageData.language}-${languageData.region}`] ||
           this.culturalAdaptations['en-SG'];
  }

  getFallbackLanguages(languageScores) {
    return Object.entries(languageScores)
      .sort(([,a], [,b]) => b.totalScore - a.totalScore)
      .slice(1, 3)
      .map(([lang]) => lang);
  }

  async getCandidateProfile(candidateId) {
    // Integration with database
    const Database = require('better-sqlite3');
    const db = new Database(require('path').resolve(__dirname, '../db/database.db'));
    return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
  }

  /**
   * Main integration method
   */
  async generateMultilingualResponse(candidateId, baseTemplate, conversationContext = {}) {
    try {
      // Detect candidate's language and cultural context
      const languageDetection = await this.detectLanguage(candidateId, conversationContext);

      // Generate culturally adapted conversation
      const adaptedConversation = await this.generateCulturallyAdaptedConversation(
        candidateId,
        baseTemplate.type,
        baseTemplate,
        languageDetection
      );

      console.log(`🌍 Generated multilingual response for ${candidateId}: ${languageDetection.primaryLanguage}-${languageDetection.region}`);

      return adaptedConversation;

    } catch (error) {
      console.error('Multilingual conversation generation error:', error);
      // Return original template as fallback
      return baseTemplate;
    }
  }
}

module.exports = MultilingualConversationEngine;