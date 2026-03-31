let _io = null;

function init(io) {
  _io = io;
}

function getIO() {
  return _io;
}

function emit(event, data) {
  if (_io) _io.emit(event, data);
}

module.exports = { init, getIO, emit };
