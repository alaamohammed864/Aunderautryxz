import { PlcDialect } from '../../types';

export interface NormalizedAddress {
  area: 'INPUT' | 'OUTPUT' | 'MEMORY' | 'TIMER' | 'COUNTER' | 'DATA';
  byteIndex: number;
  bitIndex?: number;
  rawString: string;
}

export function parseAddress(raw: string, dialect: PlcDialect): NormalizedAddress {
  const clean = raw.trim().toUpperCase();

  if (dialect === 'delta') {
    // Delta DVP: X0-X7 (Inputs), Y0-Y7 (Outputs), M0-M511 (Memory bits), T0-T127 (Timers), C0-C63 (Counters), D0-D999 (Data registers)
    if (clean.startsWith('X')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'INPUT', byteIndex: Math.floor(num / 8), bitIndex: num % 8, rawString: clean };
    }
    if (clean.startsWith('Y')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'OUTPUT', byteIndex: Math.floor(num / 8), bitIndex: num % 8, rawString: clean };
    }
    if (clean.startsWith('M')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'MEMORY', byteIndex: Math.floor(num / 8), bitIndex: num % 8, rawString: clean };
    }
    if (clean.startsWith('T')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'TIMER', byteIndex: num, rawString: clean };
    }
    if (clean.startsWith('C')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'COUNTER', byteIndex: num, rawString: clean };
    }
    if (clean.startsWith('D')) {
      const num = parseInt(clean.substring(1), 10) || 0;
      return { area: 'DATA', byteIndex: num, rawString: clean };
    }
  }

  // Siemens S7-1200 style (default): I0.0, Q0.0, M0.0, T1, C1, DB1.DBD0, MD10
  if (clean.startsWith('I') || clean.startsWith('E')) {
    const parts = clean.substring(1).split('.');
    const b = parseInt(parts[0], 10) || 0;
    const bit = parts[1] !== undefined ? parseInt(parts[1], 10) || 0 : 0;
    return { area: 'INPUT', byteIndex: b, bitIndex: bit, rawString: clean };
  }
  if (clean.startsWith('Q') || clean.startsWith('A')) {
    const parts = clean.substring(1).split('.');
    const b = parseInt(parts[0], 10) || 0;
    const bit = parts[1] !== undefined ? parseInt(parts[1], 10) || 0 : 0;
    return { area: 'OUTPUT', byteIndex: b, bitIndex: bit, rawString: clean };
  }
  if (clean.startsWith('M')) {
    const parts = clean.substring(1).split('.');
    const b = parseInt(parts[0], 10) || 0;
    const bit = parts[1] !== undefined ? parseInt(parts[1], 10) || 0 : 0;
    return { area: 'MEMORY', byteIndex: b, bitIndex: bit, rawString: clean };
  }
  if (clean.startsWith('T')) {
    const num = parseInt(clean.substring(1), 10) || 0;
    return { area: 'TIMER', byteIndex: num, rawString: clean };
  }
  if (clean.startsWith('C')) {
    const num = parseInt(clean.substring(1), 10) || 0;
    return { area: 'COUNTER', byteIndex: num, rawString: clean };
  }
  if (clean.startsWith('DB') || clean.startsWith('MD') || clean.startsWith('VW')) {
    const num = parseInt(clean.replace(/\D/g, ''), 10) || 0;
    return { area: 'DATA', byteIndex: num, rawString: clean };
  }

  return { area: 'MEMORY', byteIndex: 0, bitIndex: 0, rawString: clean };
}

export function formatAddressForDialect(address: string, dialect: PlcDialect): string {
  const norm = parseAddress(address, 'siemens');
  if (dialect === 'delta') {
    if (norm.area === 'INPUT') return `X${norm.byteIndex * 8 + (norm.bitIndex || 0)}`;
    if (norm.area === 'OUTPUT') return `Y${norm.byteIndex * 8 + (norm.bitIndex || 0)}`;
    if (norm.area === 'MEMORY') return `M${norm.byteIndex * 8 + (norm.bitIndex || 0)}`;
    if (norm.area === 'TIMER') return `T${norm.byteIndex}`;
    if (norm.area === 'COUNTER') return `C${norm.byteIndex}`;
    if (norm.area === 'DATA') return `D${norm.byteIndex}`;
  }
  return address;
}
