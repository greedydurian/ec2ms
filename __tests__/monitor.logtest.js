const EventEmitter = require('events');

describe('Monitor Event Handlers', () => {

  let monitor;

  beforeEach(() => {
    monitor = new EventEmitter();
    jest.clearAllMocks();
  });

  it('should log connection attempts', () => {
    // Mock logToFile function
    const logToFile = jest.fn();

    // Spy on console.log
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Attach the event listener
    monitor.on('connectionAttempt', (address, username) => {
      const logEntry = `Attempting connection to ${address} as ${username}`;
      console.log(logEntry);
      logToFile('Connection Attempt', logEntry);  // Mocked function is used here
    });

    // Emit a 'connectionAttempt' event
    const address = '127.0.0.1';
    const username = 'username';
    monitor.emit('connectionAttempt', address, username);

    // Define expected log entry
    const expectedLogEntry = `Attempting connection to ${address} as ${username}`;

    // Check that console.log was called with the expected log entry
    expect(logSpy).toHaveBeenCalledWith(expectedLogEntry);

    // Check that logToFile was called with the correct parameters
    expect(logToFile).toHaveBeenCalledWith('Connection Attempt', expectedLogEntry);

    // Clean up
    logSpy.mockRestore();
  });
});
