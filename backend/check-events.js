const Event = require('./models/Event');
const Lead = require('./models/Lead');
require('dotenv').config();

(async () => {
  try {
    await require('mongoose').connect(process.env.MONGO_URI);
    console.log('📋 Recent Tracking Events\n');
    
    const events = await Event.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('leadId', 'email name');
    
    if (events.length === 0) {
      console.log('❌ No tracking events found.');
    } else {
      events.forEach((event, i) => {
        console.log(`🔔 Event ${i + 1}:`);
        console.log(`   Type: ${event.type}`);
        console.log(`   Lead: ${event.leadId?.name || 'Unknown'} (${event.leadId?.email || 'Unknown'})`);
        console.log(`   Time: ${event.timestamp.toLocaleString()}`);
        if (event.metadata.page) console.log(`   Page: ${event.metadata.page}`);
        if (event.metadata.sessionId) console.log(`   Session: ${event.metadata.sessionId}`);
        if (event.metadata.timeSpent) console.log(`   Time Spent: ${event.metadata.timeSpent}s`);
        console.log('');
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
