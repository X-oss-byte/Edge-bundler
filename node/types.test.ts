import { promises as fs } from 'fs'
import { join } from 'path'

import nock from 'nock'
import { stub } from 'sinon'
import tmp from 'tmp-promise'
import { test, expect } from 'vitest'

import { testLogger } from '../test/util.js'

import { DenoBridge } from './bridge.js'
import { ensureLatestTypes } from './types.js'

test('`ensureLatestTypes` updates the Deno CLI cache if the local version of types is outdated', async () => {
  const mockURL = 'https://edge.netlify'
  const mockVersion = '123456789'
  const latestVersionMock = nock(mockURL).get('/version.txt').reply(200, mockVersion)

  const tmpDir = await tmp.dir()
  const deno = new DenoBridge({
    cacheDirectory: tmpDir.path,
    logger: testLogger,
  })

  const mock = stub(deno, 'run').resolves()

  await ensureLatestTypes(deno, testLogger, mockURL)

  const versionFile = await fs.readFile(join(tmpDir.path, 'types-version.txt'), 'utf8')

  expect(latestVersionMock.isDone()).toBe(true)
  expect(mock.callCount).toBe(1)
  expect(mock.firstCall.firstArg).toEqual(['cache', '-r', mockURL])
  expect(versionFile).toBe(mockVersion)

  mock.restore()

  await fs.rmdir(tmpDir.path, { recursive: true })
})

test('`ensureLatestTypes` does not update the Deno CLI cache if the local version of types is up-to-date', async () => {
  const mockURL = 'https://edge.netlify'
  const mockVersion = '987654321'

  const tmpDir = await tmp.dir()
  const versionFilePath = join(tmpDir.path, 'types-version.txt')

  await fs.writeFile(versionFilePath, mockVersion)

  const latestVersionMock = nock(mockURL).get('/version.txt').reply(200, mockVersion)
  const deno = new DenoBridge({
    cacheDirectory: tmpDir.path,
    logger: testLogger,
  })
  const mock = stub(deno, 'run').resolves()

  await ensureLatestTypes(deno, testLogger, mockURL)

  expect(latestVersionMock.isDone()).toBe(true)
  expect(mock.callCount).toBe(0)

  mock.restore()

  await fs.rmdir(tmpDir.path, { recursive: true })
})

test('`ensureLatestTypes` does not throw if the types URL is not available', async () => {
  const mockURL = 'https://edge.netlify'
  const latestVersionMock = nock(mockURL).get('/version.txt').reply(500)

  const tmpDir = await tmp.dir()
  const deno = new DenoBridge({
    cacheDirectory: tmpDir.path,
    logger: testLogger,
  })

  const mock = stub(deno, 'run').resolves()

  await ensureLatestTypes(deno, testLogger, mockURL)

  expect(latestVersionMock.isDone()).toBe(true)
  expect(mock.callCount).toBe(0)

  mock.restore()

  await fs.rmdir(tmpDir.path, { recursive: true })
})