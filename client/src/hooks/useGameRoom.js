import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const SERVER = `http://${window.location.hostname}:4403`;
const ACK_TIMEOUT_MS = 8000;

function readSession(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch {}
}

// Shared room plumbing: config fetch, socket connection, create/join/leave, and auto-rejoin after a refresh.
// `session` is whatever the server returned on create/join (minus `ok`) and is sent back on rejoin.
export function useGameRoom({ namespace = '', configPath, sessionKey }) {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [session, setSession] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${SERVER}${configPath}`)
      .then(res => res.json())
      .then(setConfig)
      .catch(() => setConfigError(true));

    const socket = io(`${SERVER}${namespace}`);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const saved = readSession(sessionKey);
      if (!saved) return;
      socket.emit('rejoin', saved, res => {
        if (res?.ok) setSession(saved);
        else {
          writeSession(sessionKey, null);
          setState(null);
          setSession(null);
        }
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', setState);

    return () => socket.disconnect();
  }, [namespace, configPath, sessionKey]);

  const send = useCallback((event, payload = {}, timeoutMs = ACK_TIMEOUT_MS) => new Promise(resolve => {
    socketRef.current.timeout(timeoutMs).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, error: 'אין תשובה מהשרת' } : res);
    });
  }), []);

  const enter = useCallback(async (event, payload) => {
    const { ok, error, ...identity } = await send(event, payload);
    if (ok) {
      setSession(identity);
      writeSession(sessionKey, identity);
    }
    return { ok, error };
  }, [send, sessionKey]);

  const createRoom = useCallback((name, options = {}) => enter('create', { name, ...options }), [enter]);
  const joinRoom = useCallback((code, name) => enter('join', { code, name }), [enter]);

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('leave');
    writeSession(sessionKey, null);
    setState(null);
    setSession(null);
  }, [sessionKey]);

  return { config, configError, connected, state, session, send, createRoom, joinRoom, leaveRoom };
}
