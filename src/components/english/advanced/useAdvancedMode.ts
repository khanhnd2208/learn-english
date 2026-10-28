'use client';
import { useSyncExternalStore } from 'react';

/** Per-device reading preference: show fixed phrases on word cards. */
const KEY = 'wordquest:advanced:v1';
const listeners = new Set<() => void>();
function read(): boolean { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } }
function subscribe(listener: () => void) { listeners.add(listener); window.addEventListener('storage', listener); return () => { listeners.delete(listener); window.removeEventListener('storage', listener); }; }
export function setAdvancedMode(on: boolean) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked: keep in-memory listeners only */ } listeners.forEach((l) => l()); }
export function useAdvancedMode(): boolean { return useSyncExternalStore(subscribe, read, () => false); }
