import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER = `http://${window.location.hostname}:4403`;
const SESSION_KEY = 'eretzIrSession';
const ACK_TIMEOUT_MS = 8000;

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function writeSession(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function useEretzIrRoom() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${SERVER}/api/eretz-ir/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(() => setConfigError(true));

    const socket = io(SERVER);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const saved = readSession();
      if (!saved) return;
      socket.emit('rejoin', saved, res => {
        if (res?.ok) setPlayerId(res.playerId);
        else {
          writeSession(null);
          setState(null);
          setPlayerId(null);
        }
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', setState);

    return () => socket.disconnect();
  }, []);

  const send = useCallback((event, payload = {}) => new Promise(resolve => {
    socketRef.current.timeout(ACK_TIMEOUT_MS).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, error: 'אין תשובה מהשרת' } : res);
    });
  }), []);

  const enter = useCallback(async (event, payload) => {
    const res = await send(event, payload);
    if (res.ok) {
      setPlayerId(res.playerId);
      writeSession({ code: res.code, playerId: res.playerId });
    }
    return res;
  }, [send]);

  const createRoom = useCallback(name => enter('create', { name }), [enter]);
  const joinRoom = useCallback((code, name) => enter('join', { code, name }), [enter]);

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('leave');
    writeSession(null);
    setState(null);
    setPlayerId(null);
  }, []);

  return { config, configError, connected, state, playerId, send, createRoom, joinRoom, leaveRoom };
}
