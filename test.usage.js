/*jslint indent: 2, maxlen: 80, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var EX = module.exports, equal = require('equal-pmb'),
  arSlc = Array.prototype.slice, async = require('async');

EX.tests = [];
function addTest(f) { EX.tests.push(f); }

EX.log = [];

function arg2str(a) {
  if (!a) { return a; }
  if (typeof a !== 'object') { return a; }
  var d = a.constructor.name;
  if (d === 'Object') { return a; }
  if (a.message) { d += ' "' + a.message + '"'; }
  //if (a.pid) { d += ' #' + a.pid; }
  return '{' + d + '}';
}

EX.log.args = function (topic) {
  return function () {
    EX.log.push([topic].concat(arSlc.call(arguments).map(arg2str)));
  };
};
EX.log.want = [];
EX.log.expect = function (add) { EX.log.want = EX.log.want.concat(add); };



(function readmeDemo(test) {
  //#u
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
  //#r

  async.eachSeries(EX.tests, function (t, nx) {
    equal.lists(EX.log, EX.log.want);
    t();
    setTimeout(nx, 500);
  }, function (asyncErr) {
    if (asyncErr) { throw asyncErr; }
    equal.lists(EX.log, EX.log.want);
    console.log("+OK tests passed.");
  });
}({ add: addTest, log: EX.log }));











//= "+OK tests passed."
