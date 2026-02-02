/**
 * Email Setup Script
 * Interactive setup for email notification system
 */

require('dotenv').config();
const readline = require('readline');
const { updateEmailConfig, testEmailConfig } = require('./config/email');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupEmail() {
  console.log('🚀 WorkLink Email Notification System Setup');
  console.log('=' .repeat(50));
  console.log('This wizard will help you configure email notifications.\n');

  try {
    // Ask for provider
    console.log('Available email providers:');
    console.log('1. SMTP (Gmail, Outlook, custom)');
    console.log('2. SendGrid');
    console.log('3. Mailgun');
    console.log('4. AWS SES\n');

    const providerChoice = await askQuestion('Select provider (1-4): ');

    let provider, config = {};

    switch (providerChoice) {
      case '1':
        provider = 'smtp';
        config = await setupSMTP();
        break;
      case '2':
        provider = 'sendgrid';
        config = await setupSendGrid();
        break;
      case '3':
        provider = 'mailgun';
        config = await setupMailgun();
        break;
      case '4':
        provider = 'ses';
        config = await setupSES();
        break;
      default:
        console.log('Invalid choice, defaulting to SMTP');
        provider = 'smtp';
        config = await setupSMTP();
    }

    // Common settings
    const fromEmail = await askQuestion('From email address (e.g., noreply@yourcompany.com): ');
    const fromName = await askQuestion('From name (e.g., WorkLink): ');

    const finalConfig = {
      provider,
      ...config,
      from: {
        email: fromEmail,
        name: fromName
      }
    };

    // Test configuration
    console.log('\n🧪 Testing email configuration...');
    const testResult = await testEmailConfig(finalConfig);

    if (testResult.success) {
      console.log('✅ Email configuration test successful!');

      // Save configuration
      updateEmailConfig(finalConfig);
      console.log('✅ Configuration saved successfully!');

      // Send test email
      const sendTest = await askQuestion('\nWould you like to send a test email? (y/n): ');
      if (sendTest.toLowerCase() === 'y' || sendTest.toLowerCase() === 'yes') {
        const testEmailAddr = await askQuestion('Enter test email address: ');
        await sendTestEmail(testEmailAddr);
      }

    } else {
      console.log('❌ Email configuration test failed:', testResult.message);
      console.log('Please check your settings and try again.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }

  rl.close();
}

async function setupSMTP() {
  console.log('\n📧 SMTP Configuration');
  console.log('For Gmail, use: smtp.gmail.com, port 587, and an app password');
  console.log('For Outlook, use: smtp.live.com, port 587\n');

  const host = await askQuestion('SMTP Host (e.g., smtp.gmail.com): ');
  const port = await askQuestion('SMTP Port (587 for most providers): ');
  const secure = await askQuestion('Use SSL/TLS? (y/n): ');
  const user = await askQuestion('SMTP Username (usually your email): ');
  const pass = await askQuestion('SMTP Password (use app password for Gmail): ');

  return {
    smtp: {
      host,
      port: parseInt(port) || 587,
      secure: secure.toLowerCase() === 'y',
      auth: {
        user,
        pass
      }
    }
  };
}

async function setupSendGrid() {
  console.log('\n📤 SendGrid Configuration');
  console.log('Get your API key from: https://app.sendgrid.com/settings/api_keys\n');

  const apiKey = await askQuestion('SendGrid API Key: ');
  const fromEmail = await askQuestion('Verified sender email: ');

  return {
    sendgrid: {
      apiKey,
      from: fromEmail
    }
  };
}

async function setupMailgun() {
  console.log('\n📮 Mailgun Configuration');
  console.log('Get your API key from: https://app.mailgun.com/app/account/security/api_keys\n');

  const apiKey = await askQuestion('Mailgun API Key: ');
  const domain = await askQuestion('Mailgun Domain: ');
  const fromEmail = await askQuestion('From email address: ');

  return {
    mailgun: {
      apiKey,
      domain,
      from: fromEmail
    }
  };
}

async function setupSES() {
  console.log('\n📬 AWS SES Configuration');
  console.log('Get your credentials from AWS IAM console\n');

  const accessKeyId = await askQuestion('AWS Access Key ID: ');
  const secretAccessKey = await askQuestion('AWS Secret Access Key: ');
  const region = await askQuestion('AWS Region (e.g., us-east-1): ');
  const fromEmail = await askQuestion('Verified SES email address: ');

  return {
    ses: {
      accessKeyId,
      secretAccessKey,
      region,
      from: fromEmail
    }
  };
}

async function sendTestEmail(testEmail) {
  try {
    console.log('\n📧 Sending test email...');

    const emailService = require('./services/email');
    await emailService.initialize();

    const result = await emailService.sendTestEmail({
      to: testEmail,
      subject: 'WorkLink Email System Test',
      text: 'Congratulations! Your WorkLink email notification system is working correctly.',
      html: `
        <h2>🎉 Test Successful!</h2>
        <p>Congratulations! Your WorkLink email notification system is working correctly.</p>
        <p>You should now receive email notifications for:</p>
        <ul>
          <li>Tender alerts matching your keywords</li>
          <li>Candidate status updates</li>
          <li>Daily and weekly reports</li>
          <li>System notifications</li>
        </ul>
        <p>You can manage your email preferences through the admin portal.</p>
      `
    });

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`📬 Check your inbox at: ${testEmail}`);
    } else {
      console.log('❌ Failed to send test email:', result.error);
    }

  } catch (error) {
    console.log('❌ Error sending test email:', error.message);
  }
}

console.log('Starting email setup...\n');
setupEmail();

module.exports = { setupEmail };