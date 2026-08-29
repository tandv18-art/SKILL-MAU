#!/usr/bin/env node
'use strict';

const { resolveImageModel } = require('./server');

const model = resolveImageModel();
for (const runtime of ['product-photo', 'world-checkin', 'premium-portrait', 'virtual-tryon']) {
  console.log(`${runtime}: ${model}`);
}
