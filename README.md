
<!--#echo json="package.json" key="name" underline="=" -->
ipc-proxy0-pmb
==============
<!--/#echo -->

<!--#echo json="package.json" key="description" -->
Convenience wrapper for child_process.fork
<!--/#echo -->


API
---


This module exports an object with these methods:

### .spawn(libs[, spawnOpts][, then])

Spawns an IPC proxy instance for the module name(s) from `libs`,
which should be a string or an array of strings.
Returns the subprocess object, or `false` if it couldn't `fork()`.

If present, `spawnOpts` are passed as options to `fork()`.

In case a callback function `then` is provided, it is called with
arguments (error, child) on the child's `close` event. (Actually,
the `close:nodeback` event from package `child-exit-nodeback`.)


### .err2dict(error), .dict2err(dict)

These functions translate between Error objects and plain, JSON-able
(dictionary) objects.
Currently they're based heavily on the `error-to-json` package,
but implementation may change without notice.





IPC message protocol
--------------------

* NB: Node v6 IPC channels are JSON-based, so un-JSON-able data may be
  transformed or discarded. The `jsonize-loudfail` package can check
  your data and warn you in advance.

:TODO:



Usage
-----

from [test.usage.js](test.usage.js):

<!--#include file="test.usage.js" start="  //#u" stop="  //#r"
  outdent="  " code="javascript" -->
<!--#verbatim lncnt="58" -->
```javascript
var logArgs = test.log.args, ipcProxy = require('ipc-proxy0-pmb'),
  child = ipcProxy.spawn('querystring', logArgs('child quit'));
equal(typeof child.pid, 'number');
child.on('msg:result', logArgs('got result:'));

test.add(function () {
  child.send({ mtd: 'stringify', ret: 'result',
    arg: [ { Hello: 'World!', foo: 23, bar: 42 }, '/', ':' ] });
  test.log.expect([
    [ 'got result:', 'Hello:World!/foo:23/bar:42' ],
  ]);
});

test.add(function () {
  child.send({ mtd: 'parse', ret: 'result', fin: true,
    arg: [ 'Hello=World&foo=23&bar=42' ] });
  test.log.expect([
    [ 'got result:', { Hello: 'World', foo: '23', bar: '42' } ],
    [ 'child quit', false, '{ChildProcess}' ],
  ]);
});

test.add(function () {
  var whale = ipcProxy.spawn('/dev/null/404.js', logArgs('whale quit'));
  equal(typeof whale.pid, 'number');
  whale.on('error', logArgs('whale fail'));
  test.log.expect([
    [ 'whale fail', '{Error "IPC proxy child:'
                  + ' Cannot find module \'/dev/null/404.js\'"}' ],
    [ 'whale quit', '{Error "IPC proxy child:'
                  + ' Cannot find module \'/dev/null/404.js\'"}',
      '{ChildProcess}' ],
  ]);
});

test.add(function () {
  var whale = ipcProxy.spawn('querystring', logArgs('whale quit'));
  whale.send({ mtd: "method doesn't exist", ret: true, arg: [] });
  whale.on('error', logArgs('whale fail'));
  test.log.expect([
    [ 'whale fail', '{Error "IPC proxy child:'
                  + ' Cannot read property \'apply\' of undefined"}' ],
    [ 'whale quit', '{Error "IPC proxy child:'
                  + ' Cannot read property \'apply\' of undefined"}',
      '{ChildProcess}' ],
  ]);
});

test.add(function () {
  var oneshot = ipcProxy.spawn('querystring', logArgs('oneshot quit'));
  oneshot.send({ mtd: 'parse', ret: true, fin: true,
    arg: [ 'Hello=World&foo=23&bar=42' ] });
  test.log.expect([
    [ 'oneshot quit', false, { Hello: 'World', foo: '23', bar: '42' } ],
  ]);
});
```
<!--/include-->


<!--#toc stop="scan" -->



Known issues
------------

* needs more/better tests and docs




&nbsp;


License
-------
<!--#echo json="package.json" key=".license" -->
ISC
<!--/#echo -->
