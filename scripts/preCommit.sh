#!/bin/sh
rm -rf data \
&& npm ci \
&& npm run format \
&& npm run lint \
&& npm run test:cov \
&& npm run test:e2e:smoke \
&& npm run build \
&& npm run lighthouse