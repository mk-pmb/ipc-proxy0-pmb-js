/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';
var EX = module.exports, libs = null, fork = require('child_process').fork,
  childExitNodeback = require('child-exit-nodeback'),
  isErr = require('is-error'), err2json = require('error-to-json'),
  isAry = Array.isArray, arSlc = Array.prototype.slice,
  toStr = require('safe-tostring-pmb');


function ifFun(x, d) { return ((typeof x) === 'function' ? x : d); }
function isStr(x, no) { return (((typeof x) === 'string') || no); }
function propOrTrue(x) { return ((x === true) || isStr(x) || (x === +x)); }


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
  ch.hadFatalError = false;
  ch.on('message', EX.parentRecv.bind(null, ch));
  if (then) {
    ch.once('close:nodeback', function (genericErr) {
      setImmediate.apply(null, [then, (ch.hadFatalError || genericErr)
        ].concat(ch.result || ch));
    });
  }
  return ch;
};


EX.err2dict = function (e) {
  if (!isErr(e)) {
    e = Object.assign(new Error('Non-Error value used as error: ' +
      toStr((e || false).message || e)), { value: EX.jsonPrep(e) });
  }
  return err2json(e);
};

EX.dict2err = err2json.parse;
EX.errorPrefix = 'IPC proxy child: ';


EX.runFromCLI = function () {
  if (!process.send) { return; }
  process.on('uncaughtException', function (e) {
    e = EX.err2dict(e);
    e.message = EX.errorPrefix + e.message;
    process.send({ error: e, fatal: true });
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
  var acn, err;
  if (!isAry(msg)) {
    if (msg) {
      err = msg.error;
      if (err) {
        err = EX.dict2err(err);
        if (msg.fatal) { ch.hadFatalError = err; }
        ch.emit('error', err);
        return;
      }
      if (msg.result) {
        ch.result = msg.result;
        return;
      }
    }
    msg = [msg];
  }
  acn = toStr(msg[0]);
  if (!ch.emit.apply(ch, ['msg:' + acn].concat(msg.slice(1)))) {
    throw new Error('No handler for child action: ' + acn);
  }
};


EX.serve = function (job) {
  if (!job) { return process.disconnect(); }
  var f = libs[job.lib || 0], m = job.mtd, a = job.arg, r, e = false,
    onErr = job.onerror, onRet = job.ret, fin = job.fin;
  if (m === null) { return process.disconnect(); }
  onRet = (propOrTrue(onRet) && EX.makeMsgCb({ msg: onRet, fin: fin,
    arg1err: false, spread: job.retSpread }));
  if (m && f) { f = f[m]; }
  job.libs = libs;
  if (a === undefined) { a = []; }
  if (!isAry(a)) { a = [a]; }
  if (propOrTrue(job.cb)) { a.push(EX.makeMsgCb({ msg: job.cb, fin: fin })); }

  try { r = f.apply(job, a); } catch (caught) { e = caught; }

  if (e) {
    if (onErr) { process.send([onErr, EX.err2dict(e)]); } else { throw e; }
    if (fin) { process.disconnect(); }
  }
  if (onRet) { onRet(r); }
};


EX.makeMsgCb = function (job) {
  if (isStr(job)) { job = { msg: job }; }
  var msg = job.msg, trve = (msg === true), fin = !!job.fin,
    spread = job.spread, arg1err = (job.arg1err !== false);
  job = null;
  msg = toStr(msg);
  function cb() {
    var args = arSlc.call(arguments).map(EX.jsonPrep);
    if (spread && isAry(args[0])) { args = args[0]; }
    if (trve) {
      if (args[0] && arg1err) { throw args[0]; }
      process.send({ result: args });
    } else {
      process.send([msg].concat(args));
    }
    if (fin || trve) { process.disconnect(); }
  }
  return cb;
};


EX.jsonPrep = function (x) {
  if (x === undefined) { return null; }
  if (!x) { return x; }
  if (isErr(x)) { return EX.err2dict(x); }
  return x;
};



















if (require.main === module) { EX.runFromCLI(); }
