const puppeteer = require('puppeteer');
const assert = require('assert');

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

  let hashes_log = [];
  await page.exposeFunction('_cvmfs_clearHashesLog', () =>
    hashes_log = []
  );
  await page.exposeFunction('_cvmfs_checkHashesLog', hashes =>
    assert.deepStrictEqual(hashes_log, hashes)
  );

  // log all chunk hashes from outgoing requests
  await page.on('request', request => {
    const hash = request.url()
      .replace(/.*data/, '')
      .replace('/', '')
      .replace('/', '')
      .replace('-shake128', '')
      .replace('P', '');
    hashes_log.push(hash);
  });

  // load test page on browser
  const test_file = process.argv[2];
  await page.goto('file://' + test_file);

  // print test name
  await page.waitForFunction('window._cvmfs_testname !== undefined');
  const testname = await page.evaluate('window._cvmfs_testname');
  process.stdout.write('Testing ' + testname + '... ');

  // wait for test to finish
  await page.waitForFunction('window._cvmfs_test_failed !== undefined');
  const test_failed = await page.evaluate('window._cvmfs_test_failed');

  if (test_failed) {
    console.log('FAILED.');
    if (err_msgs.length > 0) {
      console.log(err_msgs.join('\n'));
    }

    process.exitCode = -1;

    // window._cvmfs_exitstatus is only defined for C tests
    const exitstatus = await page.evaluate('window._cvmfs_exitstatus');
    if (exitstatus !== undefined) {
      console.log('The C/C++ program exited with status ' + exitstatus + '.');
      process.exitCode = exitstatus;
    }
  } else {
    console.log('PASSED.');
  }

  await browser.close();
})();
