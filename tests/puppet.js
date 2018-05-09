const puppeteer = require('puppeteer');

process.on('unhandledRejection', err => { throw err; });

(async () => {
  const options = {};
  const chrome_exe = process.argv[3];
  if (chrome_exe !== undefined) {
    options.executablePath = chrome_exe;
  }

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  // test_container.html will call window._cvmfs_printErr
  // whenever the browser JavaScript tries to print an error
  // message. we collect them as they come and print them later on.
  const err_msgs = [];
  await page.exposeFunction('_cvmfs_printErr', text =>
    err_msgs.push(text)
  );

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
    if (err_msgs.length > 0) {
      console.log(err_msgs.join('\n'));
    }
  }

  // make sure we exit with the same exit status
  process.exitCode = exitstatus;
  
  await browser.close();
})();