const Lead = require('./models/Lead');
require('dotenv').config();

(async () => {
  try {
    await require('mongoose').connect(process.env.MONGO_URI);
    console.log('📊 Tracking Verification Report\n');
    
    const leads = await Lead.find({email: {$regex: 'shaikbash'}}, 'email trackingId clickCount openCount score status lastEmailSent');
    
    if (leads.length === 0) {
      console.log('❌ No test leads found. Run send-tracking-test.js first.');
    } else {
      leads.forEach((lead, i) => {
        console.log(`📧 Lead ${i + 1}:`);
        console.log(`   Email: ${lead.email}`);
        console.log(`   🆔 Tracking ID: ${lead.trackingId}`);
        console.log(`   👁️  Email Opens: ${lead.openCount}`);
        console.log(`   🖱️  Link Clicks: ${lead.clickCount}`);
        console.log(`   📊 Score: ${lead.score}`);
        console.log(`   📈 Status: ${lead.status}`);
        console.log(`   📨 Last Email: ${lead.lastEmailSent || 'None'}`);
        console.log('');
      });
    }
    
    console.log('🔗 Test Tracking URLs:');
    leads.forEach(lead => {
      if (lead.trackingId) {
        console.log(`   📧 Email Open: http://localhost:3000/track/open/${lead.trackingId}`);
        console.log(`   🖱️  Link Click: http://localhost:3000/track/${lead.trackingId}`);
      }
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
