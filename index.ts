#!/usr/bin/env bun
import { runMain } from 'citty';
import { createCli } from './cli';
import { BunRunner } from './runner/bun-runner';

runMain(createCli(new BunRunner()));
