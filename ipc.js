/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';
var EX = module.exports, libs = null, fork = require('child_process').fork,
  childExitNodeback = require('child-exit-nodeback'),
  isErr = require('is-error'), err2json = require('error-to-json'),
  isAry = Array.isArray, arSlc = Array.prototype.slice;


function ifFun(x, d) { return ((typeof x) === 'function' ? x : d); }
function isStr(x, no) { return (((typeof x) === 'string') || no); }


EX.spawn = function spawn(libs, chOpt, then) {
  if (!ifFun(then)) { then = null; }
  if (ifFun(chOpt) && (!then)) {
    then = chOpt;
    chOpt = null;
  }
  if (libs.filename) { libs = libs.filename; }
  if (isStr(libs)) { libs = [libs]; }
  var ch;
  try {
    ch = fork(module.filename, libs, chOpt);
  } catch (stillborn) {
    if (!then) { throw stillborn; }
    setImmediate(then, stillborn);
    return false;
  }
  childExitNodeback(ch);
  ch.on('message', EX.parentRecv.bind(null, ch));
  if (then) { ch.once('close:nodeback', then); }
  return ch;
};


EX.err2dict = function (e) { return err2json(e); };   // hide .parse()
EX.dict2err = err2json.parse;


EX.runFromCLI = function () {
  if (!process.send) { return; }
  process.on('uncaughtException', function (e) {
    e = EX.err2dict(e);
    e.message = 'IPC proxy child error: ' + e.message;
    process.send({ error: e });
    process.exit(4);
  });
  libs = process.argv.slice(2);
  libs.forEach(function (a, i) {
    try {
      libs[a] = libs[i] = require(a);
    } catch (e) {
      e.lib = a;
      libs = null;
      throw e;
    }
  });
  process.on('message', EX.serve);
};


EX.parentRecv = function (ch, msg) {
  var acn, err = (msg || false).error;
  if (err) { return ch.emit('error', EX.dict2err(err)); }
  if (!isAry(msg)) { msg = [msg]; }
  acn = String(msg[0]);
  if (!ch.emit.apply(ch, ['msg:' + acn].concat(msg.slice(1)))) {
    throw new Error('No handler for child action: ' + acn);
  }
};


EX.serve = function (job) {
  if (!job) { return process.disconnect(); }
  var f = libs[job.lib || 0], m = job.mtd, a = job.arg, r, e = false,
    onErr = job.onerror, onRet = job.ret, fin = job.fin;
  if (m === null) { return process.disconnect(); }
  if (onRet) {
    onRet = [onRet];
    if (job.retPre !== undefined) { onRet = onRet.concat(job.retPre); }
    onRet.spread = job.retSpread;
  }
  if (m && f) { f = f[m]; }
  job.libs = libs;
  if (a === undefined) { a = []; }
  if (!isAry(a)) { a = [a]; }
  if (job.cb) { a.push(EX.makeMsgCb(job)); }

  try { r = f.apply(job, a); } catch (caught) { e = caught; }

  if (e) {
    if (onErr) { process.send([onErr, EX.err2dict(e)]); } else { throw e; }
    if (fin) { process.disconnect(); }
  }
  if (onRet) {
    process.send(onRet.concat(onRet.spread ? r : [r]));
    if (fin) { process.disconnect(); }
  }
};


EX.makeMsgCb = function (job) {
  if (isStr(job)) { job = { msg: job }; }
  function cb() {
    process.send([cb.msg].concat(arSlc.call(arguments).map(EX.jsonPrep)));
    if (cb.fin) { process.disconnect(); }
  }
  cb.msg = String(job.msg);
  cb.fin = !!job.fin;
  return cb;
};


EX.jsonPrep = function (x) {
  if (x === undefined) { return null; }
  if (!x) { return x; }
  if (isErr(x)) { return EX.err2dict(x); }
  return x;
};



















if (require.main === module) { EX.runFromCLI(); }
