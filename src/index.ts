#!/usr/bin/env bun
import { runMain } from 'citty';
import { createCli } from './cli';
import { resolveReporter } from './reporter/resolve-reporter';
import { BunRunner } from './runner/bun-runner';
import { resolvePlatform } from './tool/platform';

runMain(createCli(new BunRunner(), resolvePlatform(), resolveReporter()));
