import app from './server';
import { config } from './config';
import { startPolling } from './services/poller';

const port = config.server.port;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Start polling job if enabled
  if (config.polling.enabled) {
    console.log('Starting polling job...');
    startPolling();
  } else {
    console.log('Polling job disabled');
  }
});
