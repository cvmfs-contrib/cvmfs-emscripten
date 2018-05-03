const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // collect all messages sent to browser's console
  var console_msgs = [];
  page.on('console', msg => {
    console_msgs.push(msg._text);
  });

  // load test page on browser
  const test_file = process.argv[2];
  await page.goto('file://' + test_file);
  
  process.stdout.write('Testing open and readdir... ');
  
  // wait till the C/C++ program exits
  await page.waitForFunction('window._cvmfs_exited === true');

  // get the exit status
  const exitstatus = await page.evaluate('window._cvmfs_exitstatus');

  if (exitstatus === 0) {
    console.log('PASSED.');
  } else {
    console.log('FAILED.');
    console.log('The C/C++ program exited with status ' + exitstatus + '.');
  }
  
  if (console_msgs.length > 0) {
    console.log(console_msgs.join('\n'));
  }

  // make sure we exit with the same exit status
  process.exitCode = exitstatus;
  
  await browser.close();
})();