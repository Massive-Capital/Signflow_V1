import express from 'express';
import { createApp } from '../src/app';

export const app = createApp();

// Minimal health route for smoke tests when routes module loads heavy deps
export function createTestApp(): express.Express {
  return createApp();
}
